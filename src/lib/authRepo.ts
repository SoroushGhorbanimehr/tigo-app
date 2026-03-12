import { supabase } from "./supabaseClient";

type SignUpResult = {
  userId: string | null;
  emailConfirmationRequired: boolean;
};

export async function signUpTrainee(
  fullName: string,
  email: string,
  password: string
): Promise<SignUpResult> {
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo,
    },
  });

  if (error) {
    throw error;
  }

  const user = data.user ?? null;

  // Create or update a corresponding profile row.
  // Assumes `trainees` has columns: id (uuid, PK), full_name, email, password (nullable)
  if (user) {
    const { error: upsertErr } = await supabase
      .from("trainees")
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          email: email || null,
          password: null,
        },
        { onConflict: "id" }
      );

    if (upsertErr) {
      // If profile creation fails, sign the user out to avoid half-created accounts
      try {
        await supabase.auth.signOut();
      } catch {}
      throw upsertErr;
    }
  }

  return {
    userId: user?.id ?? null,
    emailConfirmationRequired: !data.session,
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function ensureTraineeProfile(opts?: { fullName?: string; email?: string }) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const fullName = opts?.fullName ?? (user.user_metadata?.full_name as string | undefined) ?? "Trainee";
  const email = opts?.email ?? user.email ?? null;

  await supabase
    .from("trainees")
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        email,
        password: null,
      },
      { onConflict: "id" }
    );
}
