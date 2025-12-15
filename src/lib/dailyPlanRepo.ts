import { supabase } from "./supabaseClient";

export type DailyPlan = {
  trainee_id: string;
  date: string;
  coach_note: string | null;
  program: string | null;
  meal: string | null;
};

export async function getDailyPlan(
  traineeId: string,
  date: string
): Promise<DailyPlan> {
  const { data, error } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("trainee_id", traineeId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error("Error loading daily plan", error);
    throw error;
  }

  return (
    data ?? {
      trainee_id: traineeId,
      date,
      coach_note: "",
      program: "",
      meal: "",
    }
  );
}

export async function upsertDailyPlan(plan: DailyPlan) {
  const { error } = await supabase.from("daily_plans").upsert(plan);

  if (error) {
    console.error("Error saving daily plan", error);
    throw error;
  }
}