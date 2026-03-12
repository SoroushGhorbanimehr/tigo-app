"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Phase = "request" | "verify";

export default function TraineeOtpPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "sent">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setStatus("sent");
      setPhase("verify");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      if (status === "submitting") setStatus("idle");
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      if (!data.user) throw new Error("Invalid code");
      router.replace("/trainee/today");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Verification failed");
    } finally {
      if (status === "submitting") setStatus("idle");
    }
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Code Sign In</h1>
        <Link href="/trainee/login" className="t-link" style={{ opacity: 0.9 }}>
          ← Password login
        </Link>
      </header>

      <div className="t-card" style={{ maxWidth: 420, margin: "0 auto" }}>
        {phase === "request" ? (
          <form onSubmit={handleRequest} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Email</span>
              <input
                className="t-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="t-btn t-btn--primary"
            >
              {status === "submitting" ? "Sending…" : "Send code"}
            </button>

            {status === "error" && (
              <p style={{ color: "var(--danger)", fontSize: 13 }}>{errorMsg}</p>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerify} style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              We emailed a 6-digit code to {email}. Enter it below.
            </div>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Code</span>
              <input
                className="t-input"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="t-btn t-btn--primary"
            >
              {status === "submitting" ? "Verifying…" : "Verify & continue"}
            </button>

            {status === "error" && (
              <p style={{ color: "var(--danger)", fontSize: 13 }}>{errorMsg}</p>
            )}

            <button
              type="button"
              className="t-btn"
              onClick={() => setPhase("request")}
            >
              Resend code
            </button>
          </form>
        )}

        <p style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>
          Don’t have an account? <Link href="/trainee/register" className="t-link">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

