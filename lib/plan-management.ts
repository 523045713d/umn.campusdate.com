"use client";

import { supabase } from "@/lib/supabase";

function managementError(error: { code?: string; message: string; details?: string }): Error {
  if (error.code === "PGRST202" || error.code === "42883") {
    return new Error("Plan management is not installed in this Supabase project. Apply migrations 009 and 010, then refresh the page.");
  }
  return new Error(error.details ? `${error.message} (${error.details})` : error.message);
}

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  created_at: string;
};

export type ManagedPlan = {
  id: string;
  title: string;
  creator_name: string;
  category: string;
  status: string;
  created_at: string;
};

export async function adminListUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw managementError(error);
  return (data ?? []) as ManagedUser[];
}

export async function adminListPlans(): Promise<ManagedPlan[]> {
  const { data, error } = await supabase.rpc("admin_list_plans");
  if (error) throw managementError(error);
  return (data ?? []) as ManagedPlan[];
}

export async function adminSetUserRole(userId: string, role: ManagedUser["role"]): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: role });
  if (error) throw managementError(error);
}

export async function deletePlan(planId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_plan", { p_plan_id: planId });
  if (error) throw managementError(error);
}
