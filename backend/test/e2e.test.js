// Full-stack e2e test: boots the real Express app on an ephemeral port,
// drives it over HTTP exactly like a real webhook caller would, and asserts
// the second-brain files it produces are exactly what the frontend's
// sales-data.ts reader expects (frontmatter keys, file locations).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createApp } from "../app.js";
import { __setTestTransport } from "../lib/anthropic.js";
import { __setTestScraper } from "../routines/lead-research.js";
import { ensureSecondBrain, PATHS } from "../lib/paths.js";
import {
  FAKE_MEETING_RESPONSE,
  FAKE_LEAD_RESEARCH_RESPONSE,
  FAKE_LINKEDIN_PROFILE,
  fakeTransport,
} from "./fixtures.js";

async function withServer(t, fn) {
  await ensureSecondBrain();
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return fn(`http://127.0.0.1:${port}`);
}

test("GET /health responds ok", async (t) => {
  await withServer(t, async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

test("POST /webhooks/meeting-ended → files land where the dashboard reads them", async (t) => {
  __setTestTransport(fakeTransport(FAKE_MEETING_RESPONSE));
  t.after(() => __setTestTransport(null));

  await withServer(t, async (base) => {
    const res = await fetch(`${base}/webhooks/meeting-ended`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId: "e2e-meeting-1",
        transcript: "Discussed ANPR drive-thru displays and rollout plan.",
        attendees: ["AE", "Prospect"],
      }),
    });

    assert.equal(res.status, 201);
    const payload = await res.json();
    assert.ok(payload.ok);

    // Proposal must live in second-brain/deals so the frontend's
    // getDeals() picks it up.
    assert.ok(payload.files.proposal.startsWith(PATHS.deals));
    assert.ok(payload.files.email.startsWith(PATHS.outbox));

    const proposal = await fs.readFile(payload.files.proposal, "utf8");
    assert.match(proposal, /^---/);
    assert.match(proposal, /company: "QuickServe Drive-Ins"/);
    assert.match(proposal, /type: proposal/);

    t.after(async () => {
      await fs.rm(payload.files.proposal, { force: true });
      await fs.rm(payload.files.email, { force: true });
    });
  });
});

test("POST /routines/lead-research/run → brief lands in second-brain/deals with expected frontmatter", async (t) => {
  process.env.TARGET_LINKEDIN_URL = "https://www.linkedin.com/in/e2e-lead/";
  t.after(() => delete process.env.TARGET_LINKEDIN_URL);

  __setTestScraper(async () => FAKE_LINKEDIN_PROFILE);
  t.after(() => __setTestScraper(null));

  __setTestTransport(fakeTransport(FAKE_LEAD_RESEARCH_RESPONSE));
  t.after(() => __setTestTransport(null));

  await withServer(t, async (base) => {
    const res = await fetch(`${base}/routines/lead-research/run`, {
      method: "POST",
    });

    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.ok(payload.ok);
    assert.ok(payload.file.startsWith(PATHS.deals));

    const content = await fs.readFile(payload.file, "utf8");
    // These are exactly the frontmatter keys frontend/src/lib/sales-data.ts
    // parses via gray-matter — a schema drift here would break the dashboard.
    assert.match(content, /^company: /m);
    assert.match(content, /^lead_score: \d+/m);
    assert.match(content, /^type: research/m);
    assert.match(content, /^next_steps:/m);

    t.after(() => fs.rm(payload.file, { force: true }));
  });
});
