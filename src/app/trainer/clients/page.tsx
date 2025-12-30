// src/app/trainer/clients/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

  // UI state
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "email" | "joined">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(newKey: "name" | "email" | "joined") {
    if (sortBy === newKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(newKey);
      setSortDir("asc");
    }
  }

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? trainees.filter((t) => {
          const name = (t.full_name || "").toLowerCase();
          const email = (t.email || "").toLowerCase();
          return name.includes(q) || email.includes(q);
        })
      : trainees;

    const arr = base.slice();
    arr.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortBy === "name") {
        va = (a.full_name || "").toLowerCase();
        vb = (b.full_name || "").toLowerCase();
      } else if (sortBy === "email") {
        va = (a.email || "").toLowerCase();
        vb = (b.email || "").toLowerCase();
      } else {
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [trainees, query, sortBy, sortDir]);

  function initials(name: string) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }

  function fmtDate(iso?: string) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return "—";
    }
  }

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
        {/* Controls */}
        <div className="t-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {loading ? "Loading…" : `${filteredSorted.length} trainee${filteredSorted.length === 1 ? "" : "s"}`}
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="search"
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: 260,
                maxWidth: "100%",
                background: "#0f1420",
                color: "#e6ebff",
                border: "1px solid var(--cardBorder)",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
                boxShadow: query ? "0 0 0 3px var(--ring)" : "none",
              }}
              aria-label="Search trainees"
            />
          </div>
        </div>
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
                    position: "sticky",
                    top: 0,
                    background: "var(--card)",
                  }}
                  onClick={() => toggleSort("name")}
                  role="button"
                  aria-sort={sortBy === "name" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  title="Sort by name"
                  className="sortable"
                >
                  Name {sortBy === "name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--cardBorder)",
                    position: "sticky",
                    top: 0,
                    background: "var(--card)",
                  }}
                  onClick={() => toggleSort("email")}
                  role="button"
                  aria-sort={sortBy === "email" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  title="Sort by email"
                >
                  Email {sortBy === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--cardBorder)",
                    position: "sticky",
                    top: 0,
                    background: "var(--card)",
                  }}
                  onClick={() => toggleSort("joined")}
                  role="button"
                  aria-sort={sortBy === "joined" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  title="Sort by joined date"
                >
                  Joined {sortBy === "joined" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--cardBorder)",
                    position: "sticky",
                    top: 0,
                    background: "var(--card)",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((t, idx) => (
                <tr
                  key={t.id}
                  style={{
                    background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    transition: "background 160ms ease",
                  }}
                >
                  <td style={{ padding: "8px 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        aria-hidden
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#e6ebff",
                          background: "#1a2133",
                          border: "1px solid var(--cardBorder)",
                        }}
                      >
                        {initials(t.full_name || "?")}
                      </div>
                      <div style={{ fontWeight: 700 }}>{t.full_name}</div>
                    </div>
                  </td>
                  <td style={{ padding: "8px 4px", opacity: 0.9 }}>{t.email ?? "—"}</td>
                  <td style={{ padding: "8px 4px", opacity: 0.9 }}>{fmtDate(t.created_at)}</td>
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
