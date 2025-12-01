"use client";

import { useTransition } from "react";
import { startSubscription } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function SubscribeButton() {
  const [isPending, startTransition] = useTransition();

  const handleSubscribe = () => {
    startTransition(async () => {
      const result = await startSubscription();
      if (result?.error) {
        alert(result.error);
      }
      // If success, the server action will redirect to Stripe
    });
  };

  return (
    <Button
      onClick={handleSubscribe}
      disabled={isPending}
      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200 hover:scale-[1.02]"
    >
      {isPending ? "Redirecting..." : "Upgrade to Pro"}
    </Button>
  );
}
