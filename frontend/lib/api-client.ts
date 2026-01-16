/**
 * API client for communicating with FastAPI backend
 */

import type {
  TokenResponse,
  User,
  Tenant,
  Document,
  ChatMessage,
  Source,
  EvaluationMetrics,
  EvaluationRun,
  ApiError,
  ReportResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_VERSION = "v1";

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = `${baseUrl}/api/${API_VERSION}`;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("access_token");
    }
    return this.accessToken;
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: "An error occurred",
      }));
      throw new Error(error.detail);
    }

    // Handle 204 No Content (e.g., DELETE requests)
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return null as T;
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, fullName?: string): Promise<TokenResponse> {
    return this.fetch<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    return this.fetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken(refreshToken: string, tenantId?: number): Promise<TokenResponse> {
    return this.fetch<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken, tenant_id: tenantId }),
    });
  }

  // Tenant endpoints
  async listTenants(): Promise<Tenant[]> {
    return this.fetch<Tenant[]>("/tenants/");
  }

  async createTenant(name: string, slug: string): Promise<Tenant> {
    return this.fetch<Tenant>("/tenants/", {
      method: "POST",
      body: JSON.stringify({ name, slug }),
    });
  }

  // Document endpoints
  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    const token = this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/documents/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail);
    }

    return response.json();
  }

  async listDocuments(): Promise<Document[]> {
    return this.fetch<Document[]>("/documents/");
  }

  async deleteDocument(documentId: number): Promise<void> {
    await this.fetch(`/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  // RAG endpoints
  async queryDocuments(
    query: string,
    documentIds?: number[]
  ): Promise<{ answer: string; sources: Source[] }> {
    return this.fetch("/rag/query", {
      method: "POST",
      body: JSON.stringify({ query, document_ids: documentIds }),
    });
  }

  // Streaming query with SSE
  async queryDocumentsStream(
    query: string,
    documentIds?: number[],
    onToken?: (token: string) => void,
    onSources?: (sources: Source[]) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const token = this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/rag/query-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, document_ids: documentIds }),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      onError?.(new Error(error.detail));
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      onError?.(new Error("No response body"));
      return;
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              onComplete?.();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "token") {
                onToken?.(parsed.content);
              } else if (parsed.type === "sources") {
                onSources?.(parsed.sources);
              } else if (parsed.type === "error") {
                onError?.(new Error(parsed.content || "An error occurred"));
                return;
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }

  // Agent action endpoints
  async generateEmailDraft(
    context: string,
    recipient?: string,
    tone?: string
  ): Promise<{ subject: string; body: string }> {
    return this.fetch("/agent/email-draft", {
      method: "POST",
      body: JSON.stringify({ context, recipient, tone }),
    });
  }

  async sendEmail(
    toEmails: string[],
    subject: string,
    body: string,
    bodyHtml?: string,
    ccEmails?: string[],
    bccEmails?: string[]
  ): Promise<{ status: string; message: string }> {
    return this.fetch("/agent/send-email", {
      method: "POST",
      body: JSON.stringify({
        to_emails: toEmails,
        subject,
        body,
        body_html: bodyHtml,
        cc_emails: ccEmails,
        bcc_emails: bccEmails,
      }),
    });
  }

  async createJiraTicket(
    projectKey: string,
    summary: string,
    description: string,
    issueType?: string
  ): Promise<{ ticket_key: string; ticket_url: string }> {
    return this.fetch("/agent/jira-ticket", {
      method: "POST",
      body: JSON.stringify({
        project_key: projectKey,
        summary,
        description,
        issue_type: issueType,
      }),
    });
  }

  async generateReport(
    documentIds: number[],
    reportType?: string,
    format?: string
  ): Promise<ReportResponse> {
    return this.fetch<ReportResponse>("/agent/generate-report", {
      method: "POST",
      body: JSON.stringify({
        document_ids: documentIds,
        report_type: reportType,
        format,
      }),
    });
  }

  async getReport(reportId: string): Promise<string> {
    // Fetch report as text/html
    const token = this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/agent/reports/${reportId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: "Failed to fetch report",
      }));
      throw new Error(error.detail);
    }

    return response.text();
  }

  // Evaluation endpoints
  async getMetrics(): Promise<EvaluationMetrics> {
    return this.fetch("/eval/metrics");
  }

  async listEvaluationRuns(): Promise<EvaluationRun[]> {
    return this.fetch("/eval/runs");
  }

  async submitFeedback(
    runId: number,
    feedback: "thumbs_up" | "thumbs_down"
  ): Promise<void> {
    await this.fetch("/eval/feedback", {
      method: "POST",
      body: JSON.stringify({ run_id: runId, feedback }),
    });
  }

  // Credentials endpoints
  async listCredentials(): Promise<any[]> {
    return this.fetch("/credentials");
  }

  async saveCredentials(
    integrationType: string,
    credentials: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<any> {
    return this.fetch("/credentials", {
      method: "POST",
      body: JSON.stringify({
        integration_type: integrationType,
        credentials,
        metadata,
      }),
    });
  }

  async deleteCredentials(integrationType: string): Promise<void> {
    await this.fetch(`/credentials/${integrationType}`, {
      method: "DELETE",
    });
  }

  async testJiraConnection(): Promise<{
    status: string;
    message: string;
    user?: any;
  }> {
    return this.fetch("/agent/jira-test");
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

