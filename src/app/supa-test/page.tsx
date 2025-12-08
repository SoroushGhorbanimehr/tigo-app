"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SupaTestPage() {
  const [status, setStatus] = useState<string>("idle");

  async function handleClick() {
    setStatus("saving…");
    const { error } = await supabase.from("notes").insert({
      trainee_id: "test-trainee",
      date: "2025-01-01",
      note: "Hello from Next.js + Supabase!",
    });

    if (error) {
      console.error(error);
      setStatus("error: " + error.message);
    } else {
      setStatus("saved ✅");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <button onClick={handleClick}>Save test note</button>
      <div style={{ marginTop: 16 }}>Status: {status}</div>
    </div>
  );
}