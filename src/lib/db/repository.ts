import type { StationConfig } from "../stations";
import type { StationArchiveFilters } from "../archive-filters";
import type { ParsedTrack } from "../track";
import { query } from "./client";

export type StationRow = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  source_type: string;
  source_url: string;
  channel_key: string;
  poll_interval_seconds: number;
  enabled: boolean;
};

export type PlayRow = {
  id: string;
  station_slug: string;
  station_name: string;
  station_timezone: string;
  played_at: string;
  source_status: string | null;
  image_url: string | null;
  raw_text: string;
  artist: string | null;
  title: string | null;
};

export async function upsertStation(config: StationConfig): Promise<StationRow> {
  const result = await query<StationRow>(
    `
      INSERT INTO stations (
        slug, name, timezone, source_type, source_url, channel_key,
        poll_interval_seconds, enabled, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        timezone = EXCLUDED.timezone,
        source_type = EXCLUDED.source_type,
        source_url = EXCLUDED.source_url,
        channel_key = EXCLUDED.channel_key,
        poll_interval_seconds = EXCLUDED.poll_interval_seconds,
        enabled = EXCLUDED.enabled,
        updated_at = now()
      RETURNING *
    `,
    [
      config.slug,
      config.name,
      config.timezone,
      config.sourceType,
      config.sourceUrl,
      config.channelKey,
      config.pollIntervalSeconds,
      config.enabled
    ]
  );

  return result.rows[0];
}

export async function upsertTrack(track: ParsedTrack): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `
      INSERT INTO tracks (identity_key, raw_text, artist, title, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (identity_key) DO UPDATE SET
        raw_text = EXCLUDED.raw_text,
        artist = COALESCE(EXCLUDED.artist, tracks.artist),
        title = COALESCE(EXCLUDED.title, tracks.title),
        updated_at = now()
      RETURNING id
    `,
    [track.identityKey, track.rawText, track.artist, track.title]
  );

  return result.rows[0];
}

export async function getLatestPlay(stationId: string): Promise<PlayRow | null> {
  const result = await query<PlayRow>(
    `
      SELECT
        p.id,
        s.slug AS station_slug,
        s.name AS station_name,
        s.timezone AS station_timezone,
        p.played_at,
        p.source_status,
        p.image_url,
        t.raw_text,
        t.artist,
        t.title
      FROM plays p
      JOIN stations s ON s.id = p.station_id
      JOIN tracks t ON t.id = p.track_id
      WHERE p.station_id = $1
      ORDER BY p.played_at DESC
      LIMIT 1
    `,
    [stationId]
  );

  return result.rows[0] ?? null;
}

export async function recordPlay(input: {
  stationId: string;
  trackId: string;
  sourceStatus?: string | null;
  imageUrl?: string | null;
  rawPayload: unknown;
}): Promise<{ inserted: boolean }> {
  const latest = await query<{ track_id: string }>(
    "SELECT track_id FROM plays WHERE station_id = $1 ORDER BY played_at DESC LIMIT 1",
    [input.stationId]
  );

  if (latest.rows[0]?.track_id === input.trackId) {
    return { inserted: false };
  }

  await query(
    `
      INSERT INTO plays (station_id, track_id, source_status, image_url, raw_payload)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      input.stationId,
      input.trackId,
      input.sourceStatus ?? null,
      input.imageUrl ?? null,
      JSON.stringify(input.rawPayload)
    ]
  );

  return { inserted: true };
}

export async function logPollRun(input: {
  stationId?: string | null;
  success: boolean;
  message?: string | null;
  rawPayload?: unknown;
}): Promise<void> {
  await query(
    `
      INSERT INTO poll_runs (station_id, finished_at, success, message, raw_payload)
      VALUES ($1, now(), $2, $3, $4::jsonb)
    `,
    [
      input.stationId ?? null,
      input.success,
      input.message ?? null,
      input.rawPayload == null ? null : JSON.stringify(input.rawPayload)
    ]
  );
}

export async function listLatestPlays(): Promise<PlayRow[]> {
  const result = await query<PlayRow>(
    `
      SELECT DISTINCT ON (s.id)
        p.id,
        s.slug AS station_slug,
        s.name AS station_name,
        s.timezone AS station_timezone,
        p.played_at,
        p.source_status,
        p.image_url,
        t.raw_text,
        t.artist,
        t.title
      FROM stations s
      LEFT JOIN plays p ON p.station_id = s.id
      LEFT JOIN tracks t ON t.id = p.track_id
      WHERE s.enabled = true
      ORDER BY s.id, p.played_at DESC
    `
  );

  return result.rows.filter((row) => row.id != null);
}

export async function listStationPlays(slug: string, filters: StationArchiveFilters = {}): Promise<PlayRow[]> {
  const params: unknown[] = [slug];
  const clauses: string[] = [];

  if (filters.search) {
    params.push(filters.search);
    const searchParam = params.length;
    const trackSearchText = "(coalesce(t.artist, '') || ' ' || coalesce(t.title, '') || ' ' || t.raw_text)";
    clauses.push(`AND (${trackSearchText} ILIKE '%' || $${searchParam} || '%' OR ${trackSearchText} % $${searchParam})`);
  }

  if (filters.from) {
    params.push(filters.from);
    clauses.push(`AND p.played_at >= ($${params.length}::timestamp AT TIME ZONE s.timezone)`);
  }

  if (filters.to) {
    params.push(filters.to);
    clauses.push(`AND p.played_at < (($${params.length}::timestamp + interval '1 minute') AT TIME ZONE s.timezone)`);
  }

  const localMinuteExpression =
    "((EXTRACT(HOUR FROM p.played_at AT TIME ZONE s.timezone)::int * 60) + EXTRACT(MINUTE FROM p.played_at AT TIME ZONE s.timezone)::int)";
  const todFromMinute = filters.todFrom ? minutesFromTimeOfDay(filters.todFrom) : null;
  const todToMinute = filters.todTo ? minutesFromTimeOfDay(filters.todTo) : null;

  if (todFromMinute != null && todToMinute != null) {
    params.push(todFromMinute, todToMinute);
    const fromParam = params.length - 1;
    const toParam = params.length;
    const operator = todFromMinute <= todToMinute ? "AND" : "OR";
    clauses.push(`AND (${localMinuteExpression} >= $${fromParam} ${operator} ${localMinuteExpression} <= $${toParam})`);
  } else if (todFromMinute != null) {
    params.push(todFromMinute);
    clauses.push(`AND ${localMinuteExpression} >= $${params.length}`);
  } else if (todToMinute != null) {
    params.push(todToMinute);
    clauses.push(`AND ${localMinuteExpression} <= $${params.length}`);
  }

  const result = await query<PlayRow>(
    `
      SELECT
        p.id,
        s.slug AS station_slug,
        s.name AS station_name,
        s.timezone AS station_timezone,
        p.played_at,
        p.source_status,
        p.image_url,
        t.raw_text,
        t.artist,
        t.title
      FROM plays p
      JOIN stations s ON s.id = p.station_id
      JOIN tracks t ON t.id = p.track_id
      WHERE s.slug = $1
        AND p.played_at >= now() - interval '30 days'
        ${clauses.join("\n        ")}
      ORDER BY p.played_at DESC
      LIMIT 200
    `,
    params
  );

  return result.rows;
}

function minutesFromTimeOfDay(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export async function searchGlobalPlays(search: string): Promise<PlayRow[]> {
  const trimmed = search.trim();
  if (!trimmed) return [];

  const result = await query<PlayRow>(
    `
      SELECT
        p.id,
        s.slug AS station_slug,
        s.name AS station_name,
        s.timezone AS station_timezone,
        p.played_at,
        p.source_status,
        p.image_url,
        t.raw_text,
        t.artist,
        t.title
      FROM plays p
      JOIN stations s ON s.id = p.station_id
      JOIN tracks t ON t.id = p.track_id
      WHERE p.played_at >= now() - interval '30 days'
        AND (
          (coalesce(t.artist, '') || ' ' || coalesce(t.title, '') || ' ' || t.raw_text || ' ' || s.name) ILIKE '%' || $1 || '%'
          OR (coalesce(t.artist, '') || ' ' || coalesce(t.title, '') || ' ' || t.raw_text || ' ' || s.name) % $1
          OR s.name ILIKE '%' || $1 || '%'
        )
      ORDER BY
        similarity((coalesce(t.artist, '') || ' ' || coalesce(t.title, '') || ' ' || t.raw_text || ' ' || s.name), $1) DESC,
        p.played_at DESC
      LIMIT 50
    `,
    [trimmed]
  );

  return result.rows;
}

export async function deleteOldPlays(): Promise<number> {
  const result = await query<{ id: string }>(
    "DELETE FROM plays WHERE played_at < now() - interval '30 days' RETURNING id"
  );
  return result.rowCount ?? 0;
}
