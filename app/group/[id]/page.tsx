"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadMyGroups } from "@/lib/store";
import { GroupChat } from "@/components/GroupChat";
import type { Plan } from "@/types";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Plan | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function fetchGroup() {
      const user = await getCurrentUser();
      if (!active) return;
      if (!user) {
        router.replace(`/login?next=/group/${encodeURIComponent(params.id)}`);
        return;
      }
      try {
        const groups = await loadMyGroups();
        if (active) {
          setGroup(groups.find((item) => item.id === params.id) ?? null);
          setUserId(user.id);
        }
      } catch {
        if (active) setError("Could not load this group.");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchGroup();
    return () => { active = false; };
  }, [params.id, router]);

  if (loading) return <p className="py-16 text-neutral-500">Loading group...</p>;
  if (error || !group) return <section className="mx-auto max-w-3xl py-16"><p>{error || "This group is not in your groups."}</p><Link href="/group" className="mt-4 inline-block underline">← My Groups</Link></section>;

  const schedule = group.category === "Study"
    ? ["Meet and set goals", "Review key concepts", "Work through problems", "Compare solutions", "Wrap up"]
    : group.category === "Build"
    ? ["Confirm roles", "Define MVP", "Build in parallel", "Integrate", "Demo review"]
    : ["Meet at the location", "Quick introductions", "Start activity", "Optional break", "Wrap up"];

  return (
    <section className="mx-auto max-w-3xl">
      <Link href="/group" className="text-sm text-neutral-500">← All my groups</Link>
      <div className="mt-5 text-sm text-neutral-500">Group overview</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{group.title}</h1>
      <div className="mt-8 rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm">
        <p className="text-neutral-600">{group.location} · {group.startsAt}</p>
        <div className="mt-7">
          <h2 className="font-semibold">Members ({group.currentMembers})</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.members.map((member, index) => (
              <span key={`${member}-${index}`} className="rounded-full bg-neutral-100 px-4 py-2 text-sm">{member} ✓</span>
            ))}
          </div>
        </div>
        <div className="mt-7 rounded-3xl bg-neutral-50 p-6">
          <div className="text-sm text-neutral-500">Suggested plan</div>
          <h2 className="mt-1 text-xl font-semibold">Make the first meeting easy</h2>
          <ol className="mt-5 space-y-3">
            {schedule.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs text-white">{index + 1}</span>
                <span className="pt-1 text-neutral-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {userId && <GroupChat planId={group.id} userId={userId} />}
    </section>
  );
}
