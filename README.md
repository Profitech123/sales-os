# Sales OS — Second-Brain Sales Operating System

A local-first sales operating system: Markdown files are the database, a
Node.js backend automates intelligence gathering with Claude, and a Next.js
dashboard renders the pipeline.

## Folder Structure

```
frontend/            Next.js (App Router) dashboard
  src/app/page.tsx     Dashboard UI (deals grid + pipeline snapshot)
  src/lib/sales-data.ts  Reads /second-brain/deals via fs + gray-matter
backend/             Express server (port 3001)
  server.js            Entry point: webhook + 07:00 cron
  routines/meeting-ended.js   POST /webhooks/meeting-ended handler
  routines/lead-research.js   Apify LinkedIn scrape → Claude sales brief
  lib/anthropic.js     Shared Claude client + business-rule system prompt
  lib/paths.js         Second-brain path helpers
second-brain/        Local file "database"
  calls/  deals/  context/  outbox/
```

## Setup

```bash
# Backend
cd backend
cp .env.example .env   # fill in ANTHROPIC_API_KEY, APIFY_TOKEN, TARGET_LINKEDIN_URL
npm install
npm start              # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev            # http://localhost:3000
```

## How It Works

1. **Meeting ends** → your meeting tool POSTs `{ meetingId, transcript, attendees }`
   to `POST /webhooks/meeting-ended`. Claude drafts a follow-up email
   (`second-brain/outbox/*.txt`) and a proposal (`second-brain/deals/*.md`).
2. **Every day at 07:00** the cron scrapes the target LinkedIn profile via the
   Apify `automation-lab/linkedin-profile-scraper` actor, and Claude produces a
   sales brief with a lead score and 3 next steps into `second-brain/deals/`.
   Trigger manually with `POST /routines/lead-research/run`.
3. **Dashboard** reads every Markdown file in `second-brain/deals/` at request
   time and renders company, color-coded lead score, summary, and next steps,
   next to a static Pipeline Snapshot widget.

## Business Rules (enforced in every AI prompt)

- No timeline section labeled "Phase 3: Growth (Months 5-6)" — timelines are
  limited to immediate deployment and standard rollout.
- Automated coffee projects are always branded **"Clap Coffee"**.
- Prompts are optimized for: 55-inch drive-thru displays with ANPR camera
  support, self-checkout micromarts with open API integration, and FastAPI
  backend data extraction for financial documents.
