CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS stations (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  timezone TEXT NOT NULL CHECK (length(trim(timezone)) > 0),
  source_type TEXT NOT NULL CHECK (length(trim(source_type)) > 0),
  source_url TEXT NOT NULL CHECK (length(trim(source_url)) > 0),
  channel_key TEXT NOT NULL,
  poll_interval_seconds INTEGER NOT NULL DEFAULT 60 CHECK (poll_interval_seconds > 0),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracks (
  id BIGSERIAL PRIMARY KEY,
  identity_key TEXT NOT NULL UNIQUE CHECK (length(trim(identity_key)) > 0),
  raw_text TEXT NOT NULL CHECK (length(trim(raw_text)) > 0),
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'plays'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.plays';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
    EXECUTE 'GRANT SELECT ON public.plays TO anon';
    EXECUTE 'ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'plays'
        AND policyname = 'Allow anonymous realtime reads on plays'
    ) THEN
      EXECUTE 'CREATE POLICY "Allow anonymous realtime reads on plays" ON public.plays FOR SELECT TO anon USING (true)';
    END IF;
  END IF;
END $$;
