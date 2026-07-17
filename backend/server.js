// Sales OS backend entry point.
// - POST /webhooks/meeting-ended → follow-up email + proposal into the second-brain
// - Daily 07:00 cron → LinkedIn lead research brief into /second-brain/deals
import "dotenv/config";
import express from "express";
import cron from "node-cron";
import { ensureSecondBrain } from "./lib/paths.js";
import { handleMeetingEnded } from "./routines/meeting-ended.js";
import { runLeadResearch } from "./routines/lead-research.js";

const PORT = process.env.PORT ?? 3001;

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

// Lead research fires every day at 07:00 server time.
cron.schedule("0 7 * * *", () => {
  runLeadResearch().catch((error) =>
    console.error("[lead-research] scheduled run failed:", error)
  );
});

await ensureSecondBrain();
app.listen(PORT, () => {
  console.log(`Sales OS backend listening on http://localhost:${PORT}`);
});
