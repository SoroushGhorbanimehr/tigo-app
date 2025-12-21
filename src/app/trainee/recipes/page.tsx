// src/app/trainee/recipes/page.tsx
import { Suspense } from "react";
import RecipesPageClient from "./RecipesPageClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RecipesPageClient />
    </Suspense>
  );
}
