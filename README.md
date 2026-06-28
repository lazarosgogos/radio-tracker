# Radio Tracker

Public radio play-history tracker for configured stations. The first station adapter targets FLY 104's AIO Radio Player metadata endpoint.

## Stack

- Next.js 16, React 19, TypeScript
- Supabase Postgres with `pg_trgm` for fuzzy search
- pnpm for package management
- Background polling worker with `tsx`

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env` from `.env.example` and set `DATABASE_URL`.

   For Supabase, use the Postgres connection string from Project Settings > Database. Keep `sslmode=require` in the URL.
   Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Project Settings > API so the browser can receive realtime play inserts.

3. Apply the database schema:

   ```bash
   pnpm db:migrate
   ```

   The migration creates:

   - `stations` for station/source config mirrored from `src/lib/stations.ts`
   - `tracks` for normalized artist/title/raw track identities
   - `plays` for each detected station track change
   - `poll_runs` for worker success/failure logs

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

## Database

Server code connects directly to Supabase Postgres through `DATABASE_URL`. Browser code uses the Supabase JavaScript client only for realtime `plays` insert notifications, then fetches hydrated data from the Next.js API.

`plays.raw_payload` and `poll_runs.raw_payload` keep the original station metadata response as `jsonb` so parser changes can be debugged without changing the public track model. Public pages only query recent play history and station summaries through server-side code.

Run retention cleanup daily:

```bash
pnpm cleanup
```

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
```
