export type SubscriptionTier = 'free' | 'pro' | 'max';
export type ComplexityLevel = 'simple' | 'detailed';

export interface Profile {
    id: string; // UUID
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    subscription_tier: SubscriptionTier;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    google_refresh_token?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Property {
    id: string; // UUID
    user_id: string; // UUID
    ga_property_id: string;
    property_name: string;
    website_url?: string | null;
    industry?: string | null;
    created_at: string;
}

export interface ReportSettings {
    id: string; // UUID
    property_id: string; // UUID
    frequency_days: number;
    complexity_level: ComplexityLevel;
    include_recommendations: boolean;
    is_active: boolean;
    last_sent_at?: string | null;
    next_send_at?: string | null;
}

export interface Report {
    id: string; // UUID
    property_id: string; // UUID
    user_id: string; // UUID
    generated_at: string;
    ai_summary_html?: string | null;
    metrics_snapshot?: Record<string, any> | null; // JSONB
    status: string;
}

export interface AIReportResponse {
    summary: string;
    recommendations?: string[];
    key_metrics_analysis: {
        metric: string;
        status: 'up' | 'down' | 'stable';
        insight: string;
    }[];
}
