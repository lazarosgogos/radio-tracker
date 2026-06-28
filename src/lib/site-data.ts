import { hasStationArchiveFilters, type StationArchiveFilters } from "@/lib/archive-filters";
import { listStationPlays, searchGlobalPlays, type PlayRow } from "@/lib/db/repository";
import { getStationConfig, stationConfigs, type StationConfig } from "@/lib/stations";
import { isIgnoredTrackText, normalizeText } from "@/lib/track";

export type StationSummary = {
  slug: string;
  name: string;
  timezone: string;
  latestPlay: PlayRow | null;
};

export async function getStationSummaries(): Promise<{ stations: StationSummary[]; error: string | null }> {
  try {
    const stationPlays = await Promise.all(
      stationConfigs.map(async (station) => ({
        station,
        plays: filterIgnoredPlays(await listStationPlays(station.slug), station)
      }))
    );

    return {
      error: null,
      stations: stationPlays.map(({ station, plays }) => ({
        slug: station.slug,
        name: station.name,
        timezone: station.timezone,
        latestPlay: plays[0] ?? null
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
    const trackResults = await searchGlobalPlays(query);

    return {
      stationResults,
      trackResults: filterIgnoredSearchResults(trackResults),
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
  filters: StationArchiveFilters = {}
): Promise<{ station: StationSummary | null; plays: PlayRow[]; error: string | null }> {
  const config = getStationConfig(slug);
  if (!config) {
    return { station: null, plays: [], error: null };
  }

  try {
    const plays = filterIgnoredPlays(await listStationPlays(slug, filters), config);
    const latestPlays = hasStationArchiveFilters(filters) ? filterIgnoredPlays(await listStationPlays(slug), config) : plays;
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

function filterIgnoredSearchResults(plays: PlayRow[]) {
  return plays.filter((play) => {
    const config = getStationConfig(play.station_slug);
    return !config || !isIgnoredPlay(play, config);
  });
}

function filterIgnoredPlays(plays: PlayRow[], config: StationConfig) {
  return plays.filter((play) => !isIgnoredPlay(play, config));
}

function isIgnoredPlay(play: PlayRow, config: StationConfig) {
  return isIgnoredTrackText(play.raw_text, config.ignoredTrackTexts);
}
