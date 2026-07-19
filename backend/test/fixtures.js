// Canned AI/scraper responses used by the test suite so no test ever hits
// the real Anthropic or Apify APIs.

export const FAKE_MEETING_RESPONSE = {
  company: "QuickServe Drive-Ins",
  email_subject: "Great connecting today, QuickServe Drive-Ins team",
  email_body:
    "Hi team,\n\nThanks for the time today — following up with the proposal we discussed.\n\nBest,\nSales OS",
  proposal_markdown:
    "## Proposal for QuickServe Drive-Ins\n\n### Scope\n55-inch ANPR drive-thru displays.\n\n### Timeline\n- Immediate Deployment: 2-store pilot\n- Standard Rollout: remaining locations",
};

export const FAKE_LEAD_RESEARCH_RESPONSE = {
  company: "Test Retail Co",
  lead_name: "Jordan Example",
  lead_score: 76,
  summary: "Jordan leads ops at Test Retail Co and is evaluating drive-thru upgrades.",
  next_steps: [
    "Send teaser deck on ANPR displays",
    "Offer a self-checkout micromart demo",
    "Scope a FastAPI financial-document extraction pilot",
  ],
  brief_markdown: "## Brief\n\nStrong fit for our solution domains.",
};

export const FAKE_LINKEDIN_PROFILE = {
  fullName: "Jordan Example",
  companyName: "Test Retail Co",
  headline: "Head of Operations",
};

/** Fake Anthropic transport — returns JSON text based on which fixture the caller wants. */
export function fakeTransport(fixture) {
  return async () => JSON.stringify(fixture);
}
