import Link from "next/link";
import { LiveStationGrid } from "@/components/LiveStationGrid";
import { TrackLine } from "@/components/TrackLine";
import { getHomeSearch, getStationSummaries, type StationSummary } from "@/lib/site-data";
import { formatRelative, formatStationTime } from "@/lib/time";

type HomePageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;
  const search = q?.trim();
  const { stations, error } = await getStationSummaries();
  const searchResults = await getHomeSearch(search);
  const hasSearch = Boolean(search);
  const hasSearchResults = searchResults.stationResults.length > 0 || searchResults.trackResults.length > 0;

  return (
    <section className="page-shell home-shell">
      <div className="home-hero">
        <p className="eyebrow">Live station metadata</p>
        <h1>Find songs and stations.</h1>
        <form className="home-search" action="/">
          <input
            type="search"
            name="q"
            placeholder="Search tracks, artists, or stations"
            defaultValue={search ?? ""}
            aria-label="Search tracks, artists, or stations"
          />
          <button type="submit">Search</button>
        </form>
      </div>

      {error ? (
        <div className="notice">
          Database data is not available yet. Run migrations and the polling worker to populate station history.
        </div>
      ) : null}

      {searchResults.error ? (
        <div className="notice">Search is not available yet: {searchResults.error}</div>
      ) : null}

      {hasSearch ? (
        <section className="search-results" aria-label="Search results">
          <div className="section-heading">
            <h2>Search results</h2>
            <p>Results for “{search}”</p>
          </div>

          {hasSearchResults ? (
            <>
              {searchResults.stationResults.length > 0 ? (
                <div className="result-section">
                  <h3>Stations</h3>
                  <div className="station-grid station-grid-compact">
                    {searchResults.stationResults.map((station) => (
                      <StationCard station={station} key={station.slug} />
                    ))}
                  </div>
                </div>
              ) : null}

              {searchResults.trackResults.length > 0 ? (
                <div className="result-section">
                  <h3>Tracks</h3>
                  <div className="track-results">
                    {searchResults.trackResults.map((play) => (
                      <Link className="track-result" href={`/stations/${play.station_slug}`} key={play.id}>
                        <span>
                          <TrackLine play={play} />
                        </span>
                        <span className="muted">
                          {play.station_name} · {formatStationTime(play.played_at, play.station_timezone)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">No matching stations or tracks found.</div>
          )}
        </section>
      ) : null}

      <div className="section-heading stations-heading">
        <h2>Stations</h2>
      </div>

      <LiveStationGrid initialStations={stations} />
    </section>
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
