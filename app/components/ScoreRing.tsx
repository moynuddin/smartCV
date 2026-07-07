"use client";

import { useEffect, useState } from "react";

export function ScoreRing({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayed / 100) * circumference;

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const gradientId =
    score >= 80 ? "scoreHigh" : score >= 60 ? "scoreMid" : "scoreLow";

  return (
    <div className="relative" style={{ width: 144, height: 144 }}>
      <svg viewBox="0 0 128 128" className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="scoreHigh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="scoreMid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="scoreLow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />

        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="score-circle score-glow"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight">{displayed}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          ATS Score
        </span>
      </div>
    </div>
  );
}
