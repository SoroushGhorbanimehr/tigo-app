"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDailyPlan, upsertDailyPlan } from "@/lib/dailyPlanRepo";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type PlanState = {
  coach_note: string;
  program: string;
  meal: string;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function TodayPageClient() {
  const today = useMemo(() => new Date(), []);
  const searchParams = useSearchParams();

  const traineeId = searchParams.get("tid") ?? "self";
  const mode = searchParams.get("mode") ?? "trainee";
  const isTrainer = mode === "trainer";

  // Calendar state
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [selected, setSelected] = useState<string>(toISODate(today));

  // Daily plan state
  const [plan, setPlan] = useState<PlanState>({
    coach_note: "",
    program: "",
    meal: "",
  });

  const [loadingPlan, setLoadingPlan] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    setLoadingPlan(true);

    getDailyPlan(traineeId, selected)
      .then((p) => {
        if (cancelled) return;
        setPlan({
          coach_note: p?.coach_note ?? "",
          program: p?.program ?? "",
          meal: p?.meal ?? "",
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingPlan(false);
      });

    return () => {
      cancelled = true;
    };
  }, [traineeId, selected]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

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

  const prevMonth = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - 1);
    setCursor(d);
  };

  const nextMonth = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + 1);
    setCursor(d);
  };

  async function handleSaveAll() {
    if (!isTrainer) return; // 🔒 lock editing for trainees

    setSaveStatus("saving");
    try {
      await upsertDailyPlan({
        trainee_id: traineeId,
        date: selected,
        coach_note: plan.coach_note,
        program: plan.program,
        meal: plan.meal,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  const readonlyStyle = {
    opacity: isTrainer ? 1 : 0.85,
    cursor: isTrainer ? "text" : "not-allowed",
  } as const;

  return (
    <>
      <header className="t-header">
        <h1 className="t-title">Today</h1>
        <Link href="/" style={{ textDecoration: "underline", opacity: 0.9 }}>
          ← Home
        </Link>
      </header>

      <div className="t-today-grid">
        {/* Left: Calendar + coach note */}
        <div className="t-card">
          <div className="t-cal-head">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="t-cal-navbtn"
              type="button"
            >
              ‹
            </button>
            <div style={{ fontWeight: 700 }}>{monthLabel}</div>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="t-cal-navbtn"
              type="button"
            >
              ›
            </button>
          </div>

          <div className="t-cal-week">
            {weekLabels.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="t-cal-grid">
            {daysGrid.map(({ date, inMonth }) => {
              const iso = toISODate(date);
              const classes = [
                "t-cal-day",
                !inMonth ? "t-cal-day--out" : "",
                isSelected(date) ? "t-cal-day--sel" : "",
              ].join(" ");

              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={classes}
                  type="button"
                >
                  <div style={{ opacity: inMonth ? 1 : 0.55 }}>
                    {date.getDate()}
                  </div>
                  {isToday(date) && <span className="t-cal-dot" />}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 14,
                opacity: 0.9,
                marginBottom: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                Coach note for <strong>{selected}</strong>
              </span>
              {loadingPlan && <span style={{ fontSize: 12 }}>Loading…</span>}
              {!loadingPlan && !isTrainer && (
                <span style={{ fontSize: 12, opacity: 0.75 }}>View-only</span>
              )}
              {!loadingPlan && isTrainer && (
                <span style={{ fontSize: 12, opacity: 0.75 }}>Edit mode</span>
              )}
            </div>

            <textarea
              value={plan.coach_note}
              onChange={(e) =>
                setPlan((p) => ({ ...p, coach_note: e.target.value }))
              }
              placeholder={isTrainer ? "Notes, reminders, links…" : "View only"}
              readOnly={!isTrainer}
              rows={5}
              style={{
                width: "100%",
                background: "#0f1420",
                color: "#fff",
                border: "1px solid var(--cardBorder)",
                borderRadius: 10,
                padding: 10,
                resize: "vertical",
                ...readonlyStyle,
              }}
            />

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              {isTrainer ? (
                <>
                  <button
                    onClick={handleSaveAll}
                    disabled={saveStatus === "saving"}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--cardBorder)",
                      background: "#1f2937",
                      color: "#fff",
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                    type="button"
                  >
                    {saveStatus === "saving" ? "Saving…" : "Save changes"}
                  </button>

                  {saveStatus === "saved" && (
                    <span style={{ fontSize: 12, color: "#22c55e" }}>
                      Saved ✅
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span style={{ fontSize: 12, color: "#f97373" }}>
                      Error saving
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  Only Coach Tigo can edit Program/Meal/Notes.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Program + Meal (editable only for trainer) */}
        <div style={{ display: "grid", gap: 12 }}>
          <section className="t-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>Today’s Program</h3>
              <span style={{ fontSize: 12, opacity: 0.75 }}>{selected}</span>
            </div>

            <textarea
              value={plan.program}
              onChange={(e) =>
                setPlan((p) => ({ ...p, program: e.target.value }))
              }
              placeholder={isTrainer ? "Write the workout plan here…" : "View only"}
              readOnly={!isTrainer}
              rows={10}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#0f1420",
                color: "#fff",
                border: "1px solid var(--cardBorder)",
                borderRadius: 10,
                padding: 10,
                resize: "vertical",
                ...readonlyStyle,
              }}
            />
          </section>

          <section className="t-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>Today’s Meal</h3>
              <span style={{ fontSize: 12, opacity: 0.75 }}>{selected}</span>
            </div>

            <textarea
              value={plan.meal}
              onChange={(e) => setPlan((p) => ({ ...p, meal: e.target.value }))}
              placeholder={isTrainer ? "Write the meal plan here…" : "View only"}
              readOnly={!isTrainer}
              rows={8}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#0f1420",
                color: "#fff",
                border: "1px solid var(--cardBorder)",
                borderRadius: 10,
                padding: 10,
                resize: "vertical",
                ...readonlyStyle,
              }}
            />
          </section>
        </div>
      </div>
    </>
  );
}