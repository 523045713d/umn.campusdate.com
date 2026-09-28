"use client";

import { displayNameFromUser, getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { matchPlan } from "@/lib/matching";
import type { Profile } from "@/lib/auth";
import type { Plan, PlanCategory } from "@/types";

type PlanRow = {
  id: string;
  creator_id: string | null;
  creator_name: string;
  title: string;
  description: string;
  interests: string[] | null;
  courses: string[] | null;
  category: PlanCategory | "Build";
  location: string;
  start_time: string;
  starts_at: string | null;
  duration: string | null;
  max_people: number;
  status: string;
  created_at: string;
  plan_members?: Array<{
    user_id: string | null;
    member_name: string;
  }>;
};

function mapPlan(row: PlanRow): Plan {
  const memberships = row.plan_members ?? [];

  return {
    id: row.id,
    creator: row.creator_name,
    creatorId: row.creator_id,
    title: row.title,
    category: row.category === "Build" ? "Others" : row.category,
    description: row.description,
    interests: row.interests ?? [],
    courses: row.courses ?? [],
    location: row.location,
    startsAt: row.starts_at ? new Date(row.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : row.start_time,
    startsAtIso: row.starts_at ?? null,
    duration: row.duration ?? "Flexible",
    maxPeople: row.max_people,
    currentMembers: memberships.length,
    matchScore: null,
    reasons: [],
    members: memberships.map((member) => member.member_name),
    memberIds: memberships
      .map((member) => member.user_id)
      .filter((id): id is string => Boolean(id)),
  };
}

const planSelect = `
  *,
  plan_members (
    user_id,
    member_name
  )
`;

export async function loadPlans(profile: Profile | null = null): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(planSelect)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadPlans:", error);
    throw error;
  }

  return (data ?? []).map((row) => withMatch(mapPlan(row as PlanRow), profile));
}

export async function loadMyGroups(): Promise<Plan[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("AUTH_REQUIRED");

  const { data: memberships, error: membershipError } = await supabase
    .from("plan_members")
    .select("plan_id")
    .eq("user_id", user.id)
    .eq("status", "confirmed");
  if (membershipError) throw membershipError;

  const ids = [...new Set((memberships ?? []).map((member) => member.plan_id as string))];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("plans")
    .select(planSelect)
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => mapPlan(row as PlanRow));
}

function withMatch(plan: Plan, profile: Profile | null): Plan {
  const match = matchPlan(plan, profile);
  return { ...plan, matchScore: match?.score ?? null, reasons: match?.reasons ?? [] };
}

export async function loadPlan(id: string, profile: Profile | null = null): Promise<Plan | null> {
  const { data, error } = await supabase
    .from("plans")
    .select(planSelect)
    .eq("id", id)
    .single();

  if (error) {
    console.error("loadPlan:", error);
    return null;
  }

  return withMatch(mapPlan(data as PlanRow), profile);
}

export async function createPlan(input: {
  title: string;
  category: PlanCategory;
  description: string;
  interests: string[];
  courses: string[];
  location: string;
  startTime: string;
  startsAtIso: string;
  maxPeople: number;
}): Promise<Plan> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const profile = await getCurrentProfile();
  const memberName = profile?.name?.trim() || displayNameFromUser(user);

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      creator_id: user.id,
      creator_name: memberName,
      title: input.title,
      category: input.category,
      description: input.description,
      interests: input.interests,
      courses: input.courses,
      location: input.location,
      start_time: input.startTime,
      starts_at: input.startsAtIso,
      duration: "Flexible",
      max_people: input.maxPeople,
    })
    .select()
    .single();

  if (planError) {
    console.error("createPlan:", planError);
    throw planError;
  }

  const { error: memberError } = await supabase.rpc("add_creator_membership", {
    p_plan_id: plan.id,
  });

  if (memberError) {
    console.error("create creator membership:", memberError);
    throw memberError;
  }

  const created = await loadPlan(plan.id);

  if (!created) {
    throw new Error("Created plan could not be loaded");
  }

  return created;
}

export type JoinRequest = {
  id: string;
  plan_id: string;
  user_id: string;
  requester_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export async function loadJoinRequests(planId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase.from("join_requests").select("*")
    .eq("plan_id", planId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as JoinRequest[];
}

export async function requestJoin(planId: string): Promise<void> {
  const { error } = await supabase.rpc("request_join", { p_plan_id: planId });
  if (error) throw error;
}

export async function reviewJoinRequest(requestId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc("review_join_request", {
    p_request_id: requestId,
    p_approve: approve,
  });
  if (error) throw error;
}

export type GroupMessage = {
  id: string;
  plan_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};

export async function loadGroupMessages(planId: string): Promise<GroupMessage[]> {
  const { data, error } = await supabase.from("group_messages")
    .select("id,plan_id,sender_id,sender_name,body,created_at")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as GroupMessage[]).reverse();
}

export async function sendGroupMessage(planId: string, body: string): Promise<void> {
  const { error } = await supabase.rpc("send_group_message", {
    p_plan_id: planId,
    p_body: body,
  });
  if (error) throw error;
}

export async function loadGroupAiPlan(planId: string): Promise<unknown> {
  const { data, error } = await supabase.from("groups")
    .select("ai_plan").eq("plan_id", planId).maybeSingle();
  if (error) throw error;
  return data?.ai_plan ?? null;
}
