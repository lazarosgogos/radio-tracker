import { getAdapter } from "../src/lib/adapters";
import { closePool } from "../src/lib/db/client";
import { logPollRun, recordPlay, upsertStation, upsertTrack } from "../src/lib/db/repository";
import { stationConfigs, type StationConfig } from "../src/lib/stations";
import { isIgnoredTrackText, parseTrack } from "../src/lib/track";

const pollOnce = process.env.POLL_ONCE === "true";

async function pollStation(config: StationConfig): Promise<void> {
  const station = await upsertStation(config);
  const adapter = getAdapter(config.sourceType);

  try {
    const nowPlaying = await adapter.fetchNowPlaying(config);
    const parsed = parseTrack(nowPlaying.rawText, nowPlaying.artist, nowPlaying.title);

    if (isIgnoredTrackText(parsed.rawText, config.ignoredTrackTexts)) {
      await logPollRun({
        stationId: station.id,
        success: true,
        message: `Ignored non-track: ${parsed.rawText}`,
        rawPayload: nowPlaying.rawPayload
      });

      console.log(`${config.name}: ignored - ${parsed.rawText}`);
      return;
    }

    const track = await upsertTrack(parsed);
    const result = await recordPlay({
      stationId: station.id,
      trackId: track.id,
      sourceStatus: nowPlaying.sourceStatus,
      imageUrl: nowPlaying.imageUrl,
      rawPayload: nowPlaying.rawPayload
    });

    await logPollRun({
      stationId: station.id,
      success: true,
      message: result.inserted ? "Inserted new play" : "No change",
      rawPayload: nowPlaying.rawPayload
    });

    console.log(`${config.name}: ${result.inserted ? "new play" : "unchanged"} - ${parsed.rawText}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown polling error";
    await logPollRun({ stationId: station.id, success: false, message });
    console.error(`${config.name}: ${message}`);
  }
}

async function runCycle(): Promise<void> {
  for (const config of stationConfigs.filter((station) => station.enabled)) {
    await pollStation(config);
  }
}

async function main(): Promise<void> {
  if (pollOnce) {
    await runCycle();
    await closePool();
    return;
  }

  await runCycle();
  const intervalMs = Math.min(...stationConfigs.map((station) => station.pollIntervalSeconds)) * 1000;
  const interval = setInterval(runCycle, intervalMs);

  const shutdown = async () => {
    clearInterval(interval);
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
