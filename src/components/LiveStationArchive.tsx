"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RelativeTime } from "@/components/RelativeTime";
import { TrackLine } from "@/components/TrackLine";
import { hasStationArchiveFilters, type StationArchiveFilters } from "@/lib/archive-filters";
import { getBrowserSupabaseClient } from "@/lib/realtime/client";
import { formatStationTime } from "@/lib/time";
import type { PlayRow } from "@/lib/db/repository";
import type { StationSummary } from "@/lib/site-data";

type StationArchiveResponse = {
  station: StationSummary | null;
  plays: PlayRow[];
  error: string | null;
};

type LiveStationArchiveProps = {
  station: StationSummary;
  plays: PlayRow[];
  error: string | null;
  filters: StationArchiveFilters;
};

const ARCHIVE_DAY_COUNT = 30;
const LAST_MINUTE_OF_DAY = 1439;

function shouldShowSourceStatus(status: string | null) {
  return Boolean(status && status.trim().toLowerCase() !== "cached");
}

export function LiveStationArchive({ station: initialStation, plays: initialPlays, error, filters }: LiveStationArchiveProps) {
  const [station, setStation] = useState(initialStation);
  const [plays, setPlays] = useState(initialPlays);
  const hasFilters = hasStationArchiveFilters(filters);
  const dayOptions = useMemo(() => buildStationDateOptions(station.timezone), [station.timezone]);
  const [dayRange, setDayRange] = useState(() => getInitialDayRange(filters, dayOptions));
  const [timeRange, setTimeRange] = useState(() => getInitialTimeRange(filters));
  const dayRangeActive = dayRange[0] !== 0 || dayRange[1] !== dayOptions.length - 1;
  const timeRangeActive = timeRange[0] !== 0 || timeRange[1] !== LAST_MINUTE_OF_DAY;
  const fromDateTime = `${dayOptions[dayRange[0]]}T00:00`;
  const toDateTime = `${dayOptions[dayRange[1]]}T23:59`;
  const todFrom = formatMinuteOfDay(timeRange[0]);
  const todTo = formatMinuteOfDay(timeRange[1]);
  const timeRangeLabel =
    timeRange[0] > timeRange[1] ? `${todFrom} to ${todTo} overnight` : `${todFrom} to ${todTo}`;

  useEffect(() => {
    setStation(initialStation);
    setPlays(initialPlays);
  }, [initialStation, initialPlays]);

  useEffect(() => {
    setDayRange(getInitialDayRange(filters, dayOptions));
    setTimeRange(getInitialTimeRange(filters));
  }, [dayOptions, filters]);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    let active = true;
    let refreshQueued = false;

    async function refreshArchive() {
      if (refreshQueued) return;
      refreshQueued = true;

      try {
        const response = await fetch(`/api/stations/${station.slug}/plays`, { cache: "no-store" });
        const payload = (await response.json()) as StationArchiveResponse;
        if (!active || !response.ok || payload.error || !payload.station) return;

        setStation(payload.station);
        if (!hasFilters) {
          setPlays(payload.plays);
        }
      } finally {
        refreshQueued = false;
      }
    }

    const channel = supabase
      .channel(`live-station-${station.slug}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plays" },
        () => {
          void refreshArchive();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [hasFilters, station.slug]);

  return (
    <>
      <div className="station-header">
        <div>
          <p className="eyebrow">Station archive</p>
          <h1>{station.name}</h1>
          <p>Times are shown in {station.timezone}. Archive records are retained for 30 days.</p>
        </div>

        <div className="now-playing">
          <span className="section-label">Now playing</span>
          {station.latestPlay ? (
            <>
              <strong>
                <TrackLine play={station.latestPlay} />
              </strong>
              <span>
                <RelativeTime value={station.latestPlay.played_at} />
              </span>
            </>
          ) : (
            <>
              <strong>Waiting for metadata</strong>
              <span>No play has been recorded yet.</span>
            </>
          )}
        </div>
      </div>

      <form className="archive-filters" action={`/stations/${station.slug}`}>
        {dayRangeActive ? (
          <>
            <input type="hidden" name="from" value={fromDateTime} />
            <input type="hidden" name="to" value={toDateTime} />
          </>
        ) : null}
        {timeRangeActive ? (
          <>
            <input type="hidden" name="todFrom" value={todFrom} />
            <input type="hidden" name="todTo" value={todTo} />
          </>
        ) : null}
        <label className="filter-field filter-field-search">
          <span>Track</span>
          <input
            type="search"
            name="q"
            placeholder="Search artist or song"
            defaultValue={filters.search ?? ""}
            aria-label="Search artist or song"
          />
        </label>
        <div className="range-panel">
          <div className="range-heading">
            <span>Days</span>
            <strong>
              {formatDayLabel(dayOptions[dayRange[0]])} to {formatDayLabel(dayOptions[dayRange[1]])}
            </strong>
          </div>
          <label className="range-control">
            <span>Start day</span>
            <input
              type="range"
              min="0"
              max={dayOptions.length - 1}
              step="1"
              value={dayRange[0]}
              onChange={(event) => {
                const nextStart = Number(event.currentTarget.value);
                setDayRange((current) => [Math.min(nextStart, current[1]), current[1]]);
              }}
            />
          </label>
          <label className="range-control">
            <span>End day</span>
            <input
              type="range"
              min="0"
              max={dayOptions.length - 1}
              step="1"
              value={dayRange[1]}
              onChange={(event) => {
                const nextEnd = Number(event.currentTarget.value);
                setDayRange((current) => [current[0], Math.max(nextEnd, current[0])]);
              }}
            />
          </label>
        </div>
        <div className="range-panel">
          <div className="range-heading">
            <span>Time</span>
            <strong>{timeRangeLabel}</strong>
          </div>
          <label className="range-control">
            <span>Start time</span>
            <input
              type="range"
              min="0"
              max={LAST_MINUTE_OF_DAY}
              step="5"
              value={timeRange[0]}
              onChange={(event) => {
                const nextStart = Number(event.currentTarget.value);
                setTimeRange((current) => [nextStart, current[1]]);
              }}
            />
          </label>
          <label className="range-control">
            <span>End time</span>
            <input
              type="range"
              min="0"
              max={LAST_MINUTE_OF_DAY}
              step="5"
              value={timeRange[1]}
              onChange={(event) => {
                const nextEnd = Number(event.currentTarget.value);
                setTimeRange((current) => [current[0], nextEnd]);
              }}
            />
          </label>
        </div>
        <div className="filter-actions">
          <button type="submit">Apply</button>
          {hasFilters ? (
            <Link className="clear-filters" href={`/stations/${station.slug}`}>
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {error ? <div className="notice">Unable to load archive data: {error}</div> : null}

      <div className="history-list">
        {plays.length > 0 ? (
          plays.map((play) => (
            <article className="history-row" key={play.id}>
              <div>
                <TrackLine play={play} />
                {shouldShowSourceStatus(play.source_status) ? <span className="status-pill">{play.source_status}</span> : null}
              </div>
              <time dateTime={play.played_at}>{formatStationTime(play.played_at, station.timezone)}</time>
            </article>
          ))
        ) : (
          <div className="empty-state">
            {hasFilters ? "No matching tracks found in the 30-day archive." : "No play history has been stored yet."}
          </div>
        )}
      </div>
    </>
  );
}

function buildStationDateOptions(timezone: string): string[] {
  const today = getStationDateParts(new Date(), timezone);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);

  return Array.from({ length: ARCHIVE_DAY_COUNT + 1 }, (_, index) => {
    const date = new Date(todayUtc - (ARCHIVE_DAY_COUNT - index) * 24 * 60 * 60 * 1000);
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  });
}

function getStationDateParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function getInitialDayRange(filters: StationArchiveFilters, dayOptions: string[]): [number, number] {
  const startIndex = filters.from ? indexForDate(dayOptions, filters.from.slice(0, 10), 0) : 0;
  const endIndex = filters.to ? indexForDate(dayOptions, filters.to.slice(0, 10), dayOptions.length - 1) : dayOptions.length - 1;
  return [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
}

function indexForDate(dayOptions: string[], value: string, fallback: number): number {
  const exactIndex = dayOptions.indexOf(value);
  if (exactIndex >= 0) return exactIndex;

  const insertionIndex = dayOptions.findIndex((day) => day >= value);
  if (insertionIndex < 0) return dayOptions.length - 1;
  if (value < dayOptions[0]) return 0;
  return fallback === 0 ? insertionIndex : Math.max(0, insertionIndex - 1);
}

function getInitialTimeRange(filters: StationArchiveFilters): [number, number] {
  return [filters.todFrom ? minuteFromTime(filters.todFrom) : 0, filters.todTo ? minuteFromTime(filters.todTo) : LAST_MINUTE_OF_DAY];
}

function minuteFromTime(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function formatMinuteOfDay(value: number): string {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function formatDayLabel(value: string): string {
  const [, month, day] = value.split("-");
  return `${month}/${day}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}
