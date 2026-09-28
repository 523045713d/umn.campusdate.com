"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { adminListPlans, adminListUsers, adminSetUserRole, deletePlan } from "@/lib/plan-management";
import type { ManagedPlan, ManagedUser } from "@/lib/plan-management";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [plans, setPlans] = useState<ManagedPlan[]>([]);
  const [myId, setMyId] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!active) return;
        if (!user) { router.replace("/login?next=/admin"); return; }
        const profile = await getCurrentProfile();
        if (!active) return;
        if (profile?.role !== "admin") { setLoading(false); return; }
        const [members, activities] = await Promise.all([adminListUsers(), adminListPlans()]);
        if (!active) return;
        setMyId(user.id);
        setAllowed(true);
        setUsers(members);
        setPlans(activities);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load admin dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  const shownUsers = useMemo(() => users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const shownPlans = useMemo(() => plans.filter((plan) => `${plan.title} ${plan.creator_name}`.toLowerCase().includes(query.toLowerCase())), [plans, query]);

  async function changeRole(user: ManagedUser) {
    const next = user.role === "admin" ? "student" : "admin";
    if (!window.confirm(`Set ${user.email} to ${next}?`)) return;
    setBusy(user.id);
    setError("");
    try {
      await adminSetUserRole(user.id, next);
      setUsers(await adminListUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role.");
    } finally { setBusy(""); }
  }

  async function removePlan(plan: ManagedPlan) {
    if (!window.confirm(`Permanently delete "${plan.title}" and its group content?`)) return;
    setBusy(plan.id);
    setError("");
    try {
      await deletePlan(plan.id);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete plan.");
    } finally { setBusy(""); }
  }

  if (loading) return <p className="py-16 text-neutral-600">Loading admin dashboard...</p>;
  if (!allowed) return <p className="py-16 text-neutral-600">{error || "Administrator access required."}</p>;

  return <section className="mx-auto max-w-5xl space-y-9">
    <div><h1 className="text-4xl font-semibold">Admin dashboard</h1><p className="mt-2 text-neutral-600">Manage administrator roles and remove plans.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <label className="block max-w-md"><span className="text-sm font-medium">Search users and plans</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, or plan title" className="mt-2 w-full rounded-xl border border-black/10 px-4 py-2" /></label>

    <div><h2 className="text-2xl font-semibold">Users ({users.length})</h2>
      <div className="mt-4 space-y-2">{shownUsers.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-4">
        <div><p className="font-medium">{user.name} <span className="text-sm text-neutral-500">· {user.role}</span></p><p className="text-sm text-neutral-500">{user.email}</p></div>
        <button type="button" disabled={Boolean(busy) || user.id === myId} onClick={() => void changeRole(user)} className="rounded-xl border border-black/10 px-4 py-2 text-sm disabled:opacity-40">{user.role === "admin" ? "Remove admin" : "Make admin"}</button>
      </div>)}</div>
      {shownUsers.length === 0 && <p className="mt-3 text-neutral-500">No users found.</p>}
    </div>

    <div><h2 className="text-2xl font-semibold">Plans ({plans.length})</h2>
      <div className="mt-4 space-y-2">{shownPlans.map((plan) => <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-4">
        <div><Link href={`/plan/${plan.id}`} className="font-medium underline">{plan.title}</Link><p className="mt-1 text-sm text-neutral-500">{plan.creator_name} · {plan.category} · {plan.status}</p></div>
        <button type="button" disabled={Boolean(busy)} onClick={() => void removePlan(plan)} className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-40">Delete plan</button>
      </div>)}</div>
      {shownPlans.length === 0 && <p className="mt-3 text-neutral-500">No plans found.</p>}
    </div>
  </section>;
}
