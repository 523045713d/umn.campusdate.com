import type { ExternalEventUpsert } from "@/lib/umn-events-feed";

type TicketmasterEvent = {
  id?: string;
  name?: string;
  url?: string;
  dates?: {
    start?: { dateTime?: string; dateTBD?: boolean; dateTBA?: boolean };
    end?: { dateTime?: string };
    timezone?: string;
    status?: { code?: string };
  };
  _embedded?: {
    venues?: Array<{ name?: string; city?: { name?: string }; state?: { stateCode?: string }; timezone?: string }>;
    attractions?: Array<{ name?: string }>;
  };
  classifications?: Array<{ segment?: { name?: string } }>;
};

type Search = { keyword?: string; classificationName?: string; stateCode?: string; label: string; group: "Sports" | "Concerts"; matches?: RegExp };

const SEARCHES: Search[] = [
  { keyword: "Minnesota Golden Gophers Mens Basketball", label: "Gophers Men's Basketball", group: "Sports", matches: /minnesota (golden )?gophers?.*(men'?s )?basketball/i },
  { keyword: "Minnesota Golden Gophers Football", label: "Gophers Football", group: "Sports", matches: /minnesota (golden )?gophers?.*football/i },
  { keyword: "Minnesota Vikings", label: "Minnesota Vikings", group: "Sports", matches: /minnesota vikings/i },
  { keyword: "Minnesota Twins", label: "Minnesota Twins", group: "Sports", matches: /minnesota twins/i },
  { keyword: "Minnesota Timberwolves", label: "Minnesota Timberwolves", group: "Sports", matches: /minnesota timberwolves/i },
  { keyword: "Los Angeles Lakers", label: "Los Angeles Lakers", group: "Sports", matches: /los angeles lakers/i },
  { keyword: "Golden State Warriors", label: "Golden State Warriors", group: "Sports", matches: /golden state warriors/i },
  { keyword: "Kansas City Chiefs", label: "Kansas City Chiefs", group: "Sports", matches: /kansas city chiefs/i },
  { keyword: "Taylor Swift", label: "Taylor Swift", group: "Concerts", matches: /taylor swift/i },
  { classificationName: "music", stateCode: "MN", label: "Minnesota concerts", group: "Concerts" },
];

function ticketmasterUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:")
        || !(url.hostname === "ticketmaster.com" || url.hostname.endsWith(".ticketmaster.com"))) return null;
    url.protocol = "https:";
    return url.toString();
  } catch { return null; }
}

export function mapTicketmasterEvent(item: TicketmasterEvent, search: Search, syncedAt: string): ExternalEventUpsert | null {
  const id = item.id?.trim();
  const title = item.name?.trim();
  const sourceUrl = ticketmasterUrl(item.url);
  const rawStart = item.dates?.start?.dateTime;
  if (!id || !title || !sourceUrl || !rawStart || item.dates?.start?.dateTBD || item.dates?.start?.dateTBA) return null;
  const names = [title, ...(item._embedded?.attractions ?? []).map((attraction) => attraction.name ?? "")].join(" ");
  if (search.matches && !search.matches.test(names)) return null;
  if (search.group === "Concerts" && item.classifications?.some((c) => c.segment?.name === "Sports")) return null;

  const start = new Date(rawStart);
  if (Number.isNaN(start.getTime())) return null;
  const end = item.dates?.end?.dateTime ? new Date(item.dates.end.dateTime) : null;
  const validEnd = end && !Number.isNaN(end.getTime()) && end > start ? end : null;
  const expiresAt = validEnd ?? new Date(start.getTime() + (search.group === "Sports" ? 5 : 6) * 60 * 60 * 1000);
  const venue = item._embedded?.venues?.[0];
  const location = [venue?.name, venue?.city?.name, venue?.state?.stateCode].filter(Boolean).join(", ");
  const status = item.dates?.status?.code === "canceled" ? "canceled" : "active";

  return {
    source: "ticketmaster",
    external_id: id,
    importer_name: "CampusCrew Event Importer",
    source_name: "Ticketmaster",
    source_url: sourceUrl,
    title,
    summary: "",
    organizer_name: search.label,
    location: location || "See the Ticketmaster event page",
    starts_at: start.toISOString(),
    ends_at: validEnd?.toISOString() ?? null,
    expires_at: expiresAt.toISOString(),
    timezone: item.dates?.timezone || venue?.timezone || "America/Chicago",
    is_all_day: false,
    status,
    categories: [search.group, search.label],
    audiences: [],
    tags: search.label === "Los Angeles Lakers" ? ["LeBron James watch — appearance not guaranteed"]
      : search.label === "Golden State Warriors" ? ["Stephen Curry watch — appearance not guaranteed"]
      : search.label === "Kansas City Chiefs" ? ["Patrick Mahomes watch — appearance not guaranteed"] : [],
    source_modified_at: null,
    last_synced_at: syncedAt,
    updated_at: syncedAt,
  };
}

export async function fetchTicketmasterEvents(apiKey: string): Promise<ExternalEventUpsert[]> {
  const syncedAt = new Date().toISOString();
  const imported = new Map<string, ExternalEventUpsert>();
  for (const search of SEARCHES) {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("countryCode", "US");
    url.searchParams.set("size", "200");
    url.searchParams.set("sort", "date,asc");
    url.searchParams.set("startDateTime", syncedAt.replace(/\.\d{3}Z$/, "Z"));
    if (search.keyword) url.searchParams.set("keyword", search.keyword);
    if (search.classificationName) url.searchParams.set("classificationName", search.classificationName);
    if (search.stateCode) url.searchParams.set("stateCode", search.stateCode);

    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Ticketmaster event search failed (${response.status})`);
    const payload = await response.json() as { _embedded?: { events?: TicketmasterEvent[] } };
    if (payload._embedded && !Array.isArray(payload._embedded.events)) throw new Error("Ticketmaster returned an unexpected payload");
    for (const item of payload._embedded?.events ?? []) {
      const event = mapTicketmasterEvent(item, search, syncedAt);
      if (!event) continue;
      const prior = imported.get(event.external_id);
      if (prior) {
        prior.categories = [...new Set([...prior.categories, ...event.categories])];
      } else {
        imported.set(event.external_id, event);
      }
    }
  }
  return [...imported.values()];
}
