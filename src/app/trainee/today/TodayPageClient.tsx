
// app/trainee/today/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getNotesForTrainee, setNotesForTrainee } from "@/lib/traineeStore";

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

export default function TodayPage() {
  const today = useMemo(() => new Date(), []);

  const searchParams = useSearchParams();
  const traineeId = searchParams.get("tid") ?? "self"; // "self" for normal trainee use

  // Calendar state
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [selected, setSelected] = useState<string>(toISODate(today));

  const [coachNotes, setCoachNotes] = useState<Record<string, string>>(
    () => getNotesForTrainee(traineeId)
  );


  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const daysGrid = useMemo(() => {
    const firstDay = new Date(cursor);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const month = firstDay.getMonth();
    const days: { date: Date; inMonth: boolean }[] = [];
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

  const prevMonth = () => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); };
  const nextMonth = () => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); };

  return (
    <>
      <header className="t-header">
        <h1 className="t-title">Today</h1>
        <Link href="/" style={{ textDecoration: "underline", opacity: 0.9 }}>← Home</Link>
      </header>

      <div className="t-today-grid">
        {/* Calendar + notes */}
        <div className="t-card">
          <div className="t-cal-head">
            <button onClick={prevMonth} aria-label="Previous month" className="t-cal-navbtn">‹</button>
            <div style={{ fontWeight: 700 }}>{monthLabel}</div>
            <button onClick={nextMonth} aria-label="Next month" className="t-cal-navbtn">›</button>
          </div>

          <div className="t-cal-week">
            {weekLabels.map((w) => <div key={w}>{w}</div>)}
          </div>

          <div className="t-cal-grid">
            {daysGrid.map(({ date, inMonth }) => {
              const iso = toISODate(date);
              const sel = isSelected(date);
              const classes = [
                "t-cal-day",
                !inMonth ? "t-cal-day--out" : "",
                sel ? "t-cal-day--sel" : "",
              ].join(" ");
              return (
                <button key={iso} onClick={() => setSelected(iso)} className={classes}>
                  <div style={{ opacity: inMonth ? 1 : 0.55 }}>{date.getDate()}</div>
                  {isToday(date) && <span className="t-cal-dot" />}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>
              Coach plan for <strong>{selected}</strong>
            </div>
                <textarea
                  value={coachNotes[selected] ?? ""}
                  onChange={(e) => {
                    const updated = { ...coachNotes, [selected]: e.target.value };
                    setCoachNotes(updated);
                    setNotesForTrainee(traineeId, updated); // 🔥 save to shared store
                  }}
                  placeholder="Notes, reminders, links…"
                  rows={4}
                  style={{
                    width: "100%",
                    background: "#0f1420",
                    color: "#fff",
                    border: "1px solid var(--cardBorder)",
                    borderRadius: 10,
                    padding: 10,
                    resize: "vertical",
                  }}
                />
          </div>
        </div>

        {/* Today program & meal */}
        <div style={{ display: "grid", gap: 12 }}>
          <section className="t-card">
            <h3>Todays Program</h3>
            <ul className="t-list">
              <li>Warm-up: 10 min incline walk</li>
              <li>Bench press 4×8</li>
              <li>Lat pulldown 4×10</li>
              <li>DB shoulder press 3×12</li>
              <li>Core circuit 10 min</li>
            </ul>
          </section>

          <section className="t-card">
            <h3>Todays Meal</h3>
            <ul className="t-list">
              <li>08:00 – Greek yogurt + whey + berries</li>
              <li>12:30 – Chicken breast, rice, salad</li>
              <li>17:00 – Pre-workout snack: banana + PB</li>
              <li>20:00 – Salmon, quinoa, veggies</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}