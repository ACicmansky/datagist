"use client";

import { useState } from "react";
import { updateReportSettings } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ReportSettings } from "@/lib/validations/schemas";

interface SettingsFormProps {
  propertyId: string;
  initialSettings: Partial<ReportSettings>;
  isPro: boolean;
}

export function SettingsForm({ propertyId, initialSettings, isPro }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [frequency, setFrequency] = useState(initialSettings.frequency_days?.toString() || "30");
  const [complexity, setComplexity] = useState(initialSettings.complexity_level || "simple");
  const [recommendations, setRecommendations] = useState(
    initialSettings.include_recommendations || false
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateReportSettings(propertyId, {
      frequency_days: parseInt(frequency),
      complexity_level: complexity as "simple" | "detailed",
      include_recommendations: recommendations,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Settings saved successfully." });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success" ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="frequency">Report Frequency (Days)</Label>
        <Select
          value={frequency}
          onValueChange={setFrequency}
          disabled={!isPro && frequency !== "30"} // Lock if free, but allow viewing
        >
          <SelectTrigger id="frequency">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7" disabled={!isPro}>
              Weekly (7 Days) {!isPro && "(Pro)"}
            </SelectItem>
            <SelectItem value="14" disabled={!isPro}>
              Bi-Weekly (14 Days) {!isPro && "(Pro)"}
            </SelectItem>
            <SelectItem value="30">Monthly (30 Days)</SelectItem>
          </SelectContent>
        </Select>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            Upgrade to Pro for weekly or bi-weekly reports.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="complexity">Report Detail Level</Label>
        <Select
          value={complexity}
          onValueChange={(value) => setComplexity(value as "simple" | "detailed")}
        >
          <SelectTrigger id="complexity">
            <SelectValue placeholder="Select complexity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simple (Executive Summary)</SelectItem>
            <SelectItem value="detailed">Detailed (Deep Dive)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label htmlFor="recommendations">Strategic Recommendations</Label>
          <p className="text-xs text-muted-foreground">Receive AI-generated actionable advice.</p>
        </div>
        <Switch
          id="recommendations"
          checked={recommendations}
          onCheckedChange={setRecommendations}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
