import assert from "node:assert/strict";
import { test } from "node:test";
import { AioRadioAdapter } from "../src/lib/adapters/aio-radio";
import { stationConfigs } from "../src/lib/stations";

test("fetches and maps AIO Radio now-playing payloads", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "https://fly104.gr/player/index.php?c=FLY104");
    return new Response(
      JSON.stringify({
        artist: "Augusto Yepes, Talon",
        title: "Funk it (",
        image: "tmp/images/default.jpg",
        status: "cached"
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  try {
    const adapter = new AioRadioAdapter();
    const result = await adapter.fetchNowPlaying(stationConfigs[0]);

    assert.equal(result.artist, "Augusto Yepes, Talon");
    assert.equal(result.title, "Funk it (");
    assert.equal(result.rawText, "Augusto Yepes, Talon - Funk it (");
    assert.equal(result.imageUrl, "https://fly104.gr/player/tmp/images/default.jpg");
    assert.equal(result.sourceStatus, "cached");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
