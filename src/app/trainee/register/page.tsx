"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { registerTrainee } from "@/lib/traineeRepo";

export default function TraineeRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !password.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const trainee = await registerTrainee(
        fullName.trim(),
        email.trim(),
        password.trim()
      );
      router.push(`/trainee/today?tid=${trainee.id}`);
    } catch (err: unknown) {
      setStatus("error");
      if (err instanceof Error) {
        setErrorMsg(err.message || "Failed to register trainee");
      } else {
        setErrorMsg("Failed to register trainee");
      }
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Trainee Registration</h1>
      </header>

      <div className="t-card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Full name *</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
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
            <span>Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <span>Password *</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            disabled={status === "submitting"}
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
            {status === "submitting" ? "Registering…" : "Register"}
          </button>

          {status === "error" && (
            <p style={{ color: "#f97373", fontSize: 13 }}>{errorMsg}</p>
          )}
        </form>
      </div>
    </div>
  );
}