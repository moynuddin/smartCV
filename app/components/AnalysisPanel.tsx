import { ScoreRing } from "@/app/components/ScoreRing";
import type { Analysis } from "@/app/lib/resume-customizer";

type Props = {
  analysis: Analysis;
};

export function AnalysisPanel({ analysis }: Props) {
  return (
    <div className="glass-strong animate-slide-up space-y-6 p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreRing score={analysis.atsScore} />

        <div className="flex flex-1 flex-col gap-3">
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Relevance
            </p>
            <p
              className="mt-1 text-2xl font-bold"
              style={{
                color:
                  analysis.relevance === "High"
                    ? "#34d399"
                    : analysis.relevance === "Medium"
                      ? "#fbbf24"
                      : "#fb7185",
              }}
            >
              {analysis.relevance}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Keyword Match
            </p>
            <p className="mt-1 text-lg font-bold text-slate-300">
              {analysis.matchedKeywords.length} / {analysis.jobKeywords.length}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="section-label flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#34d399" }}
          />
          Matched Keywords
        </p>
        <div className="stagger mt-2 flex flex-wrap gap-2">
          {analysis.matchedKeywords.length ? (
            analysis.matchedKeywords.map((kw) => (
              <span key={kw} className="badge-matched">
                {kw}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No keyword overlap found yet.
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="section-label flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#fbbf24" }}
          />
          Missing — Add These
        </p>
        <div className="stagger mt-2 flex flex-wrap gap-2">
          {analysis.missingKeywords.length ? (
            analysis.missingKeywords.map((kw) => (
              <span key={kw} className="badge-missing">
                {kw}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Your resume already covers all key terms 🎉
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
