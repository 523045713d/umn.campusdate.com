"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { unreadNotificationCount, watchNotifications } from "@/lib/notifications";

export function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let active = true;
    const refresh = () => { void unreadNotificationCount(user.id).then((count) => { if (active) setUnread(count); }).catch(() => { if (active) setUnread(0); }); };
    refresh();
    const stop = watchNotifications(user.id, refresh);
    return () => { active = false; stop(); };
  }, [user?.id]);

  async function handleSignOut() {
    await signOut();
    window.location.href = "/";
  }

  return (
    <nav className="border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Campus Project
        </Link>

        <div className="flex items-center gap-5 text-sm text-neutral-700">
          <Link href="/discover">Discover</Link>
          <Link href="/create">Create</Link>
          <Link href="/group">My Groups</Link>

          {user ? (
            <>
              <Link href="/notifications" className="font-medium">Notifications{unread > 0 && <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white" aria-label={`${unread} unread notifications`}>{unread > 99 ? "99+" : unread}</span>}</Link>
              <Link href="/profile" className="max-w-40 truncate">
                {user.user_metadata?.name || user.email || "Profile"}
              </Link>
              <button onClick={handleSignOut} className="text-neutral-500">
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-black px-4 py-2 font-medium text-white"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
