import Link from "next/link";

export default function TraineePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <section style={{ textAlign: "center", maxWidth: 720 }}>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, marginBottom: "0.5rem" }}>
          Trainee Portal
        </h1>
        <p style={{ opacity: 0.9, fontSize: "clamp(16px, 2vw, 20px)" }}>
          Here we’ll show workouts, progress tracking, weight logs, and video sessions.
        </p>

        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/" style={{ textDecoration: "underline" }}>← Back to Home</Link>
        </div>
      </section>
    </main>
  );
}