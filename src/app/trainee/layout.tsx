// src/app/trainee/layout.tsx
"use client";

import "./trainee.css";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TraineeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/trainee/login";

  return (
    <main className="t-shell">
      <section className="t-container">{children}</section>

      {!hideNav && (
        <Suspense fallback={null}>
          <BottomNav pathname={pathname} />
        </Suspense>
      )}
    </main>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const sp = useSearchParams();
  const mode = sp.get("mode"); // "trainer" or null
  const keepMode = mode === "trainer" ? "?mode=trainer" : "";

  const tabs = [
    { href: "/trainee/today", label: "Today" },
    { href: "/trainee/programs", label: "Programs" },
    { href: "/trainee/progress", label: "Progress" },
  ];

  return (
    <nav className="t-bottomnav" role="navigation" aria-label="Trainee sections">
      <div className="t-tabs">
        {tabs.map((t) => {
          const active = pathname?.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={`${t.href}${keepMode}`}
              className="t-tab"
              aria-current={active ? "page" : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}