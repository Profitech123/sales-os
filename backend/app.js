// Express app definition, kept separate from server.js so tests can import
// and exercise the app (via supertest-style request injection) without
// binding a port or scheduling the cron job.
import express from "express";
import { handleMeetingEnded } from "./routines/meeting-ended.js";
import { runLeadResearch } from "./routines/lead-research.js";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "5mb" })); // transcripts can be large

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.post("/webhooks/meeting-ended", handleMeetingEnded);

  // Manual trigger for the research routine — handy for testing without
  // waiting for 07:00.
  app.post("/routines/lead-research/run", async (_req, res) => {
    try {
      const file = await runLeadResearch();
      res.json({ ok: true, file });
    } catch (error) {
      console.error("[lead-research] manual run failed:", error);
      res.status(502).json({ error: error.message });
    }
  });

  return app;
}
