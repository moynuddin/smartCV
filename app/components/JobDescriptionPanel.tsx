type Props = {
  jobDescription: string;
  onChange: (value: string) => void;
};

export function JobDescriptionPanel({ jobDescription, onChange }: Props) {
  return (
    <div className="glass p-5">
      <p className="section-label">Job Description</p>
      <textarea
        value={jobDescription}
        onChange={(event) => onChange(event.target.value)}
        rows={8}
        className="jd-textarea"
        placeholder="Paste the target job description here…"
        id="jd-input"
      />
    </div>
  );
}
