import { redirect } from "next/navigation";

import { DeletePropertyButton } from "@/components/dashboard/delete-property-button";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { SubscriptionButton } from "@/components/dashboard/subscription-button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "max";

  // Fetch property
  const { data: property } = await supabase
    .from("properties")
    .select("id, property_name")
    .eq("user_id", user.id)
    .single();

  if (!property) {
    redirect("/dashboard"); // No property to configure
  }

  // Fetch settings
  const { data: settings } = await supabase
    .from("report_settings")
    .select("*")
    .eq("property_id", property.id)
    .single();

  return (
    <div className="container mx-auto py-10 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your subscription and report preferences.</p>
      </div>

      <Separator />

      {/* Section 1: Subscription */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Subscription</h2>
        <Card>
          <CardHeader>
            <CardTitle>
              Current Plan: {profile?.subscription_tier?.toUpperCase() || "FREE"}
            </CardTitle>
            <CardDescription>
              {isPro
                ? "You are on the Pro plan. Enjoy weekly reports and AI recommendations."
                : "You are on the Free plan. Upgrade to unlock weekly reports and AI recommendations."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionButton isPro={isPro} />
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Section 2: Report Configuration */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Report Configuration</h2>
        <Card>
          <CardHeader>
            <CardTitle>Preferences for {property.property_name}</CardTitle>
            <CardDescription>
              Customize how often you receive reports and what they contain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm propertyId={property.id} initialSettings={settings || {}} isPro={isPro} />
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Section 3: Danger Zone */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Disconnect Property</CardTitle>
            <CardDescription>
              Permanently remove this property and all its data from DataGist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeletePropertyButton propertyId={property.id} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
