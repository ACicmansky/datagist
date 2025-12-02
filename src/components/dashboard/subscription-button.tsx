"use client";

import { useState } from "react";
import { manageSubscription } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

interface SubscriptionButtonProps {
  isPro: boolean;
}

export function SubscriptionButton({ isPro }: SubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    const result = await manageSubscription();
    if (result?.error) {
      alert(result.error);
      setLoading(false);
    }
    // If success, it redirects, so no need to stop loading
  };

  return (
    <Button onClick={handleManage} variant={isPro ? "outline" : "default"} disabled={loading}>
      {loading ? "Processing..." : isPro ? "Manage Billing" : "Upgrade to Pro"}
    </Button>
  );
}
