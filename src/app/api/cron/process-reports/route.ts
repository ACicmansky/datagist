import { NextResponse } from "next/server";
import { processReportForProperty } from "@/lib/services/report-generator";
import { createAdminClient } from "@/lib/supabase/admin";

// Create a Supabase client with the Service Role Key to bypass RLS.
const supabaseAdmin = createAdminClient();

export async function GET(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 2. Query Due Reports
    const now = new Date().toISOString();
    const { data: dueReports, error } = await supabaseAdmin
      .from("report_settings")
      .select(`
        id,
        property_id,
        frequency_days,
        properties!inner (
          id,
          user_id,
          created_at
        )
      `)
      .eq("is_active", true)
      .lte("next_send_at", now);

    if (error) {
      console.error("Error fetching due reports:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!dueReports || dueReports.length === 0) {
      return NextResponse.json({ message: "No reports due", processed: 0 });
    }

    // 3. Group by User
    const reportsByUser = new Map<string, typeof dueReports>();
    const userIds = new Set<string>();

    for (const report of dueReports) {
      // Type assertion for nested property
      const property = report.properties as unknown as {
        id: string;
        user_id: string;
        created_at: string;
      };
      const userId = property.user_id;

      if (!reportsByUser.has(userId)) {
        reportsByUser.set(userId, []);
      }
      reportsByUser.get(userId)?.push(report);
      userIds.add(userId);
    }

    // 4. Fetch User Profiles (for Subscription Tier)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, subscription_tier")
      .in("id", Array.from(userIds));

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      // Continue but assume 'free' tier for everyone if this fails?
      // Better to fail safely or log. We'll assume 'free' if profile missing.
    }

    const userTiers = new Map<string, string>();
    profiles?.forEach((p) => {
      userTiers.set(p.id, p.subscription_tier || "free");
    });

    // 5. Filter & Process
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const [userId, userReports] of reportsByUser) {
      const tier = userTiers.get(userId) || "free";
      let allowance = 1; // Default Free
      if (tier === "pro") allowance = 3;
      if (tier === "max") allowance = 5;

      // Sort by property creation date (Oldest first)
      // We want to keep the oldest properties active if they downgrade
      userReports.sort((a, b) => {
        const pA = a.properties as unknown as { created_at: string };
        const pB = b.properties as unknown as { created_at: string };
        return new Date(pA.created_at).getTime() - new Date(pB.created_at).getTime();
      });

      // Take only the allowed number
      const allowedReports = userReports.slice(0, allowance);
      const skippedReports = userReports.slice(allowance);
      skippedCount += skippedReports.length;

      // Process Allowed
      for (const setting of allowedReports) {
        const property = setting.properties as unknown as { id: string; user_id: string };

        try {
          await processReportForProperty(property.id, property.user_id);

          // Update Schedule
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + (setting.frequency_days || 30));

          await supabaseAdmin
            .from("report_settings")
            .update({
              last_sent_at: now,
              next_send_at: nextDate.toISOString(),
              last_error: null,
            })
            .eq("id", setting.id);

          processedCount++;
        } catch (err) {
          console.error(`Failed to process report for property ${property.id}:`, err);
          errorCount++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          await supabaseAdmin
            .from("report_settings")
            .update({ last_error: errorMessage })
            .eq("id", setting.id);
        }
      }
    }

    console.log(
      `Processed: ${processedCount}, Errors: ${errorCount}, Skipped (Limit): ${skippedCount}`
    );

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
