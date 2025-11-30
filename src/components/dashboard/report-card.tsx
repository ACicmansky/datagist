"use client";

import { CalendarIcon, LightbulbIcon, TrendingUpIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AIAnalysisResult } from "@/lib/validations/ai";

interface ReportCardProps {
  data: AIAnalysisResult;
  date: string;
}

export function ReportCard({ data, date }: ReportCardProps) {
  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold">Analysis Report</CardTitle>
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarIcon className="mr-1 h-4 w-4" />
            {new Date(date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Executive Summary */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Executive Summary
          </h3>
          <p className="text-base leading-relaxed">{data.summary}</p>
        </div>

        {/* Key Findings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center">
            <TrendingUpIcon className="mr-2 h-4 w-4" /> Key Findings
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            {data.key_findings.map((finding, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static list
              <li key={index} className="text-sm">
                {finding}
              </li>
            ))}
          </ul>
        </div>

        {/* Top Page */}
        <div className="bg-muted/30 p-3 rounded-md">
          <span className="text-sm font-medium text-muted-foreground">Top Performing Page: </span>
          <span className="font-mono text-sm text-primary">{data.top_performing_page}</span>
        </div>

        {/* Strategic Recommendation */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 rounded-r-md">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center">
            <LightbulbIcon className="mr-2 h-4 w-4" /> Strategic Recommendation
          </h3>
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {data.strategic_recommendation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
