export function ResumeHero() {
  return (
    <section className="glass-strong animate-slide-up p-8 sm:p-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="file-chip mb-4 inline-flex text-xs">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
            ATS Resume Customizer
          </span>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Tailor your resume to{" "}
            <span className="gradient-text">every job description</span>
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Upload your resume, paste a job description, and instantly see your
            ATS score, missing keywords, and an enhanced version of your resume
            with the gaps filled.
          </p>
        </div>

        <div className="glass shrink-0 rounded-2xl p-5 text-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
            How it works
          </p>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400">①</span>
              Upload your resume (PDF, DOCX, DOC, TXT)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400">②</span>
              Paste the target job description
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400">③</span>
              Get your ATS score &amp; missing keywords
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400">④</span>
              Download an enhanced, ATS-aligned resume
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
