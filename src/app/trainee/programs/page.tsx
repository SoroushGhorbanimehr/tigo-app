// src/app/trainee/programs/page.tsx
import { Suspense } from "react";
import ProgramsPageClient from "./ProgramsPageClient";

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <div className="t-root">
          <div className="t-card" style={{ marginTop: 14 }}>
            Loading Programs…
          </div>
        </div>
      }
    >
      <ProgramsPageClient />
    </Suspense>
  );
}