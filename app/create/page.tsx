"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createPlan } from "@/lib/store";
import { loadExternalEvent } from "@/lib/external-events";
import type { ExternalEvent, PlanCategory } from "@/types";

function dateTimeInputValue(iso: string): string {
  const date = new Date(iso);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function CreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlanCategory>("Study");
  const [description, setDescription] = useState("");
  const [interests, setInterests] = useState("");
  const [courses, setCourses] = useState("");
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");
  const [maxPeople, setMaxPeople] = useState(4);
  const [sourceEvent, setSourceEvent] = useState<ExternalEvent | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      const eventId = new URLSearchParams(window.location.search).get("event");
      const nextPath = eventId ? `/create?event=${encodeURIComponent(eventId)}` : "/create";
      const user = await getCurrentUser();

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (eventId) {
        try {
          const event = await loadExternalEvent(eventId);
          if (!active) return;

          if (
            !event
            || event.status !== "active"
            || new Date(event.expiresAtIso).getTime() <= Date.now()
          ) {
            setError("This event is no longer available for a new plan.");
          } else {
            setSourceEvent(event);
            setTitle(`Go to ${event.title}`);
            setCategory(event.categories.includes("Sports") ? "Sports" : "Event");
            setDescription(`Looking for people to attend ${event.title} together.`);
            setInterests(event.tags.filter((tag) => !tag.includes(",")).slice(0, 10).join(", "));
            setLocation(event.location);
            const eventStart = new Date(event.startsAtIso);
            const suggestedStart = eventStart.getTime() > Date.now()
              ? eventStart
              : new Date(Date.now() + 15 * 60_000);
            setTime(dateTimeInputValue(suggestedStart.toISOString()));
          }
        } catch (loadError) {
          console.error(loadError);
          if (active) setError("Could not load the selected event.");
        }
      }

      if (active) setCheckingAuth(false);
    }

    void initialize();
    return () => { active = false; };
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      const start = new Date(time);
      if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
        setError("Choose a future start date and time.");
        setSubmitting(false);
        return;
      }
      const plan = await createPlan({
        title,
        category,
        description,
        interests: interests.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 10),
        courses: courses.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 10),
        location,
        startTime: `${start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} (${Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"})`,
        startsAtIso: start.toISOString(),
        maxPeople,
        externalEventId: sourceEvent?.id ?? null,
      });

      router.push(`/plan/${plan.id}`);
    } catch (err) {
      console.error(err);

      if (err instanceof Error && err.message === "AUTH_REQUIRED") {
        router.replace("/login?next=/create");
        return;
      }

      setError("Could not create plan.");
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return <div className="py-16 text-neutral-600">Checking account...</div>;
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div>
        <div className="text-sm text-neutral-500">
          {sourceEvent ? "Create a crew for an event" : "Create a new plan"}
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          What do you want to do?
        </h1>
      </div>

      {sourceEvent && (
        <div className="mt-6 rounded-3xl border border-[#6D001F]/10 bg-[#FFCC33]/15 p-5 text-sm text-neutral-700">
          <div className="font-semibold text-[#6D001F]">Linked {sourceEvent.sourceName} event</div>
          <div className="mt-2 text-base font-medium text-neutral-900">{sourceEvent.title}</div>
          <div className="mt-2">{sourceEvent.startsAt} · {sourceEvent.location}</div>
          {sourceEvent.organizerName && <div className="mt-1">Organized by {sourceEvent.organizerName}</div>}
          <a href={sourceEvent.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block font-medium underline">
            Check the original event ↗
          </a>
        </div>
      )}

      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-3xl border border-black/5 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
            placeholder="e.g. CSCI 4041 study session"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PlanCategory)}
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
          >
            {["Study", "Food", "Sports", "Event", "Others"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-32 w-full rounded-2xl border border-black/10 px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Interest tags (comma separated)</span>
          <input value={interests} onChange={(e) => setInterests(e.target.value)} maxLength={300} placeholder="Basketball, Photography" className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3" />
          <span className="mt-1 block text-xs text-neutral-500">Add up to 10 interests so students with the same interests can find this plan.</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Course codes (comma separated)</span>
          <input value={courses} onChange={(e) => setCourses(e.target.value)} maxLength={300} placeholder="CSCI 4041, MATH 1271" className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3" />
          <span className="mt-1 block text-xs text-neutral-500">Add up to 10 course codes so classmates can find this plan.</span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium">Location</span>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Walter Library"
            />
          </label>

          <label>
            <span className="text-sm font-medium">Start date and time</span>
            <input
              required
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Maximum group size</span>
          <input
            type="number"
            min={2}
            max={12}
            value={maxPeople}
            onChange={(e) => setMaxPeople(Number(e.target.value))}
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={submitting}
          className="w-full rounded-2xl bg-black px-5 py-3 font-medium text-white disabled:bg-neutral-400"
        >
          {submitting ? "Publishing..." : "Publish Plan"}
        </button>
      </form>
    </section>
  );
}
