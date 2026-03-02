"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Trainee } from "@/lib/traineeRepo";

const TRAINER_USERNAME = "tigo";
const TRAINER_PASSWORD = "tigo";

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const id = identifier.trim();
    const pass = password.trim();

    try {
      // Trainer shortcut: hardcoded credentials
      if (id.toLowerCase() === TRAINER_USERNAME && pass === TRAINER_PASSWORD) {
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("trainerName", "Tigo");
          }
        } catch {}
        router.push("/trainer/clients");
        return;
      }

      // Trainee login via Supabase by email
      const hashed = await sha256Hex(pass);
      const { data, error } = await supabase
        .from("trainees")
        .select("*")
        .eq("email", id)
        .in("password", [pass, hashed])
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setStatus("error");
        setErrorMsg("Invalid credentials");
        return;
      }

      const trainee = data as Trainee;
      router.push(`/trainee/today?tid=${trainee.id}`);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Login failed");
    } finally {
      setStatus((prev) => (prev === "submitting" ? "idle" : prev));
    }
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Sign In</h1>
        <Link href="/" className="t-link" style={{ opacity: 0.9 }}>
          ← Home
        </Link>
      </header>

      <div className="t-card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Email or Username</span>
            <input
              className="t-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Password</span>
            <input
              className="t-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="t-btn t-btn--primary"
          >
            {status === "submitting" ? "Signing in…" : "Sign In"}
          </button>

          {status === "error" && (
            <p style={{ color: "var(--danger)", fontSize: 13 }}>{errorMsg}</p>
          )}
        </form>

        <p style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>
          Don’t have an account? <Link href="/trainee/register" className="t-link">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

