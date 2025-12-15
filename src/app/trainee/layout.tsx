// src/app/trainee/layout.tsx
"use client";

import "./trainee.css";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function TraineeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hideNav = pathname === "/trainee/login";

  // keep whatever is in the URL (tid, mode, etc.)
  const suffix = useMemo(() => {
    const qs = searchParams?.toString() ?? "";
    return qs ? `?${qs}` : "";
  }, [searchParams]);

  const tabs = [
    { href: "/trainee/today", label: "Today" },
    { href: "/trainee/programs", label: "Programs" },
    { href: "/trainee/progress", label: "Progress" },
  ];

  return (
    <main className="t-shell">
      <section className="t-container">{children}</section>

      {!hideNav && (
        <nav className="t-bottomnav" role="navigation" aria-label="Trainee sections">
          <div className="t-tabs">
            {tabs.map((t) => {
              const active = pathname?.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={`${t.href}${suffix}`}
                  className="t-tab"
                  aria-current={active ? "page" : undefined}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </main>
  );
}