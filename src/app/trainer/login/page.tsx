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
      // Later you can set localStorage/session here if you want protection
      router.push("/trainer/clients");
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Trainer Login</h1>
        <Link
          href="/"
          style={{ textDecoration: "underline", opacity: 0.9 }}
        >
          ← Back to entrance
        </Link>
      </header>

      <div className="t-card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--cardBorder)",
                background: "#0f1420",
                color: "#fff",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--cardBorder)",
                background: "#0f1420",
                color: "#fff",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--cardBorder)",
              background: "#1f2937",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Login as Tigo
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