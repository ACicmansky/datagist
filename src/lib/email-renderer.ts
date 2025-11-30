import type { AIAnalysisResult } from "@/lib/validations/schemas";

export const renderReportHtml = (analysis: AIAnalysisResult): string => {
  const findingsHtml = analysis.key_findings.map((finding) => `<li>${finding}</li>`).join("");

  return `
    <h1>Monthly Report</h1>
    
    <h2>Executive Summary</h2>
    <p>${analysis.summary}</p>
    
    <h2>Key Findings</h2>
    <ul>
      ${findingsHtml}
    </ul>
    
    <h3>Top Page</h3>
    <p><strong>${analysis.top_performing_page}</strong></p>
    
    <div style="background:#f0f9ff; padding:15px; border-radius: 5px; margin-top: 20px;">
      <strong>Strategic Recommendation:</strong>
      <p style="margin-top: 5px;">${analysis.strategic_recommendation}</p>
    </div>
  `;
};
