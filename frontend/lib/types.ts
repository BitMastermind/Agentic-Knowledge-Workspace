/**
 * Shared TypeScript types for the application
 */

export interface User {
  id: number;
  email: string;
  full_name?: string;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  error_message?: string;
}

export interface Source {
  id: number;
  document_name: string;
  snippet: string;
  metadata: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
}

export interface EvaluationMetrics {
  avg_latency_ms: number;
  total_queries: number;
  avg_quality_score: number;
  positive_feedback_rate: number;
}

export interface EvaluationRun {
  id: number;
  query: string;
  response: string;
  latency_ms: number;
  quality_score?: number;
  user_feedback?: string;
  created_at: string;
}

export interface ApiError {
  detail: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ReportResponse {
  report_url: string;
  format: string;
  report_id: string;
  report_type: string;
  document_names: string[];
  document_count: number;
}

