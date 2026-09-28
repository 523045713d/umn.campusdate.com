"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  role: "student" | "admin";
  name: string;
  email: string;
  major: string | null;
  year: string | null;
  interests: string[] | null;
  courses: string[] | null;
  preferred_group_size: number | null;
  availability_slots: string[] | null;
  availability_timezone: string | null;
  avatar_url: string | null;
};

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.name !== "AuthSessionMissingError") {
      console.error("getCurrentUser:", error);
    }
    return null;
  }

  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getCurrentProfile:", error);
    return null;
  }

  return data as Profile | null;
}

export function displayNameFromUser(user: User): string {
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";

  if (metadataName) return metadataName;

  const emailName = user.email?.split("@")[0]?.trim();
  return emailName || "Student";
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
