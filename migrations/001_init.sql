CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS stations (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  channel_key TEXT NOT NULL,
  poll_interval_seconds INTEGER NOT NULL DEFAULT 60,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracks (
  id BIGSERIAL PRIMARY KEY,
  identity_key TEXT NOT NULL UNIQUE,
  raw_text TEXT NOT NULL,
  artist TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plays (
  id BIGSERIAL PRIMARY KEY,
  station_id BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  track_id BIGINT NOT NULL REFERENCES tracks(id) ON DELETE RESTRICT,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_status TEXT,
  image_url TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_runs (
  id BIGSERIAL PRIMARY KEY,
  station_id BIGINT REFERENCES stations(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  success BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS stations_enabled_idx ON stations(enabled);
CREATE INDEX IF NOT EXISTS plays_station_played_at_idx ON plays(station_id, played_at DESC);
CREATE INDEX IF NOT EXISTS plays_played_at_idx ON plays(played_at DESC);
CREATE INDEX IF NOT EXISTS tracks_identity_key_idx ON tracks(identity_key);
CREATE INDEX IF NOT EXISTS tracks_search_trgm_idx ON tracks USING gin ((coalesce(artist, '') || ' ' || coalesce(title, '') || ' ' || raw_text) gin_trgm_ops);
