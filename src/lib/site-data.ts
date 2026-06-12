import { listLatestPlays, listStationPlays, searchGlobalPlays, type PlayRow } from "@/lib/db/repository";
import { getStationConfig, stationConfigs } from "@/lib/stations";
import { normalizeText } from "@/lib/track";

export type StationSummary = {
  slug: string;
  name: string;
  timezone: string;
  latestPlay: PlayRow | null;
};

export async function getStationSummaries(): Promise<{ stations: StationSummary[]; error: string | null }> {
  try {
    const latest = await listLatestPlays();
    return {
      error: null,
      stations: stationConfigs.map((station) => ({
        slug: station.slug,
        name: station.name,
        timezone: station.timezone,
        latestPlay: latest.find((play) => play.station_slug === station.slug) ?? null
      }))
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to load station data",
      stations: stationConfigs.map((station) => ({
        slug: station.slug,
        name: station.name,
        timezone: station.timezone,
        latestPlay: null
      }))
    };
  }
}

export async function getHomeSearch(
  search?: string
): Promise<{ stationResults: StationSummary[]; trackResults: PlayRow[]; error: string | null }> {
  const query = search?.trim();
  if (!query) {
    return { stationResults: [], trackResults: [], error: null };
  }

  const normalizedQuery = normalizeText(query);
  const { stations } = await getStationSummaries();
  const stationResults = stations.filter((station) => {
    const haystack = normalizeText(`${station.name} ${station.slug}`);
    return haystack.includes(normalizedQuery) || normalizedQuery.includes(haystack);
  });

  try {
    return {
      stationResults,
      trackResults: await searchGlobalPlays(query),
      error: null
    };
  } catch (error) {
    return {
      stationResults,
      trackResults: [],
      error: error instanceof Error ? error.message : "Unable to search the archive"
    };
  }
}

export async function getStationArchive(
  slug: string,
  search?: string
): Promise<{ station: StationSummary | null; plays: PlayRow[]; error: string | null }> {
  const config = getStationConfig(slug);
  if (!config) {
    return { station: null, plays: [], error: null };
  }

  try {
    const plays = await listStationPlays(slug, search);
    const latestPlays = search?.trim() ? await listStationPlays(slug) : plays;
    return {
      error: null,
      plays,
      station: {
        slug: config.slug,
        name: config.name,
        timezone: config.timezone,
        latestPlay: latestPlays[0] ?? null
      }
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to load station archive",
      plays: [],
      station: {
        slug: config.slug,
        name: config.name,
        timezone: config.timezone,
        latestPlay: null
      }
    };
  }
}
