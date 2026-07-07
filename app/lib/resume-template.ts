export type ResumeLink = {
  label: string;
  url: string;
};

export type ResumeHeader = {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  links: ResumeLink[];
};

export type SkillGroup = {
  label: string;
  items: string[];
};

export type ExperienceItem = {
  title: string;
  company: string;
  location: string;
  dates: string;
  context: string;
  bullets: string[];
};

export type ProjectItem = {
  name: string;
  url: string;
  dates: string;
  bullets: string[];
};

export type EducationItem = {
  degree: string;
  school: string;
  location: string;
  dates: string;
};

export type TemplateResume = {
  header: ResumeHeader;
  summary: string;
  skills: SkillGroup[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  certifications: string[];
};

const DEFAULT_HEADER: ResumeHeader = {
  name: "Candidate Name",
  title: "Professional Resume",
  location: "",
  email: "",
  phone: "",
  links: [],
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).filter(Boolean)
    : [];
}

function normalizeLinks(value: unknown): ResumeLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((link) => {
      if (typeof link === "string") {
        return { label: link.trim(), url: link.trim() };
      }

      if (!link || typeof link !== "object") return null;
      const record = link as Record<string, unknown>;
      const label = asString(record.label) || asString(record.url);
      const url = asString(record.url) || label;
      return label ? { label, url } : null;
    })
    .filter((link): link is ResumeLink => Boolean(link));
}

export function normalizeTemplateResume(value: unknown): TemplateResume {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const headerRoot =
    root.header && typeof root.header === "object"
      ? (root.header as Record<string, unknown>)
      : {};

  const header: ResumeHeader = {
    name: asString(headerRoot.name) || DEFAULT_HEADER.name,
    title: asString(headerRoot.title) || DEFAULT_HEADER.title,
    location: asString(headerRoot.location),
    email: asString(headerRoot.email),
    phone: asString(headerRoot.phone),
    links: normalizeLinks(headerRoot.links),
  };

  const skills = Array.isArray(root.skills)
    ? root.skills
        .map((group) => {
          if (!group || typeof group !== "object") return null;
          const record = group as Record<string, unknown>;
          const label = asString(record.label);
          const items = asStringArray(record.items);
          return label && items.length ? { label, items } : null;
        })
        .filter((group): group is SkillGroup => Boolean(group))
    : [];

  const experience = Array.isArray(root.experience)
    ? root.experience
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const title = asString(record.title);
          const company = asString(record.company);
          const bullets = asStringArray(record.bullets);
          if (!title && !company && bullets.length === 0) return null;
          return {
            title: title || "Role",
            company,
            location: asString(record.location),
            dates: asString(record.dates),
            context: asString(record.context),
            bullets,
          };
        })
        .filter((item): item is ExperienceItem => Boolean(item))
    : [];

  const projects = Array.isArray(root.projects)
    ? root.projects
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const name = asString(record.name);
          const bullets = asStringArray(record.bullets);
          if (!name && bullets.length === 0) return null;
          return {
            name: name || "Project",
            url: asString(record.url),
            dates: asString(record.dates),
            bullets,
          };
        })
        .filter((item): item is ProjectItem => Boolean(item))
    : [];

  const education = Array.isArray(root.education)
    ? root.education
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const degree = asString(record.degree);
          const school = asString(record.school);
          if (!degree && !school) return null;
          return {
            degree: degree || "Education",
            school,
            location: asString(record.location),
            dates: asString(record.dates),
          };
        })
        .filter((item): item is EducationItem => Boolean(item))
    : [];

  return {
    header,
    summary: asString(root.summary),
    skills,
    experience,
    projects,
    education,
    certifications: asStringArray(root.certifications),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeLatex(value: string): string {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function hrefFor(link: ResumeLink): string {
  if (/^https?:\/\//i.test(link.url) || /^mailto:/i.test(link.url)) return link.url;
  if (link.url.includes("@")) return `mailto:${link.url}`;
  return `https://${link.url}`;
}

function linesForHeader(header: ResumeHeader): string[] {
  return [
    header.name,
    header.title,
    [header.location, header.email, header.phone].filter(Boolean).join(" - "),
    header.links.map((link) => link.label).filter(Boolean).join(" - "),
  ].filter(Boolean);
}

export function renderResumePlainText(resume: TemplateResume): string {
  const sections: string[] = [];
  sections.push(linesForHeader(resume.header).join("\n"));

  if (resume.summary) {
    sections.push(`Professional Summary\n${resume.summary}`);
  }

  if (resume.skills.length) {
    sections.push(
      `Technical Skills\n${resume.skills
        .map((group) => `${group.label}: ${group.items.join(", ")}`)
        .join("\n")}`,
    );
  }

  if (resume.experience.length) {
    sections.push(
      `Professional Experience\n${resume.experience
        .map((item) => {
          const heading = [item.title, item.dates].filter(Boolean).join(" - ");
          const company = [item.company, item.location].filter(Boolean).join(" - ");
          const body = [heading, company, item.context, ...item.bullets.map((b) => `- ${b}`)]
            .filter(Boolean)
            .join("\n");
          return body;
        })
        .join("\n\n")}`,
    );
  }

  if (resume.projects.length) {
    sections.push(
      `Projects\n${resume.projects
        .map((project) => {
          const heading = [project.name, project.dates || project.url].filter(Boolean).join(" - ");
          return [heading, ...project.bullets.map((b) => `- ${b}`)].join("\n");
        })
        .join("\n\n")}`,
    );
  }

  if (resume.education.length) {
    sections.push(
      `Education\n${resume.education
        .map((item) =>
          [
            [item.degree, item.dates].filter(Boolean).join(" - "),
            [item.school, item.location].filter(Boolean).join(" - "),
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n\n")}`,
    );
  }

  if (resume.certifications.length) {
    sections.push(`Certifications and Achievements\n${resume.certifications.map((item) => `- ${item}`).join("\n")}`);
  }

  return sections.filter(Boolean).join("\n\n");
}

export function renderResumeHtml(resume: TemplateResume): string {
  const contact = [resume.header.location, resume.header.email, resume.header.phone]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" <span>|</span> ");
  const links = resume.header.links
    .map((link) => `<a href="${escapeHtml(hrefFor(link))}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`)
    .join(" <span>|</span> ");

  const section = (title: string, body: string) =>
    body.trim()
      ? `<section class="template-resume-section"><h2>${escapeHtml(title)}</h2>${body}</section>`
      : "";

  return `<article class="template-resume">
    <header class="template-resume-header">
      <h1>${escapeHtml(resume.header.name)}</h1>
      <p class="template-resume-title">${escapeHtml(resume.header.title)}</p>
      ${contact ? `<p>${contact}</p>` : ""}
      ${links ? `<p>${links}</p>` : ""}
    </header>
    ${section("Professional Summary", resume.summary ? `<p>${escapeHtml(resume.summary)}</p>` : "")}
    ${section(
      "Technical Skills",
      resume.skills
        .map((group) => `<p><strong>${escapeHtml(group.label)}:</strong> ${escapeHtml(group.items.join(", "))}</p>`)
        .join(""),
    )}
    ${section(
      "Professional Experience",
      resume.experience
        .map(
          (item) => `<div class="template-resume-entry">
            <div class="template-resume-row"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.dates)}</span></div>
            <div class="template-resume-row muted"><em>${escapeHtml(item.company)}</em><span><em>${escapeHtml(item.location)}</em></span></div>
            ${item.context ? `<p><strong>${escapeHtml(item.context)}</strong></p>` : ""}
            ${item.bullets.length ? `<ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
          </div>`,
        )
        .join(""),
    )}
    ${section(
      "AI and Side Projects",
      resume.projects
        .map(
          (project) => `<div class="template-resume-entry">
            <div class="template-resume-row"><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(project.dates || project.url || "")}</span></div>
            ${project.bullets.length ? `<ul>${project.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
          </div>`,
        )
        .join(""),
    )}
    ${section(
      "Education",
      resume.education
        .map(
          (item) => `<p><strong>${escapeHtml(item.degree)}</strong>${item.dates ? ` <span class="template-resume-date">${escapeHtml(item.dates)}</span>` : ""}<br />${escapeHtml([item.school, item.location].filter(Boolean).join(" - "))}</p>`,
        )
        .join(""),
    )}
    ${section(
      "Certifications and Achievements",
      resume.certifications.length
        ? `<ul>${resume.certifications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : "",
    )}
  </article>`;
}

export function renderResumeLatex(resume: TemplateResume): string {
  const contact = [resume.header.location, resume.header.email, resume.header.phone]
    .filter(Boolean)
    .map(escapeLatex)
    .join(" \\quad | \\quad\n    ");
  const links = resume.header.links
    .map((link) => `\\href{${hrefFor(link)}}{${escapeLatex(link.label)}}`)
    .join("\n    \\quad | \\quad\n    ");

  const skills = resume.skills
    .map((group) => `\\textbf{${escapeLatex(group.label)}:} ${escapeLatex(group.items.join(", "))} \\\\`)
    .join("\n\n");

  const experience = resume.experience
    .map((item) => `\\resumeSubheading
{${escapeLatex(item.title)}}
{${escapeLatex(item.dates)}}
{${escapeLatex(item.company)}}
{${escapeLatex(item.location)}}
${item.context ? `\n\\vspace{3pt}\n\n\\textbf{${escapeLatex(item.context)}}\n` : ""}
${item.bullets.length ? `\n\\begin{itemize}\n${item.bullets.map((bullet) => `    \\item ${escapeLatex(bullet)}`).join("\n")}\n\\end{itemize}` : ""}`)
    .join("\n\n\\vspace{4pt}\n\n");

  const projects = resume.projects
    .map((project) => `\\projectHeading{${escapeLatex(project.name)}}{${escapeLatex(project.dates || project.url || "")}}
${project.bullets.length ? `\n\\begin{itemize}\n${project.bullets.map((bullet) => `    \\item ${escapeLatex(bullet)}`).join("\n")}\n\\end{itemize}` : ""}`)
    .join("\n\n\\vspace{4pt}\n\n");

  const education = resume.education
    .map((item) => `\\textbf{${escapeLatex(item.degree)}}${item.dates ? ` \\hfill ${escapeLatex(item.dates)}` : ""} \\\\
${escapeLatex([item.school, item.location].filter(Boolean).join(", "))}`)
    .join("\n\n");

  const certifications = resume.certifications.length
    ? `\\begin{itemize}\n${resume.certifications.map((item) => `    \\item ${escapeLatex(item)}`).join("\n")}\n\\end{itemize}`
    : "";

  return `\\documentclass[10pt,a4paper]{article}

% ---------- Packages ----------
\\usepackage[margin=0.65in]{geometry}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[none]{hyphenat}
\\usepackage{parskip}

% ---------- ATS Friendly Formatting ----------
\\sloppy
\\setlength{\\parindent}{0pt}
\\setlist[itemize]{leftmargin=*, noitemsep, topsep=2pt}

\\titleformat{\\section}
  {\\large\\bfseries}
  {}
  {0em}
  {}
  [\\titlerule]

\\titlespacing{\\section}{0pt}{8pt}{5pt}

\\newcommand{\\resumeSubheading}[4]{
  \\textbf{#1} \\hfill #2 \\\\
  \\textit{#3} \\hfill \\textit{#4}
}

\\newcommand{\\projectHeading}[2]{
  \\textbf{#1} \\hfill #2
}

% ---------- Document ----------
\\begin{document}

% ---------- Header ----------
\\begin{center}
    {\\Huge \\textbf{${escapeLatex(resume.header.name)}}} \\\\
    \\vspace{3pt}
    \\textbf{${escapeLatex(resume.header.title)}} \\\\
    \\vspace{5pt}
    ${contact}${contact && links ? " \\\\\n    " : ""}${links}
\\end{center}

% ---------- Summary ----------
\\section*{Professional Summary}

${escapeLatex(resume.summary)}

% ---------- Skills ----------
\\section*{Technical Skills}

${skills}

% ---------- Experience ----------
\\section*{Professional Experience}

${experience}

${projects ? `% ---------- Projects ----------\n\\section*{AI and Side Projects}\n\n${projects}\n\n` : ""}% ---------- Education ----------
\\section*{Education}

${education}

${certifications ? `% ---------- Certifications ----------\n\\section*{Certifications and Achievements}\n\n${certifications}\n\n` : ""}\\end{document}
`;
}