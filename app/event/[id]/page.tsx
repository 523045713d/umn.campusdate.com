"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadExternalEvent } from "@/lib/external-events";
import type { ExternalEvent } from "@/types";

export default function ExternalEventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<ExternalEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExternalEvent(params.id)
      .then((result) => {
        setEvent(result);
        if (!result) setError("Event not found.");
      })
      .catch((loadError) => {
        console.error(loadError);
        setError("Could not load this event.");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="py-16 text-neutral-600">Loading event...</div>;
  if (!event) return <div className="py-16 text-neutral-600">{error || "Event not found."}</div>;

  const canCreatePlan = event.status === "active"
    && new Date(event.expiresAtIso).getTime() > Date.now();

  return (
    <section className="mx-auto max-w-3xl">
      <Link href="/events" className="text-sm text-neutral-500">← Back to events</Link>
      <div className="mt-5 rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-[#6D001F] px-3 py-1 text-white">{event.source === "umn_calendar" ? "UMN Calendar" : event.categories.includes("Concerts") ? "Concert" : "Sports"}</span>
          <span className="rounded-full bg-[#FFCC33]/30 px-3 py-1 text-[#6D001F]">
            Imported by {event.importerName}
          </span>
          {event.status !== "active" && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">{event.status}</span>
          )}
        </div>

        <h1 className="mt-5 text-3xl font-semibold">{event.title}</h1>
        {event.summary && <p className="mt-4 leading-7 text-neutral-600">{event.summary}</p>}

        <div className="mt-7 grid gap-3 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-700 md:grid-cols-2">
          <div>📍 {event.location}</div>
          <div>🕒 {event.startsAt}</div>
          {event.organizerName && <div>🎟️ {event.organizerName}</div>}
          <div>🔗 Source: {event.sourceName}</div>
        </div>

        {event.categories.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {event.categories.map((category) => (
              <span key={category} className="rounded-full bg-neutral-100 px-3 py-1 text-sm">{category}</span>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {canCreatePlan && (
            <Link href={`/create?event=${encodeURIComponent(event.id)}`} className="rounded-2xl bg-black px-5 py-3 font-medium text-white">
              Find people to go with
            </Link>
          )}
          <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-black/10 px-5 py-3 font-medium">
            View original event ↗
          </a>
        </div>

        <p className="mt-6 text-xs leading-5 text-neutral-500">
          CampusCrew imports basic public event information for discovery. Registration, cost, eligibility, schedule changes, and cancellation details are controlled by the original organizer.
        </p>
      </div>
    </section>
  );
}
