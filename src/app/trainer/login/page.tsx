"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const TRAINER_USER = "tigo";
const TRAINER_PASS = "coach123";

export default function TrainerLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (user === TRAINER_USER && pass === TRAINER_PASS) {
      router.push("/trainer/clients");
    } else {
      setErrorMsg("Invalid credentials");
    }
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Trainer Login</h1>
      </header>

      <div className="t-card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Username</span>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
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
              value={pass}
              onChange={(e) => setPass(e.target.value)}
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
            }}
          >
            Login
          </button>

          {errorMsg && (
            <p style={{ color: "#f97373", fontSize: 13 }}>{errorMsg}</p>
          )}
        </form>
      </div>
    </div>
  );
}