"use client";

import { supabase } from "@/lib/supabase";

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
  if (error) throw error;
  return (data ?? []) as ManagedUser[];
}

export async function adminListPlans(): Promise<ManagedPlan[]> {
  const { data, error } = await supabase.rpc("admin_list_plans");
  if (error) throw error;
  return (data ?? []) as ManagedPlan[];
}

export async function adminSetUserRole(userId: string, role: ManagedUser["role"]): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function deletePlan(planId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_plan", { p_plan_id: planId });
  if (error) throw error;
}
