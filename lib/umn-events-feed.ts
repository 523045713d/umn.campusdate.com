const DEFAULT_UMN_EVENTS_FEED_URL =
  "https://events.tc.umn.edu/live/json/events/max/250";

type UmnFeedItem = {
  id?: string | number;
  group_title?: string | null;
  title?: string | null;
  url?: string | null;
  date_iso?: string | null;
  date2_iso?: string | null;
  timezone?: string | null;
  is_all_day?: boolean | number | string | null;
  is_canceled?: boolean | number | string | null;
  location?: string | null;
  event_types?: unknown;
  event_types_audience?: unknown;
  tags?: unknown;
  last_modified?: string | number | null;
};

export type ExternalEventUpsert = {
  source: "umn_calendar" | "ticketmaster";
  external_id: string;
  importer_name: string;
  source_name: string;
  source_url: string;
  title: string;
  summary: string;
  organizer_name: string | null;
  location: string;
  starts_at: string;
  ends_at: string | null;
  expires_at: string;
  timezone: string;
  is_all_day: boolean;
  status: "active" | "canceled";
  categories: string[];
  audiences: string[];
  tags: string[];
  source_modified_at: string | null;
  last_synced_at: string;
  updated_at: string;
};

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return named[lower] ?? match;
  });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => decodeHtmlEntities(item.trim()))
    .filter(Boolean);
}

function feedBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function sourceModifiedAt(value: UmnFeedItem["last_modified"]): string | null {
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export function mapUmnFeedItem(
  item: UmnFeedItem,
  syncedAt = new Date().toISOString(),
): ExternalEventUpsert | null {
  const sourceEventId = String(item.id ?? "").trim();
  const title = decodeHtmlEntities(item.title?.trim() ?? "");
  const sourceUrl = decodeHtmlEntities(item.url?.trim() ?? "");
  const startsAt = item.date_iso?.trim() ?? "";

  if (!sourceEventId || !title || !sourceUrl || !startsAt) return null;

  let parsedSource: URL;
  try {
    parsedSource = new URL(sourceUrl);
  } catch {
    return null;
  }

  const isUmnHost = parsedSource.hostname === "umn.edu"
    || parsedSource.hostname.endsWith(".umn.edu");
  if (parsedSource.protocol !== "https:" || !isUmnHost) {
    return null;
  }

  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) return null;

  const endDate = item.date2_iso ? new Date(item.date2_iso) : null;
  const isAllDay = feedBoolean(item.is_all_day);
  const validEndDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null;
  const fallbackDuration = isAllDay ? 24 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
  const expiresAt = validEndDate && validEndDate > startDate
    ? validEndDate
    : new Date(startDate.getTime() + fallbackDuration);

  return {
    source: "umn_calendar",
    external_id: `${sourceEventId}:${startDate.toISOString()}`,
    importer_name: "CampusDate Event Importer",
    source_name: "UMN Events Calendar",
    source_url: parsedSource.toString(),
    title,
    summary: "",
    organizer_name: item.group_title
      ? decodeHtmlEntities(item.group_title.trim()) || null
      : null,
    location: item.location
      ? decodeHtmlEntities(item.location.trim()) || "See the UMN event page"
      : "See the UMN event page",
    starts_at: startDate.toISOString(),
    ends_at: validEndDate?.toISOString() ?? null,
    expires_at: expiresAt.toISOString(),
    timezone: item.timezone?.trim() || "America/Chicago",
    is_all_day: isAllDay,
    status: feedBoolean(item.is_canceled) ? "canceled" : "active",
    categories: stringArray(item.event_types),
    audiences: stringArray(item.event_types_audience),
    tags: stringArray(item.tags),
    source_modified_at: sourceModifiedAt(item.last_modified),
    last_synced_at: syncedAt,
    updated_at: syncedAt,
  };
}

export function getUmnEventsFeedUrl(): string {
  const configured = process.env.UMN_EVENTS_FEED_URL?.trim() || DEFAULT_UMN_EVENTS_FEED_URL;
  const url = new URL(configured);

  if (
    url.protocol !== "https:"
    || url.hostname !== "events.tc.umn.edu"
    || !url.pathname.startsWith("/live/json/events")
  ) {
    throw new Error("UMN_EVENTS_FEED_URL must be an official events.tc.umn.edu JSON feed");
  }

  return url.toString();
}

export async function fetchUmnEvents(): Promise<ExternalEventUpsert[]> {
  const response = await fetch(getUmnEventsFeedUrl(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "CampusCrew/0.1 (UMN event discovery; source links preserved)",
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`UMN Events feed returned ${response.status}`);
  }

  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) throw new Error("UMN Events feed returned an unexpected payload");

  const syncedAt = new Date().toISOString();
  return raw
    .map((item) => mapUmnFeedItem(item as UmnFeedItem, syncedAt))
    .filter((event): event is ExternalEventUpsert => event !== null);
}
