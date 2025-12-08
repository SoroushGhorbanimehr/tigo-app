import { supabase } from "./supabaseClient";

export type NotesMap = Record<string, string>;

// Load all notes for one trainee as { "2025-12-08": "text...", ... }
export async function loadNotesForTrainee(
  traineeId: string
): Promise<NotesMap> {
  const { data, error } = await supabase
    .from("notes")
    .select("date, note")
    .eq("trainee_id", traineeId);

  if (error) {
    console.error("Error loading notes", error);
    return {};
  }

  const map: NotesMap = {};
  for (const row of data ?? []) {
    // Supabase returns date as "YYYY-MM-DD"
    map[row.date as string] = (row.note as string) ?? "";
  }
  return map;
}

// Save/update note for a single day
export async function saveNoteForTrainee(
  traineeId: string,
  date: string,
  note: string
) {
  const { error } = await supabase
    .from("notes")
    .upsert({
      trainee_id: traineeId,
      date,
      note,
    });

  if (error) {
    console.error("Error saving note", error);
    throw error;
  }
}