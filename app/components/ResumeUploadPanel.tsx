import type { ChangeEvent, DragEvent, RefObject } from "react";

type Props = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  isProcessing: boolean;
  statusMessage: string;
  fileName: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
};

export function ResumeUploadPanel({
  fileInputRef,
  isDragging,
  isProcessing,
  statusMessage,
  fileName,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  return (
    <div
      className={`drop-zone relative p-6 ${isDragging ? "dragging" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md"
        onChange={onFileChange}
        className="hidden"
        id="resume-upload"
      />

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-indigo-400"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-300">
            {isDragging
              ? "Drop your resume here"
              : "Drag & drop your resume here"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            or click to browse · PDF, DOCX, DOC, TXT, MD
          </p>
        </div>

        {fileName !== "sample-resume.txt" && (
          <span className="file-chip mt-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {fileName}
          </span>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-slate-600">
        {isProcessing ? "Processing…" : statusMessage}
      </p>
    </div>
  );
}
