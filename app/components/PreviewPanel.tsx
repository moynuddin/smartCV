import { ResumePreview } from "@/app/components/ResumePreview";
import type { PreviewData } from "@/app/lib/resume-customizer";

type Props = {
  activeTab: "original" | "enhanced";
  onTabChange: (tab: "original" | "enhanced") => void;
  previewData: PreviewData;
  originalPreviewLabel: string;
  enhancedPreviewData: PreviewData;
  enhancedResumeText: string | null;
  onEnhancedResumeChange: (value: string) => void;
  disabled: boolean;
};

export function PreviewPanel({
  activeTab,
  onTabChange,
  previewData,
  originalPreviewLabel,
  enhancedPreviewData,
  enhancedResumeText,
  onEnhancedResumeChange,
  disabled,
}: Props) {
  const isEnhancedTextPreview = enhancedPreviewData.type === "text";

  return (
    <div
      className="flex flex-col gap-5 animate-slide-up"
      style={{ animationDelay: "0.2s" }}
    >
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === "original" ? "active" : ""}`}
          onClick={() => onTabChange("original")}
        >
          Original Preview
        </button>
        <button
          className={`tab-btn ${activeTab === "enhanced" ? "active" : ""}`}
          onClick={() => onTabChange("enhanced")}
          disabled={disabled}
        >
          Enhanced Template
        </button>
      </div>

      <div className="glass p-5">
        {activeTab === "original" ? (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <p className="section-label mb-0">Resume Preview</p>
              <span className="text-xs text-slate-600">
                {originalPreviewLabel}
              </span>
            </div>
            <div className="max-h-145 overflow-auto rounded-xl">
              <ResumePreview data={previewData} />
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <p className="section-label mb-0">Enhanced Resume</p>
              <span className="text-xs text-slate-600">
                {isEnhancedTextPreview
                  ? "Text fallback"
                  : "Mapped to sample_resume.tex"}
              </span>
            </div>
            <div className="max-h-105 overflow-auto rounded-xl">
              <ResumePreview data={enhancedPreviewData} />
            </div>
            {isEnhancedTextPreview && (
              <textarea
                value={enhancedResumeText ?? ""}
                onChange={(event) => onEnhancedResumeChange(event.target.value)}
                className="enhanced-textarea mt-4"
                rows={12}
                id="enhanced-resume"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}