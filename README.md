# Radio Tracker

Public radio play-history tracker for configured stations. The first station adapter targets FLY 104's AIO Radio Player metadata endpoint.

## Stack

- Next.js 16, React 19, TypeScript
- Postgres with `pg_trgm` for fuzzy search
- pnpm for package management
- Background polling worker with `tsx`

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env` from `.env.example` and set `DATABASE_URL`.

3. Apply the database schema:

   ```bash
   pnpm db:migrate
   ```

4. Poll once to seed the first play record:

   ```bash
   pnpm poll:once
   ```

5. Run the website:

   ```bash
   pnpm dev
   ```

## Worker

Run the polling worker as a separate process on the VPS:

```bash
pnpm poll
```

Run retention cleanup daily with cron or a systemd timer:

```bash
pnpm cleanup
```

Play records older than 30 days are deleted. Station config currently lives in `src/lib/stations.ts`; add new stations there with a matching adapter.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
```
