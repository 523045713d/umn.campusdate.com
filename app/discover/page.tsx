"use client";

import { useEffect, useMemo, useState } from "react";
import { PlanCard } from "@/components/PlanCard";
import { loadPlans } from "@/lib/store";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { recommendPlans } from "@/lib/recommendations";
import Link from "next/link";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [hasMatchingDetails, setHasMatchingDetails] = useState(false);
  const [category, setCategory] =
    useState<(typeof categories)[number]>("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPlans() {
      try {
        const [profile, user] = await Promise.all([getCurrentProfile(), getCurrentUser()]);
        setUserId(user?.id ?? null);
        setHasMatchingDetails(Boolean(profile?.courses?.length || profile?.interests?.length || profile?.availability_slots?.length));
        setPlans(await loadPlans(profile));
      } catch {
        setError("Could not load plans.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const recommended = useMemo(
    () => userId ? recommendPlans(plans, userId) : [],
    [plans, userId]
  );

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

      {!loading && !error && (
        <section className="mt-10" aria-label="Recommended plans">
          <h2 className="text-2xl font-semibold">Recommended for you</h2>
          {recommended.length ? (
            <>
              <p className="mt-2 text-neutral-600">Open plans with shared courses, interests, or a start time that fits your weekly availability.</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {recommended.map((plan) => <div key={plan.id}><PlanCard plan={plan} /><p className="mt-2 text-sm text-neutral-600">{plan.reasons.filter((reason) => reason.startsWith("Same course:") || reason.startsWith("Shared interest:") || reason.startsWith("Start time fits")).join(" · ")}</p></div>)}
              </div>
            </>
          ) : (
            <p className="mt-3 text-neutral-600">
              {!userId ? <><Link href="/login?next=/discover" className="underline">Log in</Link> to see recommendations.</>
                : !hasMatchingDetails ? <><Link href="/profile" className="underline">Add courses, interests, or availability</Link> to your profile for recommendations.</>
                : "No matching open plans yet. Browse all plans below."}
            </p>
          )}
        </section>
      )}

      <h2 className="mt-10 text-2xl font-semibold">Browse plans</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}
