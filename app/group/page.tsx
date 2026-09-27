"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadMyGroups } from "@/lib/store";
import type { Plan } from "@/types";

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function fetchGroups() {
      const user = await getCurrentUser();
      if (!active) return;
      if (!user) {
        router.replace("/login?next=/group");
        return;
      }
      try {
        const result = await loadMyGroups();
        if (active) setGroups(result);
      } catch {
        if (active) setError("Could not load your groups.");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchGroups();
    return () => { active = false; };
  }, [router]);

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-semibold tracking-tight">My Groups</h1>
      <p className="mt-3 text-neutral-600">All plans you created or joined after approval.</p>
      {loading && <p className="mt-8 text-neutral-500">Loading groups...</p>}
      {error && <p className="mt-8 text-red-600">{error}</p>}
      {!loading && !error && !groups.length && (
        <div className="mt-8 rounded-3xl bg-white p-8 text-center">
          <p className="text-neutral-500">You are not in a group yet.</p>
          <Link href="/discover" className="mt-4 inline-block underline">Discover plans</Link>
        </div>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <Link key={group.id} href={`/group/${group.id}`} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm hover:shadow-md">
            <div className="text-sm text-neutral-500">{group.category}</div>
            <h2 className="mt-2 text-xl font-semibold">{group.title}</h2>
            <p className="mt-3 text-sm text-neutral-600">📍 {group.location} · 🕒 {group.startsAt}</p>
            <p className="mt-3 text-sm text-neutral-600">👥 {group.currentMembers} / {group.maxPeople} members</p>
            <span className="mt-5 inline-block text-sm font-medium underline">View group</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
