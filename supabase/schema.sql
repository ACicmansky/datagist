-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'max')),
  stripe_customer_id text,
  stripe_subscription_id text,
  -- We store the Refresh Token here (encrypted in application logic or via Vault) 
  -- so the background job can fetch GA data while user is offline.
  google_refresh_token text, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROPERTIES (Websites to track)
create table public.properties (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ga_property_id text not null, -- The GA4 Property ID (e.g. '123456789')
  property_name text not null,
  website_url text, -- Used for AI Grounding
  industry text, -- Optional context for AI
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, ga_property_id)
);

-- 3. REPORT SETTINGS (Configuration per property)
create table public.report_settings (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  frequency_days integer default 30, -- 7, 14, 30
  complexity_level text default 'simple' check (complexity_level in ('simple', 'detailed')),
  include_recommendations boolean default false,
  is_active boolean default true,
  last_sent_at timestamp with time zone,
  next_send_at timestamp with time zone default timezone('utc'::text, now()),
  unique(property_id) -- One settings row per property
);

-- 4. REPORTS (History)
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null, -- Denormalized for easier RLS
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ai_summary_html text, -- The final email content
  ai_result jsonb,
  metrics_snapshot jsonb, -- The raw data used (for debugging/history)
  status text default 'sent'
);

-- RLS POLICIES (Security)
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.report_settings enable row level security;
alter table public.reports enable row level security;

-- Policies: Users can only see/edit their own data
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can view own properties" on public.properties for select using (auth.uid() = user_id);
create policy "Users can insert own properties" on public.properties for insert with check (auth.uid() = user_id);
create policy "Users can update own properties" on public.properties for update using (auth.uid() = user_id);
create policy "Users can delete own properties" on public.properties for delete using (auth.uid() = user_id);

-- Report Settings policies
create policy "Users can view own report settings" on public.report_settings
  for select using (
    exists (
      select 1 from public.properties
      where properties.id = report_settings.property_id
      and properties.user_id = auth.uid()
    )
  );
create policy "Users can insert own report settings" on public.report_settings
  for insert with check (
    exists (
      select 1 from public.properties
      where properties.id = report_settings.property_id
      and properties.user_id = auth.uid()
    )
  );
create policy "Users can update own report settings" on public.report_settings
  for update using (
    exists (
      select 1 from public.properties
      where properties.id = report_settings.property_id
      and properties.user_id = auth.uid()
    )
  );

-- Reports policies
create policy "Users can view own reports" on public.reports
  for select using (auth.uid() = user_id);

-- Function to handle new user creation (Triggers)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication errors during re-runs
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
