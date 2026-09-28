"use client";

import { supabase } from "@/lib/supabase";

export type Notification = {
  id: string;
  recipient_id: string;
  plan_id: string;
  kind: "join_request" | "join_approved" | "join_declined" | "group_message";
  actor_name: string;
  plan_title: string;
  created_at: string;
  read_at: string | null;
};

export async function loadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from("notifications")
    .select("id,recipient_id,plan_id,kind,actor_name,plan_title,created_at,read_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase.from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId).is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", { p_notification_id: id });
  if (error) throw error;
}

export function notificationLink(item: Notification): string {
  return item.kind === "join_approved" || item.kind === "group_message"
    ? `/group/${item.plan_id}` : `/plan/${item.plan_id}`;
}

export function notificationText(item: Notification): string {
  switch (item.kind) {
    case "join_request": return `${item.actor_name} requested to join ${item.plan_title}.`;
    case "join_approved": return `Your request to join ${item.plan_title} was approved.`;
    case "join_declined": return `Your request to join ${item.plan_title} was declined.`;
    case "group_message": return `${item.actor_name} sent a message in ${item.plan_title}.`;
  }
}

export function watchNotifications(userId: string, refresh: () => void): () => void {
  const channel = supabase.channel(`notifications-${userId}-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, refresh)
    .subscribe();
  const interval = window.setInterval(refresh, 20000);
  return () => { window.clearInterval(interval); void supabase.removeChannel(channel); };
}
