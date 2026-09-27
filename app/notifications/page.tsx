"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadNotifications, markNotificationRead, notificationLink, notificationText, watchNotifications } from "@/lib/notifications";
import type { Notification } from "@/lib/notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    getCurrentUser().then(async (user) => {
      if (!active) return;
      if (!user) { router.replace("/login?next=/notifications"); return; }
      const refresh = () => { void loadNotifications(user.id).then((data) => {
        if (active) { setItems(data); setError(""); }
      }).catch(() => { if (active) setError("Could not load notifications."); }).finally(() => { if (active) setLoading(false); }); };
      refresh();
      if (active) stop = watchNotifications(user.id, refresh);
    }).catch(() => { if (active) { setError("Could not load notifications."); setLoading(false); } });
    return () => { active = false; stop?.(); };
  }, [router]);

  async function openNotification(item: Notification) {
    try {
      if (!item.read_at) await markNotificationRead(item.id);
      router.push(notificationLink(item));
    } catch {
      setError("Could not mark this notification as read. Please try again.");
    }
  }

  return <section className="mx-auto max-w-3xl">
    <h1 className="text-4xl font-semibold tracking-tight">Notifications</h1>
    <p className="mt-2 text-neutral-600">Join requests, decisions, and group messages.</p>
    {loading && <p className="mt-8 text-neutral-500">Loading notifications...</p>}
    {error && <p role="alert" className="mt-5 text-red-600">{error}</p>}
    {!loading && !error && items.length === 0 && <p className="mt-8 text-neutral-600">No notifications yet.</p>}
    <div className="mt-6 space-y-3">{items.map((item) => <div key={item.id} className={`rounded-2xl border p-5 ${item.read_at ? "border-black/5 bg-white" : "border-blue-200 bg-blue-50"}`}>
      <button type="button" onClick={() => void openNotification(item)} className="w-full text-left">
        <span className="font-medium">{notificationText(item)}</span>
        <span className="mt-2 block text-xs text-neutral-500">{new Date(item.created_at).toLocaleString()} · {item.read_at ? "Read" : "Unread"}</span>
      </button>
    </div>)}</div>
    <Link href="/group" className="mt-8 inline-block text-sm underline">My Groups</Link>
  </section>;
}
