# Sales OS — Second-Brain Sales Operating System

[![CI](https://github.com/Profitech123/sales-os/actions/workflows/ci.yml/badge.svg)](https://github.com/Profitech123/sales-os/actions/workflows/ci.yml)

A local-first sales operating system: Markdown files are the database, a
Node.js backend automates intelligence gathering with Claude, and a Next.js
dashboard renders the pipeline.

## Folder Structure

```
frontend/            Next.js (App Router) dashboard
  src/app/page.tsx     Dashboard UI (deals grid + pipeline snapshot)
  src/lib/sales-data.ts  Reads /second-brain/deals via fs + gray-matter
backend/             Express server (port 3001)
  app.js               Express app factory (used by both server.js and tests)
  server.js            Entry point: starts the app + 07:00 cron
  routines/meeting-ended.js   POST /webhooks/meeting-ended handler
  routines/lead-research.js   Apify LinkedIn scrape → Claude sales brief
  lib/anthropic.js     Shared Claude client + business-rule system prompt
  lib/paths.js         Second-brain path helpers
  test/                Unit + e2e tests (Node's built-in test runner)
second-brain/        Local file "database"
  calls/  deals/  context/  outbox/
docs/
  API.md               Human-readable API reference
  openapi.yaml          Machine-readable OpenAPI 3.0 spec
.github/workflows/ci.yml  Lint, typecheck, build, unit + e2e tests on every push/PR
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

## API Documentation

See [`docs/API.md`](./docs/API.md) for endpoint reference, request/response
examples, and error codes, or load [`docs/openapi.yaml`](./docs/openapi.yaml)
into any OpenAPI viewer (e.g. [editor.swagger.io](https://editor.swagger.io)).

## Testing

The backend uses Node's built-in test runner — no extra test framework
dependency. All AI/scraper calls are swapped for deterministic fixtures
(`backend/test/fixtures.js`) via test-only override hooks
(`__setTestTransport`, `__setTestScraper`), so tests run fully offline and
never touch the real Anthropic or Apify APIs.

```bash
cd backend
npm test          # unit tests: paths, JSON parsing, webhook handler, cron routine
npm run test:e2e  # boots the real Express app and drives it over HTTP
npm run test:all  # everything

cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

## CI/CD

Every push and pull request to `main` runs via GitHub Actions
(`.github/workflows/ci.yml`):
- **backend** — syntax-checks every source file, then runs the unit suite
- **frontend** — lint, typecheck, production build
- **e2e** — full-stack test that boots the Express app and verifies the
  files it writes match what the frontend's Markdown reader expects
