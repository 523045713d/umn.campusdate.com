"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function Nav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          <Link href="/group">My Group</Link>

          {user ? (
            <>
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
