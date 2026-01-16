"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { logAuditEvent } from "@/lib/audit-log";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface JiraCredsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCreds?: {
    id: number;
    integration_type: string;
    metadata: Record<string, any>;
    is_active: string;
  };
}

export function JiraCredsModal({
  isOpen,
  onClose,
  existingCreds,
}: JiraCredsModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    jira_url: existingCreds?.metadata?.jira_url || "",
    jira_email: "",
    jira_api_token: "",
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    if (!formData.jira_url || !formData.jira_email || !formData.jira_api_token) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setTesting(true);
      setError("");
      setTestResult(null);
      
      const result = await apiClient.testJiraConnection();
      setTestResult({
        success: result.status === "connected",
        message: result.message,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.jira_url || !formData.jira_email || !formData.jira_api_token) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      setError("");
      
      await apiClient.saveCredentials("jira", {
        jira_url: formData.jira_url,
        jira_email: formData.jira_email,
        jira_api_token: formData.jira_api_token,
      }, {
        jira_url: formData.jira_url,
      });

      // Log audit event
      logAuditEvent(
        existingCreds ? "Updated Jira credentials" : "Saved Jira credentials",
        "credential",
        `Jira credentials ${existingCreds ? "updated" : "saved"} for ${formData.jira_url}`,
        user?.email || "unknown",
        {
          integration_type: "jira",
          jira_url: formData.jira_url,
        }
      );

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Jira"
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="Jira Server URL *"
          type="url"
          value={formData.jira_url}
          onChange={(e) =>
            setFormData({ ...formData, jira_url: e.target.value })
          }
          placeholder="https://your-domain.atlassian.net"
          helperText="Your Jira instance URL"
          required
        />

        <Input
          label="Email Address *"
          type="email"
          value={formData.jira_email}
          onChange={(e) =>
            setFormData({ ...formData, jira_email: e.target.value })
          }
          placeholder="your-email@example.com"
          helperText="Email address associated with your Jira account"
          required
        />

        <Input
          label="API Token *"
          type="password"
          value={formData.jira_api_token}
          onChange={(e) =>
            setFormData({ ...formData, jira_api_token: e.target.value })
          }
          placeholder="Enter your Jira API token"
          helperText="Create an API token at: https://id.atlassian.com/manage-profile/security/api-tokens"
          required
        />

        {testResult && (
          <div
            className={`p-3 rounded ${
              testResult.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {testResult.success ? "✓" : "✗"} {testResult.message}
          </div>
        )}

        {error && (
          <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={testing || saving}
            loading={testing}
          >
            Test Connection
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={testing || saving}
            loading={saving}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
