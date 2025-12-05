"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { manageSubscription, startSubscription } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SubscriptionPlansProps {
  currentTier: "free" | "pro" | "max";
}

export function SubscriptionPlans({ currentTier }: SubscriptionPlansProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string, planName: string) => {
    setIsLoading(planName);
    try {
      await startSubscription(priceId);
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to start subscription. Please try again.");
      setIsLoading(null);
    }
  };

  const handleManage = async () => {
    setIsLoading("manage");
    try {
      await manageSubscription();
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal. Please try again.");
      setIsLoading(null);
    }
  };

  const tiers = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      features: ["1 Website", "Monthly Report", "Basic Analytics"],
      action: "Current Plan",
      priceId: "",
    },
    {
      id: "pro",
      name: "Pro",
      price: "$15",
      description: "For growing businesses",
      features: [
        "3 Websites",
        "Weekly Reports",
        "Smart Recommendations",
        "Google Search Grounding",
      ],
      action: "Upgrade",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || "",
      highlight: true,
    },
    {
      id: "max",
      name: "Max",
      price: "$49",
      description: "For agencies and power users",
      features: ["5 Websites", "Priority Analysis", "Competitor Intel", "White-label Options"],
      action: "Upgrade",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX || "",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {tiers.map((tier) => {
        const isCurrent = currentTier === tier.id;
        const isFreeUser = currentTier === "free";

        // Determine button state
        let buttonText = tier.action;
        let buttonAction: () => void = () => {};
        let isDisabled = false;
        let variant: "default" | "outline" | "secondary" = "default";

        if (isCurrent) {
          buttonText = "Current Plan";
          isDisabled = true;
          variant = "secondary";
        } else if (isFreeUser) {
          // Free user looking at paid plans -> Upgrade
          if (tier.id !== "free") {
            buttonText = "Upgrade";
            buttonAction = () => handleUpgrade(tier.priceId, tier.id);
          } else {
            // Should not happen if logic is correct (Free user looking at Free plan is handled by isCurrent)
            buttonText = "Downgrade"; // Placeholder
          }
        } else {
          // Paid user looking at other plans -> Manage via Portal
          buttonText = tier.id === "free" ? "Manage Subscription" : "Switch Plan";
          buttonAction = handleManage;
          variant = "outline";
        }

        return (
          <Card
            key={tier.id}
            className={cn(
              "flex flex-col",
              tier.highlight && "border-primary shadow-md scale-105 z-10"
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {tier.name}
                {tier.highlight && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Recommended
                  </span>
                )}
              </CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-3xl font-bold mb-6">
                {tier.price}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center text-sm">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={variant}
                disabled={isDisabled || isLoading !== null}
                onClick={buttonAction}
              >
                {isLoading === tier.id || (isLoading === "manage" && !isFreeUser && !isCurrent) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
