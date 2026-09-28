import Link from "next/link";
import type { ExternalEvent } from "@/types";

export function ExternalEventCard({ event }: { event: ExternalEvent }) {
  return (
    <article className="rounded-3xl border border-[#6D001F]/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="rounded-full bg-[#6D001F] px-3 py-1 text-white">
          {event.source === "umn_calendar" ? "UMN Calendar" : event.categories.includes("Concerts") ? "Concert" : "Sports"}
        </span>
        <span className="rounded-full bg-[#FFCC33]/30 px-3 py-1 text-[#6D001F]">
          Imported by {event.importerName}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-semibold leading-snug">{event.title}</h2>
      {event.summary && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
          {event.summary}
        </p>
      )}

      <div className="mt-5 grid gap-2 text-sm text-neutral-600">
        <div>📍 {event.location}</div>
        <div>🕒 {event.startsAt}</div>
        {event.organizerName && <div>🎟️ {event.organizerName}</div>}
        <div>🔗 {event.sourceName}</div>
        {event.status !== "active" && <div className="font-medium text-red-700">{event.status === "expired" ? "Expired" : "Canceled"}</div>}
      </div>

      {event.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {event.categories.slice(0, 3).map((category) => (
            <span key={category} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
              {category}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {event.status === "active" && new Date(event.expiresAtIso).getTime() > Date.now() && <Link
          href={`/create?event=${encodeURIComponent(event.id)}`}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Find people to go with
        </Link>}
        <Link
          href={`/event/${event.id}`}
          className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Event details
        </Link>
      </div>
    </article>
  );
}
