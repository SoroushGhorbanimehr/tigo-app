"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Simple helpers for dates
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function TraineePage() {
  const today = useMemo(() => new Date(), []);
  const [active, setActive] = useState<"today" | "programs" | "progress">(
    "today"
  );

  // Calendar state
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selected, setSelected] = useState<string>(toISODate(today));

  // Coach notes per day (local-only demo state)
  const [coachNotes, setCoachNotes] = useState<Record<string, string>>({});

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const daysGrid = useMemo(() => {
    const firstDay = new Date(cursor);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const month = firstDay.getMonth();

    const days: { date: Date; inMonth: boolean }[] = [];

    // start from Sunday of the first week shown
    const start = new Date(firstDay);
    start.setDate(1 - startWeekday);

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ date: d, inMonth: d.getMonth() === month });
    }
    return days;
  }, [cursor]);

  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const isToday = (d: Date) => toISODate(d) === toISODate(today);
  const isSelected = (d: Date) => toISODate(d) === selected;

  function prevMonth() {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - 1);
    setCursor(d);
  }
  function nextMonth() {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + 1);
    setCursor(d);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "1fr auto",
        background: "#0d0f13",
        color: "#fff",
      }}
    >
      {/* CONTENT */}
      <section style={{ padding: "1rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800 }}>Trainee</h1>
          <Link href="/" style={{ textDecoration: "underline", opacity: 0.9 }}>← Home</Link>
        </header>

        {/* Tabs content */}
        {active === "today" && (
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1.1fr 1fr", alignItems: "start" }}>
            {/* Left column: Mini calendar + notes */}
            <div
              style={{
                background: "#131722",
                border: "1px solid #1f2430",
                borderRadius: 12,
                padding: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <button onClick={prevMonth} aria-label="Previous month" style={navBtnStyle}>‹</button>
                <div style={{ fontWeight: 700 }}>{monthLabel}</div>
                <button onClick={nextMonth} aria-label="Next month" style={navBtnStyle}>›</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                {weekLabels.map((w) => (
                  <div key={w} style={{ textAlign: "center" }}>{w}</div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {daysGrid.map(({ date, inMonth }) => {
                  const iso = toISODate(date);
                  const sel = isSelected(date);
                  const todayFlag = isToday(date);
                  return (
                    <button
                      key={iso}
                      onClick={() => setSelected(iso)}
                      style={{
                        aspectRatio: "1 / 1",
                        borderRadius: 10,
                        border: sel ? "1px solid #4c84ff" : "1px solid #1f2430",
                        background: sel ? "#1a2133" : "#111520",
                        color: inMonth ? "#fff" : "#7b8499",
                        position: "relative",
                        fontWeight: sel ? 700 : 500,
                      }}
                    >
                      <div style={{ opacity: inMonth ? 1 : 0.55 }}>{date.getDate()}</div>
                      {todayFlag && (
                        <span style={{ position: "absolute", right: 6, top: 6, width: 6, height: 6, borderRadius: 6, background: "#36d399" }} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>Coach plan for <strong>{selected}</strong></div>
                <textarea
                  value={coachNotes[selected] ?? ""}
                  onChange={(e) => setCoachNotes({ ...coachNotes, [selected]: e.target.value })}
                  placeholder="Notes, reminders, links…"
                  rows={4}
                  style={{ width: "100%", background: "#0f1420", color: "#fff", border: "1px solid #1f2430", borderRadius: 10, padding: 10, resize: "vertical" }}
                />
              </div>
            </div>

            {/* Right column: Today program & meal */}
            <div style={{ display: "grid", gap: "1rem" }}>
              <Card title="Today's Program">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Warm-up: 10 min incline walk</li>
                  <li>Bench press 4×8</li>
                  <li>Lat pulldown 4×10</li>
                  <li>DB shoulder press 3×12</li>
                  <li>Core circuit 10 min</li>
                </ul>
              </Card>
              <Card title="Today's Meal">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>08:00 – Greek yogurt + whey + berries</li>
                  <li>12:30 – Chicken breast, rice, salad</li>
                  <li>17:00 – Pre-workout snack: banana + PB</li>
                  <li>20:00 – Salmon, quinoa, veggies</li>
                </ul>
              </Card>
            </div>
          </div>
        )}

        {active === "programs" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <Card title="Programs">
              <p style={{ marginTop: 0, opacity: 0.9 }}>
                Your assigned exercise blocks. (This is a placeholder list — hook to your data later.)
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { name: "Upper A", focus: "Chest/Back", days: "Mon", notes: "RPE 7–8" },
                  { name: "Lower A", focus: "Quads/Hams", days: "Tue", notes: "Tempo squats" },
                  { name: "Upper B", focus: "Shoulders/Arms", days: "Thu", notes: "Supersets" },
                  { name: "Lower B", focus: "Glutes/Calves", days: "Sat", notes: "Pause reps" },
                ].map((p) => (
                  <div key={p.name} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #1f2430",
                    background: "#121723",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>{p.focus} • {p.days}</div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{p.notes}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {active === "progress" && (
          <div>
            <Card title="Progress">
              <p style={{ marginTop: 0, opacity: 0.9 }}>
                We'll add charts and logs here next. 👍
              </p>
            </Card>
          </div>
        )}
      </section>

      {/* BOTTOM BAR */}
      <nav
        style={{
          position: "sticky",
          bottom: 0,
          backdropFilter: "blur(6px)",
          background: "rgba(13,15,19,0.7)",
          borderTop: "1px solid #1f2430",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          <TabButton label="Today" active={active === "today"} onClick={() => setActive("today")} />
          <TabButton label="Programs" active={active === "programs"} onClick={() => setActive("programs")} />
          <TabButton label="Progress" active={active === "progress"} onClick={() => setActive("progress")} />
        </div>
      </nav>
    </main>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.9rem 0.5rem",
        fontWeight: 700,
        letterSpacing: 0.2,
        border: "none",
        background: "transparent",
        color: active ? "#ffffff" : "#9aa3b2",
        position: "relative",
      }}
    >
      {label}
      <span
        style={{
          position: "absolute",
          left: "10%",
          right: "10%",
          bottom: 6,
          height: 2,
          background: active ? "#4c84ff" : "transparent",
          borderRadius: 2,
          transition: "background 160ms ease",
        }}
      />
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#131722", border: "1px solid #1f2430", borderRadius: 14, padding: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid #1f2430",
  background: "#0f1420",
  color: "#e6ebff",
  cursor: "pointer",
};