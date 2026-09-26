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
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(getNextPath());
    });
  }, [router]);

  async function resendSignupConfirmation() {
    const targetEmail = email.trim();

    if (!targetEmail) {
      setError("Enter your email first.");
      return;
    }

    setResendingConfirmation(true);
    setError("");
    setMessage("");

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
      });

      if (resendError) {
        if (resendError.code === "over_email_send_rate_limit") {
          setError("Too many confirmation emails were requested. Please wait and try again.");
          return;
        }

        setError(
          "Could not resend the confirmation email. If you already confirmed this account, switch to Log in."
        );
        return;
      }

      setMessage(
        "If this email has an unconfirmed account, a confirmation email has been sent. Check your inbox and spam folder."
      );
    } catch {
      setError("Could not resend the confirmation email. Please try again.");
    } finally {
      setResendingConfirmation(false);
    }
  }

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

        if (signUpError) {
          setCanResendConfirmation(true);

          if (
            signUpError.code === "user_already_exists" ||
            signUpError.code === "email_exists"
          ) {
            setMessage(
              "A sign-up may already be in progress for this email. Resend the confirmation email below, or switch to Log in if you already confirmed it."
            );
            return;
          }

          throw signUpError;
        }

        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }

        setCanResendConfirmation(true);
        setMessage(
          "Check your email for a confirmation link. If you already tried signing up or the email did not arrive, resend it below."
        );
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
      if (mode === "signup") {
        setCanResendConfirmation(true);
      }

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

          {mode === "signup" && canResendConfirmation && (
            <button
              type="button"
              onClick={resendSignupConfirmation}
              disabled={submitting || resendingConfirmation}
              className="w-full rounded-2xl border border-black/10 px-5 py-3 font-medium disabled:text-neutral-400"
            >
              {resendingConfirmation
                ? "Sending confirmation email..."
                : "Resend confirmation email"}
            </button>
          )}

          <button
            disabled={submitting || resendingConfirmation}
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
