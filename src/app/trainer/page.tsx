"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

type Program = {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  weeks: number;
};

type Trainee = {
  id: string;
  name: string;
  goal: string;
  lastCheckIn?: string;
};

const mockPrograms: Program[] = [
  { id: "p1", title: "Full-Body 3x/Week", level: "Beginner", weeks: 8 },
  { id: "p2", title: "Circuit training", level: "Intermediate", weeks: 12 },
  { id: "p3", title: "Cut & Conditioning", level: "Advanced", weeks: 6 },
  { id: "p4", title: "Bulking and ...", level: "Advanced", weeks: 6 },

];

const mockTrainees: Trainee[] = [
  { id: "t1", name: "Alex Johnson", goal: "Lose 5kg & improve cardio", lastCheckIn: "2025-10-22" },
  { id: "t2", name: "Maria Lopez", goal: "Build glutes & core", lastCheckIn: "2025-10-20" },
  { id: "t3", name: "Iman Z.", goal: "Stronger bench press (100kg)", lastCheckIn: "—" },
];

const tabs = ["Programs", "Trainees", "Sessions", "Analytics"] as const;
type Tab = typeof tabs[number];

export default function TrainerPage() {
  const [active, setActive] = useState<Tab>("Programs");
  const [query, setQuery] = useState("");

  const filteredPrograms = useMemo(() => {
    if (!query.trim()) return mockPrograms;
    const q = query.toLowerCase();
    return mockPrograms.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.level.toLowerCase().includes(q) ||
        String(p.weeks).includes(q)
    );
  }, [query]);

  const filteredTrainees = useMemo(() => {
    if (!query.trim()) return mockTrainees;
    const q = query.toLowerCase();
    return mockTrainees.filter(
      (t) => t.name.toLowerCase().includes(q) || t.goal.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <section style={{ width: "min(1100px, 92vw)" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800 }}>Trainer Dashboard</h1>
          <Link href="/" style={{ textDecoration: "underline", opacity: 0.9 }}>← Back to Home</Link>
        </header>

        {/* Tabs */}
        <nav
          aria-label="Sections"
          style={{
            display: "flex",
            gap: ".5rem",
            flexWrap: "wrap",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
            paddingBottom: ".5rem",
            marginBottom: "1rem",
          }}
        >
          {tabs.map((t) => {
            const isActive = t === active;
            return (
              <button
                key={t}
                onClick={() => setActive(t)}
                style={{
                  padding: ".65rem 1rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  border: isActive ? "1px solid rgba(255,255,255,0.7)" : "1px solid rgba(255,255,255,0.25)",
                  background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            );
          })}
        </nav>

        {/* Search / Quick actions */}
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <input
            placeholder={`Search ${active.toLowerCase()}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: "1 1 260px",
              padding: ".75rem 1rem",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.06)",
              outline: "none",
            }}
          />
          {active === "Programs" && (
            <button
              style={{
                padding: ".75rem 1rem",
                borderRadius: "10px",
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}
              onClick={() => alert("TODO: create new program")}
            >
              + New Program
            </button>
          )}
          {active === "Trainees" && (
            <button
              style={{
                padding: ".75rem 1rem",
                borderRadius: "10px",
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}
              onClick={() => alert("TODO: add new trainee")}
            >
              + Add Trainee
            </button>
          )}
        </div>

        {/* Panels */}
        {active === "Programs" && <ProgramsPanel items={filteredPrograms} />}
        {active === "Trainees" && <TraineesPanel items={filteredTrainees} />}
        {active === "Sessions" && <SessionsPanel />}
        {active === "Analytics" && <AnalyticsPanel />}

        <footer style={{ marginTop: "2rem", opacity: 0.7, fontSize: 13 }}>
          Tip: This dashboard is static for now. Later we can wire it to an API / DB (e.g., Supabase, Prisma + SQLite/Postgres).
        </footer>
      </section>
    </main>
  );
}

function Card(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.05)",
        borderRadius: "12px",
        padding: "1rem",
      }}
    >
      {props.children}
    </div>
  );
}

function Grid(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1rem",
      }}
    >
      {props.children}
    </div>
  );
}

function ProgramsPanel({ items }: { items: Program[] }) {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Grid>
        {items.map((p) => (
          <Card key={p.id}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{p.title}</h3>
            <p style={{ margin: ".35rem 0 .75rem 0", opacity: 0.85 }}>
              Level: {p.level} • Duration: {p.weeks} weeks
            </p>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <button
                style={{
                  padding: ".55rem .9rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
                onClick={() => alert(`Open ${p.title}`)}
              >
                Open
              </button>
              <button
                style={{
                  padding: ".55rem .9rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
                onClick={() => alert(`Assign ${p.title} to a trainee`)}
              >
                Assign
              </button>
            </div>
          </Card>
        ))}
      </Grid>
    </div>
  );
}

function TraineesPanel({ items }: { items: Trainee[] }) {
  return (
    <Card>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Goal</Th>
              <Th>Last Check-in</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <Td style={{ fontWeight: 700 }}>{t.name}</Td>
                <Td>{t.goal}</Td>
                <Td>{t.lastCheckIn ?? "—"}</Td>
                <Td>
                  <button
                    style={{
                      padding: ".45rem .75rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: "rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      marginRight: ".5rem",
                    }}
                    onClick={() => alert(`Open ${t.name}`)}
                  >
                    View
                  </button>
                  <button
                    style={{
                      padding: ".45rem .75rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: "rgba(255,255,255,0.08)",
                      cursor: "pointer",
                    }}
                    onClick={() => alert(`Message ${t.name}`)}
                  >
                    Message
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th(props: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: ".6rem .5rem",
        fontSize: 13,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        opacity: 0.7,
      }}
    >
      {props.children}
    </th>
  );
}
function Td(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: ".7rem .5rem", verticalAlign: "top", ...(props.style || {}) }}>
      {props.children}
    </td>
  );
}

function SessionsPanel() {
  return (
    <Grid>
      <Card>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Book Session</h3>
        <p style={{ margin: ".35rem 0 .75rem 0", opacity: 0.85 }}>
          Quick placeholder for scheduling sessions. Later: calendar integration.
        </p>
        <button
          style={{
            padding: ".55rem .9rem",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.08)",
            cursor: "pointer",
          }}
          onClick={() => alert("TODO: open calendar")}
        >
          New Session
        </button>
      </Card>
      <Card>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Upload Videos</h3>
        <p style={{ margin: ".35rem 0 .75rem 0", opacity: 0.85 }}>
          Upload form placeholder (S3/Supabase later).
        </p>
        <button
          style={{
            padding: ".55rem .9rem",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.08)",
            cursor: "pointer",
          }}
          onClick={() => alert("TODO: open uploader")}
        >
          Upload
        </button>
      </Card>
    </Grid>
  );
}

function AnalyticsPanel() {
  return (
    <Grid>
      <Card>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Active Trainees</h3>
        <p style={{ margin: ".35rem 0 0 0", opacity: 0.85, fontSize: 28, fontWeight: 800 }}>3</p>
      </Card>
      <Card>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Programs Running</h3>
        <p style={{ margin: ".35rem 0 0 0", opacity: 0.85, fontSize: 28, fontWeight: 800 }}>3</p>
      </Card>
      <Card>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Avg Check-in Gap</h3>
        <p style={{ margin: ".35rem 0 0 0", opacity: 0.85, fontSize: 28, fontWeight: 800 }}>2.7 days</p>
      </Card>
    </Grid>
  );
}