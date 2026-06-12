export type ParsedTrack = {
  rawText: string;
  artist: string | null;
  title: string | null;
  identityKey: string;
};

const separators = [" - ", " – ", " — ", " | "];

export function parseTrack(rawInput: string, artistInput?: string | null, titleInput?: string | null): ParsedTrack {
  const explicitArtist = cleanField(artistInput);
  const explicitTitle = cleanField(titleInput);
  const rawText = cleanField(rawInput) ?? [explicitArtist, explicitTitle].filter(Boolean).join(" - ");

  let artist = explicitArtist;
  let title = explicitTitle;

  if ((!artist || !title) && rawText) {
    for (const separator of separators) {
      const index = rawText.indexOf(separator);
      if (index > 0) {
        artist ??= cleanField(rawText.slice(0, index));
        title ??= cleanField(rawText.slice(index + separator.length));
        break;
      }
    }
  }

  const fallbackRawText = rawText || "Unknown track";

  return {
    rawText: fallbackRawText,
    artist,
    title,
    identityKey: normalizeTrackIdentity(artist, title, fallbackRawText)
  };
}

export function normalizeTrackIdentity(artist: string | null, title: string | null, rawText: string): string {
  return normalizeText([artist, title].filter(Boolean).join(" - ") || rawText);
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanField(value?: string | null): string | null {
  if (value == null) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}
