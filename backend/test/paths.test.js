import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, todayStamp, PATHS, SECOND_BRAIN_ROOT } from "../lib/paths.js";

test("slugify lowercases and kebab-cases text", () => {
  assert.equal(slugify("QuickServe Drive-Ins"), "quickserve-drive-ins");
});

test("slugify strips non-alphanumeric characters", () => {
  assert.equal(slugify("Acme & Co. (Pilot)!!"), "acme-co-pilot");
});

test("slugify falls back to 'untitled' for empty input", () => {
  assert.equal(slugify("   "), "untitled");
  assert.equal(slugify("***"), "untitled");
});

test("slugify truncates to 80 characters", () => {
  const long = "a".repeat(200);
  assert.ok(slugify(long).length <= 80);
});

test("todayStamp returns an ISO date (YYYY-MM-DD)", () => {
  assert.match(todayStamp(), /^\d{4}-\d{2}-\d{2}$/);
});

test("PATHS point inside the second-brain root", () => {
  for (const dir of Object.values(PATHS)) {
    assert.ok(dir.startsWith(SECOND_BRAIN_ROOT));
  }
});
