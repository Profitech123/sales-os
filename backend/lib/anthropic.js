// Shared Anthropic client + the business-rule system prompt fragment that is
// injected into EVERY AI call the Sales OS makes.
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = "claude-3-5-sonnet-latest";

/**
 * Non-negotiable business constraints. Keep this appended to every system
 * prompt so no generated proposal, email, or brief can violate them.
 */
export const BUSINESS_RULES = `
NON-NEGOTIABLE BUSINESS RULES — apply to every document you produce:
1. NEVER include a timeline section labeled "Phase 3: Growth (Months 5-6)" in any
   proposal or document. Timelines must be limited to immediate deployment and a
   standard rollout — do not invent long-tail growth phases.
2. Any copy or proposal relating to automated coffee projects MUST use the brand
   name "Clap Coffee" — never any other name, spelling, or variation.
3. Our solution domains (frame all value propositions around these):
   - 55-inch drive-thru displays with ANPR camera support
   - Self-checkout micromarts with open API integration
   - Backend data extraction via FastAPI for financial documents
`;

// Test seam: lets the test suite substitute a fake transport so unit/e2e
// tests never hit the real Anthropic API. Production code never sets this.
let transportOverride = null;
export function __setTestTransport(fn) {
  transportOverride = fn;
}

/**
 * Call Claude and parse a strict-JSON answer. Strips markdown code fences if
 * the model wraps its response in them.
 */
export async function askClaudeForJson({ system, user, maxTokens = 4096 }) {
  const raw = transportOverride
    ? await transportOverride({ system, user, maxTokens })
    : await callAnthropic({ system, user, maxTokens });

  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Claude returned non-JSON output: ${error.message}\n--- raw output ---\n${raw}`
    );
  }
}

async function callAnthropic({ system, user, maxTokens }) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
