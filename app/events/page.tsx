"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalEventCard } from "@/components/ExternalEventCard";
import { loadExternalEvents } from "@/lib/external-events";
import type { ExternalEvent } from "@/types";

const categories = ["All", "UMN Events", "Sports", "Concerts", "Expired"] as const;
const featured = [
  { label: "Gophers men's basketball", tag: "Gophers Men's Basketball" },
  { label: "Gophers football", tag: "Gophers Football" },
  { label: "Vikings", tag: "Minnesota Vikings" },
  { label: "Twins", tag: "Minnesota Twins" },
  { label: "Timberwolves", tag: "Minnesota Timberwolves" },
  { label: "LeBron / Lakers", tag: "Los Angeles Lakers" },
  { label: "Steph / Warriors", tag: "Golden State Warriors" },
  { label: "Mahomes / Chiefs", tag: "Kansas City Chiefs" },
  { label: "Taylor Swift", tag: "Taylor Swift" },
  { label: "Minnesota concerts", tag: "Minnesota concerts" },
] as const;

export default function EventsPage() {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [featuredTag, setFeaturedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExternalEvents()
      .then(setEvents)
      .catch((loadError) => {
        console.error(loadError);
        setError("Could not load events.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return events.filter((event) => {
      if (category === "Expired") {
        if (event.status !== "expired" && event.status !== "canceled") return false;
      } else {
        if (event.status !== "active") return false;
        if (category === "UMN Events" && event.source !== "umn_calendar") return false;
        if (category === "Sports" && !event.categories.includes("Sports")) return false;
        if (category === "Concerts" && !event.categories.includes("Concerts")) return false;
      }
      if (featuredTag && !event.categories.includes(featuredTag)) return false;
      if (!normalized) return true;
      return [
        event.title,
        event.summary,
        event.organizerName ?? "",
        event.location,
        ...event.categories,
        ...event.tags,
      ].some((value) => value.toLocaleLowerCase().includes(normalized));
    });
  }, [events, query, category, featuredTag]);

  return (
    <section>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-medium text-[#6D001F]">CampusCrew Events</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Find an event crew</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Browse UMN activities, sports, and concerts, then create a CampusCrew plan to go together.
          </p>
        </div>
        <label className="block md:w-80">
          <span className="sr-only">Search events</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, organizers, places…"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Event category">
        {categories.map((item) =>
          <button key={item} type="button" onClick={() => { setCategory(item); setFeaturedTag(null); }} aria-pressed={category === item && !featuredTag}
            className={`rounded-full border px-4 py-2 text-sm ${category === item && !featuredTag ? "border-[#6D001F] bg-[#6D001F] text-white" : "border-black/10 bg-white text-neutral-700"}`}>
            {item}
          </button>)}
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-semibold text-neutral-700">Teams and featured concerts</h2>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Team and concert filters">
          {featured.map(({ label, tag }) => (
            <button key={tag} type="button" onClick={() => { setCategory("All"); setFeaturedTag(tag === featuredTag ? null : tag); }} aria-pressed={featuredTag === tag}
              className={`rounded-full border px-3 py-1.5 text-sm ${featuredTag === tag ? "border-[#6D001F] bg-[#6D001F] text-white" : "border-black/10 bg-white text-neutral-700"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#6D001F]/10 bg-[#FFCC33]/15 px-5 py-4 text-sm text-neutral-700">
        Event facts come from the UMN Events Calendar or Ticketmaster. Team schedules do not confirm LeBron James, Stephen Curry, or Patrick Mahomes will play. Check the original event page before attending.
      </div>

      {loading && <p className="mt-8 text-neutral-500">Loading events...</p>}
      {error && <p className="mt-8 text-red-600">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <div className="mt-10 rounded-3xl bg-white p-8 text-center text-neutral-500">
          {featuredTag
            ? `No upcoming ${featured.find((item) => item.tag === featuredTag)?.label ?? "featured"} events are available from the connected source yet. Check the original team's or artist's schedule for updates.`
            : events.length ? "No events match this category or search." : "No events have been imported yet."}
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
