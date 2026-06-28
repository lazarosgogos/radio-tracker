import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveStationArchive } from "@/components/LiveStationArchive";
import { parseStationArchiveFilters, type StationArchiveSearchParams } from "@/lib/archive-filters";
import { getStationArchive } from "@/lib/site-data";
import { getStationConfig } from "@/lib/stations";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<StationArchiveSearchParams>;
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
  const config = getStationConfig(slug);
  if (!config) notFound();

  const filters = parseStationArchiveFilters(await searchParams, { timezone: config.timezone });
  const { station, plays, error } = await getStationArchive(slug, filters);

  if (!station) notFound();

  return (
    <section className="page-shell">
      <LiveStationArchive station={station} plays={plays} filters={filters} error={error} />
    </section>
  );
}
