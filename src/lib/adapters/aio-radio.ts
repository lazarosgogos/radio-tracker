import type { StationConfig } from "../stations";
import { parseTrack } from "../track";
import type { StationAdapter, StationNowPlaying } from "./types";

type AioRadioPayload = {
  artist?: string | null;
  title?: string | null;
  image?: string | null;
  status?: string | null;
};

export class AioRadioAdapter implements StationAdapter {
  async fetchNowPlaying(station: StationConfig): Promise<StationNowPlaying> {
    const endpoint = new URL("index.php", ensureTrailingSlash(station.sourceUrl));
    endpoint.searchParams.set("c", station.channelKey);

    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "user-agent": "radio-tracker/0.1 (+https://example.com)"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`AIO Radio request failed with ${response.status}`);
    }

    const payload = (await response.json()) as AioRadioPayload;
    const parsed = parseTrack(
      [payload.artist, payload.title].filter(Boolean).join(" - "),
      payload.artist,
      payload.title
    );

    return {
      rawText: parsed.rawText,
      artist: parsed.artist,
      title: parsed.title,
      imageUrl: absolutizeImageUrl(station.sourceUrl, payload.image),
      sourceStatus: payload.status ?? null,
      rawPayload: payload
    };
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function absolutizeImageUrl(sourceUrl: string, image?: string | null): string | null {
  if (!image) return null;
  try {
    return new URL(image, ensureTrailingSlash(sourceUrl)).toString();
  } catch {
    return null;
  }
}
