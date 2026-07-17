// Central path resolution for the second-brain file store.
// Everything the backend produces lands inside these folders.
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo layout: /backend/lib/paths.js → ../../second-brain
export const SECOND_BRAIN_ROOT = path.resolve(__dirname, "../../second-brain");

export const PATHS = {
  calls: path.join(SECOND_BRAIN_ROOT, "calls"),
  deals: path.join(SECOND_BRAIN_ROOT, "deals"),
  context: path.join(SECOND_BRAIN_ROOT, "context"),
  outbox: path.join(SECOND_BRAIN_ROOT, "outbox"),
};

/** Ensure every second-brain folder exists before we write to it. */
export async function ensureSecondBrain() {
  await Promise.all(
    Object.values(PATHS).map((dir) => fs.mkdir(dir, { recursive: true }))
  );
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
