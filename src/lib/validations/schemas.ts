import { z } from "zod";

// --- Database Enums ---
export const SubscriptionTierEnum = z.enum(["free", "pro", "max"]);
export const ComplexityEnum = z.enum(["simple", "detailed"]);

// --- Profiles ---
export const ProfileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  full_name: z.string().nullish(),
  avatar_url: z.string().nullish(),
  subscription_tier: SubscriptionTierEnum,
  stripe_customer_id: z.string().nullish(),
  stripe_subscription_id: z.string().nullish(),
  google_refresh_token: z.string().nullish(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

// --- Properties ---
export const PropertySchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  ga_property_id: z.string().min(1, "GA4 Property ID is required"),
  property_name: z.string().min(1, "Name is required"),
  website_url: z.url("Must be a valid URL").nullish(),
  industry: z.string().nullish(),
  created_at: z.iso.datetime(),
});

// --- Onboarding / Add Property Input ---
export const CreatePropertySchema = PropertySchema.pick({
  property_name: true,
  ga_property_id: true,
  website_url: true,
  industry: true,
});

// --- Report Settings ---
export const ReportSettingsSchema = z.object({
  id: z.uuid(),
  property_id: z.uuid(),
  frequency_days: z.number().int().min(1).max(30).default(30),
  complexity_level: ComplexityEnum.default("simple"),
  include_recommendations: z.boolean().default(false),
  is_active: z.boolean().default(true),
  last_sent_at: z.iso.datetime().nullish(),
  next_send_at: z.iso.datetime().nullish(),
});

export const CreateReportSettingsSchema = ReportSettingsSchema.pick({
  frequency_days: true,
  complexity_level: true,
  include_recommendations: true,
});

// --- Reports ---
export const ReportSchema = z.object({
  id: z.uuid(),
  property_id: z.uuid(),
  user_id: z.uuid(),
  generated_at: z.iso.datetime(),
  ai_summary_html: z.string().nullish(),
  metrics_snapshot: z.record(z.any(), z.any()).nullish(), // JSONB
  status: z.string().default("sent"),
});

// --- Types derived from Zod ---
export type Profile = z.infer<typeof ProfileSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
export type ReportSettings = z.infer<typeof ReportSettingsSchema>;
export type CreateReportSettingsInput = z.infer<typeof CreateReportSettingsSchema>;
export type Report = z.infer<typeof ReportSchema>;

// --- API Response Types (for AI) ---
export interface AIReportResponse {
  summary: string;
  recommendations?: string[];
  key_metrics_analysis: {
    metric: string;
    status: "up" | "down" | "stable";
    insight: string;
  }[];
}
