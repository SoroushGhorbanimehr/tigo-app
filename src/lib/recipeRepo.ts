// src/lib/recipeRepo.ts
import { supabase } from "./supabaseClient";

export type Recipe = {
  id: string;
  title: string;
  slug: string;
  description: string | null; // preparation notes / steps
  image_url: string | null;
  created_at: string;
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function listRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id,title,slug,description,image_url,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Recipe[];
}

export async function createRecipe(payload: {
  title: string;
  description?: string;
}): Promise<Recipe> {
  const base = slugify(payload.title);
  const slug = base || `rcp-${Date.now()}`;

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      title: payload.title,
      slug,
      description: payload.description || null,
      image_url: null,
    })
    .select("id,title,slug,description,image_url,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as Recipe;
}

export async function updateRecipe(
  id: string,
  patch: Partial<Pick<Recipe, "title" | "slug" | "description" | "image_url">>
): Promise<Recipe> {
  const { data, error } = await supabase
    .from("recipes")
    .update(patch)
    .eq("id", id)
    .select("id,title,slug,description,image_url,created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Recipe;
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id,title,slug,description,image_url,created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Recipe | null;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Uploads an image to Supabase Storage and saves the PUBLIC url in recipes.image_url
 * Bucket: "recipe-images" (public) recommended for now.
 */
export async function uploadRecipeImage(recipeId: string, file: File) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `recipes/${recipeId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("recipe-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || `image/${ext}`,
    });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: dbErr } = await supabase
    .from("recipes")
    .update({ image_url: publicUrl })
    .eq("id", recipeId);
  if (dbErr) {
    throw new Error(
      `Image uploaded to storage, but saving image_url failed: ${dbErr.message}`
    );
  }
  return publicUrl;
}
