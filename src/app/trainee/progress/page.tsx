// app/trainee/progress/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Progress Page (Design-first, offline-first)
 * - Weight check-ins + trends + sparkline
 * - Goals + simple projection
 * - Habits (14-day toggles + 28-day heatmap)
 * - Progress photos (upload + gallery + compare slider)
 * - Measurements (log + trends)
 * - Strength / PRs (log + estimated 1RM + bests)
 *
 * Storage: localStorage for now — later swap these storage helpers to Supabase.
 */

type UnitW = "kg" | "lb";
type UnitL = "cm" | "in";

type WeightEntry = {
  id: string;
  weight_kg: number;
  recorded_at: string; // ISO
  note?: string;
};

type PhotoLabel = "front" | "side" | "back";
type PhotoEntry = {
  id: string;
  label: PhotoLabel;
  recorded_at: string; // ISO
  url: string; // dataURL for now; later: Supabase Storage URL
  note?: string;
};

type MeasurementsEntry = {
  id: string;
  recorded_at: string; // ISO
  note?: string;

  waist_cm?: number;
  chest_cm?: number;
  hips_cm?: number;
  arm_cm?: number; // upper arm
  thigh_cm?: number;
};

type StrengthEntry = {
  id: string;
  recorded_at: string; // ISO
  exercise: string;
  weight_kg: number;
  reps: number; // 1-30
  note?: string;
};

type HabitDay = { workout: boolean; steps: boolean; water: boolean };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function formatDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function toPrettyDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toKg(value: number, unit: UnitW) {
  if (!Number.isFinite(value)) return NaN;
  return unit === "kg" ? value : value * 0.45359237;
}
function toLb(kg: number) {
  return kg / 0.45359237;
}
function toCm(value: number, unit: UnitL) {
  if (!Number.isFinite(value)) return NaN;
  return unit === "cm" ? value : value * 2.54;
}
function toIn(cm: number) {
  return cm / 2.54;
}

function median(arr: number[]) {
  if (arr.length === 0) return NaN;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/** Least squares slope (y per week) */
function linearTrendPerWeek(points: { t: number; y: number }[]) {
  if (points.length < 2) return 0;
  const n = points.length;
  const sumT = points.reduce((s, p) => s + p.t, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumTT = points.reduce((s, p) => s + p.t * p.t, 0);
  const sumTY = points.reduce((s, p) => s + p.t * p.y, 0);
  const denom = n * sumTT - sumT * sumT;
  if (denom === 0) return 0;
  const slopePerMs = (n * sumTY - sumT * sumY) / denom;
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return slopePerMs * msPerWeek;
}

function epley1RM(weightKg: number, reps: number) {
  const r = clamp(reps, 1, 30);
  return weightKg * (1 + r / 30);
}

/** ---------- localStorage keys ---------- */
const K_WEIGHTS = "tigo_progress_weights_v2";
const K_GOALS = "tigo_progress_goals_v2";
const K_HABITS = "tigo_progress_habits_v2";
const K_PHOTOS = "tigo_progress_photos_v2";
const K_MEASURE = "tigo_progress_measurements_v2";
const K_STRENGTH = "tigo_progress_strength_v2";

/** Seed: small SVG placeholders for photos (lightweight) */
function photoPlaceholder(label: PhotoLabel) {
  const title = label.toUpperCase();
  const hue = label === "front" ? 210 : label === "side" ? 265 : 135;
  const svg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hue} 80% 60%)" stop-opacity="0.55"/>
        <stop offset="1" stop-color="hsl(${hue} 70% 45%)" stop-opacity="0.15"/>
      </linearGradient>
      <radialGradient id="r" cx="40%" cy="25%" r="80%">
        <stop offset="0" stop-color="white" stop-opacity="0.16"/>
        <stop offset="1" stop-color="white" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="rgba(255,255,255,0.02)"/>
    <rect x="40" y="40" width="820" height="1120" rx="42" fill="url(#g)" stroke="rgba(255,255,255,0.18)" />
    <rect x="40" y="40" width="820" height="1120" rx="42" fill="url(#r)"/>
    <text x="80" y="140" font-size="64" font-family="ui-sans-serif, system-ui" fill="rgba(255,255,255,0.92)" font-weight="800">${title}</text>
    <text x="80" y="205" font-size="28" font-family="ui-sans-serif, system-ui" fill="rgba(255,255,255,0.75)">Progress photo placeholder</text>
    <path d="M450 350 C520 350 565 410 565 470 C565 535 515 595 450 595 C385 595 335 535 335 470 C335 410 380 350 450 350 Z"
      fill="rgba(255,255,255,0.18)"/>
    <path d="M300 1010 C360 900 540 900 600 1010" stroke="rgba(255,255,255,0.25)" stroke-width="18" fill="none" stroke-linecap="round"/>
  </svg>`);
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function getOrSeedWeights(): WeightEntry[] {
  const existing = safeJsonParse<WeightEntry[]>(
    typeof window !== "undefined" ? window.localStorage.getItem(K_WEIGHTS) : null,
    []
  );
  if (existing.length > 0) return existing;

  const base = 96.2;
  const seeded: WeightEntry[] = Array.from({ length: 21 }).map((_, i) => {
    const d = daysAgo(20 - i);
    const w = base - i * 0.12 + Math.sin(i / 2) * 0.15 + (i % 5 === 0 ? 0.25 : 0);
    return {
      id: uid("w"),
      weight_kg: Number(w.toFixed(2)),
      recorded_at: new Date(`${formatDateInput(d)}T12:00:00`).toISOString(),
      note: i === 18 ? "Good sleep 😴" : i === 14 ? "Salty dinner 🍟" : undefined,
    };
  });

  if (typeof window !== "undefined") window.localStorage.setItem(K_WEIGHTS, JSON.stringify(seeded));
  return seeded;
}
function setWeights(weights: WeightEntry[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(K_WEIGHTS, JSON.stringify(weights));
}

function getOrSeedGoals() {
  const existing = safeJsonParse(
    typeof window !== "undefined" ? window.localStorage.getItem(K_GOALS) : null,
    { goal_weight_kg: 92, weekly_change_kg: 0.4, weighins_per_week: 4 }
  );
  if (typeof window !== "undefined") window.localStorage.setItem(K_GOALS, JSON.stringify(existing));
  return existing as { goal_weight_kg: number; weekly_change_kg: number; weighins_per_week: number };
}
function setGoals(goals: { goal_weight_kg: number; weekly_change_kg: number; weighins_per_week: number }) {
  if (typeof window !== "undefined") window.localStorage.setItem(K_GOALS, JSON.stringify(goals));
}

function getOrSeedHabits(): Record<string, HabitDay> {
  const existing = safeJsonParse<Record<string, HabitDay>>(
    typeof window !== "undefined" ? window.localStorage.getItem(K_HABITS) : null,
    {}
  );
  if (Object.keys(existing).length > 0) return existing;

  const seeded: Record<string, HabitDay> = {};
  for (let i = 27; i >= 0; i--) {
    const d = daysAgo(i);
    const k = formatDateInput(d);
    seeded[k] = { workout: i % 2 === 0, steps: i % 3 !== 0, water: i % 5 !== 0 };
  }
  if (typeof window !== "undefined") window.localStorage.setItem(K_HABITS, JSON.stringify(seeded));
  return seeded;
}
function setHabits(obj: Record<string, HabitDay>) {
  if (typeof window !== "undefined") window.localStorage.setItem(K_HABITS, JSON.stringify(obj));
}

function getOrSeedPhotos(): PhotoEntry[] {
  const existing = safeJsonParse<PhotoEntry[]>(
    typeof window !== "undefined" ? window.localStorage.getItem(K_PHOTOS) : null,
    []
  );
  if (existing.length > 0) return existing;

  // Seed 1 set (placeholders)
  const d = daysAgo(18);
  const iso = new Date(`${formatDateInput(d)}T12:00:00`).toISOString();
  const seeded: PhotoEntry[] = (["front", "side", "back"] as PhotoLabel[]).map((label) => ({
    id: uid("p"),
    label,
    recorded_at: iso,
    url: photoPlaceholder(label),
    note: "Demo (replace with your real photos)",
  }));

  if (typeof window !== "undefined") window.localStorage.setItem(K_PHOTOS, JSON.stringify(seeded));
  return seeded;
}
function setPhotos(list: PhotoEntry[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(K_PHOTOS, JSON.stringify(list));
}

function getOrSeedMeasurements(): MeasurementsEntry[] {
  const existing = safeJsonParse<MeasurementsEntry[]>(
    typeof window !== "undefined" ? window.localStorage.getItem(K_MEASURE) : null,
    []
  );
  if (existing.length > 0) return existing;

  // Seed weekly-ish points for 6 weeks
  const seeded: MeasurementsEntry[] = Array.from({ length: 6 }).map((_, i) => {
    const d = daysAgo(35 - i * 7);
    const iso = new Date(`${formatDateInput(d)}T12:00:00`).toISOString();
    const waist = 101 - i * 0.8 + Math.sin(i) * 0.2;
    const chest = 112 - i * 0.2;
    return {
      id: uid("m"),
      recorded_at: iso,
      waist_cm: Number(waist.toFixed(1)),
      chest_cm: Number(chest.toFixed(1)),
      hips_cm: Number((108 - i * 0.25).toFixed(1)),
      arm_cm: Number((36.5 - i * 0.05).toFixed(1)),
      thigh_cm: Number((61.2 - i * 0.08).toFixed(1)),
      note: i === 4 ? "Better pump week 💪" : undefined,
    };
  });

  if (typeof window !== "undefined") window.localStorage.setItem(K_MEASURE, JSON.stringify(seeded));
  return seeded;
}
function setMeasurements(list: MeasurementsEntry[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(K_MEASURE, JSON.stringify(list));
}

function getOrSeedStrength(): StrengthEntry[] {
  const existing = safeJsonParse<StrengthEntry[]>(
    typeof window !== "undefined" ? window.localStorage.getItem(K_STRENGTH) : null,
    []
  );
  if (existing.length > 0) return existing;

  const exercises = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Row"];
  const seeded: StrengthEntry[] = [];
  for (let i = 0; i < 10; i++) {
    const d = daysAgo(30 - i * 3);
    const iso = new Date(`${formatDateInput(d)}T12:00:00`).toISOString();
    const ex = exercises[i % exercises.length];
    const base = ex === "Deadlift" ? 140 : ex === "Squat" ? 120 : ex === "Bench Press" ? 92 : ex === "Row" ? 80 : 60;
    const w = base + i * 1.5;
    const reps = 5 - (i % 3) + 1; // 3..6-ish
    seeded.push({
      id: uid("s"),
      recorded_at: iso,
      exercise: ex,
      weight_kg: Number(w.toFixed(1)),
      reps: clamp(reps, 1, 12),
      note: i === 8 ? "Felt strong 🔥" : undefined,
    });
  }

  if (typeof window !== "undefined") window.localStorage.setItem(K_STRENGTH, JSON.stringify(seeded));
  return seeded;
}
function setStrength(list: StrengthEntry[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(K_STRENGTH, JSON.stringify(list));
}

/** ---------- UI components ---------- */

function Sparkline({ values }: { values: number[] }) {
  const w = 320;
  const h = 78;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 6;

  const pts = values
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (values.length - 1);
      const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.92"
      />
      <polygon points={`${pad},${h - pad} ${pts} ${w - pad},${h - pad}`} fill="url(#g)" opacity="0.9" />
      <circle cx={w - pad} cy={pad + (1 - (values[values.length - 1] - min) / (max - min || 1)) * (h - pad * 2)} r="3" fill="currentColor" />
    </svg>
  );
}

function MiniRing({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total <= 0 ? 0 : clamp((value / total) * 100, 0, 100);
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={44} height={44} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
          opacity="0.9"
        />
        <text x="22" y="26" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.9">
          {Math.round(pct)}%
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 750 }}>
          {value}/{total}
        </div>
      </div>
    </div>
  );
}

function Heatmap({ days, byDay }: { days: number; byDay: Record<string, HabitDay> }) {
  const items = Array.from({ length: days }).map((_, idx) => {
    const d = daysAgo(days - 1 - idx);
    const key = formatDateInput(d);
    const v = byDay[key];
    const score = (v?.workout ? 1 : 0) + (v?.steps ? 1 : 0) + (v?.water ? 1 : 0);
    return { key, score };
  });

  const cols = 14;
  const rows = Math.ceil(items.length / cols);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
      {Array.from({ length: rows * cols }).map((_, i) => {
        const it = items[i];
        if (!it) return <div key={i} style={{ height: 12 }} />;
        const opacity = it.score === 0 ? 0.12 : it.score === 1 ? 0.28 : it.score === 2 ? 0.45 : 0.65;
        return (
          <div
            key={it.key}
            title={`${it.key} • score ${it.score}/3`}
            style={{
              height: 12,
              borderRadius: 4,
              background: `rgba(255,255,255,${opacity})`,
              outline: "1px solid rgba(255,255,255,0.06)",
            }}
          />
        );
      })}
    </div>
  );
}

/** Compress image to a reasonable size for localStorage */
async function compressImageToDataURL(file: File, maxW = 960, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Failed to read file."));
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Invalid image file."));
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function ProgressPage() {
  const [tab, setTab] = useState<
    "overview" | "log" | "goals" | "habits" | "photos" | "measurements" | "strength"
  >("overview");

  const [unitW, setUnitW] = useState<UnitW>("kg");
  const [unitL, setUnitL] = useState<UnitL>("cm");

  const [rows, setRows] = useState<WeightEntry[]>([]);
  const [goals, setGoalsState] = useState(() => getOrSeedGoals());
  const [habits, setHabitsState] = useState<Record<string, HabitDay>>({});
  const [photos, setPhotosState] = useState<PhotoEntry[]>([]);
  const [measures, setMeasuresState] = useState<MeasurementsEntry[]>([]);
  const [strength, setStrengthState] = useState<StrengthEntry[]>([]);

  // toasts
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  function toast(text: string) {
    setErr(null);
    setMsg(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setMsg(null), 2000);
  }

  useEffect(() => {
    setRows(getOrSeedWeights().sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()));
    setHabitsState(getOrSeedHabits());
    setPhotosState(getOrSeedPhotos().sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()));
    setMeasuresState(getOrSeedMeasurements().sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()));
    setStrengthState(getOrSeedStrength().sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()));
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  // ---------- derived (weight) ----------
  const sortedAscW = useMemo(() => [...rows].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()), [rows]);
  const firstW = sortedAscW[0];
  const lastW = sortedAscW[sortedAscW.length - 1];

  const last7W = useMemo(() => {
    const cutoff = daysAgo(6).setHours(0, 0, 0, 0);
    return sortedAscW.filter((r) => new Date(r.recorded_at).getTime() >= cutoff);
  }, [sortedAscW]);

  const last30W = useMemo(() => {
    const cutoff = daysAgo(29).setHours(0, 0, 0, 0);
    return sortedAscW.filter((r) => new Date(r.recorded_at).getTime() >= cutoff);
  }, [sortedAscW]);

  const values30 = useMemo(() => last30W.map((r) => r.weight_kg), [last30W]);
  const med30 = useMemo(() => median(values30), [values30]);

  const delta7 = useMemo(() => (last7W.length >= 2 ? last7W[last7W.length - 1].weight_kg - last7W[0].weight_kg : 0), [last7W]);
  const avg7 = useMemo(() => (last7W.length ? last7W.reduce((s, r) => s + r.weight_kg, 0) / last7W.length : NaN), [last7W]);
  const trendPerWeek = useMemo(() => {
    const pts = last30W.map((r) => ({ t: new Date(r.recorded_at).getTime(), y: r.weight_kg }));
    return linearTrendPerWeek(pts);
  }, [last30W]);

  const goalProgress = useMemo(() => {
    const current = lastW?.weight_kg ?? NaN;
    const goal = goals.goal_weight_kg;
    const start = firstW?.weight_kg ?? NaN;
    if (!Number.isFinite(current) || !Number.isFinite(goal) || !Number.isFinite(start)) return 0;
    const denom = Math.abs(start - goal) || 1;
    const done = Math.abs(start - current);
    return clamp((done / denom) * 100, 0, 100);
  }, [firstW, lastW, goals.goal_weight_kg]);

  const weekWeighins = useMemo(() => {
    const set = new Set(last7W.map((r) => formatDateInput(new Date(r.recorded_at))));
    return set.size;
  }, [last7W]);

  const habitWeekScore = useMemo(() => {
    const keys = Array.from({ length: 7 }).map((_, i) => formatDateInput(daysAgo(6 - i)));
    let total = 0;
    let done = 0;
    for (const k of keys) {
      const v = habits[k] ?? { workout: false, steps: false, water: false };
      total += 3;
      done += (v.workout ? 1 : 0) + (v.steps ? 1 : 0) + (v.water ? 1 : 0);
    }
    return { done, total };
  }, [habits]);

  const currentWeightShown = useMemo(() => {
    const kg = lastW?.weight_kg;
    if (!Number.isFinite(kg ?? NaN)) return "—";
    return unitW === "kg" ? `${kg!.toFixed(1)} kg` : `${toLb(kg!).toFixed(1)} lb`;
  }, [lastW, unitW]);

  const delta7Shown = useMemo(() => {
    const sign = delta7 > 0 ? "+" : "";
    const v = unitW === "kg" ? delta7 : toLb(delta7);
    return `${sign}${v.toFixed(2)} ${unitW} (7d)`;
  }, [delta7, unitW]);

  const trendShown = useMemo(() => {
    const v = unitW === "kg" ? trendPerWeek : toLb(trendPerWeek);
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(2)} ${unitW}/week`;
  }, [trendPerWeek, unitW]);

  // ---------- derived (measurements) ----------
  const sortedAscM = useMemo(() => [...measures].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()), [measures]);
  const lastM = sortedAscM[sortedAscM.length - 1];

  // ---------- derived (strength) ----------
  const bestByExercise = useMemo(() => {
    const map = new Map<string, { bestE1RM: number; best: StrengthEntry }>();
    for (const e of strength) {
      const one = epley1RM(e.weight_kg, e.reps);
      const cur = map.get(e.exercise);
      if (!cur || one > cur.bestE1RM) map.set(e.exercise, { bestE1RM: one, best: e });
    }
    return map;
  }, [strength]);

  // ---------- forms state ----------
  // weight form
  const [wWeight, setWWeight] = useState("");
  const [wDate, setWDate] = useState(() => formatDateInput(new Date()));
  const [wNote, setWNote] = useState("");
  const [savingW, setSavingW] = useState(false);

  // photo form
  const [pLabel, setPLabel] = useState<PhotoLabel>("front");
  const [pDate, setPDate] = useState(() => formatDateInput(new Date()));
  const [pNote, setPNote] = useState("");
  const [pFile, setPFile] = useState<File | null>(null);
  const [pPreview, setPPreview] = useState<string | null>(null);
  const [savingP, setSavingP] = useState(false);

  // photo compare
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [comparePos, setComparePos] = useState(50);

  // measurements form
  const [mDate, setMDate] = useState(() => formatDateInput(new Date()));
  const [mNote, setMNote] = useState("");
  const [mWaist, setMWaist] = useState("");
  const [mChest, setMChest] = useState("");
  const [mHips, setMHips] = useState("");
  const [mArm, setMArm] = useState("");
  const [mThigh, setMThigh] = useState("");
  const [savingM, setSavingM] = useState(false);
  const [mFocus, setMFocus] = useState<keyof MeasurementsEntry>("waist_cm");

  // strength form
  const presets = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Row", "Pull-up (added weight)"];
  const [sExercise, setSExercise] = useState(presets[0]);
  const [sCustom, setSCustom] = useState("");
  const [sWeight, setSWeight] = useState("");
  const [sReps, setSReps] = useState("5");
  const [sDate, setSDate] = useState(() => formatDateInput(new Date()));
  const [sNote, setSNote] = useState("");
  const [savingS, setSavingS] = useState(false);
  const [sFilter, setSFilter] = useState<string>("All");

  // ---------- actions ----------
  async function addWeight() {
    setErr(null);
    setSavingW(true);
    try {
      const parsed = Number(wWeight);
      const kg = toKg(parsed, unitW);
      if (!Number.isFinite(kg)) throw new Error("Please enter a valid number.");
      if (kg < 30 || kg > 300) throw new Error("That weight looks unusual. Please double-check.");
      if (!wDate) throw new Error("Please pick a date.");

      const recorded_at = new Date(`${wDate}T12:00:00`).toISOString();
      const entry: WeightEntry = {
        id: uid("w"),
        weight_kg: Number(kg.toFixed(2)),
        recorded_at,
        note: wNote.trim() ? wNote.trim() : undefined,
      };

      const next = [entry, ...rows]
        .filter((r, i, arr) => arr.findIndex((x) => x.recorded_at === r.recorded_at) === i)
        .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

      setRows(next);
      setWeights(next);
      setWWeight("");
      setWNote("");
      toast("Saved ✅");
      setTab("overview");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save.");
    } finally {
      setSavingW(false);
    }
  }

  function removeWeight(id: string) {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    setWeights(next);
    toast("Removed");
  }

  function toggleHabit(dayKey: string, which: keyof HabitDay) {
    const cur = habits[dayKey] ?? { workout: false, steps: false, water: false };
    const next = { ...habits, [dayKey]: { ...cur, [which]: !cur[which] } };
    setHabitsState(next);
    setHabits(next);
  }

  async function addPhoto() {
    setErr(null);
    setSavingP(true);
    try {
      if (!pDate) throw new Error("Pick a date.");
      if (!pFile) throw new Error("Choose a photo first.");

      // guard localStorage size a bit (soft limit)
      if (photos.length >= 30) throw new Error("Photo limit reached (30). Remove old photos first.");

      const dataUrl = await compressImageToDataURL(pFile, 960, 0.82);
      const entry: PhotoEntry = {
        id: uid("p"),
        label: pLabel,
        recorded_at: new Date(`${pDate}T12:00:00`).toISOString(),
        url: dataUrl,
        note: pNote.trim() ? pNote.trim() : undefined,
      };

      const next = [entry, ...photos].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      setPhotosState(next);
      setPhotos(next);

      setPFile(null);
      setPPreview(null);
      setPNote("");
      toast("Photo saved ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save photo.");
    } finally {
      setSavingP(false);
    }
  }

  function removePhoto(id: string) {
    const next = photos.filter((p) => p.id !== id);
    setPhotosState(next);
    setPhotos(next);
    toast("Photo removed");
  }

  async function addMeasurement() {
    setErr(null);
    setSavingM(true);
    try {
      if (!mDate) throw new Error("Pick a date.");

      const parse = (s: string) => {
        if (!s.trim()) return undefined;
        const v = Number(s);
        if (!Number.isFinite(v)) throw new Error("Measurements must be valid numbers.");
        const cm = toCm(v, unitL);
        if (!Number.isFinite(cm)) throw new Error("Invalid measurement.");
        if (cm < 10 || cm > 250) throw new Error("That measurement looks unusual.");
        return Number(cm.toFixed(1));
      };

      const entry: MeasurementsEntry = {
        id: uid("m"),
        recorded_at: new Date(`${mDate}T12:00:00`).toISOString(),
        note: mNote.trim() ? mNote.trim() : undefined,
        waist_cm: parse(mWaist),
        chest_cm: parse(mChest),
        hips_cm: parse(mHips),
        arm_cm: parse(mArm),
        thigh_cm: parse(mThigh),
      };

      // at least one field
      const hasAny =
        entry.waist_cm || entry.chest_cm || entry.hips_cm || entry.arm_cm || entry.thigh_cm;
      if (!hasAny) throw new Error("Enter at least one measurement.");

      const next = [entry, ...measures].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      setMeasuresState(next);
      setMeasurements(next);

      setMNote("");
      setMWaist("");
      setMChest("");
      setMHips("");
      setMArm("");
      setMThigh("");
      toast("Measurements saved ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save measurements.");
    } finally {
      setSavingM(false);
    }
  }

  function removeMeasurement(id: string) {
    const next = measures.filter((m) => m.id !== id);
    setMeasuresState(next);
    setMeasurements(next);
    toast("Removed");
  }

  async function addStrength() {
    setErr(null);
    setSavingS(true);
    try {
      const ex = (sCustom.trim() ? sCustom.trim() : sExercise).slice(0, 60);
      if (!ex) throw new Error("Pick an exercise.");
      if (!sDate) throw new Error("Pick a date.");

      const reps = clamp(Number(sReps), 1, 30);
      if (!Number.isFinite(reps)) throw new Error("Invalid reps.");

      const w = Number(sWeight);
      const kg = toKg(w, unitW);
      if (!Number.isFinite(kg)) throw new Error("Enter a valid weight.");
      if (kg < 1 || kg > 500) throw new Error("That load looks unusual.");

      const entry: StrengthEntry = {
        id: uid("s"),
        recorded_at: new Date(`${sDate}T12:00:00`).toISOString(),
        exercise: ex,
        weight_kg: Number(kg.toFixed(1)),
        reps: reps,
        note: sNote.trim() ? sNote.trim() : undefined,
      };

      const next = [entry, ...strength].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      setStrengthState(next);
      setStrength(next);

      setSWeight("");
      setSNote("");
      setSCustom("");
      toast("PR saved ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save.");
    } finally {
      setSavingS(false);
    }
  }

  function removeStrength(id: string) {
    const next = strength.filter((s) => s.id !== id);
    setStrengthState(next);
    setStrength(next);
    toast("Removed");
  }

  function saveGoals() {
    const clean = {
      goal_weight_kg: clamp(Number(goals.goal_weight_kg) || 0, 30, 300),
      weekly_change_kg: clamp(Number(goals.weekly_change_kg) || 0, 0, 2),
      weighins_per_week: clamp(Number(goals.weighins_per_week) || 0, 1, 7),
    };
    setGoalsState(clean);
    setGoals(clean);
    toast("Goals updated ✅");
  }

  // ---------- photos compare defaults ----------
  useEffect(() => {
    if (photos.length < 2) return;
    if (!compareA) setCompareA(photos[photos.length - 1]?.id ?? "");
    if (!compareB) setCompareB(photos[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const comparePhotoA = useMemo(() => photos.find((p) => p.id === compareA), [photos, compareA]);
  const comparePhotoB = useMemo(() => photos.find((p) => p.id === compareB), [photos, compareB]);

  // ---------- measurement chart values ----------
  const measurementSeries = useMemo(() => {
    const key = mFocus as keyof MeasurementsEntry; // e.g. waist_cm
    const asc = [...measures].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    const vals = asc
      .map((m) => {
        const v = m[key] as unknown as number | undefined;
        if (!Number.isFinite(v ?? NaN)) return null;
        return v!;
      })
      .filter((x): x is number => x !== null);

    // stored in cm
    const shown = unitL === "cm" ? vals : vals.map((cm) => toIn(cm));
    return shown;
  }, [measures, mFocus, unitL]);

  // ---------- strength filter list ----------
  const strengthExercises = useMemo(() => {
    const set = new Set<string>();
    for (const s of strength) set.add(s.exercise);
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [strength]);

  const filteredStrength = useMemo(() => {
    if (sFilter === "All") return strength;
    return strength.filter((s) => s.exercise === sFilter);
  }, [strength, sFilter]);

  // ---------- small styling helpers ----------
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 750,
    cursor: "pointer",
    userSelect: "none",
    border: "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
    opacity: active ? 1 : 0.9,
  });

  const cardSoft: React.CSSProperties = {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  };

  // ---------- export / import ----------
  function exportData() {
    const payload = {
      weights: rows,
      goals,
      habits,
      photos,
      measurements: measures,
      strength,
      exportedAt: new Date().toISOString(),
      version: 2,
    };
    const txt = JSON.stringify(payload, null, 2);
    navigator.clipboard
      .writeText(txt)
      .then(() => toast("Export copied ✅"))
      .catch(() => {
        // fallback download
        const blob = new Blob([txt], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tigo-progress-export-${formatDateInput(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast("Export downloaded ✅");
      });
  }

  async function importDataFromFile(file: File) {
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);

      if (data?.weights) {
        setRows(data.weights);
        setWeights(data.weights);
      }
      if (data?.goals) {
        setGoalsState(data.goals);
        setGoals(data.goals);
      }
      if (data?.habits) {
        setHabitsState(data.habits);
        setHabits(data.habits);
      }
      if (data?.photos) {
        setPhotosState(data.photos);
        setPhotos(data.photos);
      }
      if (data?.measurements) {
        setMeasuresState(data.measurements);
        setMeasurements(data.measurements);
      }
      if (data?.strength) {
        setStrengthState(data.strength);
        setStrength(data.strength);
      }
      toast("Import complete ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Import failed.");
    }
  }

  function resetDemo() {
    if (!confirm("Reset all progress data? This will clear local data on this device.")) return;
    localStorage.removeItem(K_WEIGHTS);
    localStorage.removeItem(K_GOALS);
    localStorage.removeItem(K_HABITS);
    localStorage.removeItem(K_PHOTOS);
    localStorage.removeItem(K_MEASURE);
    localStorage.removeItem(K_STRENGTH);

    setRows(getOrSeedWeights());
    setGoalsState(getOrSeedGoals());
    setHabitsState(getOrSeedHabits());
    setPhotosState(getOrSeedPhotos());
    setMeasuresState(getOrSeedMeasurements());
    setStrengthState(getOrSeedStrength());
    toast("Reset ✅");
  }

  return (
    <>
      {/* Header */}
      <div className="t-card" style={{ marginBottom: 12, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 240px at 15% 15%, rgba(255,255,255,0.08), transparent), radial-gradient(600px 220px at 80% 20%, rgba(255,255,255,0.06), transparent)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="t-title" style={{ marginBottom: 6 }}>
              Progress
            </h1>
            <div style={{ fontSize: 13, opacity: 0.82 }}>
              Weight, habits, photos, measurements, and strength — all in one clean dashboard.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Weight</span>
              <select value={unitW} onChange={(e) => setUnitW(e.target.value as UnitW)} className="t-input" style={{ width: 90 }}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Length</span>
              <select value={unitL} onChange={(e) => setUnitL(e.target.value as UnitL)} className="t-input" style={{ width: 90 }}>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>

            <button className="t-btn" onClick={() => setTab("log")}>
              ➕ Add check-in
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={pillStyle(tab === "overview")} onClick={() => setTab("overview")}>
          🏁 Overview
        </div>
        <div style={pillStyle(tab === "log")} onClick={() => setTab("log")}>
          ⚖️ Weight
        </div>
        <div style={pillStyle(tab === "goals")} onClick={() => setTab("goals")}>
          🎯 Goals
        </div>
        <div style={pillStyle(tab === "habits")} onClick={() => setTab("habits")}>
          🔥 Habits
        </div>
        <div style={pillStyle(tab === "photos")} onClick={() => setTab("photos")}>
          📸 Photos
        </div>
        <div style={pillStyle(tab === "measurements")} onClick={() => setTab("measurements")}>
          📏 Measurements
        </div>
        <div style={pillStyle(tab === "strength")} onClick={() => setTab("strength")}>
          🏋️ Strength
        </div>
      </div>

      {/* Toast / Error */}
      {(msg || err) && (
        <div
          className="t-card"
          style={{
            marginBottom: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: msg ? "rgba(255,255,255,0.06)" : "rgba(255,60,60,0.07)",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.92 }}>{msg ? `✅ ${msg}` : `❗ ${err}`}</div>
        </div>
      )}

      {/* ---------- OVERVIEW ---------- */}
      {tab === "overview" && (
        <div className="pg-grid">
          {/* Main Weight Summary */}
          <div className="t-card pg-span-12">
            <div className="pg-grid" style={{ gap: 12 }}>
              <div className="pg-span-6">
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Current</div>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.6 }}>{currentWeightShown}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, opacity: 0.85 }}>{delta7Shown}</span>
                  <span style={{ fontSize: 13, opacity: 0.85 }}>•</span>
                  <span style={{ fontSize: 13, opacity: 0.85 }}>{trendShown}</span>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  Median (30d):{" "}
                  <b style={{ opacity: 0.95 }}>
                    {Number.isFinite(med30) ? `${(unitW === "kg" ? med30 : toLb(med30)).toFixed(1)} ${unitW}` : "—"}
                  </b>
                </div>

                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
                  <div style={{ ...cardSoft, gridColumn: "span 4" }}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Goal progress</div>
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <MiniRing value={Math.round(goalProgress)} total={100} label="to goal" />
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Goal</div>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>
                          {(unitW === "kg" ? goals.goal_weight_kg : toLb(goals.goal_weight_kg)).toFixed(1)} {unitW}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ ...cardSoft, gridColumn: "span 4" }}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Weigh-ins this week</div>
                    <div style={{ marginTop: 10 }}>
                      <MiniRing value={weekWeighins} total={goals.weighins_per_week} label="done" />
                    </div>
                  </div>

                  <div style={{ ...cardSoft, gridColumn: "span 4" }}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Habit score (7d)</div>
                    <div style={{ marginTop: 10 }}>
                      <MiniRing value={habitWeekScore.done} total={habitWeekScore.total} label="completed" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pg-span-6" style={{ color: "rgba(255,255,255,0.92)" }}>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Last 30 days</div>
                <Sparkline values={values30} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                  <span>
                    {Number.isFinite(values30[0])
                      ? `${(unitW === "kg" ? values30[0] : toLb(values30[0])).toFixed(1)} ${unitW}`
                      : ""}
                  </span>
                  <span>
                    {Number.isFinite(values30[values30.length - 1])
                      ? `${(unitW === "kg" ? values30[values30.length - 1] : toLb(values30[values30.length - 1])).toFixed(1)} ${unitW}`
                      : ""}
                  </span>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div style={cardSoft}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Quick coaching</div>
                    <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800 }}>Trend beats noise</div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
                      Daily scale swings are normal. Judge progress by 7–30 day averages.
                    </div>
                  </div>
                  <div style={cardSoft}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Fast actions</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button className="t-btn" onClick={() => setTab("photos")} style={{ opacity: 0.9 }}>
                        📸 Add photos
                      </button>
                      <button className="t-btn" onClick={() => setTab("measurements")} style={{ opacity: 0.9 }}>
                        📏 Add measurements
                      </button>
                      <button className="t-btn" onClick={() => setTab("strength")} style={{ opacity: 0.9 }}>
                        🏋️ Log PR
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Small overview row: Measurements + Strength highlights */}
              <div className="pg-span-12">
                <div className="pg-grid">
                  <div className="t-card pg-span-6" style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <h2 style={{ margin: 0, fontSize: 18 }}>📏 Measurements snapshot</h2>
                      <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("measurements")}>
                        Open
                      </button>
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <div style={cardSoft}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Latest</div>
                        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                          {lastM ? toPrettyDate(lastM.recorded_at) : "No entries yet"}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {(["waist_cm", "chest_cm", "hips_cm"] as const).map((k) => {
                            const v = lastM?.[k];
                            if (!Number.isFinite(v ?? NaN)) return null;
                            const shown = unitL === "cm" ? v! : toIn(v!);
                            const label = k === "waist_cm" ? "Waist" : k === "chest_cm" ? "Chest" : "Hips";
                            return (
                              <div key={k} style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <span style={{ fontSize: 12, opacity: 0.8 }}>{label}: </span>
                                <b style={{ fontSize: 12 }}>{shown.toFixed(1)} {unitL}</b>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div style={cardSoft}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Tip</div>
                        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                          Measure weekly, same time & posture. Waist + photos often show progress before scale does.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="t-card pg-span-6" style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <h2 style={{ margin: 0, fontSize: 18 }}>🏋️ Strength snapshot</h2>
                      <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("strength")}>
                        Open
                      </button>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      <div style={cardSoft}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Top lifts (best e1RM)</div>
                        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                          {["Squat", "Bench Press", "Deadlift"].map((ex) => {
                            const b = bestByExercise.get(ex);
                            if (!b) return (
                              <div key={ex} style={{ display: "flex", justifyContent: "space-between", opacity: 0.8 }}>
                                <span>{ex}</span>
                                <span>—</span>
                              </div>
                            );
                            const one = b.bestE1RM;
                            const shown = unitW === "kg" ? one : toLb(one);
                            return (
                              <div key={ex} style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ opacity: 0.9 }}>{ex}</span>
                                <b style={{ opacity: 0.95 }}>{shown.toFixed(1)} {unitW}</b>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={cardSoft}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Coach tip</div>
                        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                          Keep PRs honest: same ROM, controlled tempo. Your “estimated 1RM” trend matters more than any single day.
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Recent weight check-ins */}
          <div className="t-card pg-span-6">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>🧾 Recent weight check-ins</h2>
              <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("log")}>Add</button>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {[...rows].slice(0, 6).map((r) => {
                const shown = unitW === "kg" ? r.weight_kg : toLb(r.weight_kg);
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 850 }}>
                        {shown.toFixed(1)} {unitW}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{toPrettyDate(r.recorded_at)}</div>
                      {r.note ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>📝 {r.note}</div> : null}
                    </div>
                    <button className="t-btn" style={{ opacity: 0.75, alignSelf: "center" }} onClick={() => removeWeight(r.id)}>✕</button>
                  </div>
                );
              })}
              {rows.length === 0 ? (
                <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.04)", opacity: 0.85 }}>
                  No entries yet. Click “Add check-in”.
                </div>
              ) : null}
            </div>
          </div>

          {/* Habit heatmap */}
          <div className="t-card pg-span-6">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>🗓️ Consistency map (28d)</h2>
              <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("habits")}>Edit</button>
            </div>
            <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
              Each square = day score from 0 to 3 (🏋️ + 🚶 + 💧).
            </div>
            <div style={{ marginTop: 12 }}>
              <Heatmap days={28} byDay={habits} />
            </div>
          </div>
        </div>
      )}

      {/* ---------- WEIGHT LOG ---------- */}
      {tab === "log" && (
        <div className="pg-grid">
          <div className="t-card pg-span-7">
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>⚖️ Add a weight check-in</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>
              Keep it simple. Your chart gets smarter with consistency.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 10, alignItems: "end" }}>
              <div>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Weight ({unitW})</label>
                <input
                  inputMode="decimal"
                  value={wWeight}
                  onChange={(e) => setWWeight(e.target.value)}
                  placeholder={unitW === "kg" ? "e.g., 95.4" : "e.g., 210.3"}
                  className="t-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Date</label>
                <input type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} className="t-input" style={{ width: "100%" }} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Note (optional)</label>
                <input
                  value={wNote}
                  onChange={(e) => setWNote(e.target.value)}
                  placeholder="e.g., morning weigh-in / big meal / stressful day"
                  className="t-input"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button className="t-btn" onClick={() => void addWeight()} disabled={savingW}>
                {savingW ? "Saving…" : "Save"}
              </button>
              <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("overview")}>
                Back
              </button>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Tip: weigh in at the same time daily for clean data.
              </div>
            </div>
          </div>

          <div className="t-card pg-span-5">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>📌 Quick insights</h2>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={cardSoft}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>7d average</div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
                  {Number.isFinite(avg7) ? `${(unitW === "kg" ? avg7 : toLb(avg7)).toFixed(1)} ${unitW}` : "—"}
                </div>
              </div>

              <div style={cardSoft}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Trend (30d)</div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>{trendShown}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                  Great trend: ~0.25–0.75 kg/week (varies per goal).
                </div>
              </div>

              <div style={cardSoft}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Add more context</div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                  Pair weight with <b>photos</b> + <b>waist measurement</b>. It’s a powerful combo.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("photos")}>📸 Photos</button>
                  <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("measurements")}>📏 Measurements</button>
                </div>
              </div>
            </div>
          </div>

          <div className="t-card pg-span-12">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>🧾 All weight entries</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {rows.map((r) => {
                const shown = unitW === "kg" ? r.weight_kg : toLb(r.weight_kg);
                return (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 850 }}>
                        {shown.toFixed(1)} {unitW}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{toPrettyDate(r.recorded_at)}</div>
                      {r.note ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>📝 {r.note}</div> : null}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 12, opacity: 0.7 }} title="Stored internally in kg">
                        {r.weight_kg.toFixed(2)} kg
                      </div>
                      <button className="t-btn" style={{ opacity: 0.75 }} onClick={() => removeWeight(r.id)}>
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
              {rows.length === 0 ? (
                <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.04)", opacity: 0.85 }}>
                  No entries yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ---------- GOALS ---------- */}
      {tab === "goals" && (
        <div className="pg-grid">
          <div className="t-card pg-span-7">
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>🎯 Goals & targets</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>
              Your plan becomes real when it’s visible.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
              <div style={{ gridColumn: "span 6" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Goal weight ({unitW})</label>
                <input
                  inputMode="decimal"
                  value={String(unitW === "kg" ? goals.goal_weight_kg : toLb(goals.goal_weight_kg))}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const kg = unitW === "kg" ? v : toKg(v, "lb");
                    setGoalsState((g) => ({ ...g, goal_weight_kg: Number.isFinite(kg) ? Number(kg.toFixed(2)) : g.goal_weight_kg }));
                  }}
                  className="t-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ gridColumn: "span 6" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Weigh-ins per week</label>
                <input
                  inputMode="numeric"
                  value={String(goals.weighins_per_week)}
                  onChange={(e) => setGoalsState((g) => ({ ...g, weighins_per_week: Number(e.target.value) }))}
                  className="t-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ gridColumn: "span 12" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                  Expected weekly change ({unitW}/week)
                </label>
                <input
                  inputMode="decimal"
                  value={String(unitW === "kg" ? goals.weekly_change_kg : toLb(goals.weekly_change_kg))}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const kg = unitW === "kg" ? v : toKg(v, "lb");
                    setGoalsState((g) => ({ ...g, weekly_change_kg: Number.isFinite(kg) ? Number(kg.toFixed(2)) : g.weekly_change_kg }));
                  }}
                  className="t-input"
                  style={{ width: "100%" }}
                />
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Example: 0.25–0.75 kg/week for fat loss (depends on body + plan).
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="t-btn" onClick={saveGoals}>Save goals</button>
              <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("overview")}>Back</button>
            </div>
          </div>

          <div className="t-card pg-span-5">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>📊 Projection (simple)</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>
              Based on your last weight and expected weekly change.
            </div>

            {(() => {
              const current = lastW?.weight_kg;
              if (!Number.isFinite(current ?? NaN)) return <div style={{ opacity: 0.85 }}>Add at least one check-in to see projection.</div>;
              const goal = goals.goal_weight_kg;
              const delta = current! - goal;
              const perWeek = goals.weekly_change_kg || 0.4;
              const weeks = perWeek > 0 ? Math.abs(delta) / perWeek : 0;
              const estDate = new Date();
              estDate.setDate(estDate.getDate() + Math.round(weeks * 7));

              return (
                <div style={cardSoft}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Estimated time to goal</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 950 }}>
                    {weeks < 0.5 ? "< 1 week" : `${Math.round(weeks)} weeks`}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                    Target date: <b style={{ opacity: 0.95 }}>{estDate.toLocaleDateString()}</b>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                    This is a simple estimate — real progress is not linear.
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ---------- HABITS ---------- */}
      {tab === "habits" && (
        <div className="pg-grid">
          <div className="t-card pg-span-7">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>🔥 Habits</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>
              Tap toggles for any day. Consistency beats intensity.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {Array.from({ length: 14 }).map((_, i) => {
                const d = daysAgo(13 - i);
                const k = formatDateInput(d);
                const v = habits[k] ?? { workout: false, steps: false, water: false };
                const score = (v.workout ? 1 : 0) + (v.steps ? 1 : 0) + (v.water ? 1 : 0);

                return (
                  <div key={k} style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(3, 1fr) 0.7fr", gap: 8, alignItems: "center", padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 850 }}>{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>Score {score}/3</div>
                    </div>

                    <button className="t-btn" style={{ opacity: v.workout ? 1 : 0.6 }} onClick={() => toggleHabit(k, "workout")} title="Workout">🏋️</button>
                    <button className="t-btn" style={{ opacity: v.steps ? 1 : 0.6 }} onClick={() => toggleHabit(k, "steps")} title="Steps">🚶</button>
                    <button className="t-btn" style={{ opacity: v.water ? 1 : 0.6 }} onClick={() => toggleHabit(k, "water")} title="Water">💧</button>

                    <div style={{ textAlign: "right", fontSize: 12, opacity: 0.75 }}>
                      {score === 3 ? "Perfect" : score === 2 ? "Good" : score === 1 ? "Start" : "Rest"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="t-btn" onClick={() => setTab("overview")}>Back</button>
              <button
                className="t-btn"
                style={{ opacity: 0.9 }}
                onClick={() => {
                  const k = formatDateInput(new Date());
                  const cur = habits[k] ?? { workout: false, steps: false, water: false };
                  const next = { ...habits, [k]: { workout: true, steps: true, water: cur.water } };
                  setHabitsState(next);
                  setHabits(next);
                  toast("Nice! ✅");
                }}
              >
                Quick: workout + steps
              </button>
            </div>
          </div>

          <div className="t-card pg-span-5">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>🗓️ 28-day map</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>Your consistency fingerprint.</div>
            <Heatmap days={28} byDay={habits} />

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={cardSoft}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>What counts?</div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>🏋️ workout • 🚶 steps • 💧 water</div>
              </div>
              <div style={cardSoft}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Coach note</div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                  Don’t try to be perfect. Try to be consistent.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- PHOTOS ---------- */}
      {tab === "photos" && (
        <div className="pg-grid">
          <div className="t-card pg-span-7">
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>📸 Progress photos</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>
              Best practice: same lighting, same angle, same time of day.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Angle</label>
                <select value={pLabel} onChange={(e) => setPLabel(e.target.value as PhotoLabel)} className="t-input" style={{ width: "100%" }}>
                  <option value="front">Front</option>
                  <option value="side">Side</option>
                  <option value="back">Back</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Date</label>
                <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} className="t-input" style={{ width: "100%" }} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="t-input"
                  style={{ width: "100%" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setPFile(f);
                    setPPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  Photos are compressed and stored locally (for now). Later we’ll use Supabase Storage.
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Note (optional)</label>
                <input value={pNote} onChange={(e) => setPNote(e.target.value)} className="t-input" style={{ width: "100%" }} placeholder="e.g., post-cut week 2" />
              </div>
            </div>

            {pPreview ? (
              <div style={{ marginTop: 12, ...cardSoft }}>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Preview</div>
                <img src={pPreview} alt="preview" style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="t-btn" onClick={() => void addPhoto()} disabled={savingP}>
                {savingP ? "Saving…" : "Save photo"}
              </button>
              <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("overview")}>Back</button>
            </div>
          </div>

          <div className="t-card pg-span-5">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>🆚 Compare</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>
              Pick two photos and drag the slider.
            </div>

            {photos.length < 2 ? (
              <div style={{ ...cardSoft, opacity: 0.85 }}>Add at least two photos to compare.</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Photo A</label>
                    <select className="t-input" style={{ width: "100%" }} value={compareA} onChange={(e) => setCompareA(e.target.value)}>
                      {photos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label.toUpperCase()} • {toPrettyDate(p.recorded_at)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Photo B</label>
                    <select className="t-input" style={{ width: "100%" }} value={compareB} onChange={(e) => setCompareB(e.target.value)}>
                      {photos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label.toUpperCase()} • {toPrettyDate(p.recorded_at)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 12, ...cardSoft }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                    <span>{comparePhotoA ? `${comparePhotoA.label.toUpperCase()} • ${toPrettyDate(comparePhotoA.recorded_at)}` : ""}</span>
                    <span>{comparePhotoB ? `${comparePhotoB.label.toUpperCase()} • ${toPrettyDate(comparePhotoB.recorded_at)}` : ""}</span>
                  </div>

                  <div className="pg-compare">
                    {comparePhotoB ? <img src={comparePhotoB.url} alt="B" className="pg-compare-img" /> : null}
                    {comparePhotoA ? (
                      <img
                        src={comparePhotoA.url}
                        alt="A"
                        className="pg-compare-img pg-compare-top"
                        style={{ clipPath: `inset(0 ${100 - comparePos}% 0 0)` }}
                      />
                    ) : null}
                    <div className="pg-compare-line" style={{ left: `${comparePos}%` }} />
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={comparePos}
                    onChange={(e) => setComparePos(Number(e.target.value))}
                    style={{ width: "100%", marginTop: 10 }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="t-card pg-span-12">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>🗂️ Gallery</h2>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Tip: keep a monthly photo set (Front/Side/Back).</div>
            </div>

            <div style={{ marginTop: 12 }} className="pg-grid">
              {photos.map((p) => (
                <div key={p.id} style={{ ...cardSoft }} className="pg-span-3">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      <b style={{ opacity: 0.95 }}>{p.label.toUpperCase()}</b> • {toPrettyDate(p.recorded_at)}
                    </div>
                    <button className="t-btn" style={{ opacity: 0.75 }} onClick={() => removePhoto(p.id)}>✕</button>
                  </div>
                  <img src={p.url} alt={p.label} style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", marginTop: 10 }} />
                  {p.note ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82 }}>📝 {p.note}</div> : null}
                </div>
              ))}
              {photos.length === 0 ? <div style={{ ...cardSoft, opacity: 0.85 }}>No photos yet.</div> : null}
            </div>
          </div>
        </div>
      )}

      {/* ---------- MEASUREMENTS ---------- */}
      {tab === "measurements" && (
        <div className="pg-grid">
          <div className="t-card pg-span-7">
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>📏 Measurements</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>
              Weekly entries are enough. Pick 1–2 key metrics (e.g., waist + hips).
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
              <div style={{ gridColumn: "span 6" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Date</label>
                <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className="t-input" style={{ width: "100%" }} />
              </div>
              <div style={{ gridColumn: "span 6" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Note (optional)</label>
                <input value={mNote} onChange={(e) => setMNote(e.target.value)} className="t-input" style={{ width: "100%" }} placeholder="e.g., after deload" />
              </div>

              {[
                ["Waist", mWaist, setMWaist],
                ["Chest", mChest, setMChest],
                ["Hips", mHips, setMHips],
                ["Upper arm", mArm, setMArm],
                ["Thigh", mThigh, setMThigh],
              ].map(([label, val, setVal]) => (
                <div key={label as string} style={{ gridColumn: "span 6" }}>
                  <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                    {label} ({unitL})
                  </label>
                  <input
                    inputMode="decimal"
                    value={val as string}
                    onChange={(e) => (setVal as any)(e.target.value)}
                    className="t-input"
                    style={{ width: "100%" }}
                    placeholder={unitL === "cm" ? "e.g., 101" : "e.g., 39.8"}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="t-btn" onClick={() => void addMeasurement()} disabled={savingM}>
                {savingM ? "Saving…" : "Save measurements"}
              </button>
              <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("overview")}>Back</button>
            </div>

            <div style={{ marginTop: 12, ...cardSoft }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>📈 Trend</h3>
                <select className="t-input" style={{ width: 190 }} value={mFocus} onChange={(e) => setMFocus(e.target.value as any)}>
                  <option value="waist_cm">Waist</option>
                  <option value="chest_cm">Chest</option>
                  <option value="hips_cm">Hips</option>
                  <option value="arm_cm">Upper arm</option>
                  <option value="thigh_cm">Thigh</option>
                </select>
              </div>
              <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
                Stored in cm internally • shown as {unitL}.
              </div>
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.92)" }}>
                {measurementSeries.length >= 2 ? <Sparkline values={measurementSeries} /> : <div style={{ opacity: 0.85 }}>Add a couple entries to see a trend line.</div>}
              </div>
            </div>
          </div>

          <div className="t-card pg-span-5">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>🧾 Entries</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {measures.map((m) => {
                const show = (cm?: number) => {
                  if (!Number.isFinite(cm ?? NaN)) return "—";
                  const v = unitL === "cm" ? cm! : toIn(cm!);
                  return `${v.toFixed(1)} ${unitL}`;
                };

                return (
                  <div key={m.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{toPrettyDate(m.recorded_at)}</div>
                      <button className="t-btn" style={{ opacity: 0.75 }} onClick={() => removeMeasurement(m.id)}>✕</button>
                    </div>

                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontSize: 12 }}>
                      <div><span style={{ opacity: 0.75 }}>Waist:</span> <b>{show(m.waist_cm)}</b></div>
                      <div><span style={{ opacity: 0.75 }}>Chest:</span> <b>{show(m.chest_cm)}</b></div>
                      <div><span style={{ opacity: 0.75 }}>Hips:</span> <b>{show(m.hips_cm)}</b></div>
                      <div><span style={{ opacity: 0.75 }}>Arm:</span> <b>{show(m.arm_cm)}</b></div>
                      <div><span style={{ opacity: 0.75 }}>Thigh:</span> <b>{show(m.thigh_cm)}</b></div>
                    </div>

                    {m.note ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82 }}>📝 {m.note}</div> : null}
                  </div>
                );
              })}

              {measures.length === 0 ? (
                <div style={{ ...cardSoft, opacity: 0.85 }}>No measurement entries yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ---------- STRENGTH / PRs ---------- */}
      {tab === "strength" && (
        <div className="pg-grid">
          <div className="t-card pg-span-7">
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>🏋️ Strength & PRs</h2>
            <div style={{ fontSize: 13, opacity: 0.82, marginBottom: 12 }}>
              Log a heavy set. We compute an estimated 1RM (Epley) to track progression.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
              <div style={{ gridColumn: "span 6" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Exercise</label>
                <select className="t-input" style={{ width: "100%" }} value={sExercise} onChange={(e) => setSExercise(e.target.value)}>
                  {presets.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>Or custom:</div>
                <input className="t-input" style={{ width: "100%", marginTop: 6 }} value={sCustom} onChange={(e) => setSCustom(e.target.value)} placeholder="e.g., Incline DB Press" />
              </div>

              <div style={{ gridColumn: "span 6" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Date</label>
                <input type="date" className="t-input" style={{ width: "100%" }} value={sDate} onChange={(e) => setSDate(e.target.value)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Weight ({unitW})</label>
                    <input inputMode="decimal" className="t-input" style={{ width: "100%" }} value={sWeight} onChange={(e) => setSWeight(e.target.value)} placeholder={unitW === "kg" ? "e.g., 100" : "e.g., 225"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Reps</label>
                    <input inputMode="numeric" className="t-input" style={{ width: "100%" }} value={sReps} onChange={(e) => setSReps(e.target.value)} placeholder="e.g., 5" />
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: "span 12" }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Note (optional)</label>
                <input className="t-input" style={{ width: "100%" }} value={sNote} onChange={(e) => setSNote(e.target.value)} placeholder="e.g., RPE 8 / paused reps" />
              </div>
            </div>

            <div style={{ marginTop: 12, ...cardSoft }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Estimated 1RM preview</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950 }}>
                {(() => {
                  const w = Number(sWeight);
                  const reps = Number(sReps);
                  const kg = toKg(w, unitW);
                  if (!Number.isFinite(kg) || !Number.isFinite(reps) || reps < 1) return "—";
                  const one = epley1RM(kg, clamp(reps, 1, 30));
                  const shown = unitW === "kg" ? one : toLb(one);
                  return `${shown.toFixed(1)} ${unitW}`;
                })()}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78 }}>
                This is an estimate — use it for trends, not ego 🙂
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="t-btn" onClick={() => void addStrength()} disabled={savingS}>
                {savingS ? "Saving…" : "Save PR"}
              </button>
              <button className="t-btn" style={{ opacity: 0.9 }} onClick={() => setTab("overview")}>Back</button>
            </div>
          </div>

          <div className="t-card pg-span-5">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>🏆 Bests</h2>

            <div style={{ display: "grid", gap: 10 }}>
              {["Squat", "Bench Press", "Deadlift", "Overhead Press"].map((ex) => {
                const b = bestByExercise.get(ex);
                const shown = b ? (unitW === "kg" ? b.bestE1RM : toLb(b.bestE1RM)) : NaN;
                return (
                  <div key={ex} style={cardSoft}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{ex}</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950 }}>
                      {Number.isFinite(shown) ? `${shown.toFixed(1)} ${unitW}` : "—"}
                    </div>
                    {b ? (
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
                        Best set: {(unitW === "kg" ? b.best.weight_kg : toLb(b.best.weight_kg)).toFixed(1)} {unitW} × {b.best.reps} • {toPrettyDate(b.best.recorded_at)}
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Log a set to start tracking.</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, ...cardSoft }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Filter</div>
              <select className="t-input" style={{ width: "100%", marginTop: 8 }} value={sFilter} onChange={(e) => setSFilter(e.target.value)}>
                {strengthExercises.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>

          <div className="t-card pg-span-12">
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>🧾 History</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {filteredStrength.map((s) => {
                const loadShown = unitW === "kg" ? s.weight_kg : toLb(s.weight_kg);
                const one = epley1RM(s.weight_kg, s.reps);
                const oneShown = unitW === "kg" ? one : toLb(one);
                return (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 950 }}>{s.exercise}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {loadShown.toFixed(1)} {unitW} × {s.reps} • e1RM {oneShown.toFixed(1)} {unitW} • {toPrettyDate(s.recorded_at)}
                      </div>
                      {s.note ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>📝 {s.note}</div> : null}
                    </div>
                    <button className="t-btn" style={{ opacity: 0.75, alignSelf: "center" }} onClick={() => removeStrength(s.id)}>✕</button>
                  </div>
                );
              })}
              {filteredStrength.length === 0 ? <div style={{ ...cardSoft, opacity: 0.85 }}>No entries for this filter.</div> : null}
            </div>
          </div>
        </div>
      )}

      {/* Footer / data tools */}
      <div className="t-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, opacity: 0.78 }}>
            Offline mode: stored locally in your browser. Later we’ll connect Supabase (Auth + DB + Storage).
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="t-btn" style={{ opacity: 0.9 }} onClick={exportData}>Export</button>
            <label className="t-btn" style={{ opacity: 0.9, cursor: "pointer" }}>
              Import
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importDataFromFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <button className="t-btn" style={{ opacity: 0.8 }} onClick={resetDemo}>Reset</button>
          </div>
        </div>
      </div>

      {/* local styles for layout + compare */}
      <style jsx>{`
        .pg-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 12px;
        }
        .pg-span-12 { grid-column: span 12; }
        .pg-span-7 { grid-column: span 7; }
        .pg-span-6 { grid-column: span 6; }
        .pg-span-5 { grid-column: span 5; }
        .pg-span-3 { grid-column: span 3; }

        @media (max-width: 980px) {
          .pg-span-7, .pg-span-6, .pg-span-5, .pg-span-3 { grid-column: span 12; }
        }

        .pg-compare {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 4;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
        }
        .pg-compare-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pg-compare-top {
          filter: contrast(1.02);
        }
        .pg-compare-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(255, 255, 255, 0.65);
          transform: translateX(-1px);
          box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.12);
        }
      `}</style>
    </>
  );
}