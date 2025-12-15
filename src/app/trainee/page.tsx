// src/app/trainee/page.tsx
import { Suspense } from "react";
import TraineeLandingClient from "./TraineeLandingClient";

export default function TraineePage() {
  return (
    <Suspense fallback={<div className="t-root">Loading…</div>}>
      <TraineeLandingClient />
    </Suspense>
  );
}