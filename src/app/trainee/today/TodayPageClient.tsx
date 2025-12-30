"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDailyPlan, upsertDailyPlan } from "@/lib/dailyPlanRepo";
import { getTraineeById } from "@/lib/traineeRepo";

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
  const [traineeName, setTraineeName] = useState<string | null>(null);

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

  // Load trainee name for greeting (client mode only)
  useEffect(() => {
    let cancelled = false;
    async function loadName() {
      if (isTrainer) return;
      if (!traineeId || traineeId === "self") return;
      const t = await getTraineeById(traineeId);
      if (!cancelled) setTraineeName(t?.full_name ?? null);
    }
    loadName();
    return () => {
      cancelled = true;
    };
  }, [isTrainer, traineeId]);

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
  const formattedSelected = new Date(selected).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        {!isTrainer && (
          <div className="t-subtitle">Welcome back{traineeName ? `, ${traineeName}` : ""}</div>
        )}
        <div className="t-subtitle" aria-live="polite">{formattedSelected}</div>
      </div>

      <div className="t-today-grid">
        {/* Left: Calendar + coach note */}
        <div className="t-card t-card--hoverable">
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
            <div className="t-section-head">
              <div>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 2 }}>Coach note</div>
                <div className="t-subtitle" style={{ opacity: 0.7 }}>{selected}</div>
              </div>
              <div>
                {loadingPlan && <span className="t-chip t-chip--view">Loading…</span>}
                {!loadingPlan && !isTrainer && (
                  <span className="t-chip t-chip--view">View only</span>
                )}
                {!loadingPlan && isTrainer && (
                  <span className="t-chip t-chip--edit">Edit mode</span>
                )}
              </div>
            </div>

            <textarea
              value={plan.coach_note}
              onChange={(e) =>
                setPlan((p) => ({ ...p, coach_note: e.target.value }))
              }
              placeholder={isTrainer ? "Notes, reminders, links…" : "View only"}
              readOnly={!isTrainer}
              rows={5}
              className="t-textarea"
              style={{ ...readonlyStyle }}
            />

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              {isTrainer ? (
                <>
                  <button
                    onClick={handleSaveAll}
                    disabled={saveStatus === "saving"}
                    className="t-btn t-btn--primary"
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
          <section className="t-card t-card--hoverable">
            <div className="t-section-head" style={{ alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Program</h3>
              <span className="t-chip" style={{ marginLeft: "auto" }}>{selected}</span>
            </div>

            <textarea
              value={plan.program}
              onChange={(e) => setPlan((p) => ({ ...p, program: e.target.value }))}
              placeholder={isTrainer ? "Write the workout plan here…" : "View only"}
              readOnly={!isTrainer}
              rows={10}
              className="t-textarea"
              style={{ marginTop: 10, ...readonlyStyle }}
            />
          </section>

          <section className="t-card t-card--hoverable">
            <div className="t-section-head">
              <h3 style={{ margin: 0 }}>Meal</h3>
              <span className="t-chip">{selected}</span>
            </div>

            <textarea
              value={plan.meal}
              onChange={(e) => setPlan((p) => ({ ...p, meal: e.target.value }))}
              placeholder={isTrainer ? "Write the meal plan here…" : "View only"}
              readOnly={!isTrainer}
              rows={8}
              className="t-textarea"
              style={{ marginTop: 10, ...readonlyStyle }}
            />
          </section>
        </div>
      </div>
    </>
  );
}
