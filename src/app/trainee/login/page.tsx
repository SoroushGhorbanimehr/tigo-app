"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Trainee } from "@/lib/traineeRepo";

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
      const { data, error } = await supabase
        .from("trainees")
        .select("*")
        .eq("email", email.trim())
        .eq("password", password.trim())
        .maybeSingle();

      if (error) {
        console.error("Trainee login error", error);
        throw error;
      }
      if (!data) {
        setStatus("error");
        setErrorMsg("Invalid email or password");
        return;
      }

      const trainee = data as Trainee;
      router.push(`/trainee/today?tid=${trainee.id}`);
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
      </div>
    </div>
  );
}
