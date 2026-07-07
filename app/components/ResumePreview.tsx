"use client";

import type { PreviewData } from "@/app/lib/resume-customizer";

export function ResumePreview({ data }: { data: PreviewData }) {
  switch (data.type) {
    case "pdf":
      return (
        <div className="preview-frame" style={{ height: 520 }}>
          <iframe src={data.url} title="Resume PDF Preview" />
        </div>
      );
    case "html":
      return (
        <div className="preview-frame">
          <div
            className="preview-html"
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        </div>
      );
    case "text":
      return (
        <div className="preview-frame">
          <pre className="preview-text">{data.content}</pre>
        </div>
      );
  }
}
