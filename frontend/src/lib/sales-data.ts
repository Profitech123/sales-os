// Server-only utility: reads every deal Markdown file out of the second-brain
// and parses its YAML frontmatter into typed Deal objects for the dashboard.
//
// Two transports:
//  - GITHUB_TOKEN + GITHUB_REPO set (Vercel deployment): fetch deal files
//    live from the GitHub Contents API. This is required because the
//    backend runs as stateless Vercel functions with no persistent disk —
//    it commits generated files straight to the repo (see
//    backend/lib/github-store.js) instead of writing local files, so the
//    frontend has to read them the same way to see anything it writes.
//  - otherwise (local dev, CI, a persistent host): read second-brain/deals
//    off the local filesystem, same disk the backend writes to.
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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // "owner/repo"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? "main";
const GITHUB_API = "https://api.github.com";

function parseDeal(slug: string, data: Record<string, unknown>, content: string): Deal {
  return {
    slug,
    company: String(data.company ?? "Unknown Company"),
    leadName: data.lead_name ? String(data.lead_name) : null,
    leadScore: typeof data.lead_score === "number" ? data.lead_score : null,
    type: String(data.type ?? "research"),
    date: String(data.date ?? ""),
    summary: String(data.summary ?? ""),
    nextSteps: Array.isArray(data.next_steps) ? data.next_steps.map(String) : [],
    content,
  };
}

function getDealsFromDisk(): Deal[] {
  if (!fs.existsSync(DEALS_DIR)) return [];

  return fs
    .readdirSync(DEALS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(DEALS_DIR, file), "utf8");
      const { data, content } = matter(raw);
      return parseDeal(file.replace(/\.md$/, ""), data, content);
    });
}

function githubHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getDealsFromGitHub(): Promise<Deal[]> {
  const listUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/second-brain/deals?ref=${GITHUB_BRANCH}`;
  const listRes = await fetch(listUrl, { headers: githubHeaders(), cache: "no-store" });
  if (!listRes.ok) {
    console.error(`[sales-data] GitHub directory listing failed: ${listRes.status}`);
    return [];
  }

  const entries: Array<{ name: string; path: string }> = await listRes.json();
  const mdFiles = entries.filter((entry) => entry.name.endsWith(".md"));

  const deals = await Promise.all(
    mdFiles.map(async (entry) => {
      const fileRes = await fetch(
        `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${entry.path}?ref=${GITHUB_BRANCH}`,
        { headers: githubHeaders(), cache: "no-store" }
      );
      if (!fileRes.ok) return null;

      const fileJson = await fileRes.json();
      const raw = Buffer.from(fileJson.content, "base64").toString("utf8");
      const { data, content } = matter(raw);
      return parseDeal(entry.name.replace(/\.md$/, ""), data, content);
    })
  );

  return deals.filter((deal): deal is Deal => deal !== null);
}

export async function getDeals(): Promise<Deal[]> {
  const deals =
    GITHUB_TOKEN && GITHUB_REPO ? await getDealsFromGitHub() : getDealsFromDisk();

  return deals.sort((a, b) => b.date.localeCompare(a.date));
}
