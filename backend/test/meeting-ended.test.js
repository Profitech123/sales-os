import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { handleMeetingEnded } from "../routines/meeting-ended.js";
import { __setTestTransport } from "../lib/anthropic.js";
import { PATHS, ensureSecondBrain } from "../lib/paths.js";
import { FAKE_MEETING_RESPONSE, fakeTransport } from "./fixtures.js";

/** Minimal Express-compatible res double that captures what was sent. */
function createMockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("handleMeetingEnded returns 400 when required fields are missing", async () => {
  const req = { body: {} };
  const res = createMockRes();

  await handleMeetingEnded(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /required/i);
});

test("handleMeetingEnded writes an email draft and a proposal to the second-brain", async (t) => {
  await ensureSecondBrain();
  __setTestTransport(fakeTransport(FAKE_MEETING_RESPONSE));
  t.after(() => __setTestTransport(null));

  const req = {
    body: {
      meetingId: "test-meeting-123",
      transcript: "We discussed drive-thru displays and pricing.",
      attendees: ["Alice", "Bob"],
    },
  };
  const res = createMockRes();

  await handleMeetingEnded(req, res);

  assert.equal(res.statusCode, 201);
  assert.ok(res.body.ok);

  const emailContent = await fs.readFile(res.body.files.email, "utf8");
  assert.match(emailContent, /Subject: Great connecting today/);

  const proposalContent = await fs.readFile(res.body.files.proposal, "utf8");
  assert.match(proposalContent, /company: "QuickServe Drive-Ins"/);
  assert.match(proposalContent, /Immediate Deployment/);
  assert.doesNotMatch(proposalContent, /Phase 3: Growth \(Months 5-6\)/);

  // Clean up generated fixtures so the working tree stays clean.
  t.after(async () => {
    await fs.rm(res.body.files.email, { force: true });
    await fs.rm(res.body.files.proposal, { force: true });
  });
});

test("handleMeetingEnded surfaces AI errors as a 502", async (t) => {
  __setTestTransport(async () => "not valid json");
  t.after(() => __setTestTransport(null));

  const req = {
    body: { meetingId: "err-meeting", transcript: "transcript text" },
  };
  const res = createMockRes();

  await handleMeetingEnded(req, res);

  assert.equal(res.statusCode, 502);
  assert.ok(res.body.error);
});
