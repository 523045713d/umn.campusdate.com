"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlan } from "@/lib/store";
import type { PlanCategory } from "@/types";

export default function CreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<PlanCategory>("Study");

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");
  const [maxPeople, setMaxPeople] = useState(4);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      const plan = await createPlan({
        title,
        category,
        description,
        location,
        startTime: time,
        maxPeople,
      });

      router.push(`/plan/${plan.id}`);
    } catch (err) {
      console.error(err);
      setError("Could not create plan.");
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div>
        <div className="text-sm text-neutral-500">
          Create a new plan
        </div>

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
          <span className="text-sm font-medium">
            Category
          </span>

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as PlanCategory)
            }
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
          >
            {[
              "Study",
              "Food",
              "Sports",
              "Event",
              "Build",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            Description
          </span>

          <textarea
            required
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            className="mt-2 min-h-32 w-full rounded-2xl border border-black/10 px-4 py-3"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium">
              Location
            </span>

            <input
              required
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Walter Library"
            />
          </label>

          <label>
            <span className="text-sm font-medium">
              Time
            </span>

            <input
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Tonight · 7 PM"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">
            Maximum group size
          </span>

          <input
            type="number"
            min={2}
            max={12}
            value={maxPeople}
            onChange={(e) =>
              setMaxPeople(Number(e.target.value))
            }
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
          />
        </label>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

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