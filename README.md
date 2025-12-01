## Future-Self Card Studio

Future-Self Card Studio is an identity-focused journaling environment that keeps a persistent “future-self” card alongside open writing, optional prompts, and AI scaffolding that never prescribes behaviour.

### Core Capabilities (MVP)

- Persistent Future-Self Card with revision annotations and history.
- Open journaling workspace with full-width editor, auto-save, and entry list.
- Optional value-anchored prompts grounded in the card.
- Margin notes generated on demand once you invite them.
- Fresh shadcn/ui styling with a card-first layout and Turbopack-enabled dev server.

### Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4 + shadcn/ui, Turbopack dev server, SWR.
- **Backend:** Next.js Route Handlers, Prisma ORM.
- **Database:** PostgreSQL (connection provided via `DATABASE_URL`).
- **Validation & helpers:** Zod, custom prompt/margin note generators (LLM hooks ready to swap in).

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env` and set `DATABASE_URL` to a Postgres instance.
   - Recommended: use a pooled connection string for serverless deployments.

3. **Apply migrations & generate client**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```

4. **Run the app**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Application Structure

- `src/app/api`: Next.js Route Handlers for the card, journaling, prompts, and margin notes.
- `src/components`: UI building blocks (card panel, journal workspace, onboarding flow, etc.).
- `src/lib`: Prisma client, session helper, prompt and margin note generators, Zod validators.
- `prisma/schema.prisma`: Data model for users, cards, revisions, journal entries, preferences, notes, etc.

## Data Model Highlights

- `FutureSelfCard` holds current card state (values, goals, constraints, identity statement).
- `CardRevision` logs every change with the user’s annotation and snapshot for history view.
- `JournalEntry` stores free-form writing with timestamps for autosave feedback.
- `MarginNote`, `PatternSummary`, `PromptHistory`, `ScaffoldResponse` prepare the system for higher-agency tools.

Run `npx prisma studio` (via `npm run prisma:studio`) to inspect or debug data locally.

## API Surface (MVP)

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/card` | GET / PUT | Fetch or update the Future-Self Card with required annotation & history |
| `/api/card/history` | GET | Pull the last 25 revisions |
| `/api/journal` | GET / POST | List entries or create a new entry |
| `/api/journal/[id]` | GET / PATCH | Fetch or update entry content |
| `/api/prompts/next` | POST | Generate a value-anchored prompt grounded in the card |
| `/api/margin-notes` | POST | Generate card-grounded notes using recent entries |

## Frontend Experience

- **Card Panel:** Always visible with sheet-based editing and revision history.
- **Journal Workspace:** Entry list, full-width editor with autosave status, optional prompt banner, and on-demand reflection tools.
- **Margin Notes:** Generated on demand, limited to four, explicitly cite card elements and patterns.

## Extending the System

- Upgrade the prompt service to call your preferred LLM inside `lib/prompts.ts`.
- Expand margin note and pattern detection in `lib/margin-notes.ts` with NLP/embedding services.
- Implement real authentication (replace `getOrCreateUser` stub) and pair with user research exports.
- Phase 2: add prompt categories, Pattern View UI, and Scaffolded Reflection flows (component placeholders already present).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Create/apply a migration (`-- --name <label>`) |
| `npm run prisma:studio` | Launch Prisma Studio |
