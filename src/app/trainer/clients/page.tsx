"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listTrainees, Trainee } from "@/lib/traineeRepo";

export default function TrainerClientsPage() {
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listTrainees();
      if (!cancelled) {
        setTrainees(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Coach Tigo – Clients</h1>
        <Link href="/" style={{ textDecoration: "underline", opacity: 0.9 }}>
          ← Home
        </Link>
      </header>

      <div className="t-card" style={{ maxWidth: 640, margin: "0 auto" }}>
        {loading ? (
          <p>Loading trainees…</p>
        ) : trainees.length === 0 ? (
          <p>No trainees yet. Ask them to register from /trainee/register.</p>
        ) : (
          <ul className="t-list">
            {trainees.map((t) => (
              <li
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div>
                  <div>{t.full_name}</div>
                  {t.email && (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{t.email}</div>
                  )}
                </div>
                <Link
                  href={`/trainee/today?tid=${t.id}`}
                  style={{
                    fontSize: 14,
                    textDecoration: "underline",
                    opacity: 0.9,
                  }}
                >
                  Open dashboard →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}