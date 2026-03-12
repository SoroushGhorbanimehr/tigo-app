"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ensureTraineeProfile } from "@/lib/authRepo";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const access_token = url.searchParams.get("access_token");
        const refresh_token = url.searchParams.get("refresh_token");

        if (code) {
          // PKCE / email confirmation flow
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (access_token && refresh_token) {
          // Legacy hash-based links (fallback)
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        }
        // After session is set, ensure profile row exists
        await ensureTraineeProfile();
      } catch {
        // Ignore; we'll fall through to login
      } finally {
        if (!ignore) router.replace("/trainee/today");
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [router]);

  return null;
}
