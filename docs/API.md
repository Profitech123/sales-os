# Sales OS Backend API

Full machine-readable spec: [`openapi.yaml`](./openapi.yaml) — paste it into
[editor.swagger.io](https://editor.swagger.io) or any OpenAPI viewer for an
interactive reference.

Base URL (local dev): `http://localhost:3001`

## `GET /health`

Liveness check.

```
curl http://localhost:3001/health
# {"ok":true}
```

## `POST /webhooks/meeting-ended`

Call this the moment a sales call ends. Claude turns the transcript into a
follow-up email and a commercial proposal, and both are filed into the
second-brain automatically.

**Request body**

| Field       | Type       | Required | Description                          |
|-------------|------------|----------|---------------------------------------|
| `meetingId` | `string`   | yes      | Unique ID for the meeting             |
| `transcript`| `string`   | yes      | Raw transcript text                   |
| `attendees` | `string[]` | no       | Attendee names/roles                  |

```bash
curl -X POST http://localhost:3001/webhooks/meeting-ended \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "cal-2026-07-19-001",
    "transcript": "AE: Thanks for hopping on...",
    "attendees": ["Jamie (AE)", "Marta Kola (QuickServe)"]
  }'
```

**Response — `201 Created`**

```json
{
  "ok": true,
  "files": {
    "email": "/.../second-brain/outbox/2026-07-19-quickserve-follow-up.txt",
    "proposal": "/.../second-brain/deals/2026-07-19-quickserve-proposal.md"
  }
}
```

**Errors**
- `400` — `meetingId` or `transcript` missing.
- `502` — the AI call failed, or returned output that couldn't be parsed as JSON.

## `POST /routines/lead-research/run`

Runs the daily lead-research routine on demand instead of waiting for the
07:00 cron. Scrapes `TARGET_LINKEDIN_URL` via Apify, asks Claude for a sales
brief (lead score 0–100 + exactly 3 next steps), and saves it to
`second-brain/deals/`.

```bash
curl -X POST http://localhost:3001/routines/lead-research/run
```

**Response — `200 OK`**

```json
{ "ok": true, "file": "/.../second-brain/deals/2026-07-19-test-retail-co.md" }
```

If `TARGET_LINKEDIN_URL` isn't set in the environment, the routine no-ops and
returns `{ "ok": true, "file": null }` rather than failing — this keeps the
cron from spamming errors in environments where the target isn't configured
yet.

**Errors**
- `502` — the Apify scrape or the Claude call failed.

## Business rules enforced on every generated document

Every AI call in this service appends the same non-negotiable constraints
(`backend/lib/anthropic.js` → `BUSINESS_RULES`):

1. No "Phase 3: Growth (Months 5-6)" timeline section — only "Immediate
   Deployment" and "Standard Rollout".
2. Automated coffee projects are always branded **"Clap Coffee"**.
3. Value propositions are framed around: 55-inch ANPR drive-thru displays,
   open-API self-checkout micromarts, and FastAPI financial-document
   extraction.

Tests run against fixture AI responses (no live API calls), so they verify
the file-writing pipeline preserves these constraints end to end, not the
model's actual prompt-following behavior — spot-check real Claude output
periodically since prompts can drift.
