"use client";
// TODO: this page should be shared between trainer and trainee, with different modes. so I should move this part to trainer
// and refactor the trainee to use this too.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  listExercises,
  createExercise,
  updateExercise,
  uploadExerciseVideo,
  Exercise,
} from "@/lib/exerciseRepo";

export default function ProgramsPage() {
  const sp = useSearchParams();
  const mode = sp.get("mode"); // "trainer" or null
  const isTrainer = mode === "trainer";

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // create form (trainer only)
  const [title, setTitle] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listExercises();
      setExercises(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listExercises()
      .then((rows) => {
        if (!cancelled) setExercises(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return exercises;
    return exercises.filter((e) =>
      [e.title, e.muscle_group, e.equipment, e.description, e.slug]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [q, exercises]);

  async function handleCreate() {
    if (!title.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      await createExercise({
        title: title.trim(),
        muscle_group: muscle.trim() || undefined,
        equipment: equipment.trim() || undefined,
        description: desc.trim() || undefined,
      });

      setTitle("");
      setMuscle("");
      setEquipment("");
      setDesc("");
      await refresh();
      setMsg("Created ✅");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Programs</h1>

        <Link
          href={isTrainer ? "/trainer/clients" : "/trainee/today"}
          style={{ textDecoration: "underline", opacity: 0.9 }}
        >
          ← Back
        </Link>
      </header>

      {/* Trainer-only editor */}
      {isTrainer && (
        <section className="t-card" style={{ marginTop: 14 }}>
          <h2 style={{ marginTop: 0 }}>Coach – Add new exercise</h2>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g., Incline Bench Press)"
              style={inputStyle}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
                placeholder="Muscle group (optional)"
                style={inputStyle}
              />
              <input
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="Equipment (optional)"
                style={inputStyle}
              />
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Short description / tips (optional)"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={handleCreate}
                disabled={busy}
                style={buttonStyle}
              >
                {busy ? "Creating…" : "+ Create exercise"}
              </button>
              {msg && <span style={{ fontSize: 13, opacity: 0.9 }}>{msg}</span>}
            </div>
          </div>
        </section>
      )}

      {/* Library (both, but trainer has upload/edit controls) */}
      <section className="t-card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Exercise Library</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: bench, squat, smith, chest…"
            style={{ ...inputStyle, width: 320, maxWidth: "100%" }}
          />
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}

          {!loading && filtered.length === 0 && (
            <div style={{ opacity: 0.8 }}>No exercises found.</div>
          )}

          {!loading &&
            filtered.map((ex) => (
              <div
                key={ex.id}
                className="t-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <Link
                  href={`/trainee/programs/exercises/${ex.slug}${isTrainer ? "?mode=trainer" : ""}`}
                  style={{ textDecoration: "none", flex: 1 }}
                >
                  <div style={{ fontWeight: 800 }}>{ex.title}</div>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    {(ex.muscle_group ?? "—")} • {(ex.equipment ?? "—")}
                  </div>
                  <div style={{ opacity: 0.8, fontSize: 12, marginTop: 6 }}>
                    {ex.video_url ? "Video ✅" : "No video"}
                  </div>
                </Link>

                {/* Trainer-only controls */}
                {isTrainer && (
                  <TrainerControls
                    ex={ex}
                    onUpdated={async () => {
                      await refresh();
                    }}
                  />
                )}
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function TrainerControls(props: { ex: Exercise; onUpdated: () => Promise<void> }) {
  const { ex, onUpdated } = props;
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(ex.title);
  const [muscle, setMuscle] = useState(ex.muscle_group ?? "");
  const [equipment, setEquipment] = useState(ex.equipment ?? "");
  const [desc, setDesc] = useState(ex.description ?? "");
  const [msg, setMsg] = useState("");

  async function saveMeta() {
    setSaving(true);
    setMsg("");
    try {
      await updateExercise(ex.id, {
        title: title.trim() || ex.title,
        muscle_group: muscle.trim() || null,
        equipment: equipment.trim() || null,
        description: desc.trim() || null,
      });
      await onUpdated();
      setMsg("Saved ✅");
      setTimeout(() => setMsg(""), 1500);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setSaving(true);
    setMsg("");
    try {
      await uploadExerciseVideo(ex.id, file);
      await onUpdated();
      setMsg("Video uploaded ✅");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ width: 360, maxWidth: "45%", display: "grid", gap: 8 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} style={miniInputStyle} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input value={muscle} onChange={(e) => setMuscle(e.target.value)} placeholder="muscle" style={miniInputStyle} />
        <input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="equipment" style={miniInputStyle} />
      </div>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} style={{ ...miniInputStyle, resize: "vertical" }} />

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={saveMeta} disabled={saving} style={miniButtonStyle}>
          {saving ? "Saving…" : "Save"}
        </button>

        <label style={{ ...miniButtonStyle, display: "inline-block", cursor: "pointer" }}>
          Upload video
          <input
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {msg && <span style={{ fontSize: 12, opacity: 0.9 }}>{msg}</span>}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--cardBorder)",
  background: "#0f1420",
  color: "#fff",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--cardBorder)",
  background: "#1f2937",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const miniInputStyle: React.CSSProperties = {
  padding: 8,
  borderRadius: 10,
  border: "1px solid var(--cardBorder)",
  background: "#0f1420",
  color: "#fff",
  fontSize: 13,
};

const miniButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid var(--cardBorder)",
  background: "#111827",
  color: "#fff",
  fontSize: 12,
};