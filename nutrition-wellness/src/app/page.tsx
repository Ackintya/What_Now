import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { NutritionWellnessPage } from "@/modules/nutrition/ui/NutritionWellnessPage";
import { getCurrentUser } from "@/lib/auth";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("http://localhost:3000");
  }

  return (
    <>
      <Navigation user={user} />
      <Suspense fallback={<main className="min-h-screen pt-20 pb-10" />}>
        <NutritionWellnessPage userId={user.userId} userName={user.name} />
      </Suspense>
    </>
  );
}
