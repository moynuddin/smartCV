"use client";

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import { AITailoringModal } from "@/app/components/AITailoringModal";
import { AnalysisPanel } from "@/app/components/AnalysisPanel";
import { JobDescriptionPanel } from "@/app/components/JobDescriptionPanel";
import { PreviewPanel } from "@/app/components/PreviewPanel";
import { ResumeHero } from "@/app/components/ResumeHero";
import { ResumeUploadPanel } from "@/app/components/ResumeUploadPanel";
import {
  SAMPLE_RESUME,
  type Analysis,
  type PreviewData,
  type ResumeSource,
  buildAnalysis,
  extractTextFromFile,
  generatePreview,
} from "@/app/lib/resume-customizer";
import {
  type TemplateResume,
  renderResumePlainText,
} from "@/app/lib/resume-template";

type DownloadFormat = "pdf" | "docx" | "tex";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function safeDownloadName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "enhanced-resume";
}

function buildTemplateDocx(resume: TemplateResume) {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: "center",
      children: [new TextRun({ text: resume.header.name, bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: "center",
      children: [new TextRun({ text: resume.header.title, bold: true })],
    }),
    new Paragraph({
      alignment: "center",
      text: [resume.header.location, resume.header.email, resume.header.phone]
        .filter(Boolean)
        .join(" | "),
    }),
    new Paragraph({
      alignment: "center",
      text: resume.header.links.map((link) => link.label).join(" | "),
    }),
  ];

  const heading = (text: string) => children.push(new Paragraph({ text, heading: "Heading2" }));
  const bullet = (text: string) => children.push(new Paragraph({ text, bullet: { level: 0 } }));

  if (resume.summary) {
    heading("Professional Summary");
    children.push(new Paragraph(resume.summary));
  }

  if (resume.skills.length) {
    heading("Technical Skills");
    resume.skills.forEach((group) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${group.label}: `, bold: true }),
            new TextRun(group.items.join(", ")),
          ],
        }),
      );
    });
  }

  if (resume.experience.length) {
    heading("Professional Experience");
    resume.experience.forEach((item) => {
      children.push(new Paragraph({ children: [new TextRun({ text: `${item.title} ${item.dates ? `- ${item.dates}` : ""}`, bold: true })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: [item.company, item.location].filter(Boolean).join(" - "), italics: true })] }));
      if (item.context) children.push(new Paragraph({ children: [new TextRun({ text: item.context, bold: true })] }));
      item.bullets.forEach(bullet);
    });
  }

  if (resume.projects.length) {
    heading("AI and Side Projects");
    resume.projects.forEach((project) => {
      children.push(new Paragraph({ children: [new TextRun({ text: [project.name, project.dates || project.url].filter(Boolean).join(" - "), bold: true })] }));
      project.bullets.forEach(bullet);
    });
  }

  if (resume.education.length) {
    heading("Education");
    resume.education.forEach((item) => {
      children.push(new Paragraph({ children: [new TextRun({ text: [item.degree, item.dates].filter(Boolean).join(" - "), bold: true })] }));
      children.push(new Paragraph([item.school, item.location].filter(Boolean).join(" - ")));
    });
  }

  if (resume.certifications.length) {
    heading("Certifications and Achievements");
    resume.certifications.forEach(bullet);
  }

  return new DocxDocument({ sections: [{ properties: {}, children }] });
}

export function ResumeCustomizer() {
  const [originalResumeText, setOriginalResumeText] = useState(SAMPLE_RESUME);
  const [enhancedResumeText, setEnhancedResumeText] = useState<string | null>(
    null,
  );
  const [enhancedPreviewData, setEnhancedPreviewData] =
    useState<PreviewData | null>(null);
  const [enhancedTemplateResume, setEnhancedTemplateResume] =
    useState<TemplateResume | null>(null);
  const [enhancedLatex, setEnhancedLatex] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData>({
    type: "text",
    content: "",
  });
  const [fileName, setFileName] = useState("sample-resume.txt");
  const [resumeSource, setResumeSource] = useState<ResumeSource>("sample");
  const [statusMessage, setStatusMessage] = useState(
    "Upload a PDF, Word, TXT, or MD resume to get started.",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTailoringModalOpen, setIsTailoringModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"original" | "enhanced">(
    "original",
  );

  const pdfUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasResumeText = originalResumeText.trim().length > 0;
  const downloadResumeText = enhancedResumeText ?? originalResumeText;
  const canDownloadResume = downloadResumeText.trim().length > 0;
  const originalPreviewLabel =
    resumeSource === "upload"
      ? "Showing your uploaded resume"
      : "Showing the sample resume";
  const activeEnhancedPreview: PreviewData =
    enhancedPreviewData ?? { type: "text", content: enhancedResumeText ?? "" };
  const shouldShowPreview = resumeSource === "upload" && hasResumeText;

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setResumeSource("upload");
    setOriginalResumeText("");
    setIsProcessing(true);
    setStatusMessage(`Reading ${file.name}...`);
    setAnalysis(null);
    setEnhancedResumeText(null);
    setEnhancedPreviewData(null);
    setEnhancedTemplateResume(null);
    setEnhancedLatex(null);
    setActiveTab("original");

    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }

    let preview: PreviewData | null = null;

    try {
      preview = await generatePreview(file);
      if (preview.type === "pdf") pdfUrlRef.current = preview.url;
      setPreviewData(preview);
    } catch {
      setPreviewData({ type: "text", content: "" });
    }

    try {
      const extractedText = (await extractTextFromFile(file)).trim();
      if (!extractedText) {
        throw new Error("No readable resume text found.");
      }

      setOriginalResumeText(extractedText);
      if (!preview) setPreviewData({ type: "text", content: extractedText });
      setStatusMessage(`Loaded ${file.name} successfully.`);
    } catch {
      setOriginalResumeText("");
      setAnalysis(null);
      setStatusMessage(
        preview
          ? `Preview loaded, but text could not be extracted from ${file.name}. Try exporting it as a text-based PDF or DOCX.`
          : `Could not read ${file.name}. Try a PDF, DOCX, DOC, TXT, or MD file.`,
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleAnalyze = () => {
    if (!hasResumeText) return;
    const result = buildAnalysis(originalResumeText, jobDescription);
    setAnalysis(result);
  };

  const handleOpenTailoringModal = () => {
    if (!analysis || !hasResumeText) return;
    setIsTailoringModalOpen(true);
  };

  const handleApplyTailoring = async () => {
    if (!analysis || !hasResumeText) return;
    setIsProcessing(true);
    setStatusMessage("Parsing, tailoring, and mapping resume to the LaTeX template...");

    try {
      const resp = await fetch("/api/hf-merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: originalResumeText,
          missingKeywords: analysis.missingKeywords,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const errMsg =
          data?.error || `Hugging Face merge failed (status ${resp.status})`;
        setStatusMessage(`Hugging Face error: ${errMsg}`);
        return;
      }

      if (!data?.merged || typeof data.merged !== "string") {
        setStatusMessage("Hugging Face returned no merged resume text.");
        return;
      }

      setEnhancedResumeText(data.merged);
      setEnhancedTemplateResume(data.resume ?? null);
      setEnhancedLatex(typeof data.latex === "string" ? data.latex : null);
      setEnhancedPreviewData(
        typeof data.html === "string"
          ? { type: "html", content: data.html }
          : { type: "text", content: data.merged },
      );
      setStatusMessage(
        `Mapped your enhanced resume onto the LaTeX template with ${analysis.missingKeywords.length} missing keyword${
          analysis.missingKeywords.length === 1 ? "" : "s"
        } integrated.`,
      );

      setActiveTab("enhanced");
      setIsTailoringModalOpen(false);
    } catch (err) {
      setStatusMessage(`Error calling Hugging Face: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreOriginal = () => {
    setEnhancedResumeText(null);
    setEnhancedPreviewData(null);
    setEnhancedTemplateResume(null);
    setEnhancedLatex(null);
    setActiveTab("original");
  };

  const handleDownloadResume = async (format: DownloadFormat) => {
    const text = enhancedTemplateResume
      ? renderResumePlainText(enhancedTemplateResume)
      : downloadResumeText;
    if (!text.trim()) return;

    if (format === "tex") {
      if (!enhancedLatex) return;
      downloadBlob(
        new Blob([enhancedLatex], { type: "text/x-tex;charset=utf-8" }),
        `${safeDownloadName(fileName)}-enhanced.tex`,
      );
      return;
    }

    if (format === "pdf" && enhancedLatex) {
      setIsProcessing(true);
      setStatusMessage("Compiling PDF from the LaTeX template...");

      try {
        const resp = await fetch("/api/render-resume-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latex: enhancedLatex, fileName }),
        });

        if (!resp.ok) {
          const result = await resp.json().catch(() => ({}));
          setStatusMessage(
            `LaTeX PDF compile failed: ${result?.error ?? resp.statusText} ${result?.details ?? ""}`,
          );
          return;
        }

        const blob = await resp.blob();
        downloadBlob(blob, `${safeDownloadName(fileName)}-enhanced.pdf`);
        setStatusMessage("Downloaded the LaTeX-compiled enhanced PDF.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }


    if (format === "docx" && enhancedTemplateResume) {
      const blob = await Packer.toBlob(buildTemplateDocx(enhancedTemplateResume));
      downloadBlob(blob, `${safeDownloadName(fileName)}-enhanced.docx`);
      return;
    }

    if (format === "docx") {
      const doc = new DocxDocument({
        sections: [
          {
            properties: {},
            children: text
              .split(/\n/)
              .map((line) => new Paragraph(line || " ")),
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, "updated-resume.docx");
      return;
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <ResumeHero />

        <AITailoringModal
          isOpen={isTailoringModalOpen}
          onClose={() => setIsTailoringModalOpen(false)}
          onApply={() => void handleApplyTailoring()}
          missingKeywords={analysis?.missingKeywords ?? []}
        />

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div
            className="flex flex-col gap-6 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <ResumeUploadPanel
              fileInputRef={fileInputRef}
              isDragging={isDragging}
              isProcessing={isProcessing}
              statusMessage={statusMessage}
              fileName={fileName}
              onFileChange={(e) => void handleFileUpload(e)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => void handleDrop(e)}
            />

            <JobDescriptionPanel
              jobDescription={jobDescription}
              onChange={setJobDescription}
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAnalyze}
                disabled={!hasResumeText || isProcessing}
                className="btn-primary"
                id="analyze-btn"
              >
                Analyze Resume Fit
              </button>
              <button
                onClick={handleOpenTailoringModal}
                disabled={!analysis || !hasResumeText}
                className="btn-secondary"
                id="merge-btn"
              >
                AI Tailor Resume
              </button>
              <button
                onClick={handleRestoreOriginal}
                className="btn-secondary"
                id="restore-btn"
              >
                Restore Original
              </button>
            </div>

            {analysis && <AnalysisPanel analysis={analysis} />}
          </div>

          <div className="flex flex-col gap-5">
            {shouldShowPreview && (
              <>
                <PreviewPanel
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  previewData={previewData}
                  originalPreviewLabel={originalPreviewLabel}
                  enhancedPreviewData={activeEnhancedPreview}
                  enhancedResumeText={enhancedResumeText}
                  onEnhancedResumeChange={setEnhancedResumeText}
                  disabled={!enhancedResumeText && !enhancedPreviewData}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => void handleDownloadResume("pdf")}
                    disabled={!enhancedLatex || isProcessing}
                    className="btn-download"
                    id="download-pdf"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => void handleDownloadResume("docx")}
                    disabled={!canDownloadResume}
                    className="btn-download"
                    id="download-docx"
                  >
                    Download DOCX
                  </button>
                  <button
                    onClick={() => void handleDownloadResume("tex")}
                    disabled={!enhancedLatex}
                    className="btn-download"
                    id="download-tex"
                  >
                    Download LaTeX
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}