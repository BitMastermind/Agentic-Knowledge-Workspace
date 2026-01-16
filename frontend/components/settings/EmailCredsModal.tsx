"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { logAuditEvent } from "@/lib/audit-log";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface EmailCredsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCreds?: {
    id: number;
    integration_type: string;
    metadata: Record<string, any>;
    is_active: string;
  };
}

export function EmailCredsModal({
  isOpen,
  onClose,
  existingCreds,
}: EmailCredsModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    smtp_host: existingCreds?.metadata?.smtp_host || "",
    smtp_port: existingCreds?.metadata?.smtp_port || 587,
    smtp_user: "",
    smtp_password: "",
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setTesting(true);
      setError("");
      setTestResult(null);
      
      // Note: Backend may not have test endpoint, so we'll just validate form
      // In production, you'd call: await apiClient.testEmailConnection(formData);
      setTestResult({
        success: true,
        message: "Connection test not available. Please save and test by sending an email.",
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
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      setError("");
      
      await apiClient.saveCredentials("email", {
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_user: formData.smtp_user,
        smtp_password: formData.smtp_password,
        use_tls: true,
      }, {
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
      });

      // Log audit event
      logAuditEvent(
        existingCreds ? "Updated email credentials" : "Saved email credentials",
        "credential",
        `Email (SMTP) credentials ${existingCreds ? "updated" : "saved"} for ${formData.smtp_host}`,
        user?.email || "unknown",
        {
          integration_type: "email",
          smtp_host: formData.smtp_host,
          smtp_port: formData.smtp_port,
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
      title="Configure Email (SMTP)"
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="SMTP Host *"
          type="text"
          value={formData.smtp_host}
          onChange={(e) =>
            setFormData({ ...formData, smtp_host: e.target.value })
          }
          placeholder="smtp.gmail.com"
          required
        />

        <Input
          label="SMTP Port *"
          type="number"
          value={formData.smtp_port}
          onChange={(e) =>
            setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })
          }
          required
        />

        <Input
          label="Email Address *"
          type="email"
          value={formData.smtp_user}
          onChange={(e) =>
            setFormData({ ...formData, smtp_user: e.target.value })
          }
          placeholder="your-email@gmail.com"
          required
        />

        <Input
          label="Password / App Password *"
          type="password"
          value={formData.smtp_password}
          onChange={(e) =>
            setFormData({ ...formData, smtp_password: e.target.value })
          }
          placeholder="Enter your SMTP password"
          helperText="For Gmail, use an App Password. Credentials are encrypted and stored securely."
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
