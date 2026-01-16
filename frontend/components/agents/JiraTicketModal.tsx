"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface AgentAction {
  id: string;
  type: "email" | "jira" | "report";
  description: string;
  status: "success" | "failed";
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface JiraTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (action: AgentAction) => void;
  initialDescription?: string;
}

export function JiraTicketModal({
  isOpen,
  onClose,
  onSuccess,
  initialDescription = "",
}: JiraTicketModalProps) {
  const [projectKey, setProjectKey] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState(initialDescription);
  const [issueType, setIssueType] = useState("Task");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset when modal opens with new initial description
  useEffect(() => {
    if (isOpen && initialDescription) {
      setDescription(initialDescription);
    }
  }, [isOpen, initialDescription]);

  const handleCreate = async () => {
    if (!projectKey.trim() || !summary.trim() || !description.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await apiClient.createJiraTicket(
        projectKey,
        summary,
        description,
        issueType
      );

      const action: AgentAction = {
        id: Date.now().toString(),
        type: "jira",
        description: `Jira ticket created: ${result.ticket_key} - ${summary}`,
        status: "success",
        timestamp: new Date(),
        metadata: {
          ticketKey: result.ticket_key,
          ticketUrl: result.ticket_url,
          summary,
        },
      };

      onSuccess(action);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Jira ticket");
      const action: AgentAction = {
        id: Date.now().toString(),
        type: "jira",
        description: `Failed to create Jira ticket: ${err instanceof Error ? err.message : "Unknown error"}`,
        status: "failed",
        timestamp: new Date(),
      };
      onSuccess(action);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProjectKey("");
    setSummary("");
    setDescription(initialDescription || "");
    setIssueType("Task");
    setError("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Jira Ticket"
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="Project Key *"
          type="text"
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
          placeholder="e.g., PROJ"
          helperText="The Jira project key (usually 2-10 uppercase letters)"
          required
        />

        <Input
          label="Summary *"
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief summary of the ticket"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the issue"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
            rows={6}
            required
          />
        </div>

        <Select
          label="Issue Type"
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          options={[
            { value: "Task", label: "Task" },
            { value: "Bug", label: "Bug" },
            { value: "Story", label: "Story" },
            { value: "Epic", label: "Epic" },
          ]}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={loading || !projectKey.trim() || !summary.trim() || !description.trim()}
            loading={loading}
          >
            Create Ticket
          </Button>
        </div>
      </div>
    </Modal>
  );
}
