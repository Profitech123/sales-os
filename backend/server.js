// Sales OS backend entry point.
// - POST /webhooks/meeting-ended → follow-up email + proposal into the second-brain
// - Daily 07:00 cron → LinkedIn lead research brief into /second-brain/deals
import "dotenv/config";
import cron from "node-cron";
import { createApp } from "./app.js";
import { ensureSecondBrain } from "./lib/paths.js";
import { runLeadResearch } from "./routines/lead-research.js";

const PORT = process.env.PORT ?? 3001;

const app = createApp();

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
