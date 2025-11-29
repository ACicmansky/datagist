"use client";

import { useState, useTransition } from "react";
import { generateManualReport } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

interface ReportGeneratorProps {
  propertyId: string;
}

export function ReportGenerator({ propertyId }: ReportGeneratorProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleGenerate = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await generateManualReport(propertyId);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("Report generated successfully!");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 items-start">
      <Button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Generating..." : "Generate Report Now"}
      </Button>
      {message && (
        <p className={`text-sm ${message.includes("error") ? "text-red-500" : "text-green-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
