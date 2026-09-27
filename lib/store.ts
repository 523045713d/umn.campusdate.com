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
  category: PlanCategory;
  location: string;
  start_time: string;
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
    category: row.category,
    description: row.description,
    location: row.location,
    startsAt: row.start_time,
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
  location: string;
  startTime: string;
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
      location: input.location,
      start_time: input.startTime,
      duration: "Flexible",
      max_people: input.maxPeople,
    })
    .select()
    .single();

  if (planError) {
    console.error("createPlan:", planError);
    throw planError;
  }

  const { error: memberError } = await supabase
    .from("plan_members")
    .insert({
      plan_id: plan.id,
      user_id: user.id,
      member_name: memberName,
      role: "creator",
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

export async function joinPlan(id: string): Promise<Plan | null> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const current = await loadPlan(id);
  if (!current) return null;

  if (current.memberIds.includes(user.id)) {
    return current;
  }

  if (current.currentMembers >= current.maxPeople) {
    return current;
  }

  const profile = await getCurrentProfile();
  const memberName = profile?.name?.trim() || displayNameFromUser(user);

  const { error } = await supabase.from("plan_members").insert({
    plan_id: id,
    user_id: user.id,
    member_name: memberName,
    role: "member",
  });

  if (error) {
    console.error("joinPlan:", error);
    throw error;
  }

  return loadPlan(id);
}
