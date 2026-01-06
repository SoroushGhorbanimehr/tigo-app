// src/lib/traineeRepo.ts
import { supabase } from "./supabaseClient";

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type Trainee = {
  id: string;
  full_name: string;
  email: string | null;
  password: string | null;
  created_at?: string;
};

export async function registerTrainee(
  fullName: string,
  email: string,
  password: string
): Promise<Trainee> {
  // Store a SHA-256 hash instead of plaintext. For stronger security,
  // migrate to Supabase Auth and RLS (recommended).
  const hashed = await sha256Hex(password);
  const { data, error } = await supabase
    .from("trainees")
    .insert({
      full_name: fullName,
      email: email || null,
      password: hashed,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error registering trainee", error);
    throw error;
  }

  return data as Trainee;
}

// ✅ List all trainees (for trainer dashboard)
export async function listTrainees(): Promise<Trainee[]> {
  const { data, error } = await supabase
    .from("trainees")
    .select("id, full_name, email, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error listing trainees", error);
    return [];
  }

  return (data ?? []) as Trainee[];
}

export async function getTraineeById(id: string): Promise<Trainee | null> {
  const { data, error } = await supabase
    .from("trainees")
    .select("id, full_name, email")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching trainee by id", error);
    return null;
  }

  return (data as Trainee) ?? null;
}
