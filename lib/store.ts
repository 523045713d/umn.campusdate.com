"use client";

import { supabase } from "@/lib/supabase";
import type { Plan, PlanCategory } from "@/types";

type PlanRow = {
  id: string;
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
    member_name: string;
  }>;
};

function mapPlan(row: PlanRow): Plan {
  const members =
    row.plan_members?.map((member) => member.member_name) ?? [];

  return {
    id: row.id,
    creator: row.creator_name,
    title: row.title,
    category: row.category,
    description: row.description,
    location: row.location,
    startsAt: row.start_time,
    duration: row.duration ?? "Flexible",
    maxPeople: row.max_people,
    currentMembers: members.length,
    matchScore: 88,
    reasons: [
      "Availability overlap",
      "Shared activity interest",
      "Compatible group size",
    ],
    members,
  };
}

export async function loadPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(`
      *,
      plan_members (
        member_name
      )
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadPlans:", error);
    throw error;
  }

  return (data ?? []).map((row) => mapPlan(row as PlanRow));
}

export async function loadPlan(id: string): Promise<Plan | null> {
  const { data, error } = await supabase
    .from("plans")
    .select(`
      *,
      plan_members (
        member_name
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("loadPlan:", error);
    return null;
  }

  return mapPlan(data as PlanRow);
}

export async function createPlan(input: {
  title: string;
  category: PlanCategory;
  description: string;
  location: string;
  startTime: string;
  maxPeople: number;
}): Promise<Plan> {
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      creator_name: "You",
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
      member_name: "You",
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
  const current = await loadPlan(id);

  if (!current) return null;

  if (current.members.includes("You")) {
    return current;
  }

  if (current.currentMembers >= current.maxPeople) {
    return current;
  }

  const { error } = await supabase
    .from("plan_members")
    .insert({
      plan_id: id,
      member_name: "You",
      role: "member",
    });

  if (error) {
    console.error("joinPlan:", error);
    throw error;
  }

  return loadPlan(id);
}