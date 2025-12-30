// src/app/trainer/clients/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTrainees, Trainee } from "@/lib/traineeRepo";

export default function TrainerClientsPage() {
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerName, setTrainerName] = useState<string>("Tigo");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await listTrainees();
      if (!cancelled) {
        setTrainees(data);
        setLoading(false);
      }
    }

    load();

    // read persisted trainer name
    try {
      if (typeof window !== "undefined") {
        const n = localStorage.getItem("trainerName");
        if (n) setTrainerName(n);
      }
    } catch {}

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Coach TIGO – Trainees</h1>
            <div style={{ marginTop: 4, fontSize: 14, opacity: 0.95 }}>Welcome back, {trainerName}</div>
            <Link href="/trainer" style={{ textDecoration: "underline", opacity: 0.9 }}>
              ← Back to dashboard
            </Link>
      </header>
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <Link
            href="/trainer/clients"
            style={{
              padding: ".65rem 1rem",
              borderRadius: "10px",
              fontWeight: 800,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            Trainees (real table)
          </Link>

          <Link
            href="/trainee/programs?mode=trainer"
            style={{
              padding: ".65rem 1rem",
              borderRadius: "10px",
              fontWeight: 800,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            Exercise Library
          </Link>
        </div>
      <div className="t-card" style={{ overflowX: "auto" }}>
        {loading ? (
          <p style={{ fontSize: 14, opacity: 0.9 }}>Loading trainees…</p>
        ) : trainees.length === 0 ? (
          <p style={{ fontSize: 14, opacity: 0.9 }}>
            No trainees registered yet.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--cardBorder)",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--cardBorder)",
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--cardBorder)",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {trainees.map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: "8px 4px" }}>{t.full_name}</td>
                  <td style={{ padding: "8px 4px", opacity: 0.9 }}>
                    {t.email ?? "—"}
                  </td>
                    <td style={{ padding: "8px 4px" }}>
                      <Link
                        href={`/trainee/today?tid=${t.id}&mode=trainer`}
                        style={{
                          fontSize: 13,
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "1px solid var(--cardBorder)",
                          textDecoration: "none",
                          background: "#111827",
                        }}
                      >
                        Open plan
                      </Link>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
