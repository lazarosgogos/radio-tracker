export type StationSourceType = "aio-radio";

export type StationConfig = {
  slug: string;
  name: string;
  timezone: string;
  sourceType: StationSourceType;
  sourceUrl: string;
  channelKey: string;
  pollIntervalSeconds: number;
  enabled: boolean;
};

export const stationConfigs: StationConfig[] = [
  {
    slug: "fly-104",
    name: "FLY 104",
    timezone: "Europe/Athens",
    sourceType: "aio-radio",
    sourceUrl: "https://fly104.gr/player/",
    channelKey: "FLY104",
    pollIntervalSeconds: 60,
    enabled: true
  }
];

export function getStationConfig(slug: string): StationConfig | undefined {
  return stationConfigs.find((station) => station.slug === slug);
}
