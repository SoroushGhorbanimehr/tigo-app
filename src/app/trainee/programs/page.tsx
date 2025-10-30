// app/trainee/programs/page.tsx
"use client";

export default function ProgramsPage() {
  const programs = [
    { name: "Upper A", focus: "Chest/Back", days: "Mon", notes: "RPE 7–8" },
    { name: "Lower A", focus: "Quads/Hams", days: "Tue", notes: "Tempo squats" },
    { name: "Upper B", focus: "Shoulders/Arms", days: "Thu", notes: "Supersets" },
    { name: "Lower B", focus: "Glutes/Calves", days: "Sat", notes: "Pause reps" },
  ];

  return (
    <>
      <h1 className="t-title" style={{ marginBottom: 12 }}>Programs</h1>
      <div style={{ display: "grid", gap: 12 }}>
        {programs.map((p) => (
          <div
            key={p.name}
            className="t-card"
            style={{
              display: "grid",
              gap: 6,
              gridTemplateColumns: "1fr",    /* mobile: stack */
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{p.focus} • {p.days}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, whiteSpace: "nowrap" }}>{p.notes}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}