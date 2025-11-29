import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has any properties configured
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!property) {
    // User has no properties, show onboarding wizard
    return (
      <div className="container mx-auto py-10">
        <OnboardingWizard />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p>Welcome back! Your reports are being generated.</p>
      {/* TODO: Add dashboard overview components here */}
    </div>
  );
}
