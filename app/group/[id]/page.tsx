"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadMyGroups } from "@/lib/store";
import { GroupChat } from "@/components/GroupChat";
import { AiPlanner } from "@/components/AiPlanner";
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
        {userId && <AiPlanner group={group} userId={userId} />}
      </div>
      {userId && <GroupChat planId={group.id} userId={userId} />}
    </section>
  );
}
