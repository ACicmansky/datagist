import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { processReportForProperty } from "@/lib/services/report-generator";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables for admin client");
}

// Create a Supabase client with the Service Role Key to bypass RLS.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 2. Query Due Reports
    // Find active settings where next_send_at is in the past
    const now = new Date().toISOString();
    const { data: dueReports, error } = await supabaseAdmin
      .from("report_settings")
      .select(`
        id,
        property_id,
        frequency_days,
        properties!inner (
          id,
          user_id
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

    console.log(`Found ${dueReports.length} reports to process.`);

    let processedCount = 0;
    let errorCount = 0;

    // 3. Process Each Report
    for (const setting of dueReports) {
      // Type assertion because Supabase types might be deep
      const property = setting.properties as unknown as { id: string; user_id: string };

      try {
        await processReportForProperty(property.id, property.user_id);

        // 4. Update Schedule on Success
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + (setting.frequency_days || 30));

        await supabaseAdmin
          .from("report_settings")
          .update({
            last_sent_at: now,
            next_send_at: nextDate.toISOString(),
            last_error: null, // Clear previous errors
          })
          .eq("id", setting.id);

        processedCount++;
      } catch (err) {
        console.error(`Failed to process report for property ${property.id}:`, err);
        errorCount++;

        // Log error to DB
        const errorMessage = err instanceof Error ? err.message : String(err);
        await supabaseAdmin
          .from("report_settings")
          .update({
            last_error: errorMessage,
          })
          .eq("id", setting.id);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
