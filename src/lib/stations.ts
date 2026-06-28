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
  ignoredTrackTexts?: readonly string[];
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
    enabled: true,
    ignoredTrackTexts: ["FLY 104 - fly into the music"]
  },
  {
    slug: "imagine-897",
    name: "Imagine 89.7",
    timezone: "Europe/Athens",
    sourceType: "aio-radio",
    sourceUrl: "https://www.imagine897.gr/webplayer/",
    channelKey: "",
    pollIntervalSeconds: 60,
    enabled: true,
    ignoredTrackTexts: ["Imagine 89.7 - Το ραδιόφωνο όπως το φαντάστηκες"]
  }
];

export function getStationConfig(slug: string): StationConfig | undefined {
  return stationConfigs.find((station) => station.slug === slug);
}
