"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";

type Draft = {
  fullName?: string;
  email?: string;
  phone?: string;
  age?: string;
  sex?: string;
  height?: string;
  weight?: string;
  activity?: string;
  notes?: string;
};

export default function SchedulePage() {
  const [draft, setDraft] = useState<Draft>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tigo_contact_draft");
      if (raw) setDraft(JSON.parse(raw));
    } catch {}
  }, []);

  function buildMailto() {
    const to = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
    if (!to) return "";
    const subject = encodeURIComponent("Tigo Scheduling Request");
    const body = encodeURIComponent(
      [
        `Name: ${draft.fullName || ""}`,
        `Email: ${draft.email || ""}`,
        `Phone: ${draft.phone || ""}`,
        `Requested Date: ${date}`,
        `Requested Time: ${time} (${tz})`,
      ]
        .filter(Boolean)
        .join("\n")
    );
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    setStatus("submitting");
    // Open mail client if configured
    const mailto = buildMailto();
    if (mailto) {
      try { window.location.href = mailto; } catch {}
    }
    setStatus("success");
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Schedule with Tigo</h1>
        <Link href="/" className="t-link" style={{ opacity: 0.9 }}>
          ← Home
        </Link>
      </header>

      <div className="t-card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.95 }}>
            {draft.fullName ? `Hi ${draft.fullName}, pick a time:` : "Pick a time:"}
          </div>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Date *</span>
            <input className="t-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Time *</span>
            <input className="t-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </label>

          <div style={{ fontSize: 13, opacity: 0.8 }}>Timezone: {tz}</div>

          <button type="submit" className="t-btn t-btn--primary" disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting…" : "Confirm"}
          </button>

          {status === "success" && (
            <p style={{ fontSize: 13, opacity: 0.9 }}>
              Thanks! We’ll reach out to confirm your appointment.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

