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

  const stats = useMemo(() => {
    const total = trainees.length;
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const recent = trainees.filter((t) => {
      if (!t.created_at) return false;
      const ts = new Date(t.created_at).getTime();
      return now - ts <= weekMs;
    }).length;
    const withEmail = trainees.filter((t) => !!t.email).length;
    return { total, recent, withEmail };
  }, [trainees]);

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
      <header className="t-header" style={{
        background: "linear-gradient(180deg, rgba(31,41,55,0.7), transparent)",
        borderRadius: 12,
        paddingBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="t-title" style={{ marginBottom: 6 }}>Coach TIGO – Clients</h1>
            <div style={{ fontSize: 14, opacity: 0.95 }}>Welcome back, <strong>{trainerName}</strong></div>
          </div>
          <Link href="/trainer" className="t-link" style={{ opacity: 0.9, alignSelf: "center" }}>
            ← Back to dashboard
          </Link>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <Link href="/trainer/clients" className="t-btn t-btn--ghost" style={{ textDecoration: "none" }}>Trainees</Link>
          <Link href="/trainee/programs?mode=trainer" className="t-btn t-btn--ghost" style={{ textDecoration: "none" }}>Exercise Library</Link>
          <Link href="/trainee/recipes?mode=trainer" className="t-btn t-btn--ghost" style={{ textDecoration: "none" }}>Recipe Library</Link>
        </div>
      </header>

      {/* Stats */}
      <section className="t-today-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 12 }}>
        <div className="t-card">
          <div style={{ fontSize: 12, opacity: 0.8 }}>Total Trainees</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.total}</div>
        </div>
        <div className="t-card">
          <div style={{ fontSize: 12, opacity: 0.8 }}>Joined This Week</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.recent}</div>
        </div>
        <div className="t-card">
          <div style={{ fontSize: 12, opacity: 0.8 }}>With Email</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{stats.withEmail}</div>
        </div>
      </section>
      <div className="t-card" style={{ overflowX: "auto" }}>
        {/* Controls */}
        <div className="t-row" style={{ justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
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
                width: 280,
                maxWidth: "100%",
                background: "#0f1420",
                color: "#e6ebff",
                border: "1px solid var(--cardBorder)",
                borderRadius: 999,
                padding: "10px 14px",
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
          <div className="t-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>No trainees yet</div>
            <p style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>Share your sign-up link to get started.</p>
            <div style={{ marginTop: 10 }}>
              <Link href="/trainee/register" className="t-btn t-btn--primary" style={{ textDecoration: "none" }}>
                Invite trainee
              </Link>
            </div>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 8px",
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
                    padding: "10px 8px",
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
                    padding: "10px 8px",
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
                    padding: "10px 8px",
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
                    background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.03)",
                    transition: "background 160ms ease",
                  }}
                >
                  <td style={{ padding: "10px 8px" }}>
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
                          background: "linear-gradient(180deg, #1a2133, #111827)",
                          border: "1px solid var(--cardBorder)",
                        }}
                      >
                        {initials(t.full_name || "?")}
                      </div>
                      <div style={{ fontWeight: 700 }}>{t.full_name}</div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 8px", opacity: 0.9 }}>{t.email ?? "—"}</td>
                  <td style={{ padding: "10px 8px", opacity: 0.9 }}>{fmtDate(t.created_at)}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <Link
                      href={`/trainee/today?tid=${t.id}&mode=trainer`}
                      style={{
                        fontSize: 13,
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid var(--cardBorder)",
                        textDecoration: "none",
                        background: "linear-gradient(180deg, #2a3c66, #1f2937)",
                        color: "#e6ebff",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
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
