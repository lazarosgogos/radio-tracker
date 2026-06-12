import type { PlayRow } from "@/lib/db/repository";

export function TrackLine({ play }: { play: Pick<PlayRow, "artist" | "title" | "raw_text"> }) {
  if (play.artist || play.title) {
    return (
      <span>
        {play.artist ? <strong>{play.artist}</strong> : null}
        {play.artist && play.title ? " - " : null}
        {play.title ?? null}
      </span>
    );
  }

  return <span>{play.raw_text}</span>;
}
