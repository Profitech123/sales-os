// Server-only utility: reads every deal Markdown file out of the second-brain
// and parses its YAML frontmatter into typed Deal objects for the dashboard.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface Deal {
  slug: string;
  company: string;
  leadName: string | null;
  leadScore: number | null;
  type: string;
  date: string;
  summary: string;
  nextSteps: string[];
  content: string;
}

// Repo layout: /frontend → ../second-brain/deals
const DEALS_DIR = path.resolve(process.cwd(), "..", "second-brain", "deals");

export function getDeals(): Deal[] {
  if (!fs.existsSync(DEALS_DIR)) return [];

  return fs
    .readdirSync(DEALS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(DEALS_DIR, file), "utf8");
      const { data, content } = matter(raw);

      return {
        slug: file.replace(/\.md$/, ""),
        company: String(data.company ?? "Unknown Company"),
        leadName: data.lead_name ? String(data.lead_name) : null,
        leadScore:
          typeof data.lead_score === "number" ? data.lead_score : null,
        type: String(data.type ?? "research"),
        date: String(data.date ?? ""),
        summary: String(data.summary ?? ""),
        nextSteps: Array.isArray(data.next_steps)
          ? data.next_steps.map(String)
          : [],
        content,
      } satisfies Deal;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
