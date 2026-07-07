import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type RequestBody = {
  latex: string;
  fileName?: string;
};

function sanitizeFileName(value: string | undefined) {
  return (
    value
      ?.replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "enhanced-resume"
  );
}

function pdflatexCandidates() {
  const candidates = [
    process.env.PDFLATEX_PATH,
    "pdflatex",
    process.env.LOCALAPPDATA
      ? join(
          process.env.LOCALAPPDATA,
          "Programs",
          "MiKTeX",
          "miktex",
          "bin",
          "x64",
          "pdflatex.exe",
        )
      : undefined,
    "C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe",
  ];

  return candidates.filter((candidate): candidate is string => Boolean(candidate));
}

async function runPdfLatex(command: string, cwd: string) {
  return execFileAsync(
    command,
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
  let lastError = "pdflatex was not found.";

  for (const command of pdflatexCandidates()) {
    try {
      await runPdfLatex(command, workDir);
      await runPdfLatex(command, workDir);
      return command;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError);
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