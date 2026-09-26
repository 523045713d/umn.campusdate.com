"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import type { Plan } from "@/types";
import { joinPlan, loadPlan } from "@/lib/store";

export default function PlanDetail() {
  const params = useParams<{ id: string }>();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function fetchPlan() {
      const result = await loadPlan(params.id);

      setPlan(result);
      setLoading(false);
    }

    fetchPlan();
  }, [params.id]);

  async function handleJoin() {
    setJoining(true);

    try {
      const updated = await joinPlan(params.id);
      setPlan(updated);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-neutral-600">
        Loading plan...
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="py-16 text-neutral-600">
        Plan not found.
      </div>
    );
  }

  const joined = plan.members.includes("You");
  const full =
    plan.currentMembers >= plan.maxPeople;

  return (
    <section className="mx-auto max-w-3xl">
      <Link
        href="/discover"
        className="text-sm text-neutral-500"
      >
        ← Back to discover
      </Link>

      <div className="mt-5 rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div>
            <div className="text-sm text-neutral-500">
              {plan.category}
            </div>

            <h1 className="mt-2 text-3xl font-semibold">
              {plan.title}
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
              {plan.description}
            </p>
          </div>

          <div className="h-fit rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold">
            {plan.matchScore}% match
          </div>
        </div>

        <div className="mt-7 grid gap-3 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-700 md:grid-cols-3">
          <div>📍 {plan.location}</div>
          <div>🕒 {plan.startsAt}</div>
          <div>
            👥 {plan.currentMembers} / {plan.maxPeople}
          </div>
        </div>

        <div className="mt-7">
          <h2 className="font-semibold">
            Why this matches you
          </h2>

          <div className="mt-3 grid gap-2">
            {plan.reasons.map((reason) => (
              <div
                key={reason}
                className="rounded-xl border border-black/5 px-4 py-3 text-sm"
              >
                ✓ {reason}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7">
          <h2 className="font-semibold">
            Current group
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {plan.members.map((member) => (
              <span
                key={member}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm"
              >
                {member}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            disabled={joined || full || joining}
            onClick={handleJoin}
            className="rounded-2xl bg-black px-5 py-3 font-medium text-white disabled:bg-neutral-300"
          >
            {joining
              ? "Joining..."
              : joined
              ? "Joined"
              : full
              ? "Group Full"
              : "Join Plan"}
          </button>

          <Link
            href="/group"
            className="rounded-2xl border border-black/10 px-5 py-3 font-medium"
          >
            View Group
          </Link>
        </div>
      </div>
    </section>
  );
}