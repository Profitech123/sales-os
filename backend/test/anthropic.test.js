import { test } from "node:test";
import assert from "node:assert/strict";
import {
  askClaudeForJson,
  __setTestTransport,
  BUSINESS_RULES,
} from "../lib/anthropic.js";

test("askClaudeForJson parses plain JSON", async () => {
  __setTestTransport(async () => JSON.stringify({ ok: true, value: 42 }));
  const result = await askClaudeForJson({ system: "sys", user: "user" });
  assert.deepEqual(result, { ok: true, value: 42 });
});

test("askClaudeForJson strips markdown code fences", async () => {
  __setTestTransport(async () => "```json\n{\"ok\":true}\n```");
  const result = await askClaudeForJson({ system: "sys", user: "user" });
  assert.deepEqual(result, { ok: true });
});

test("askClaudeForJson throws a descriptive error on invalid JSON", async () => {
  __setTestTransport(async () => "not json at all");
  await assert.rejects(
    () => askClaudeForJson({ system: "sys", user: "user" }),
    /Claude returned non-JSON output/
  );
});

test("BUSINESS_RULES enforces the required constraints", () => {
  assert.match(BUSINESS_RULES, /Phase 3: Growth \(Months 5-6\)/);
  assert.match(BUSINESS_RULES, /Clap Coffee/);
  assert.match(BUSINESS_RULES, /ANPR/);
  assert.match(BUSINESS_RULES, /FastAPI/);
});

test.after(() => __setTestTransport(null));
