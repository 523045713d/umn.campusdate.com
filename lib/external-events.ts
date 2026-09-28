"use client";

import { supabase } from "@/lib/supabase";
import type { ExternalEvent } from "@/types";

type ExternalEventRow = {
  id: string;
  source: "umn_calendar" | "ticketmaster";
  external_id: string;
  importer_name: string;
  source_name: string;
  source_url: string;
  title: string;
  summary: string | null;
  organizer_name: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  expires_at: string;
  timezone: string | null;
  is_all_day: boolean;
  status: "active" | "canceled" | "expired";
  categories: string[] | null;
  audiences: string[] | null;
  tags: string[] | null;
};

function formatStart(row: ExternalEventRow): string {
  const date = new Date(row.starts_at);
  if (Number.isNaN(date.getTime())) return row.starts_at;

  return date.toLocaleString(undefined, row.is_all_day
    ? { dateStyle: "full" }
    : { dateStyle: "medium", timeStyle: "short" });
}

function mapExternalEvent(row: ExternalEventRow): ExternalEvent {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    importerName: row.importer_name,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    title: row.title,
    summary: row.summary ?? "",
    organizerName: row.organizer_name,
    location: row.location?.trim() || "See the original event page",
    startsAt: formatStart(row),
    startsAtIso: row.starts_at,
    endsAtIso: row.ends_at,
    expiresAtIso: row.expires_at,
    timezone: row.timezone ?? "America/Chicago",
    isAllDay: row.is_all_day,
    status: row.status,
    categories: row.categories ?? [],
    audiences: row.audiences ?? [],
    tags: row.tags ?? [],
  };
}

export async function loadExternalEvents(limit = 100): Promise<ExternalEvent[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const activeQuery = (source: "umn_calendar" | "ticketmaster") => supabase
    .from("external_events").select("*")
    .eq("source", source).eq("status", "active")
    .gte("expires_at", now.toISOString())
    .order("starts_at", { ascending: true }).limit(safeLimit);
  const expiredQuery = supabase.from("external_events")
    .select("*")
    .in("status", ["expired", "canceled"])
    .gte("expires_at", cutoff)
    .order("starts_at", { ascending: false })
    .limit(50);
  const [umn, ticketmaster, expired] = await Promise.all([
    activeQuery("umn_calendar"), activeQuery("ticketmaster"), expiredQuery,
  ]);
  if (umn.error) throw umn.error;
  if (ticketmaster.error) throw ticketmaster.error;
  if (expired.error) throw expired.error;
  return [...(umn.data ?? []), ...(ticketmaster.data ?? []), ...(expired.data ?? [])]
    .map((row) => mapExternalEvent(row as ExternalEventRow));
}

export async function loadExternalEvent(id: string): Promise<ExternalEvent | null> {
  const { data, error } = await supabase
    .from("external_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapExternalEvent(data as ExternalEventRow) : null;
}
