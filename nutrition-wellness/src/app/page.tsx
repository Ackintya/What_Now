import { Suspense } from "react";
import { Navigation } from "@/components/Navigation";
import { NutritionWellnessPage } from "@/modules/nutrition/ui/NutritionWellnessPage";

export default function Page() {
  return (
    <>
      <Navigation />
      <Suspense fallback={<main className="min-h-screen pt-20 pb-10" />}>
        <NutritionWellnessPage />
      </Suspense>
    </>
  );
}
