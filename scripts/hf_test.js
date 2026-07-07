const fs = require("fs");

async function main() {
  const envRaw = fs.readFileSync(".env", "utf8");
  const m = envRaw.match(/HF_API_KEY=(.+)/);
  if (!m) {
    console.error("HF_API_KEY not found in .env");
    process.exit(1);
  }
  const HF_API_KEY = m[1].trim();
  const model = process.env.HF_MODEL || "google/flan-t5-large";

  const resumeText = `Name: Test\nSummary: Experienced dev with frontend background.\nSkills:\n- JavaScript`;
  const missingKeywords = ["Java", "SQL"];

  const prompt = `Rewrite the following plain-text resume so that the listed keywords are integrated naturally into the Skills section and supporting sections (summary, experience). Do not add meta commentary; produce the revised full resume text. Preserve the original structure.\\n\\nResume:\\n${resumeText}\\n\\nKeywords to integrate:\\n${missingKeywords.join(", ")}`;

  try {
    const resp = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 256, temperature: 0.2 },
        }),
      },
    );

    console.log("HF status", resp.status);
    const j = await resp.text();
    console.log(j);
  } catch (err) {
    console.error("Error calling HF:", err);
    process.exit(2);
  }
}

main();
