// src/app/trainer/page.tsx
"use client";

import Link from "next/link";

export default function TrainerPage() {
  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Coach TIGO – Dashboard</h1>
        <Link href="/" style={{ textDecoration: "underline", opacity: 0.9 }}>
          ← Back to Home
        </Link>
      </header>

      <div
        className="t-today-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
      >
        {/* Trainees */}
        <Link
          href="/trainer/clients"
          className="t-card"
          style={{ cursor: "pointer", textDecoration: "none" }}
        >
          <h2 style={{ marginBottom: 8 }}>Trainees</h2>
          <p style={{ opacity: 0.85, fontSize: 14 }}>
            See all trainees and open their Today plan.
          </p>
        </Link>

        {/* Exercise Library */}
        <Link
          href="/trainee/programs?mode=trainer"
          className="t-card"
          style={{ cursor: "pointer", textDecoration: "none" }}
        >
          <h2 style={{ marginBottom: 8 }}>Exercise Library</h2>
          <p style={{ opacity: 0.85, fontSize: 14 }}>
            Add/edit exercises and upload demo videos.
          </p>
        </Link>

        {/* Recipe Library */}
        <Link
          href="/trainee/recipes?mode=trainer"
          className="t-card"
          style={{ cursor: "pointer", textDecoration: "none" }}
        >
          <h2 style={{ marginBottom: 8 }}>Recipe Library</h2>
          <p style={{ opacity: 0.85, fontSize: 14 }}>
            Add recipes with image and preparation notes.
          </p>
        </Link>
      </div>

      <div className="t-card" style={{ marginTop: 14, opacity: 0.85, fontSize: 13 }}>
        Tip: We removed the mock tabs (Programs/Trainees/Sessions/Analytics) to avoid confusion.
        Everything real is now under <strong>Trainees</strong>, <strong>Exercise Library</strong>, and <strong>Recipe Library</strong>.
      </div>
    </div>
  );
}
