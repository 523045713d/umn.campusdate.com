"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [groupSize, setGroupSize] = useState(4);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser();
      if (!user) {
        router.replace("/login?next=/profile");
        return;
      }

      const profile = await getCurrentProfile();

      setEmail(user.email ?? "");
      setName(profile?.name ?? user.user_metadata?.name ?? "");
      setMajor(profile?.major ?? "");
      setYear(profile?.year ?? "");
      setGroupSize(profile?.preferred_group_size ?? 4);
      setLoading(false);
    }

    load();
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const user = await getCurrentUser();

    if (!user) {
      router.replace("/login?next=/profile");
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        name: name.trim(),
        major: major.trim() || null,
        year: year.trim() || null,
        preferred_group_size: groupSize,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      await supabase.auth.updateUser({
        data: { name: name.trim() },
      });
      setMessage("Profile saved.");
    }

    setSaving(false);
  }

  if (loading) {
    return <div className="py-16 text-neutral-600">Loading profile...</div>;
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="text-sm text-neutral-500">Your account</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Profile</h1>

      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-3xl border border-black/5 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            disabled
            value={email}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-neutral-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium">Major</span>
            <input
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Computer Science"
            />
          </label>

          <label>
            <span className="text-sm font-medium">Year</span>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Sophomore"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Preferred group size</span>
          <input
            type="number"
            min={2}
            max={12}
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value))}
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <button
          disabled={saving}
          className="rounded-2xl bg-black px-5 py-3 font-medium text-white disabled:bg-neutral-400"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
