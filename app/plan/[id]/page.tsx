"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import type { Plan } from "@/types";
import { loadJoinRequests, loadPlan, requestJoin, reviewJoinRequest } from "@/lib/store";
import type { JoinRequest } from "@/lib/store";
import { deletePlan } from "@/lib/plan-management";

export default function PlanDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPlan() {
      const [profile, user] = await Promise.all([getCurrentProfile(), getCurrentUser()]);
      try {
        const result = await loadPlan(params.id, profile);
        setPlan(result);
        setCurrentUserId(user?.id ?? null);
        setIsAdmin(profile?.role === "admin");
        const joinRequests = user && result ? await loadJoinRequests(params.id) : [];
        setRequests(joinRequests);
      } catch {
        setError("Could not load join requests.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [params.id]);

  async function refresh() {
    const [updated, joinRequests] = await Promise.all([
      loadPlan(params.id, await getCurrentProfile()),
      loadJoinRequests(params.id),
    ]);
    setPlan(updated);
    setRequests(joinRequests);
  }

  async function handleRequest() {
    if (!currentUserId) {
      router.push(`/login?next=/plan/${params.id}`);
      return;
    }
    setWorking(true);
    setError("");
    try {
      await requestJoin(params.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request to join.");
    } finally {
      setWorking(false);
    }
  }

  async function handleReview(requestId: string, approve: boolean) {
    setWorking(true);
    setError("");
    try {
      await reviewJoinRequest(requestId, approve);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not review request.");
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete() {
    if (!plan || !window.confirm(`Delete "${plan.title}" permanently? Group messages, memberships, and join requests will also be deleted.`)) return;
    setWorking(true);
    setError("");
    try {
      await deletePlan(plan.id);
      router.replace(isAdmin && !isCreator ? "/admin" : "/group");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete plan.");
      setWorking(false);
    }
  }

  if (loading) {
    return <div className="py-16 text-neutral-600">Loading plan...</div>;
  }

  if (!plan) {
    return <div className="py-16 text-neutral-600">{error || "Plan not found."}</div>;
  }

  const joined = currentUserId
    ? plan.memberIds.includes(currentUserId)
    : false;
  const full = plan.currentMembers >= plan.maxPeople;
  const isCreator = Boolean(currentUserId && plan.creatorId === currentUserId);
  const ownRequest = requests.find((request) => request.user_id === currentUserId);
  const pendingRequests = isCreator ? requests.filter((request) => request.status === "pending") : [];

  return (
    <section className="mx-auto max-w-3xl">
      <Link href="/discover" className="text-sm text-neutral-500">
        ← Back to discover
      </Link>

      <div className="mt-5 rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div>
            <div className="text-sm text-neutral-500">{plan.category}</div>
            <h1 className="mt-2 text-3xl font-semibold">{plan.title}</h1>
            <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
              {plan.description}
            </p>
            <p className="mt-3 text-sm text-neutral-500">
              Created by {plan.creator}
            </p>
            {plan.externalEvent && (
              <div className="mt-4 rounded-2xl border border-[#6D001F]/10 bg-[#FFCC33]/15 p-4 text-sm text-neutral-700">
                <div className="font-semibold text-[#6D001F]">Crew for a {plan.externalEvent.sourceName} event</div>
                {plan.externalEvent.organizerName && <div className="mt-1">Organized by {plan.externalEvent.organizerName}</div>}
                <a href={plan.externalEvent.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-medium underline">
                  Check the original {plan.externalEvent.sourceName} listing ↗
                </a>
              </div>
            )}
          </div>

          {plan.matchScore !== null && (
            <div className="h-fit rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold">
              {plan.matchScore}% match
            </div>
          )}
        </div>

        {(plan.interests.length > 0 || plan.courses.length > 0) && <div className="mt-5 flex flex-wrap gap-2" aria-label="Plan tags">
          {plan.courses.map((course) => <span key={course} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800">{course}</span>)}
          {plan.interests.map((interest) => <span key={interest} className="rounded-full bg-neutral-100 px-3 py-1 text-sm">{interest}</span>)}
        </div>}

        <div className="mt-7 grid gap-3 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-700 md:grid-cols-3">
          <div>📍 {plan.location}</div>
          <div>🕒 {plan.startsAt}</div>
          <div>
            👥 {plan.currentMembers} / {plan.maxPeople}
          </div>
        </div>

        {plan.matchScore !== null && <div className="mt-7">
          <h2 className="font-semibold">Why this matches you</h2>
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
        </div>}

        <div className="mt-7">
          <h2 className="font-semibold">Current group</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.members.map((member, index) => (
              <span
                key={`${member}-${index}`}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm"
              >
                {member}
              </span>
            ))}
          </div>
        </div>

        {error && <p className="mt-5 text-sm text-red-600">{error}</p>}

        {isCreator && (
          <div className="mt-8">
            <h2 className="font-semibold">Join requests ({pendingRequests.length})</h2>
            {pendingRequests.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No pending requests.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 p-4">
                    <span>{request.requester_name}</span>
                    <div className="flex gap-2">
                      <button disabled={working || full} onClick={() => handleReview(request.id, true)} className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:bg-neutral-300">Approve</button>
                      <button disabled={working} onClick={() => handleReview(request.id, false)} className="rounded-xl border border-black/10 px-4 py-2 text-sm disabled:opacity-50">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {!isCreator && (
            <button
              disabled={joined || full || working || ownRequest?.status === "pending"}
              onClick={handleRequest}
              className="rounded-2xl bg-black px-5 py-3 font-medium text-white disabled:bg-neutral-300"
            >
              {working ? "Submitting..." : joined ? "Joined" : ownRequest?.status === "pending"
                ? "Request pending" : full ? "Group Full" : !currentUserId
                ? "Log in to Request" : ownRequest?.status === "rejected"
                ? "Request Again" : "Request to Join"}
            </button>
          )}
          {ownRequest?.status === "rejected" && !joined && <p className="self-center text-sm text-neutral-600">Your previous request was declined.</p>}
          {(joined || isCreator) && <Link href={`/group/${plan.id}`} className="rounded-2xl border border-black/10 px-5 py-3 font-medium">View Group</Link>}
        </div>
        {(isCreator || isAdmin) && <div className="mt-10 border-t border-black/10 pt-6">
          <button type="button" disabled={working} onClick={() => void handleDelete()} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
            {working ? "Working..." : "Delete plan"}
          </button>
          <p className="mt-2 text-xs text-neutral-500">Permanently removes this plan and its group content.</p>
        </div>}
      </div>
    </section>
  );
}
