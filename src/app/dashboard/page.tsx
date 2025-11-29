import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ReportGenerator } from "@/components/report-generator";
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
              const insight = report.metrics_snapshot?.insight;
              return (
                <div key={report.id} className="border rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-medium">{insight?.summary || "Report"}</h3>
                      <p className="text-sm text-muted-foreground">
                        Generated on {new Date(report.generated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {report.status}
                    </span>
                  </div>

                  {insight && (
                    <div className="space-y-4">
                      <div>
                        <span className="font-semibold">Top Source:</span> {insight.top_source}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {insight.recommendations?.map((rec: string, i: number) => (
                            <li key={rec}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">No reports generated yet.</p>
        )}
      </div>
    </div>
  );
}
