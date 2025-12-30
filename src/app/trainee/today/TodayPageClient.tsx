"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDailyPlan, upsertDailyPlan } from "@/lib/dailyPlanRepo";
import { getTraineeById } from "@/lib/traineeRepo";
import { renderMarkdown } from "@/lib/markdown";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type PlanState = {
  coach_note: string;
  program: string;
  meal: string;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function WeekIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="6.5" y1="13.5" x2="6.5" y2="17"/>
      <line x1="10.5" y1="13.5" x2="10.5" y2="17"/>
      <line x1="14.5" y1="13.5" x2="14.5" y2="17"/>
      <line x1="18" y1="13.5" x2="18" y2="17"/>
    </svg>
  );
}

function MonthIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="8" y1="9" x2="8" y2="21"/>
      <line x1="13" y1="9" x2="13" y2="21"/>
      <line x1="18" y1="9" x2="18" y2="21"/>
    </svg>
  );
}

function TodayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="7"/>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
      <line x1="12" y1="3" x2="12" y2="5"/>
      <line x1="12" y1="19" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="5" y2="12"/>
      <line x1="19" y1="12" x2="21" y2="12"/>
    </svg>
  );
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
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  // Touch swipe state for week view
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragState = useMemo(() => ({ startX: 0, startY: 0, active: false }), []);
  const lastDXRef = useMemo(() => ({ val: 0 }), []);
  const lastDYRef = useMemo(() => ({ val: 0 }), []);

  // Daily plan state
  const [plan, setPlan] = useState<PlanState>({
    coach_note: "",
    program: "",
    meal: "",
  });

  const [loadingPlan, setLoadingPlan] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  // Editor view modes (trainer only)
  const [modeCoach, setModeCoach] = useState<"write" | "preview">("preview");
  const [modeProgram, setModeProgram] = useState<"write" | "preview">("preview");
  const [modeMeal, setModeMeal] = useState<"write" | "preview">("preview");

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

  const goToToday = () => {
    const d = new Date();
    setSelected(toISODate(d));
    const c = new Date(d);
    c.setDate(1);
    setCursor(c);
  };

  const prev = () => {
    if (viewMode === "month") {
      const d = new Date(cursor);
      d.setMonth(d.getMonth() - 1);
      setCursor(d);
    } else {
      const d = new Date(selected);
      d.setDate(d.getDate() - 7);
      setSelected(toISODate(d));
      const c = new Date(d);
      c.setDate(1);
      setCursor(c);
    }
  };

  const next = () => {
    if (viewMode === "month") {
      const d = new Date(cursor);
      d.setMonth(d.getMonth() + 1);
      setCursor(d);
    } else {
      const d = new Date(selected);
      d.setDate(d.getDate() + 7);
      setSelected(toISODate(d));
      const c = new Date(d);
      c.setDate(1);
      setCursor(c);
    }
  };

  // Touch handlers (week view swipe)
  const onTouchStartWeek = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    dragState.startX = t.clientX;
    dragState.startY = t.clientY;
    dragState.active = true;
    setDragging(true);
    setDragX(0);
    lastDXRef.val = 0;
    lastDYRef.val = 0;
  };

  const onTouchMoveWeek = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!dragState.active) return;
    const t = e.touches[0];
    const dx = t.clientX - dragState.startX;
    const dy = t.clientY - dragState.startY;
    lastDXRef.val = dx;
    lastDYRef.val = dy;
    // Only show horizontal drag feedback if moving mostly sideways
    if (Math.abs(dx) > Math.abs(dy)) {
      const clamped = Math.max(-40, Math.min(40, dx));
      setDragX(clamped);
    }
  };

  const onTouchEndWeek = () => {
    const dx = lastDXRef.val;
    const dy = lastDYRef.val;
    const horiz = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50;
    if (horiz) {
      if (dx < 0) next();
      else prev();
    }
    setDragging(false);
    setDragX(0);
    dragState.active = false;
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

  // Refs for editors + autosize
  const coachRef = useRef<HTMLTextAreaElement | null>(null);
  const programRef = useRef<HTMLTextAreaElement | null>(null);
  const mealRef = useRef<HTMLTextAreaElement | null>(null);

  function autosize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.max(80, el.scrollHeight) + "px";
  }

  useEffect(() => {
    autosize(coachRef.current);
    autosize(programRef.current);
    autosize(mealRef.current);
  }, [plan.coach_note, plan.program, plan.meal]);

  function insertAtCursor(ref: React.RefObject<HTMLTextAreaElement>, text: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const nextVal = before + text + after;
    if (ref === coachRef) setPlan((p) => ({ ...p, coach_note: nextVal }));
    if (ref === programRef) setPlan((p) => ({ ...p, program: nextVal }));
    if (ref === mealRef) setPlan((p) => ({ ...p, meal: nextVal }));
    // restore cursor
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = start + text.length;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
      autosize(el);
    });
  }

  function wrapSelection(
    ref: React.RefObject<HTMLTextAreaElement>,
    prefix: string,
    suffix: string,
    placeholder = "text"
  ) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const sel = el.value.slice(start, end) || placeholder;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const nextVal = before + prefix + sel + suffix + after;
    if (ref === coachRef) setPlan((p) => ({ ...p, coach_note: nextVal }));
    if (ref === programRef) setPlan((p) => ({ ...p, program: nextVal }));
    if (ref === mealRef) setPlan((p) => ({ ...p, meal: nextVal }));
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = start + prefix.length + sel.length + suffix.length;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
      autosize(el);
    });
  }

  type ToolbarProps = {
    modeKey: "coach" | "program" | "meal";
    refEl: React.RefObject<HTMLTextAreaElement>;
    clear: () => void;
    insert: (ref: React.RefObject<HTMLTextAreaElement>, text: string) => void;
    presets?: "program" | "meal";
  };

  function EditorToolbar({ modeKey, refEl, clear, insert, presets }: ToolbarProps) {
    return (
      <div className="t-editor-toolbar" style={{ marginBottom: 8 }}>
        <button className="t-toolbtn" type="button" title="Heading 1" onClick={() => insert(refEl, ("# "))}>H1</button>
        <button className="t-toolbtn" type="button" title="Heading 2" onClick={() => insert(refEl, ("## "))}>H2</button>
        <button className="t-toolbtn" type="button" title="Paragraph" onClick={() => insert(refEl, ("\n\n"))}>P</button>
        <button className="t-toolbtn" type="button" title="Bold" onClick={() => wrapSelection(refEl, "**", "**")}>B</button>
        <button className="t-toolbtn" type="button" title="Italic" onClick={() => wrapSelection(refEl, "*", "*")}>I</button>
        <button className="t-toolbtn" type="button" title="Code" onClick={() => wrapSelection(refEl, "`", "`")}>Code</button>
        <button className="t-toolbtn" type="button" title="Bulleted list" onClick={() => insert(refEl, ("\n- "))}>•</button>
        <button className="t-toolbtn" type="button" title="Numbered list" onClick={() => insert(refEl, ("\n1. "))}>1.</button>
        <button className="t-toolbtn" type="button" title="Checklist" onClick={() => insert(refEl, ("\n- [ ] "))}>☑</button>
        <button className="t-toolbtn" type="button" title="Link" onClick={() => insert(refEl, ("[text](https://)"))}>🔗</button>
        <span style={{ width: 8 }} />
        {presets === "program" && (
          <>
            <button className="t-toolbtn" type="button" onClick={() => insert(refEl, ("\n\nWarm-up\n- 5 min easy jog\n- Mobility drills\n\nMain\n- 3x10 Squats (RPE 7)\n- 3x10 Lunges each side\n\nFinisher\n- 3x30s Plank\n"))}>Template</button>
            <button className="t-toolbtn" type="button" onClick={() => insert(refEl, ("\n- 3 x 12 @ moderate\n"))}>Sets x Reps</button>
            <button className="t-toolbtn" type="button" onClick={() => insert(refEl, ("\nA1) Push-ups\nA2) Rows\n(3 rounds)\n"))}>Superset</button>
          </>
        )}
        {presets === "meal" && (
          <>
            <button className="t-toolbtn" type="button" onClick={() => insert(refEl, ("\n\nBreakfast: \nLunch: \nSnack: \nDinner: \nHydration: 2L water\n"))}>Template</button>
            <button className="t-toolbtn" type="button" onClick={() => insert(refEl, ("\n- Protein\n- Carbs\n- Veggies\n"))}>Checklist</button>
          </>
        )}
        <span style={{ width: 8 }} />
        <button className="t-toolbtn" type="button" onClick={clear}>Clear</button>
      </div>
    );
  }

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
          <div className="t-cal-head" style={{ gap: 10 }}>
            <button
              onClick={prev}
              aria-label="Previous month"
              className="t-cal-navbtn"
              type="button"
            >
              ‹
            </button>
            <div style={{ fontWeight: 700 }}>{monthLabel}</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <div className="t-segment" role="tablist" aria-label="Calendar view">
                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  aria-pressed={viewMode === "week"}
                  role="tab"
                  aria-selected={viewMode === "week"}
                  className="t-segment-btn"
                  title="Week view"
                  aria-label="Week view"
                >
                  <WeekIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  aria-pressed={viewMode === "month"}
                  role="tab"
                  aria-selected={viewMode === "month"}
                  className="t-segment-btn"
                  title="Month view"
                  aria-label="Month view"
                >
                  <MonthIcon />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="t-cal-navbtn"
                type="button"
                title="Go to today"
                aria-label="Go to today"
              >
                <TodayIcon />
              </button>
            </div>
            <button
              onClick={next}
              aria-label="Next month"
              className="t-cal-navbtn"
              type="button"
            >
              ›
            </button>
          </div>

          {viewMode === "week" ? (
            <>
              <div className="t-cal-week">
                {weekLabels.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
              <div
                className="t-cal-weekstrip"
                onTouchStart={onTouchStartWeek}
                onTouchMove={onTouchMoveWeek}
                onTouchEnd={onTouchEndWeek}
                style={{ transform: dragX ? `translateX(${dragX}px)` : undefined, transition: dragging ? "none" : "transform 160ms ease" }}
              >
                {(() => {
                  const d = new Date(selected);
                  const start = new Date(d);
                  start.setDate(d.getDate() - d.getDay());
                  return Array.from({ length: 7 }).map((_, i) => {
                    const day = new Date(start);
                    day.setDate(start.getDate() + i);
                    const iso = toISODate(day);
                    const sel = isSelected(day);
                    const todayFlag = isToday(day);
                    return (
                      <button
                        key={iso}
                        onClick={() => setSelected(iso)}
                        type="button"
                        className="t-cal-weekpill"
                        aria-current={sel ? "date" : undefined}
                        title={day.toDateString()}
                      >
                        <div style={{ fontSize: 18 }}>{day.getDate()}</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{weekLabels[day.getDay()]}</div>
                        {todayFlag && (
                          <span className="t-cal-dot" style={{ right: 8, top: 8 }} />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <>
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
                      <div style={{ opacity: inMonth ? 1 : 0.55 }}>{date.getDate()}</div>
                      {isToday(date) && <span className="t-cal-dot" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ marginTop: 14 }}>
            <div className="t-section-head">
              <div>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 2 }}>Coach note</div>
                <div className="t-subtitle" style={{ opacity: 0.7 }}>{selected}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isTrainer && (
                  <div className="t-segment" role="tablist" aria-label="Coach note view">
                    <button
                      type="button"
                      className="t-segment-btn"
                      role="tab"
                      aria-selected={modeCoach === "write"}
                      aria-pressed={modeCoach === "write"}
                      onClick={() => setModeCoach("write")}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      className="t-segment-btn"
                      role="tab"
                      aria-selected={modeCoach === "preview"}
                      aria-pressed={modeCoach === "preview"}
                      onClick={() => setModeCoach("preview")}
                    >
                      Preview
                    </button>
                  </div>
                )}
                {loadingPlan && <span className="t-chip t-chip--view">Loading…</span>}
                {!loadingPlan && !isTrainer && (
                  <span className="t-chip t-chip--view">View only</span>
                )}
                {!loadingPlan && isTrainer && (
                  <span className="t-chip t-chip--edit">Edit mode</span>
                )}
              </div>
            </div>

            {isTrainer && modeCoach === "write" && (
              <EditorToolbar
                modeKey="coach"
                refEl={coachRef}
                clear={() => setPlan((p) => ({ ...p, coach_note: "" }))}
                insert={insertAtCursor}
              />
            )}

            {isTrainer && modeCoach === "write" ? (
              <textarea
                ref={coachRef}
                value={plan.coach_note}
                onChange={(e) => setPlan((p) => ({ ...p, coach_note: e.target.value }))}
                onInput={(e) => autosize(e.currentTarget)}
                placeholder="Use #, ##, lists, etc…"
                readOnly={!isTrainer}
                rows={5}
                className="t-textarea"
                style={{ ...readonlyStyle, resize: "none", overflow: "hidden" }}
              />
            ) : null}
            <div className="t-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.coach_note || "") }} />

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              {isTrainer && modeCoach === "write" ? (
                <>
                  <button
                    onClick={handleSaveAll}
                    disabled={saveStatus === "saving"}
                    className="t-btn t-btn--primary"
                    type="button"
                  >
                    {saveStatus === "saving" ? "Saving…" : "Save changes"}
                  </button>
                  <span className="t-statusline">{plan.coach_note.length} chars</span>
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
              ) : !isTrainer ? (
                <span className="t-statusline">
                  Only Coach Tigo can edit Program/Meal/Notes.
                </span>
              ) : (
                <span className="t-statusline">{plan.coach_note.length} chars</span>
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
              {isTrainer && (
                <div className="t-segment" role="tablist" aria-label="Program view">
                  <button
                    type="button"
                    className="t-segment-btn"
                    role="tab"
                    aria-selected={modeProgram === "write"}
                    aria-pressed={modeProgram === "write"}
                    onClick={() => setModeProgram("write")}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className="t-segment-btn"
                    role="tab"
                    aria-selected={modeProgram === "preview"}
                    aria-pressed={modeProgram === "preview"}
                    onClick={() => setModeProgram("preview")}
                  >
                    Preview
                  </button>
                </div>
              )}
            </div>

            {isTrainer && modeProgram === "write" && (
              <EditorToolbar
                modeKey="program"
                refEl={programRef}
                clear={() => setPlan((p) => ({ ...p, program: "" }))}
                insert={insertAtCursor}
                presets="program"
              />
            )}

            {isTrainer && modeProgram === "write" ? (
              <textarea
                ref={programRef}
                value={plan.program}
                onChange={(e) => setPlan((p) => ({ ...p, program: e.target.value }))}
                onInput={(e) => autosize(e.currentTarget)}
                placeholder="Use #, lists, code fences…"
                readOnly={!isTrainer}
                rows={10}
                className="t-textarea"
                style={{ marginTop: 10, ...readonlyStyle, resize: "none", overflow: "hidden" }}
              />
            ) : null}
            <div className="t-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.program || "") }} />
            <div className="t-statusline" style={{ marginTop: 6 }}>{plan.program.length} chars</div>
          </section>

          <section className="t-card t-card--hoverable">
            <div className="t-section-head">
              <h3 style={{ margin: 0 }}>Meal</h3>
              <span className="t-chip">{selected}</span>
              {isTrainer && (
                <div className="t-segment" role="tablist" aria-label="Meal view">
                  <button
                    type="button"
                    className="t-segment-btn"
                    role="tab"
                    aria-selected={modeMeal === "write"}
                    aria-pressed={modeMeal === "write"}
                    onClick={() => setModeMeal("write")}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className="t-segment-btn"
                    role="tab"
                    aria-selected={modeMeal === "preview"}
                    aria-pressed={modeMeal === "preview"}
                    onClick={() => setModeMeal("preview")}
                  >
                    Preview
                  </button>
                </div>
              )}
            </div>

            {isTrainer && modeMeal === "write" && (
              <EditorToolbar
                modeKey="meal"
                refEl={mealRef}
                clear={() => setPlan((p) => ({ ...p, meal: "" }))}
                insert={insertAtCursor}
                presets="meal"
              />
            )}

            {isTrainer && modeMeal === "write" ? (
              <textarea
                ref={mealRef}
                value={plan.meal}
                onChange={(e) => setPlan((p) => ({ ...p, meal: e.target.value }))}
                onInput={(e) => autosize(e.currentTarget)}
                placeholder="Use #, lists, etc…"
                readOnly={!isTrainer}
                rows={8}
                className="t-textarea"
                style={{ marginTop: 10, ...readonlyStyle, resize: "none", overflow: "hidden" }}
              />
            ) : null}
            <div className="t-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.meal || "") }} />
            <div className="t-statusline" style={{ marginTop: 6 }}>{plan.meal.length} chars</div>
          </section>
        </div>
      </div>
    </>
  );
}
