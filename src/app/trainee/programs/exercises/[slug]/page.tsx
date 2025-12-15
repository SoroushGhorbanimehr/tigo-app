"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getExerciseBySlug, Exercise } from "@/lib/exerciseRepo";

export default function ExercisePage({ params }: { params: { slug: string } }) {
  const [ex, setEx] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getExerciseBySlug(params.slug)
      .then((row) => {
        if (!cancelled) setEx(row);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Exercise</h1>
        <Link href="/trainee/programs" style={{ textDecoration: "underline", opacity: 0.9 }}>
          ← Back to Programs
        </Link>
      </header>

      <div className="t-card">
        {loading && <div>Loading…</div>}

        {!loading && !ex && (
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Not found</div>
            <div style={{ opacity: 0.8 }}>This exercise doesn’t exist.</div>
          </div>
        )}

        {!loading && ex && (
          <>
            <h2 style={{ marginTop: 0 }}>{ex.title}</h2>
            <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 10 }}>
              {(ex.muscle_group ?? "—")} • {(ex.equipment ?? "—")}
            </div>

            {ex.video_url ? (
              <video
                src={ex.video_url}
                controls
                playsInline
                style={{
                  width: "100%",
                  maxHeight: 420,
                  borderRadius: 12,
                  border: "1px solid var(--cardBorder)",
                  background: "#000",
                }}
              />
            ) : (
              <div style={{ opacity: 0.8 }}>No video uploaded yet.</div>
            )}

            <div style={{ marginTop: 14, lineHeight: 1.6, opacity: 0.95 }}>
              {ex.description ? ex.description : "No description yet."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}