import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  normalizeTemplateResume,
  renderResumeHtml,
  renderResumeLatex,
  renderResumePlainText,
} from "@/app/lib/resume-template";

type RequestBody = {
  resumeText: string;
  missingKeywords: string[];
};

function extractJsonObject(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in LLM response.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

async function readLatexTemplate() {
  try {
    return await readFile(join(process.cwd(), "template", "sample_resume.tex"), "utf8");
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const hfKey = process.env.HF_API_KEY ?? process.env.HF_TOKEN;
  const model = process.env.HF_MODEL ?? "openai/gpt-oss-120b:fastest";

  if (!hfKey) {
    return NextResponse.json(
      { error: "HF_API_KEY or HF_TOKEN not configured on server." },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { resumeText, missingKeywords } = body;
  const template = await readLatexTemplate();

  const prompt = `Parse the uploaded resume, naturally integrate the missing job-description keywords, and return ONLY valid JSON matching this schema:
{
  "header": {
    "name": "",
    "title": "",
    "location": "",
    "email": "",
    "phone": "",
    "links": [{ "label": "", "url": "" }]
  },
  "summary": "",
  "skills": [{ "label": "Frontend", "items": [""] }],
  "experience": [{
    "title": "",
    "company": "",
    "location": "",
    "dates": "",
    "context": "",
    "bullets": [""]
  }],
  "projects": [{ "name": "", "url": "", "dates": "", "bullets": [""] }],
  "education": [{ "degree": "", "school": "", "location": "", "dates": "" }],
  "certifications": [""]
}

Rules:
- Preserve the candidate's real information from the uploaded resume.
- Do not invent employers, schools, dates, metrics, certifications, links, or projects.
- Integrate every missing keyword at least once where it fits naturally, usually in summary, skills, and relevant experience bullets.
- Keep bullets concise, ATS-friendly, and achievement-oriented.
- Use the LaTeX template sections and order shown below when choosing fields.
- Return JSON only. No markdown, no code fence, no commentary.

LaTeX template reference:
${template.slice(0, 6000)}

Uploaded resume:
${resumeText}

Missing keywords to integrate:
${missingKeywords.join(", ") || "None"}`;

  try {
    console.log(`[hf-merge] request received - model=${model}`);
    const start = Date.now();
    const resp = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert resume parser and ATS resume editor. Return strict JSON only.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3500,
        temperature: 0.2,
        stream: false,
      }),
    });

    console.log(`[hf-merge] huggingface status=${resp.status}`);

    if (!resp.ok) {
      const errText = await resp.text();
      const isAuthError = resp.status === 401 || resp.status === 403;
      const isModelError = errText.includes("Model not supported");
      return NextResponse.json(
        {
          error: isAuthError
            ? "Hugging Face token is missing the Inference Providers permission."
            : isModelError
              ? "Configured HF_MODEL is not supported by Hugging Face Inference Providers."
              : "Hugging Face API error",
          details: isAuthError
            ? `${errText} Create a fine-grained Hugging Face token with "Make calls to Inference Providers" enabled, then update HF_API_KEY or HF_TOKEN.`
            : isModelError
              ? `${errText} Set HF_MODEL to a chat-completion model such as openai/gpt-oss-120b:fastest.`
              : errText,
        },
        { status: isAuthError || isModelError ? 500 : 502 },
      );
    }

    const j = await resp.json();
    const tookMs = Date.now() - start;
    console.log(`[hf-merge] received response in ${tookMs}ms`);

    const content =
      typeof j?.choices?.[0]?.message?.content === "string"
        ? j.choices[0].message.content
        : "";

    if (!content) {
      console.warn("[hf-merge] unexpected HF response shape", j);
      return NextResponse.json(
        { error: "Unexpected response from Hugging Face" },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(content);
    } catch (error) {
      console.warn("[hf-merge] could not parse structured resume", error);
      return NextResponse.json(
        {
          error: "Hugging Face returned invalid resume JSON.",
          details: content.slice(0, 1000),
        },
        { status: 502 },
      );
    }

    const resume = normalizeTemplateResume(parsed);
    const mergedText = renderResumePlainText(resume);
    const latex = renderResumeLatex(resume);
    const html = renderResumeHtml(resume);

    console.log(`[hf-merge] rendered structured resume length=${mergedText.length}`);
    return NextResponse.json({ merged: mergedText, resume, latex, html });
  } catch (err) {
    console.error("[hf-merge] error calling Hugging Face:", err);
    return NextResponse.json(
      { error: "Server error calling Hugging Face", details: String(err) },
      { status: 500 },
    );
  }
}