"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuardClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const sp = useSearchParams();
  const mode = sp.get("mode");

  const isPublic =
    pathname === "/trainee/login" ||
    pathname === "/trainee/register" ||
    pathname === "/trainee/otp";

  useEffect(() => {
    let ignore = false;
    async function check() {
      // Allow public pages and trainer-view bypass (no auth for now)
      if (isPublic || mode === "trainer") {
        setChecked(true);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!ignore) {
        if (!data.user) {
          router.replace("/trainee/login");
        } else {
          setChecked(true);
        }
      }
    }
    check();
    return () => {
      ignore = true;
    };
  }, [isPublic, router, pathname, mode]);

  if (!checked) return null;
  return <>{children}</>;
}
