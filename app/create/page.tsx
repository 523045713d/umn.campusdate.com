"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createPlan } from "@/lib/store";
import type { PlanCategory } from "@/types";

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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) {
        router.replace("/login?next=/create");
        return;
      }

      setCheckingAuth(false);
    });
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
        <div className="text-sm text-neutral-500">Create a new plan</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          What do you want to do?
        </h1>
      </div>

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
            {["Study", "Food", "Sports", "Event", "Build"].map((item) => (
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
