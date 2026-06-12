import type { StationConfig } from "@/lib/stations";

export type StationNowPlaying = {
  rawText: string;
  artist: string | null;
  title: string | null;
  imageUrl: string | null;
  sourceStatus: string | null;
  rawPayload: unknown;
};

export interface StationAdapter {
  fetchNowPlaying(station: StationConfig): Promise<StationNowPlaying>;
}
