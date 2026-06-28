"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrackLine } from "@/components/TrackLine";
import { getBrowserSupabaseClient } from "@/lib/realtime/client";
import { formatRelative, formatStationTime } from "@/lib/time";
import type { StationSummary } from "@/lib/site-data";

type LatestStationsResponse = {
  stations: StationSummary[];
  error: string | null;
};

export function LiveStationGrid({ initialStations }: { initialStations: StationSummary[] }) {
  const [stations, setStations] = useState(initialStations);

  useEffect(() => {
    setStations(initialStations);
  }, [initialStations]);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    let active = true;
    let refreshQueued = false;

    async function refreshStations() {
      if (refreshQueued) return;
      refreshQueued = true;

      try {
        const response = await fetch("/api/stations/latest", { cache: "no-store" });
        const payload = (await response.json()) as LatestStationsResponse;
        if (active && response.ok && !payload.error) {
          setStations(payload.stations);
        }
      } finally {
        refreshQueued = false;
      }
    }

    const channel = supabase
      .channel("live-station-grid")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plays" },
        () => {
          void refreshStations();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="station-grid">
      {stations.map((station) => (
        <StationCard station={station} key={station.slug} />
      ))}
    </div>
  );
}

function StationCard({ station }: { station: StationSummary }) {
  return (
    <Link className="station-card" href={`/stations/${station.slug}`}>
      <span className="station-label">{station.name}</span>
      {station.latestPlay ? (
        <>
          <span className="track-title">
            <TrackLine play={station.latestPlay} />
          </span>
          <span className="muted">
            {formatRelative(station.latestPlay.played_at)} · {formatStationTime(station.latestPlay.played_at, station.timezone)}
          </span>
        </>
      ) : (
        <>
          <span className="track-title">Waiting for first poll</span>
          <span className="muted">No play history stored yet</span>
        </>
      )}
    </Link>
  );
}
