"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalEventCard } from "@/components/ExternalEventCard";
import { loadExternalEvents } from "@/lib/external-events";
import type { ExternalEvent } from "@/types";

export default function EventsPage() {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExternalEvents()
      .then(setEvents)
      .catch((loadError) => {
        console.error(loadError);
        setError("Could not load UMN calendar events.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return events;
    return events.filter((event) => [
      event.title,
      event.summary,
      event.organizerName ?? "",
      event.location,
      ...event.categories,
      ...event.tags,
    ].some((value) => value.toLocaleLowerCase().includes(normalized)));
  }, [events, query]);

  return (
    <section>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-medium text-[#6D001F]">UMN Events Calendar</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Find an event crew</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Browse public events imported from the UMN Events Calendar, then create a CampusCrew plan to attend together.
          </p>
        </div>
        <label className="block md:w-80">
          <span className="sr-only">Search UMN events</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, organizers, places…"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
          />
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-[#6D001F]/10 bg-[#FFCC33]/15 px-5 py-4 text-sm text-neutral-700">
        Event facts come from the UMN Events Calendar. CampusCrew is an independent student project; always check the original event page before attending.
      </div>

      {loading && <p className="mt-8 text-neutral-500">Loading UMN events...</p>}
      {error && <p className="mt-8 text-red-600">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <div className="mt-10 rounded-3xl bg-white p-8 text-center text-neutral-500">
          {events.length ? "No events match your search." : "No upcoming UMN events have been imported yet."}
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => <ExternalEventCard key={event.id} event={event} />)}
        </div>
      )}
    </section>
  );
}
