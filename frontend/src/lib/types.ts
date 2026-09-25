export type Severity = "CRITICAL" | "WARNING" | "INFO";

export type Category = "SECURITY" | "PERFORMANCE" | "ARCHITECTURE";

export interface Finding {
  file: string;
  line_number: number;
  severity: Severity;
  category: Category;
  issue: string;
  suggestion: string;
  patch: string;
}

export interface ReviewReport {
  security: Finding[];
  performance: Finding[];
  architecture: Finding[];
  health_score: number;
  total_issues: number;
}

export type PersonaFilterValue = "ALL" | Category;
