"use client";

import mammoth from "mammoth";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import {
  GlobalWorkerOptions,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();

export type PreviewData =
  | { type: "pdf"; url: string }
  | { type: "html"; content: string }
  | { type: "text"; content: string };

export type ResumeSource = "sample" | "upload";

export type Analysis = {
  atsScore: number;
  relevance: string;
  keywordScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  jobKeywords: string[];
  structureScore: number;
  resumeWordCount: number;
  jobWordCount: number;
};

const TECH_AND_BUSINESS_DICTIONARY = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Swift",
  "Go",
  "Rust",
  "Kotlin",
  "HTML",
  "CSS",
  "Sass",
  "SCSS",
  "SQL",
  "NoSQL",
  "GraphQL",
  "Bash",
  "Shell",
  "Web3",
  "Solidity",
  "React",
  "Next.js",
  "Node.js",
  "Angular",
  "Vue",
  "Svelte",
  "Express",
  "NestJS",
  "Django",
  "Flask",
  "Rails",
  "Spring Boot",
  "Laravel",
  "Tailwind CSS",
  "Bootstrap",
  "Redux",
  "Zustand",
  "Webpack",
  "Vite",
  "jQuery",
  "Ember",
  "RxJS",
  "Prisma",
  "TypeORM",
  "Sequelize",
  "Mongoose",
  "AWS",
  "Azure",
  "GCP",
  "Google Cloud",
  "Firebase",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "Elasticsearch",
  "Supabase",
  "DynamoDB",
  "MariaDB",
  "Cassandra",
  "CI/CD",
  "GitHub Actions",
  "Jenkins",
  "Git",
  "GitHub",
  "GitLab",
  "Bitbucket",
  "Terraform",
  "Ansible",
  "CircleCI",
  "Prometheus",
  "Grafana",
  "Sentry",
  "New Relic",
  "REST API",
  "REST APIs",
  "gRPC",
  "WebSockets",
  "Microservices",
  "Serverless",
  "Agile",
  "Scrum",
  "Kanban",
  "TDD",
  "Unit Testing",
  "Integration Testing",
  "E2E Testing",
  "Automated Testing",
  "Monitoring",
  "Logging",
  "Release Automation",
  "UI/UX",
  "User Interface",
  "User Experience",
  "Responsive Design",
  "State Management",
  "Performance Optimization",
  "UI Architecture",
  "Frontend",
  "Backend",
  "Full-Stack",
  "System Architecture",
  "Cross-functional",
  "End-to-end",
  "Product Design",
  "Product Development",
  "Collaboration",
  "Teamwork",
  "Mentorship",
  "Leadership",
  "SaaS",
  "Micro-frontend",
  "Design System",
  "Design Systems",
  "Web Performance",
  "SEO",
  "Accessibility",
  "WCAG",
  "Security",
  "Authentication",
  "Authorization",
  "OAuth",
  "JWT",
];

const KEYWORD_ALIASES: Record<string, string[]> = {
  "Next.js": ["next.js", "nextjs"],
  "Node.js": ["node.js", "nodejs"],
  React: ["react", "react.js", "reactjs"],
  Vue: ["vue", "vue.js", "vuejs"],
  "Tailwind CSS": ["tailwind css", "tailwindcss", "tailwind"],
  "Full-Stack": ["fullstack", "full-stack", "full stack"],
  "End-to-end": ["end-to-end", "end to end"],
  "Cross-functional": ["cross-functional", "cross functional"],
  "REST API": ["rest api", "rest apis", "restful"],
  "REST APIs": ["rest api", "rest apis", "restful"],
  "Google Cloud": ["google cloud", "gcp"],
  AWS: ["aws", "amazon web services"],
};

export const SAMPLE_RESUME = `Name: Jordan Lee
Summary: Product-minded software engineer with 6+ years of experience building reliable web applications and leading delivery across cross-functional teams.
Experience:
- Senior Software Engineer, Bright Labs (2021-Present)
  - Built and shipped internal dashboards used by 20+ product teams.
  - Improved application reliability by 35% through better monitoring and release automation.
  - Partnered with design and product to deliver fast, user-friendly features.
- Software Engineer, Northstar Studio (2018-2021)
  - Developed React and Node.js features for customer-facing platforms.
  - Collaborated with QA and operations to launch releases on schedule.
Skills:
- JavaScript, TypeScript, React, Next.js, Node.js, SQL, REST APIs, CI/CD
Education:
- B.S. Computer Science, State University`;

function hasKeyword(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  let pos = lowerText.indexOf(lowerKeyword);
  while (pos !== -1) {
    let isValid = true;

    if (pos > 0) {
      const charBefore = lowerText[pos - 1];
      if (/[a-z0-9]/.test(charBefore) && /[a-z0-9]/.test(lowerKeyword[0])) {
        isValid = false;
      }
    }

    const posAfter = pos + lowerKeyword.length;
    if (posAfter < lowerText.length) {
      const charAfter = lowerText[posAfter];
      if (
        /[a-z0-9]/.test(charAfter) &&
        /[a-z0-9]/.test(lowerKeyword[lowerKeyword.length - 1])
      ) {
        isValid = false;
      }
    }

    if (isValid) return true;
    pos = lowerText.indexOf(lowerKeyword, pos + 1);
  }
  return false;
}

function hasKeywordOrAlias(text: string, keyword: string): boolean {
  if (hasKeyword(text, keyword)) return true;
  const aliases = KEYWORD_ALIASES[keyword];
  if (aliases) {
    for (const alias of aliases) {
      if (hasKeyword(text, alias)) return true;
    }
  }
  return false;
}

function extractKeywords(text: string, limit = 15): string[] {
  const found = new Set<string>();

  for (const keyword of TECH_AND_BUSINESS_DICTIONARY) {
    if (hasKeywordOrAlias(text, keyword)) {
      found.add(keyword);
    }
  }

  return Array.from(found).slice(0, limit);
}

export async function extractTextFromPdf(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const chunks: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    chunks.push(pageText);
  }

  return chunks.filter(Boolean).join("\n\n");
}

export async function extractTextFromFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return extractTextFromPdf(file);
    case "docx": {
      const ab = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: ab });
      return result.value;
    }
    case "doc":
    case "txt":
    case "md":
      return file.text();
    default:
      return file.text();
  }
}

export async function generatePreview(file: File): Promise<PreviewData> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "pdf": {
      const url = URL.createObjectURL(file);
      return { type: "pdf", url };
    }
    case "docx": {
      const ab = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: ab });
      return { type: "html", content: result.value };
    }
    case "doc": {
      try {
        const ab = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: ab });
        if (result.value.trim()) {
          return { type: "html", content: result.value };
        }
      } catch {
        // fall through to text
      }
      const text = await file.text();
      return { type: "text", content: text };
    }
    default: {
      const text = await file.text();
      return { type: "text", content: text };
    }
  }
}

export function buildAnalysis(resumeText: string, jobText: string): Analysis {
  const resumeLower = resumeText.toLowerCase();
  const jobKeywords = extractKeywords(jobText, 15);

  const matchedKeywords = jobKeywords.filter((kw) =>
    hasKeywordOrAlias(resumeText, kw),
  );

  const missingKeywords = jobKeywords.filter(
    (kw) => !matchedKeywords.includes(kw),
  );

  const keywordScore = jobKeywords.length
    ? Math.min(
        100,
        Math.round((matchedKeywords.length / jobKeywords.length) * 100),
      )
    : 0;

  const structureScore = Math.min(
    30,
    (resumeLower.includes("experience") ? 8 : 0) +
      (resumeLower.includes("skills") ? 8 : 0) +
      (resumeLower.includes("education") ? 6 : 0) +
      (/\d/.test(resumeText) ? 4 : 0) +
      (resumeText.split(/\n+/).filter(Boolean).length >= 4 ? 4 : 0),
  );

  const atsScore = Math.min(
    100,
    Math.round(keywordScore * 0.7 + structureScore),
  );
  const relevance = atsScore >= 80 ? "High" : atsScore >= 60 ? "Medium" : "Low";

  return {
    atsScore,
    relevance,
    keywordScore,
    matchedKeywords,
    missingKeywords,
    jobKeywords,
    structureScore,
    resumeWordCount: resumeText.trim().split(/\s+/).filter(Boolean).length,
    jobWordCount: jobText.trim().split(/\s+/).filter(Boolean).length,
  };
}

function joinKeywords(keywords: string[]) {
  if (keywords.length === 1) return keywords[0];
  if (keywords.length === 2) return `${keywords[0]} and ${keywords[1]}`;
  return `${keywords.slice(0, -1).join(", ")}, and ${keywords.at(-1)}`;
}

function insertIntoSummary(lines: string[], missingKeywords: string[]) {
  const summaryHeaders = [/^summary\s*:/i, /^objective\s*:/i];
  const summaryKeywordGroup = missingKeywords.slice(0, 3);
  const extraPhrase = `Skilled in ${joinKeywords(summaryKeywordGroup)}.`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (summaryHeaders.some((header) => header.test(line))) {
      if (/:/.test(line)) {
        return lines.map((current, index) =>
          index === i ? `${current.trim()} ${extraPhrase}` : current,
        );
      }

      if (i + 1 < lines.length) {
        return lines.map((current, index) =>
          index === i + 1 ? `${current.trim()} ${extraPhrase}` : current,
        );
      }
    }
  }

  return lines;
}

function insertIntoSkills(lines: string[], missingKeywords: string[]) {
  const result: string[] = [];
  let inserted = false;
  let i = 0;
  const sectionPattern =
    /^(experience|education|projects|certifications|qualifications|summary|objective|awards|publications|references)\b/i;

  while (i < lines.length) {
    const current = lines[i];
    const trimmed = current.trim().replace(/[:\-]/g, "").trim();

    result.push(current);

    if (!inserted && /^(skills|technical\s+skills|core\s+skills|key\s+skills)\b/i.test(trimmed)) {
      let j = i + 1;
      let added = false;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim().replace(/[:\-]/g, "").trim();
        if (nextTrimmed && sectionPattern.test(nextTrimmed)) break;

        if (!added && nextLine.trim()) {
          const keywordsText = missingKeywords.join(", ");
          if (nextLine.trim().startsWith("-")) {
            result.push(`${nextLine.trim()} ${keywordsText}`);
          } else {
            result.push(`${nextLine.trim()} ${keywordsText}`);
          }
          added = true;
        } else {
          result.push(nextLine);
        }

        j++;
      }

      if (!added) {
        result.push(`- ${missingKeywords.join(", ")}`);
      }

      inserted = true;
      i = j - 1;
    }

    i++;
  }

  if (!inserted) {
    result.push("", "Skills:", `- ${missingKeywords.join(", ")}`);
  }

  return result;
}

export function mergeKeywordsIntoResume(
  resumeText: string,
  missingKeywords: string[],
): string {
  if (missingKeywords.length === 0) return resumeText;

  const lines = resumeText.split("\n");
  let mergedLines = insertIntoSummary(lines, missingKeywords);
  mergedLines = insertIntoSkills(mergedLines, missingKeywords);
  return mergedLines.join("\n");
}

export function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function wrapPdfText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function createEnhancedPdfFromUpload(
  pdfBytes: ArrayBuffer,
  missingKeywords: string[],
) {
  const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];
  const { width } = page.getSize();
  const margin = 36;
  const fontSize = 8;
  const maxWidth = width - margin * 2;
  const keywordText = missingKeywords.length
    ? missingKeywords.join(", ")
    : "No missing keywords found.";
  const lines = wrapPdfText(keywordText, font, fontSize, maxWidth);
  const lineHeight = 10;
  const boxHeight = Math.max(34, 24 + lines.length * lineHeight);
  const y = margin;

  page.drawRectangle({
    x: margin - 6,
    y: y - 8,
    width: maxWidth + 12,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.74, 0.78, 0.86),
    borderWidth: 0.5,
    opacity: 0.96,
  });

  page.drawText("Additional ATS keywords", {
    x: margin,
    y: y + boxHeight - 17,
    size: 7.5,
    font: boldFont,
    color: rgb(0.1, 0.16, 0.28),
  });

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: margin,
      y: y + boxHeight - 30 - index * lineHeight,
      size: fontSize,
      font,
      color: rgb(0.12, 0.16, 0.24),
    });
  });

  const bytes = await pdfDoc.save();
  const blob = new Blob([toArrayBuffer(bytes)], { type: "application/pdf" });
  return { bytes, url: URL.createObjectURL(blob) };
}
