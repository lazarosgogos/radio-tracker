import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackLine } from "@/components/TrackLine";
import { getStationArchive } from "@/lib/site-data";
import { formatRelative, formatStationTime } from "@/lib/time";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { station } = await getStationArchive(slug);
  return {
    title: station?.name ?? "Station"
  };
}

export default async function StationPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q } = await searchParams;
  const search = q?.trim();
  const { station, plays, error } = await getStationArchive(slug, search);

  if (!station) notFound();

  return (
    <section className="page-shell">
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
              <span>{formatRelative(station.latestPlay.played_at)}</span>
            </>
          ) : (
            <>
              <strong>Waiting for metadata</strong>
              <span>No play has been recorded yet.</span>
            </>
          )}
        </div>
      </div>

      <form className="search-row" action={`/stations/${station.slug}`}>
        <input
          type="search"
          name="q"
          placeholder="Search artist or song"
          defaultValue={search ?? ""}
          aria-label="Search artist or song"
        />
        <button type="submit">Search</button>
      </form>

      {error ? <div className="notice">Unable to load archive data: {error}</div> : null}

      <div className="history-list">
        {plays.length > 0 ? (
          plays.map((play) => (
            <article className="history-row" key={play.id}>
              <div>
                <TrackLine play={play} />
                {play.source_status ? <span className="status-pill">{play.source_status}</span> : null}
              </div>
              <time dateTime={play.played_at}>
                {formatStationTime(play.played_at, station.timezone)}
              </time>
            </article>
          ))
        ) : (
          <div className="empty-state">
            {search ? "No matching tracks found in the 30-day archive." : "No play history has been stored yet."}
          </div>
        )}
      </div>
    </section>
  );
}
