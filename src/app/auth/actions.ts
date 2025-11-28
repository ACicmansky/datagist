"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function loginWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      scopes: "https://www.googleapis.com/auth/analytics.readonly",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("Google Login Error:", error);
    redirect("/error?message=Could not authenticate with Google");
  }

  if (data.url) {
    redirect(data.url);
  }
}
