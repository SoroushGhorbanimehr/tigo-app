"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function TraineeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      const user = data.user;
      if (!user) {
        setStatus("error");
        setErrorMsg("Invalid email or password");
        return;
      }

      router.push(`/trainee/today`);
    } catch {
      setStatus("error");
      setErrorMsg("Login failed");
    } finally {
      setStatus((prev) => (prev === "submitting" ? "idle" : prev));
    }
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Client</h1>
      </header>

      <div className="t-card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Email</span>
            <input className="t-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Password</span>
            <input className="t-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="t-btn t-btn--primary"
          >
            {status === "submitting" ? "Logging in…" : "Log in"}
          </button>

          {status === "error" && (
            <p style={{ color: "var(--danger)", fontSize: 13 }}>{errorMsg}</p>
          )}
        </form>

        <p style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>
          Prefer a code? <a href="/trainee/otp" className="t-link">Sign in with code</a>
        </p>
      </div>
    </div>
  );
}
