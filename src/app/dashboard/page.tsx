import { redirect } from "next/navigation";
import { ReportCard } from "@/components/dashboard/report-card";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ReportGenerator } from "@/components/report-generator";
import type { AIAnalysisResult } from "@/lib/validations/ai";
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
    .select("id, property_name")
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

  // Fetch reports
  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .eq("property_id", property.id)
    .order("generated_at", { ascending: false });

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview for {property.property_name}</p>
        </div>
        <ReportGenerator propertyId={property.id} />
      </div>

      <div className="grid gap-6">
        <h2 className="text-2xl font-semibold">Recent Reports</h2>
        {reports && reports.length > 0 ? (
          <div className="grid gap-4">
            {reports.map((report) => {
              // Ensure type safety for ai_result
              const aiResult = report.ai_result as AIAnalysisResult | null;

              if (!aiResult) {
                // Fallback for old reports or failed generations
                return (
                  <div key={report.id} className="border rounded-lg p-6 shadow-sm">
                    <p className="text-muted-foreground">
                      Legacy report generated on{" "}
                      {new Date(report.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                );
              }

              return <ReportCard key={report.id} data={aiResult} date={report.generated_at} />;
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">No reports generated yet.</p>
        )}
      </div>
    </div>
  );
}
