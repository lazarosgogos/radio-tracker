import assert from "node:assert/strict";
import { test } from "node:test";
import { hasStationArchiveFilters, parseStationArchiveFilters } from "../src/lib/archive-filters";

test("parses station archive filters from query params", () => {
  const filters = parseStationArchiveFilters({
    q: "  artist  ",
    from: "2026-06-27T14:30",
    to: "2026-06-28T16:00",
    todFrom: "08:15",
    todTo: "11:45"
  });

  assert.deepEqual(filters, {
    search: "artist",
    from: "2026-06-27T14:30",
    to: "2026-06-28T16:00",
    todFrom: "08:15",
    todTo: "11:45"
  });
  assert.equal(hasStationArchiveFilters(filters), true);
});

test("ignores empty and invalid station archive filter values", () => {
  const filters = parseStationArchiveFilters({
    q: " ",
    from: "2026-02-30T14:30",
    to: "2026-06-28T25:00",
    todFrom: "24:00",
    todTo: "09:99"
  });

  assert.deepEqual(filters, {});
  assert.equal(hasStationArchiveFilters(filters), false);
});

test("keeps inverted absolute and wrapping time-of-day ranges for query handling", () => {
  const filters = parseStationArchiveFilters({
    from: "2026-06-28T16:00",
    to: "2026-06-27T14:30",
    todFrom: "22:00",
    todTo: "02:00"
  });

  assert.deepEqual(filters, {
    from: "2026-06-28T16:00",
    to: "2026-06-27T14:30",
    todFrom: "22:00",
    todTo: "02:00"
  });
});

test("uses first value for repeated query params", () => {
  const filters = parseStationArchiveFilters({
    q: ["first", "second"],
    todFrom: ["07:00", "08:00"]
  });

  assert.deepEqual(filters, {
    search: "first",
    todFrom: "07:00"
  });
});

test("parses native range slider params", () => {
  const filters = parseStationArchiveFilters(
    {
      fromDay: "29",
      toDay: "30",
      todFromMinute: "480",
      todToMinute: "540"
    },
    {
      now: new Date("2026-06-28T12:00:00Z"),
      timezone: "Europe/Athens"
    }
  );

  assert.deepEqual(filters, {
    from: "2026-06-27T00:00",
    to: "2026-06-28T23:59",
    todFrom: "08:00",
    todTo: "09:00"
  });
});

test("ignores default native range slider params", () => {
  const filters = parseStationArchiveFilters(
    {
      fromDay: "0",
      toDay: "30",
      todFromMinute: "0",
      todToMinute: "1439"
    },
    {
      now: new Date("2026-06-28T12:00:00Z"),
      timezone: "Europe/Athens"
    }
  );

  assert.deepEqual(filters, {});
});
