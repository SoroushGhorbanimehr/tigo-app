// app/trainee/progress/page.tsx
"use client";

export default function ProgressPage() {
  return (
    <>
      <h1 className="t-title" style={{ marginBottom: 12 }}>Progress</h1>
      <div className="t-card">
        <p style={{ marginTop: 0, opacity: 0.9 }}>
          Charts and logs will go here (weight, workouts, PRs, macros).
        </p>
        {/* When ready, we can mount charts that resize with the container. */}
      </div>
    </>
  );
}