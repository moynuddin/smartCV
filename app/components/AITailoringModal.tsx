"use client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  missingKeywords: string[];
};

export function AITailoringModal({
  isOpen,
  onClose,
  onApply,
  missingKeywords,
}: Props) {
  if (!isOpen) return null;

  const hasMissingKeywords = missingKeywords.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="glass-strong w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">
              AI Resume Tailoring
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-100">
              {hasMissingKeywords
                ? "We’ll weave your keywords in naturally"
                : "No keyword gaps to fill"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-400 transition hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-slate-400">
          <p>
            {hasMissingKeywords
              ? "We’ll refine your resume so relevant terms appear naturally in skills and supporting sections."
              : "Your current resume already covers the target keywords well."}
          </p>

          {hasMissingKeywords && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Suggested keywords
              </p>
              <div className="flex flex-wrap gap-2">
                {missingKeywords.map((keyword) => (
                  <span key={keyword} className="badge-missing">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            {hasMissingKeywords ? "Cancel" : "Close"}
          </button>
          <button onClick={onApply} className="btn-primary">
            {hasMissingKeywords ? "Apply suggestions" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
