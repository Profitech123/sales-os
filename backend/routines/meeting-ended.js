// Webhook handler: POST /webhooks/meeting-ended
// Takes a raw meeting transcript, asks Claude for a follow-up email + proposal,
// then files both into the second-brain (outbox + deals).
import {
  askClaudeForJson,
  BUSINESS_RULES,
} from "../lib/anthropic.js";
import { saveSecondBrainFile, slugify, todayStamp } from "../lib/paths.js";

const SYSTEM_PROMPT = `You are the post-meeting engine of a Sales Operating System for a
retail-technology integrator. After every sales call you produce a follow-up
email and a commercial proposal.

Respond with ONLY a valid JSON object — no prose, no markdown fences — with
exactly these keys:
{
  "company": "the prospect's company name inferred from the transcript/attendees",
  "email_subject": "a concise, specific follow-up subject line",
  "email_body": "a warm, professional follow-up email referencing concrete points from the call",
  "proposal_markdown": "a full proposal in Markdown: summary, scope, pricing placeholders, and a timeline"
}

Timeline guidance: proposals should show an 'Immediate Deployment' step and a
'Standard Rollout' step only.
${BUSINESS_RULES}`;

/** Express handler for the meeting-ended webhook. */
export async function handleMeetingEnded(req, res) {
  const { meetingId, transcript, attendees } = req.body ?? {};

  if (!meetingId || !transcript) {
    return res
      .status(400)
      .json({ error: "Both 'meetingId' and 'transcript' are required." });
  }

  try {
    const result = await askClaudeForJson({
      system: SYSTEM_PROMPT,
      user: [
        `Meeting ID: ${meetingId}`,
        `Attendees: ${Array.isArray(attendees) ? attendees.join(", ") : attendees ?? "unknown"}`,
        "",
        "Transcript:",
        transcript,
      ].join("\n"),
    });

    const stamp = todayStamp();
    const slug = slugify(result.company ?? meetingId);

    // 1. Email draft → /second-brain/outbox as plain text, ready to review & send.
    const emailFilename = `${stamp}-${slug}-follow-up.txt`;
    const emailPath = await saveSecondBrainFile({
      dirKey: "outbox",
      filename: emailFilename,
      content: `Subject: ${result.email_subject}\n\n${result.email_body}\n`,
      commitMessage: `Follow-up email: ${result.company ?? meetingId}`,
    });

    // 2. Proposal → /second-brain/deals as Markdown with frontmatter so the
    //    dashboard can pick it up alongside research briefs.
    const proposalFilename = `${stamp}-${slug}-proposal.md`;
    const proposalPath = await saveSecondBrainFile({
      dirKey: "deals",
      filename: proposalFilename,
      content: [
        "---",
        `company: "${result.company ?? slug}"`,
        `type: proposal`,
        `meeting_id: "${meetingId}"`,
        `date: ${stamp}`,
        "---",
        "",
        result.proposal_markdown,
        "",
      ].join("\n"),
      commitMessage: `Proposal: ${result.company ?? meetingId}`,
    });

    return res.status(201).json({
      ok: true,
      files: { email: emailPath, proposal: proposalPath },
    });
  } catch (error) {
    console.error("[meeting-ended] failed:", error);
    return res.status(502).json({ error: error.message });
  }
}
