import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeText, parseTrack } from "../src/lib/track";

test("parses explicit artist and title while preserving raw text", () => {
  const parsed = parseTrack("Augusto Yepes, Talon - Funk it (", "Augusto Yepes, Talon", "Funk it (");

  assert.equal(parsed.rawText, "Augusto Yepes, Talon - Funk it (");
  assert.equal(parsed.artist, "Augusto Yepes, Talon");
  assert.equal(parsed.title, "Funk it (");
  assert.equal(parsed.identityKey, "augusto yepes talon funk it");
});

test("parses common separator when only raw text is available", () => {
  const parsed = parseTrack("Artist Name - Song Title");

  assert.equal(parsed.artist, "Artist Name");
  assert.equal(parsed.title, "Song Title");
});

test("normalizes accents, case, and punctuation for fuzzy identity", () => {
  assert.equal(normalizeText("  Déjà Vu!!!  "), "deja vu");
});
