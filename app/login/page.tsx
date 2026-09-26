"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function getNextPath() {
  if (typeof window === "undefined") return "/discover";
  const value = new URLSearchParams(window.location.search).get("next");
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/discover";
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(getNextPath());
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const submittedName = name.trim();
    if (mode === "signup" && !submittedName) {
      setError("Please enter your name.");
      setSubmitting(false);
      return;
    }

    try {
      const next = getNextPath();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: submittedName },
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }

        setMessage("Account created. Check your email to confirm your account.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md py-10">
      <div className="rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm">
        <div className="text-sm text-neutral-500">Campus account</div>
        <h1 className="mt-2 text-3xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>

        <div className="mt-6 flex rounded-2xl bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium ${
              mode === "login" ? "bg-white shadow-sm" : "text-neutral-500"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium ${
              mode === "signup" ? "bg-white shadow-sm" : "text-neutral-500"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="text-sm font-medium">Name</span>
              <input
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
                placeholder="Enter your name"
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="you@umn.edu"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="At least 6 characters"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            disabled={submitting}
            className="w-full rounded-2xl bg-black px-5 py-3 font-medium text-white disabled:bg-neutral-400"
          >
            {submitting
              ? "Please wait..."
              : mode === "login"
              ? "Log in"
              : "Create account"}
          </button>
        </form>
      </div>
    </section>
  );
}
