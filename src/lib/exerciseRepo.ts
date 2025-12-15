// src/lib/exerciseRepo.ts
import { supabase } from "./supabaseClient";

export type Exercise = {
  id: string;
  title: string;
  slug: string;
  muscle_group: string | null;
  equipment: string | null;
  description: string | null;
  video_url: string | null;
  created_at: string;
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id,title,slug,muscle_group,equipment,description,video_url,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function getExerciseBySlug(slug: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id,title,slug,muscle_group,equipment,description,video_url,created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Exercise | null;
}

export async function createExercise(payload: {
  title: string;
  muscle_group?: string;
  equipment?: string;
  description?: string;
}): Promise<Exercise> {
  // generate slug on client (simple + predictable)
  const base = slugify(payload.title);
  const slug = base || `ex-${Date.now()}`;

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      title: payload.title,
      slug,
      muscle_group: payload.muscle_group || null,
      equipment: payload.equipment || null,
      description: payload.description || null,
      video_url: null,
    })
    .select("id,title,slug,muscle_group,equipment,description,video_url,created_at")
    .single();

  // If you have a UNIQUE constraint on slug, duplicates can fail here.
  // In that case you can retry with slug + "-xxxx" but keep it simple for now.
  if (error) throw error;
  return data as Exercise;
}

export async function updateExercise(
  id: string,
  patch: Partial<Pick<Exercise, "title" | "slug" | "muscle_group" | "equipment" | "description" | "video_url">>
): Promise<Exercise> {
  const { data, error } = await supabase
    .from("exercises")
    .update(patch)
    .eq("id", id)
    .select("id,title,slug,muscle_group,equipment,description,video_url,created_at")
    .single();

  if (error) throw error;
  return data as Exercise;
}

/**
 * Uploads a video to Supabase Storage and saves the PUBLIC url in exercises.video_url
 *
 * IMPORTANT:
 * - Bucket: "exercise-videos" must exist
 * - Bucket must be public OR you must switch to signed URLs later
 */
export async function uploadExerciseVideo(exerciseId: string, file: File) {
  const ext = file.name.split(".").pop() || "mp4";
  const path = `exercises/${exerciseId}/${crypto.randomUUID()}.${ext}`;

  // 1) Upload to Storage
  const { error: upErr } = await supabase.storage
    .from("exercise-videos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "video/mp4",
    });

  if (upErr) throw upErr;

  // 2) Convert to public URL (bucket must be public)
  const { data } = supabase.storage.from("exercise-videos").getPublicUrl(path);
  const publicUrl = data.publicUrl;

  // 3) Save URL into DB
  const { error: dbErr } = await supabase
    .from("exercises")
    .update({ video_url: publicUrl })
    .eq("id", exerciseId);

  // IMPORTANT: this is the part that usually fails while the file is already uploaded.
  if (dbErr) {
    throw new Error(
      `Video uploaded to storage, but saving video_url failed: ${dbErr.message}`
    );
  }

  return publicUrl;
}