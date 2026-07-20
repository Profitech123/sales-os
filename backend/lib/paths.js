// Central path resolution for the second-brain file store.
// Everything the backend produces lands inside these folders.
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { commitFile, isGitHubStoreConfigured } from "./github-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo layout: /backend/lib/paths.js → ../../second-brain
export const SECOND_BRAIN_ROOT = path.resolve(__dirname, "../../second-brain");

export const PATHS = {
  calls: path.join(SECOND_BRAIN_ROOT, "calls"),
  deals: path.join(SECOND_BRAIN_ROOT, "deals"),
  context: path.join(SECOND_BRAIN_ROOT, "context"),
  outbox: path.join(SECOND_BRAIN_ROOT, "outbox"),
};

/** Ensure every second-brain folder exists before we write to it (local fs mode only). */
export async function ensureSecondBrain() {
  await Promise.all(
    Object.values(PATHS).map((dir) => fs.mkdir(dir, { recursive: true }))
  );
}

/**
 * Save a second-brain file, choosing the right transport for where the
 * backend is running:
 *  - GITHUB_TOKEN + GITHUB_REPO set (Vercel serverless — no persistent disk)
 *    → commit the file straight to the repo via the GitHub Contents API.
 *  - otherwise (local dev, CI, a persistent host)
 *    → plain fs write under second-brain/<dirKey>/.
 *
 * Returns the path that was written — a repo-relative path in GitHub mode,
 * an absolute filesystem path otherwise.
 */
export async function saveSecondBrainFile({ dirKey, filename, content, commitMessage }) {
  if (isGitHubStoreConfigured()) {
    const repoRelativePath = `second-brain/${dirKey}/${filename}`;
    await commitFile(repoRelativePath, content, commitMessage ?? `Add ${filename}`);
    return repoRelativePath;
  }

  const dir = PATHS[dirKey];
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

/** Turn arbitrary text into a safe kebab-case filename fragment. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

/** ISO date (YYYY-MM-DD) used as a filename prefix so files sort by day. */
export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
