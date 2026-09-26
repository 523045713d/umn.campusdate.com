"use client";

import { useEffect, useMemo, useState } from "react";
import { PlanCard } from "@/components/PlanCard";
import { loadPlans } from "@/lib/store";
import type { Plan, PlanCategory } from "@/types";

const categories: Array<"All" | PlanCategory> = [
  "All",
  "Study",
  "Food",
  "Sports",
  "Event",
  "Build",
];

export default function DiscoverPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [category, setCategory] =
    useState<(typeof categories)[number]>("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPlans() {
      try {
        setPlans(await loadPlans());
      } catch {
        setError("Could not load plans.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const filtered = useMemo(
    () =>
      category === "All"
        ? plans
        : plans.filter((plan) => plan.category === category),
    [plans, category]
  );

  return (
    <section>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Discover Plans
          </h1>

          <p className="mt-3 text-neutral-600">
            Browse first. Match automatically only when it helps.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-full px-4 py-2 text-sm ${
                category === item
                  ? "bg-black text-white"
                  : "border border-black/10 bg-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="mt-8 text-neutral-500">Loading plans...</p>
      )}

      {error && (
        <p className="mt-8 text-red-600">{error}</p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-10 rounded-3xl bg-white p-8 text-center">
          <p className="text-neutral-500">
            No plans yet. Create the first one.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}