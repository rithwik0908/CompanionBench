# CompanionBench

A research-grade web application for evaluating AI companion apps and automating proof-of-concept interactions. Built for the RouterSense research project.

## Overview

CompanionBench has two modules:

1. **Evaluation Registry** — Catalog and evaluate AI companion apps using structured fields (web accessibility, login requirements, age verification, subscription models, language support). Import/export via CSV.

2. **Automation Runner** — Execute multi-message conversation batches against target platforms using browser automation (Playwright). Captures responses, screenshots, timing data, and page HTML as evidence artifacts.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma 5** + SQLite
- **Tailwind CSS** + shadcn/ui components
- **Playwright** for browser automation
- **Server-Sent Events** for live run monitoring
- **PapaParse** for CSV import/export

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Set up the database
cp .env.example .env
npm run db:migrate
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database with 15 sample apps |
| `npm run db:reset` | Reset database and re-seed |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run auth:character-ai` | Initialize Character.AI browser session |

## Character.AI Authentication

Character.AI no longer supports standard email + password login. It uses email-link or OAuth (Google / Apple). CompanionBench handles this via **Playwright storage-state reuse**:

### One-Time Setup

```bash
npm run auth:character-ai
```

This opens a visible Chromium browser at character.ai. Log in manually using whichever method you prefer (Google, Apple, email link). Once logged in, the script automatically detects it and saves the session to `.auth/character-ai.json`.

### How It Works

1. **`npm run auth:character-ai`** — Opens a real browser. You log in manually. Session cookies/state are saved to `.auth/character-ai.json`.
2. **New Run (Real adapter)** — The UI checks for a valid session before launch. If missing, it shows instructions.
3. **At run start** — The adapter loads the storage state into a fresh Playwright context, navigates to character.ai, and verifies the session is still active before sending messages.
4. **Session expired?** — Re-run `npm run auth:character-ai` to refresh.

### Verify Session

The UI shows session status on the New Run page when "Character.AI (Real)" is selected. You can also check via API:

```bash
curl http://localhost:3000/api/auth/character-ai/status
```

## Architecture

```
src/
├── app/                      # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── apps/             # CRUD, CSV import/export
│   │   └── runs/             # Run management, execution, SSE streaming
│   ├── apps/                 # App registry pages
│   │   ├── [id]/             # App detail + evaluation form
│   │   └── import/           # CSV import
│   ├── runs/                 # Automation run pages
│   │   ├── [id]/             # Run detail + transcript
│   │   │   └── console/      # Live SSE console
│   │   └── new/              # Run builder
│   └── page.tsx              # Dashboard
├── automation/
│   ├── types.ts              # PlatformAdapter interface
│   ├── runner.ts             # Run orchestrator
│   └── adapters/
│       ├── mock.ts           # Mock adapter (testing)
│       └── character-ai.ts   # Character.AI adapter (Playwright)
├── components/
│   ├── layout/sidebar.tsx    # Navigation sidebar
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── db.ts                 # Prisma client singleton
│   ├── csv.ts                # CSV parse/import/export
│   └── utils.ts              # Utilities
└── prisma/
    ├── schema.prisma         # Database schema
    └── seed.ts               # Seed script
```

## Database Models

- **App** — AI companion app with all Q1 evaluation fields
- **Run** — Automation run (status, config, adapter type, timing, summary)
- **MessageTurn** — Individual message/response pair within a run
- **Artifact** — Screenshot, log, or export file attached to a run or turn

## Adapter Pattern

The automation engine uses an adapter interface (`PlatformAdapter`) with methods:

- `initialize()`, `login()`, `openConversation()`
- `sendMessage()`, `waitForResponse()`, `extractResponse()`
- `captureScreenshot()`, `capturePageHtml()`, `cleanup()`

**Included adapters:**
- **MockAdapter** — Simulated responses with realistic delays for testing
- **CharacterAIAdapter** — Real Playwright-based automation for character.ai (session-based auth via storage state)

To add a new platform, implement the `PlatformAdapter` interface in `src/automation/adapters/`.

## Q1 Evaluation Fields

Each app entry captures:

| Field | Type |
|---|---|
| Name, Platform, Developer, Store URL | Text |
| App Type | companion / general_purpose / other |
| Web Accessible + URL | Boolean + URL |
| Login Required + Methods | Boolean + comma-separated |
| Age Verification Required + Method | Boolean + Text |
| Subscription Required for Long Chat | Boolean |
| All Features Available Without Subscription | Boolean |
| Subscription Features + Cost | Text |
| Languages Supported | Comma-separated |

## Demo Walkthrough

1. **Dashboard** — View stats (total apps, evaluated count, automation runs)
2. **App Registry** → Browse/filter/search the 15 seeded apps
3. **App Detail** → Edit evaluation fields, view linked runs
4. **Import CSV** → Upload a CSV to bulk-import apps
5. **Export CSV** → Download the full registry as CSV
6. **New Run** → Configure a 10-message mock run, launch it
7. **Run Detail** → View the transcript, artifacts, timing data
8. **Live Console** → Watch messages stream in via SSE
