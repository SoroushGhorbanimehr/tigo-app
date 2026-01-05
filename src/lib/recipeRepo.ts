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

export type RecipeImage = {
  path: string;
  publicUrl: string;
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

/**
 * Album helpers: list, upload, and delete images for a recipe album in storage.
 * Paths are under recipes/{recipeId}/album/
 */
export async function listRecipeAlbumImages(recipeId: string): Promise<RecipeImage[]> {
  const prefix = `recipes/${recipeId}/album`;
  const { data, error } = await supabase.storage
    .from("recipe-images")
    .list(prefix, { limit: 100 });
  if (error) throw new Error(error.message);
  const files = data || [];
  // Map to full paths and public URLs
  return files
    .filter((f) => !f.name.endsWith("/"))
    .map((f) => {
      const path = `${prefix}/${f.name}`;
      const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
      return { path, publicUrl: data.publicUrl } as RecipeImage;
    });
}

export async function uploadRecipeGalleryImages(recipeId: string, files: File[]): Promise<RecipeImage[]> {
  const results: RecipeImage[] = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `recipes/${recipeId}/album/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("recipe-images")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type || `image/${ext}` });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
    results.push({ path, publicUrl: data.publicUrl });
  }
  return results;
}

export async function deleteRecipeGalleryImage(recipeId: string, path: string): Promise<void> {
  // Ensure path belongs to recipe for safety
  const expectedPrefix = `recipes/${recipeId}/album/`;
  if (!path.startsWith(expectedPrefix)) throw new Error("Invalid image path for recipe");
  const { error } = await supabase.storage.from("recipe-images").remove([path]);
  if (error) throw new Error(error.message);
}
