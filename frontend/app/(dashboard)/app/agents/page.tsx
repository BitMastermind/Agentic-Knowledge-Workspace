"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { logAuditEvent } from "@/lib/audit-log";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { EmailDraftModal } from "@/components/agents/EmailDraftModal";
import { JiraTicketModal } from "@/components/agents/JiraTicketModal";
import { ReportModal } from "@/components/agents/ReportModal";

interface AgentAction {
  id: string;
  type: "email" | "jira" | "report";
  description: string;
  status: "success" | "failed";
  timestamp: Date;
  metadata?: {
    ticketKey?: string;
    ticketUrl?: string;
    reportId?: string;
    reportUrl?: string;
    recipient?: string;
  };
}

const AGENT_HISTORY_KEY = "agentic_workspace_agent_history";

export default function AgentsPage() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [agentHistory, setAgentHistory] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    loadData();
    loadAgentHistory();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const creds = await apiClient.listCredentials();
      setCredentials(creds);
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentHistory = () => {
    try {
      const saved = localStorage.getItem(AGENT_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const history = parsed.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp),
        }));
        setAgentHistory(history.sort((a: AgentAction, b: AgentAction) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ));
      }
    } catch (err) {
      console.error("Failed to load agent history:", err);
    }
  };

  const saveAgentAction = (action: AgentAction) => {
    const updated = [action, ...agentHistory].slice(0, 50); // Keep last 50
    setAgentHistory(updated);
    localStorage.setItem(
      AGENT_HISTORY_KEY,
      JSON.stringify(updated.map((a) => ({
        ...a,
        timestamp: a.timestamp.toISOString(),
      })))
    );
    
    // Log to audit log
    logAuditEvent(
      action.status === "success" 
        ? `${action.type === "email" ? "Email" : action.type === "jira" ? "Jira ticket" : "Report"} ${action.type === "email" ? "sent" : action.type === "jira" ? "created" : "generated"}`
        : `Agent action failed: ${action.type}`,
      "agent",
      action.description,
      user?.email || "unknown",
      {
        agent_type: action.type,
        status: action.status,
        ...action.metadata,
      }
    );
  };

  const getCredential = (type: string) => {
    return credentials.find((c) => c.integration_type === type);
  };

  const emailCreds = getCredential("email");
  const jiraCreds = getCredential("jira");

  const emailConnected = !!emailCreds;
  const jiraConnected = !!jiraCreds;

  if (loading) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Agents</h1>
        <LoadingState>Loading agents...</LoadingState>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
        <p className="mt-2 text-gray-600">
          Use AI agents to automate actions like sending emails, creating Jira tickets, and generating reports
        </p>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Email Agent */}
        <Card hover>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
              📧
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">Email Agent</h3>
              <p className="text-sm text-gray-500">Draft and send emails</p>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  emailConnected ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className={emailConnected ? "text-green-600" : "text-gray-500"}>
                {emailConnected ? "Connected" : "Not configured"}
              </span>
            </div>
            {emailCreds?.last_used_at && (
              <p className="text-xs text-gray-500 mt-1">
                Last used: {new Date(emailCreds.last_used_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {emailConnected ? (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => setShowEmailModal(true)}
              >
                Compose Email
              </Button>
            ) : (
              <Link href="/app/settings" className="flex-1">
                <Button variant="secondary" size="sm" fullWidth>
                  Configure
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Jira Agent */}
        <Card hover>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
              🎫
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">Jira Agent</h3>
              <p className="text-sm text-gray-500">Create and manage tickets</p>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  jiraConnected ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className={jiraConnected ? "text-green-600" : "text-gray-500"}>
                {jiraConnected ? "Connected" : "Not configured"}
              </span>
            </div>
            {jiraCreds?.last_used_at && (
              <p className="text-xs text-gray-500 mt-1">
                Last used: {new Date(jiraCreds.last_used_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {jiraConnected ? (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => setShowJiraModal(true)}
              >
                Create Ticket
              </Button>
            ) : (
              <Link href="/app/settings" className="flex-1">
                <Button variant="secondary" size="sm" fullWidth>
                  Configure
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Report Agent */}
        <Card hover>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
              📊
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">Report Generator</h3>
              <p className="text-sm text-gray-500">Generate reports from documents</p>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-600">Always available</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">No configuration needed</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => setShowReportModal(true)}
          >
            Generate Report
          </Button>
        </Card>
      </div>

      {/* Agent Execution History */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Actions</h2>
            {agentHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Clear all agent action history?")) {
                    setAgentHistory([]);
                    localStorage.removeItem(AGENT_HISTORY_KEY);
                  }
                }}
              >
                Clear History
              </Button>
            )}
          </div>
        }
      >
        {agentHistory.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No agent actions yet"
            description="Agent actions will appear here once you start using agents"
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {agentHistory.map((action) => (
              <div
                key={action.id}
                className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-2xl flex-shrink-0">
                    {action.type === "email" && "📧"}
                    {action.type === "jira" && "🎫"}
                    {action.type === "report" && "📊"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {action.type === "email" && "Email"}
                        {action.type === "jira" && "Jira Ticket"}
                        {action.type === "report" && "Report"}
                      </span>
                      <Badge
                        variant={action.status === "success" ? "success" : "error"}
                        size="sm"
                      >
                        {action.status === "success" ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{action.description}</p>
                    {action.metadata && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        {action.metadata.ticketKey && (
                          <span>Ticket: {action.metadata.ticketKey}</span>
                        )}
                        {action.metadata.reportId && (
                          <span>Report ID: {action.metadata.reportId}</span>
                        )}
                        {action.metadata.recipient && (
                          <span>To: {action.metadata.recipient}</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {action.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {action.metadata?.ticketUrl && (
                    <a
                      href={action.metadata.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View →
                    </a>
                  )}
                  {action.metadata?.reportUrl && (
                    <a
                      href={action.metadata.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      <EmailDraftModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSuccess={(action) => saveAgentAction(action)}
      />

      <JiraTicketModal
        isOpen={showJiraModal}
        onClose={() => setShowJiraModal(false)}
        onSuccess={(action) => saveAgentAction(action)}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={(action) => saveAgentAction(action)}
      />
    </div>
  );
}
