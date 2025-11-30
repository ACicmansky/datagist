export interface AIAnalysisResult {
  summary: string; // The "Dense 2-sentence narrative"
  key_findings: string[]; // The array of 3 specific findings
  top_performing_page: string; // The specific URL
  strategic_recommendation: string; // The Plan-Level specific advice
}
