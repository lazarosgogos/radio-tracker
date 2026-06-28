export type StationArchiveFilters = {
  search?: string;
  from?: string;
  to?: string;
  todFrom?: string;
  todTo?: string;
};

export type StationArchiveSearchParams = {
  q?: string | string[];
  from?: string | string[];
  to?: string | string[];
  fromDay?: string | string[];
  toDay?: string | string[];
  todFrom?: string | string[];
  todTo?: string | string[];
  todFromMinute?: string | string[];
  todToMinute?: string | string[];
};

export type StationArchiveFilterParseOptions = {
  now?: Date;
  timezone?: string;
};

export const ARCHIVE_DAY_COUNT = 30;
export const LAST_MINUTE_OF_DAY = 1439;

const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const TIME_OF_DAY_PATTERN = /^\d{2}:\d{2}$/;
const DAY_INDEX_PATTERN = /^\d+$/;
const MINUTE_OF_DAY_PATTERN = /^\d+$/;

export function parseStationArchiveFilters(
  params: StationArchiveSearchParams,
  options: StationArchiveFilterParseOptions = {}
): StationArchiveFilters {
  const search = firstParam(params.q)?.trim();
  const dayIndexRange = parseDayIndexRange(params, options);
  const minuteRange = parseMinuteRange(params);
  const from = parseLocalDateTime(firstParam(params.from)) ?? dayIndexRange.from;
  const to = parseLocalDateTime(firstParam(params.to)) ?? dayIndexRange.to;
  const todFrom = parseTimeOfDay(firstParam(params.todFrom)) ?? minuteRange.todFrom;
  const todTo = parseTimeOfDay(firstParam(params.todTo)) ?? minuteRange.todTo;

  return {
    ...(search ? { search } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(todFrom ? { todFrom } : {}),
    ...(todTo ? { todTo } : {})
  };
}

export function hasStationArchiveFilters(filters: StationArchiveFilters): boolean {
  return Boolean(filters.search || filters.from || filters.to || filters.todFrom || filters.todTo);
}

export function buildStationDateOptions(timezone: string, now = new Date()): string[] {
  const today = getStationDateParts(now, timezone);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);

  return Array.from({ length: ARCHIVE_DAY_COUNT + 1 }, (_, index) => {
    const date = new Date(todayUtc - (ARCHIVE_DAY_COUNT - index) * 24 * 60 * 60 * 1000);
    return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  });
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseLocalDateTime(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !LOCAL_DATE_TIME_PATTERN.test(trimmed)) return undefined;

  const [datePart, timePart] = trimmed.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (!isValidDateParts(year, month, day) || hour > 23 || minute > 59) return undefined;
  return trimmed;
}

function parseTimeOfDay(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !TIME_OF_DAY_PATTERN.test(trimmed)) return undefined;

  const [hour, minute] = trimmed.split(":").map(Number);
  if (hour > 23 || minute > 59) return undefined;
  return trimmed;
}

function parseDayIndexRange(
  params: StationArchiveSearchParams,
  options: StationArchiveFilterParseOptions
): Pick<StationArchiveFilters, "from" | "to"> {
  if (!options.timezone) return {};

  const fromDay = parseDayIndex(firstParam(params.fromDay));
  const toDay = parseDayIndex(firstParam(params.toDay));
  if (fromDay == null && toDay == null) return {};
  if ((fromDay ?? 0) === 0 && (toDay ?? ARCHIVE_DAY_COUNT) === ARCHIVE_DAY_COUNT) return {};

  const dayOptions = buildStationDateOptions(options.timezone, options.now);
  const start = Math.min(fromDay ?? 0, toDay ?? ARCHIVE_DAY_COUNT);
  const end = Math.max(fromDay ?? 0, toDay ?? ARCHIVE_DAY_COUNT);

  return {
    from: `${dayOptions[start]}T00:00`,
    to: `${dayOptions[end]}T23:59`
  };
}

function parseDayIndex(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !DAY_INDEX_PATTERN.test(trimmed)) return undefined;

  const index = Number(trimmed);
  if (!Number.isInteger(index) || index < 0 || index > ARCHIVE_DAY_COUNT) return undefined;
  return index;
}

function parseMinuteRange(params: StationArchiveSearchParams): Pick<StationArchiveFilters, "todFrom" | "todTo"> {
  const todFromMinute = parseMinuteOfDay(firstParam(params.todFromMinute));
  const todToMinute = parseMinuteOfDay(firstParam(params.todToMinute));
  if (todFromMinute == null && todToMinute == null) return {};
  if ((todFromMinute ?? 0) === 0 && (todToMinute ?? LAST_MINUTE_OF_DAY) === LAST_MINUTE_OF_DAY) return {};

  return {
    ...(todFromMinute != null ? { todFrom: formatMinuteOfDay(todFromMinute) } : {}),
    ...(todToMinute != null ? { todTo: formatMinuteOfDay(todToMinute) } : {})
  };
}

function parseMinuteOfDay(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !MINUTE_OF_DAY_PATTERN.test(trimmed)) return undefined;

  const minute = Number(trimmed);
  if (!Number.isInteger(minute) || minute < 0 || minute > LAST_MINUTE_OF_DAY) return undefined;
  return minute;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function getStationDateParts(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function formatMinuteOfDay(value: number): string {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}
