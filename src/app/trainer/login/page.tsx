// src/app/trainer/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TRAINER_USERNAME = "tigo";
const TRAINER_PASSWORD = "tigo";

export default function TrainerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "error">("idle");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (
      username.trim() === TRAINER_USERNAME &&
      password === TRAINER_PASSWORD
    ) {
      // Store trainer display name for greeting
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("trainerName", username.trim() || "Tigo");
        }
      } catch {}
      // Later you can set session for protection
      router.push("/trainer/clients");
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Trainer</h1>
        <Link href="/" className="t-link" style={{ opacity: 0.9 }}>
          ← Back
        </Link>
      </header>

      <div className="t-card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Username</span>
            <input className="t-input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Password</span>
            <input className="t-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <button
            type="submit"
            className="t-btn t-btn--primary"
            >
            Log in
          </button>

          {status === "error" && (
            <p style={{ color: "#f97373", fontSize: 13 }}>
              Invalid credentials. Try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
