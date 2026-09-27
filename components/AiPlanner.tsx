"use client";

import { useEffect, useState } from "react";
import type { Plan } from "@/types";
import { isAiPlan } from "@/lib/ai-plan";
import type { AiPlan } from "@/lib/ai-plan";
import { loadGroupAiPlan } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function AiPlanner({ group, userId }: { group: Plan; userId: string }) {
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const isCreator = group.creatorId === userId;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPlan(null);
    setError("");
    loadGroupAiPlan(group.id).then((result) => {
      if (active) setPlan(isAiPlan(result) ? result : null);
    }).catch(() => {
      if (active) setError("Could not load the group plan.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [group.id]);

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sign in required.");
      const response = await fetch(`/api/groups/${group.id}/plan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not generate the plan.");
      if (!isAiPlan(result.plan)) throw new Error("Invalid generated plan.");
      setPlan(result.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the plan.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-8 rounded-3xl bg-neutral-50 p-6">
      <h2 className="text-xl font-semibold">AI activity plan</h2>
      {loading && <p className="mt-3 text-sm text-neutral-500">Loading plan...</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {!loading && !plan && (
        <div className="mt-3">
          <p className="text-sm text-neutral-600">{isCreator ? "Generate an agenda and preparation checklist for this group." : "The creator has not generated a plan yet."}</p>
          {isCreator && <>
            <p className="mt-2 text-xs text-neutral-500">Generation sends this activity’s title, description, time, location, and group size to Google Gemini. Chat messages and member names are excluded. Google may use data submitted on the Gemini API free tier to improve its products.</p>
            <button onClick={generate} disabled={generating} className="mt-4 rounded-xl bg-black px-5 py-3 text-sm text-white disabled:bg-neutral-300">{generating ? "Planning..." : "Generate plan"}</button>
          </>}
        </div>
      )}
      {plan && <div className="mt-4 space-y-5 text-sm text-neutral-700">
        <p>{plan.summary}</p>
        <div><h3 className="font-semibold">Before you meet</h3><ul className="mt-2 list-disc space-y-1 pl-5">{plan.preparation.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
        <div><h3 className="font-semibold">Agenda</h3><ol className="mt-2 space-y-3">{plan.agenda.map((item, index) => <li key={index}><strong>{index + 1}. {item.step} · {item.duration_minutes} min</strong><p className="mt-1">{item.details}</p></li>)}</ol></div>
        <div><h3 className="font-semibold">Backup plan</h3><p className="mt-1">{plan.backup_plan}</p></div>
      </div>}
    </div>
  );
}
