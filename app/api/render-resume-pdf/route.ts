import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { platform, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type RequestBody = {
  latex: string;
  fileName?: string;
};

type PdfLatexCandidate = {
  command: string;
  label: string;
};

function sanitizeFileName(value: string | undefined) {
  return (
    value
      ?.replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "enhanced-resume"
  );
}

function dedupeCandidates(candidates: Array<PdfLatexCandidate | undefined>) {
  const seen = new Set<string>();
  return candidates.filter((candidate): candidate is PdfLatexCandidate => {
    if (!candidate || seen.has(candidate.command)) return false;
    seen.add(candidate.command);
    return true;
  });
}

function pdflatexCandidates() {
  const currentPlatform = platform();
  const candidates: Array<PdfLatexCandidate | undefined> = [
    process.env.PDFLATEX_PATH
      ? {
          command: process.env.PDFLATEX_PATH,
          label: "PDFLATEX_PATH",
        }
      : undefined,
    { command: "pdflatex", label: "system PATH" },
  ];

  if (currentPlatform === "win32") {
    candidates.push(
      process.env.LOCALAPPDATA
        ? {
            command: join(
              process.env.LOCALAPPDATA,
              "Programs",
              "MiKTeX",
              "miktex",
              "bin",
              "x64",
              "pdflatex.exe",
            ),
            label: "local MiKTeX install",
          }
        : undefined,
      {
        command: "C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe",
        label: "Program Files MiKTeX install",
      },
    );
  } else {
    candidates.push(
      { command: "/usr/bin/pdflatex", label: "Linux TeX Live install" },
      { command: "/usr/local/bin/pdflatex", label: "local TeX Live install" },
    );
  }

  return dedupeCandidates(candidates);
}

async function runPdfLatex(candidate: PdfLatexCandidate, cwd: string) {
  return execFileAsync(
    candidate.command,
    [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-file-line-error",
      "-disable-installer",
      "-no-shell-escape",
      "resume.tex",
    ],
    {
      cwd,
      timeout: 60000,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8,
    },
  );
}

async function compileLatex(workDir: string) {
  const failures: string[] = [];

  for (const candidate of pdflatexCandidates()) {
    try {
      await runPdfLatex(candidate, workDir);
      await runPdfLatex(candidate, workDir);
      return candidate.command;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${candidate.label} (${candidate.command}): ${message}`);
    }
  }

  throw new Error(
    [
      "pdflatex was not found or failed to run on this server.",
      "Install a LaTeX distribution on the deployment host, make pdflatex available on PATH, or set PDFLATEX_PATH to the absolute pdflatex binary path.",
      `Tried: ${failures.join(" | ")}`,
    ].join(" "),
  );
}


async function compileLatexWithService(latex: string) {
  if (!process.env.LATEX_SERVICE_URL) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.LATEX_SERVICE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.LATEX_SERVICE_TOKEN}`;
  }

  const response = await fetch(process.env.LATEX_SERVICE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ latex }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const details = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");
    throw new Error(
      `LaTeX service failed with status ${response.status}: ${
        typeof details === "string" ? details : JSON.stringify(details)
      }`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}
export async function POST(req: Request) {
  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.latex || typeof body.latex !== "string") {
    return NextResponse.json({ error: "No LaTeX document provided." }, { status: 400 });
  }

  const baseName = sanitizeFileName(body.fileName);
  const workDir = join(tmpdir(), `resume-latex-${randomUUID()}`);

  try {
    const servicePdfBytes = await compileLatexWithService(body.latex);

    if (servicePdfBytes) {
      return new NextResponse(servicePdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}-enhanced.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    await mkdir(workDir, { recursive: true });
    await writeFile(join(workDir, "resume.tex"), body.latex, "utf8");
    await compileLatex(workDir);

    const pdfBytes = await readFile(join(workDir, "resume.pdf"));

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}-enhanced.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to compile LaTeX resume PDF.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}