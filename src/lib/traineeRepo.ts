// src/lib/traineeRepo.ts
import { supabase } from "./supabaseClient";

export type Trainee = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
};

// Register a new trainee
export async function registerTrainee(fullName: string, email?: string) {
  const { data, error } = await supabase
    .from("trainees")
    .insert({ full_name: fullName, email: email || null })
    .select("id, full_name, email, created_at")
    .single();

  if (error) {
    console.error("Error registering trainee", error);
    throw error;
  }

  return data as Trainee;
}

// List all trainees (for trainer dashboard)
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