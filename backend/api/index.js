// Vercel serverless entry point. Vercel routes every request here (see
// vercel.json rewrites) and Express handles the routing internally — the
// same app.js used by server.js (persistent host) and the test suite.
import { createApp } from "../app.js";

export default createApp();
