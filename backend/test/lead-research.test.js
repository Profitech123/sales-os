import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  runLeadResearch,
  __setTestScraper,
} from "../routines/lead-research.js";
import { __setTestTransport } from "../lib/anthropic.js";
import { ensureSecondBrain } from "../lib/paths.js";
import {
  FAKE_LEAD_RESEARCH_RESPONSE,
  FAKE_LINKEDIN_PROFILE,
  fakeTransport,
} from "./fixtures.js";

test("runLeadResearch skips when TARGET_LINKEDIN_URL is not set", async (t) => {
  const original = process.env.TARGET_LINKEDIN_URL;
  delete process.env.TARGET_LINKEDIN_URL;
  t.after(() => {
    if (original) process.env.TARGET_LINKEDIN_URL = original;
  });

  const result = await runLeadResearch();
  assert.equal(result, null);
});

test("runLeadResearch scrapes, briefs, and saves a Markdown file", async (t) => {
  await ensureSecondBrain();

  process.env.TARGET_LINKEDIN_URL = "https://www.linkedin.com/in/test-lead/";
  t.after(() => delete process.env.TARGET_LINKEDIN_URL);

  __setTestScraper(async () => FAKE_LINKEDIN_PROFILE);
  t.after(() => __setTestScraper(null));

  __setTestTransport(fakeTransport(FAKE_LEAD_RESEARCH_RESPONSE));
  t.after(() => __setTestTransport(null));

  const filePath = await runLeadResearch();
  assert.ok(filePath, "expected a file path to be returned");

  const content = await fs.readFile(filePath, "utf8");
  assert.match(content, /company: "Test Retail Co"/);
  assert.match(content, /lead_score: 76/);
  assert.match(content, /next_steps:/);
  assert.match(content, /Send teaser deck on ANPR displays/);
  assert.doesNotMatch(content, /Phase 3: Growth \(Months 5-6\)/);

  t.after(() => fs.rm(filePath, { force: true }));
});

test("runLeadResearch throws if the AI response is missing", async (t) => {
  process.env.TARGET_LINKEDIN_URL = "https://www.linkedin.com/in/test-lead/";
  t.after(() => delete process.env.TARGET_LINKEDIN_URL);

  __setTestScraper(async () => FAKE_LINKEDIN_PROFILE);
  t.after(() => __setTestScraper(null));

  __setTestTransport(async () => "not json");
  t.after(() => __setTestTransport(null));

  await assert.rejects(() => runLeadResearch());
});
