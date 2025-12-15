"use client";

import Link from "next/link";

export default function TraineeLandingClient() {
  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Trainee</h1>
        <Link href="/" style={{ textDecoration: "underline", opacity: 0.9 }}>
          ← Back to entrance
        </Link>
      </header>

      <div
        className="t-today-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
      >
        <Link href="/trainee/login" className="t-card" style={{ cursor: "pointer" }}>
          <h2 style={{ marginBottom: 8 }}>I already have an account</h2>
          <p style={{ opacity: 0.85, fontSize: 14 }}>
            Log in with the username and password Coach Tigo gave you.
          </p>
        </Link>

        <Link href="/trainee/register" className="t-card" style={{ cursor: "pointer" }}>
          <h2 style={{ marginBottom: 8 }}>I am new here</h2>
          <p style={{ opacity: 0.85, fontSize: 14 }}>
            Register as a new trainee, then use your credentials to log in.
          </p>
        </Link>
      </div>
    </div>
  );
}