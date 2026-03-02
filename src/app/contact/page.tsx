"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Sex = "Male" | "Female" | "Other" | "Prefer not to say";
type Activity = "Sedentary" | "Lightly active" | "Moderately active" | "Very active" | "Athlete";

export default function ContactPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<Sex>("Male");
  const [height, setHeight] = useState<string>(""); // cm
  const [weight, setWeight] = useState<string>(""); // kg
  const [activity, setActivity] = useState<Activity>("Sedentary");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  function buildMailto() {
    const to = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
    if (!to) return "";
    const subject = encodeURIComponent("Tigo Contact Request");
    const body = encodeURIComponent(
      [
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Age: ${age}`,
        `Sex: ${sex}`,
        `Height (cm): ${height}`,
        `Weight (kg): ${weight}`,
        `Physical Activity: ${activity}`,
        notes ? `Notes: ${notes}` : undefined,
      ]
        .filter(Boolean)
        .join("\n")
    );
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function saveDraft() {
    try {
      const payload = { fullName, email, phone, age, sex, height, weight, activity, notes, dt: new Date().toISOString() };
      localStorage.setItem("tigo_contact_draft", JSON.stringify(payload));
    } catch {}
  }

  function validate() {
    return fullName.trim() && email.trim() && phone.trim() && age && height && weight;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    setMsg("");

    const mailto = buildMailto();
    // Save details locally for schedule page to use
    saveDraft();

    // Try to open user's mail app (if configured)
    if (mailto) {
      try { window.location.href = mailto; } catch {}
    }

    // Redirect to schedule page
    setTimeout(() => router.push("/schedule"), 150);
  }

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Contact Us</h1>
        <Link href="/" className="t-link" style={{ opacity: 0.9 }}>
          ← Home
        </Link>
      </header>

      <div className="t-card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Name *</span>
            <input className="t-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Email *</span>
              <input className="t-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Phone number *</span>
              <input className="t-input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Age *</span>
              <input className="t-input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} required />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Sex</span>
              <select className="t-input" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Height (cm) *</span>
              <input className="t-input" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} required />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Weight (kg) *</span>
              <input className="t-input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} required />
            </label>
          </div>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Physical Activity</span>
            <select className="t-input" value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
              <option>Sedentary</option>
              <option>Lightly active</option>
              <option>Moderately active</option>
              <option>Very active</option>
              <option>Athlete</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Notes (optional)</span>
            <textarea className="t-textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <button type="submit" className="t-btn t-btn--primary" disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting…" : "Submit"}
          </button>

          {msg && (
            <p style={{ fontSize: 13, opacity: 0.9 }}>{msg}</p>
          )}
        </form>
      </div>
    </div>
  );
}
