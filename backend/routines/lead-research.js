// Daily lead-research routine (07:00).
// Scrapes a target LinkedIn profile via Apify, asks Claude for a sales brief
// with a lead score + 3 next steps, and files it into /second-brain/deals.
import fs from "node:fs/promises";
import path from "node:path";
import { ApifyClient } from "apify-client";
import { askClaudeForJson, BUSINESS_RULES } from "../lib/anthropic.js";
import { PATHS, slugify, todayStamp } from "../lib/paths.js";

const APIFY_ACTOR = "automation-lab/linkedin-profile-scraper";

const SYSTEM_PROMPT = `You are the lead-research engine of a Sales Operating System for a
retail-technology integrator. Given scraped LinkedIn profile data, produce a
sales brief that helps an account executive prepare outreach.

Respond with ONLY a valid JSON object — no prose, no markdown fences — with
exactly these keys:
{
  "company": "the lead's company name",
  "lead_name": "the person's full name",
  "lead_score": 0-100 integer scoring fit against our solution domains,
  "summary": "2-3 sentence intelligence summary: who they are, why they fit, timing signals",
  "next_steps": ["exactly", "three", "concrete recommended next steps"],
  "brief_markdown": "a fuller Markdown brief expanding on the summary and angle of attack"
}
${BUSINESS_RULES}`;

/** Run one research pass against the configured target profile. */
export async function runLeadResearch() {
  const targetUrl = process.env.TARGET_LINKEDIN_URL;
  if (!targetUrl) {
    console.warn("[lead-research] TARGET_LINKEDIN_URL not set — skipping run.");
    return null;
  }

  const apify = new ApifyClient({ token: process.env.APIFY_TOKEN });

  // 1. Scrape the profile.
  console.log(`[lead-research] scraping ${targetUrl}`);
  const run = await apify.actor(APIFY_ACTOR).call({
    profileUrls: [targetUrl],
  });
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  if (!items.length) {
    throw new Error("Apify returned no profile data.");
  }
  const profile = items[0];

  // 2. Turn raw profile JSON into an actionable brief.
  const brief = await askClaudeForJson({
    system: SYSTEM_PROMPT,
    user: `Scraped LinkedIn profile JSON:\n${JSON.stringify(profile, null, 2)}`,
  });

  // 3. Persist as Markdown + YAML frontmatter so the dashboard can render it.
  const stamp = todayStamp();
  const slug = slugify(brief.company ?? brief.lead_name ?? "lead");
  const filePath = path.join(PATHS.deals, `${stamp}-${slug}.md`);

  const nextStepsYaml = (brief.next_steps ?? [])
    .map((step) => `  - "${String(step).replace(/"/g, '\\"')}"`)
    .join("\n");

  await fs.writeFile(
    filePath,
    [
      "---",
      `company: "${brief.company}"`,
      `lead_name: "${brief.lead_name}"`,
      `lead_score: ${brief.lead_score}`,
      `type: research`,
      `date: ${stamp}`,
      `summary: "${String(brief.summary).replace(/"/g, '\\"')}"`,
      "next_steps:",
      nextStepsYaml,
      "---",
      "",
      brief.brief_markdown,
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(`[lead-research] brief saved → ${filePath}`);
  return filePath;
}
