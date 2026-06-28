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
  todFrom?: string | string[];
  todTo?: string | string[];
};

const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const TIME_OF_DAY_PATTERN = /^\d{2}:\d{2}$/;

export function parseStationArchiveFilters(params: StationArchiveSearchParams): StationArchiveFilters {
  const search = firstParam(params.q)?.trim();
  const from = parseLocalDateTime(firstParam(params.from));
  const to = parseLocalDateTime(firstParam(params.to));
  const todFrom = parseTimeOfDay(firstParam(params.todFrom));
  const todTo = parseTimeOfDay(firstParam(params.todTo));

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

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
