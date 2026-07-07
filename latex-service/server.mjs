import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 8080);
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 1024 * 1024);
const pdflatexPath = process.env.PDFLATEX_PATH || "pdflatex";
const expectedToken = process.env.LATEX_SERVICE_TOKEN;

function sendJson(res, status, body) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": payload.length,
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });

    req.on("error", reject);
  });
}

async function runPdfLatex(cwd) {
  return execFileAsync(
    pdflatexPath,
    [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-file-line-error",
      "-no-shell-escape",
      "resume.tex",
    ],
    {
      cwd,
      timeout: Number(process.env.PDFLATEX_TIMEOUT_MS || 60000),
      maxBuffer: 1024 * 1024 * 8,
    },
  );
}

async function compileLatex(latex) {
  const workDir = join(tmpdir(), `resume-latex-${randomUUID()}`);

  try {
    await mkdir(workDir, { recursive: true });
    await writeFile(join(workDir, "resume.tex"), latex, "utf8");
    await runPdfLatex(workDir);
    await runPdfLatex(workDir);
    return readFile(join(workDir, "resume.pdf"));
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

const server = createServer(async (req, res) => {
  if (
    req.method === "GET" &&
    (req.url === "/" || req.url === "/health" || req.url === "/health/")
  ) {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/compile") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (
    expectedToken &&
    req.headers.authorization !== `Bearer ${expectedToken}`
  ) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(req);

    if (!body || typeof body.latex !== "string" || !body.latex.trim()) {
      sendJson(res, 400, { error: "No LaTeX document provided." });
      return;
    }

    const pdfBytes = await compileLatex(body.latex);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Length": pdfBytes.length,
      "Cache-Control": "no-store",
    });
    res.end(pdfBytes);
  } catch (error) {
    sendJson(res, 500, {
      error: "Failed to compile LaTeX resume PDF.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, () => {
  console.log(`LaTeX compile service listening on ${port}`);
});
