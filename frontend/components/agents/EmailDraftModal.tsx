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

interface EmailDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (action: AgentAction) => void;
  initialContext?: string;
}

export function EmailDraftModal({
  isOpen,
  onClose,
  onSuccess,
  initialContext = "",
}: EmailDraftModalProps) {
  const [context, setContext] = useState(initialContext);
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Reset when modal opens with new initial context
  useEffect(() => {
    if (isOpen && initialContext) {
      setContext(initialContext);
    }
  }, [isOpen, initialContext]);

  const handleGenerate = async () => {
    if (!context.trim()) {
      setError("Please provide context for the email");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const draft = await apiClient.generateEmailDraft(
        context,
        recipient || undefined,
        tone
      );
      setResult(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate email draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!result) return;

    if (!toEmail.trim()) {
      setError("Please enter a recipient email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = toEmail.split(",").map((e) => e.trim());
    const invalidEmails = emails.filter((e) => !emailRegex.test(e));

    if (invalidEmails.length > 0) {
      setError(`Invalid email address(es): ${invalidEmails.join(", ")}`);
      return;
    }

    try {
      setSending(true);
      setError("");
      await apiClient.sendEmail(emails, result.subject, result.body);

      const action: AgentAction = {
        id: Date.now().toString(),
        type: "email",
        description: `Email sent to ${emails.join(", ")}: ${result.subject}`,
        status: "success",
        timestamp: new Date(),
        metadata: {
          recipient: emails.join(", "),
          subject: result.subject,
        },
      };

      onSuccess(action);
      setSendSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
      const action: AgentAction = {
        id: Date.now().toString(),
        type: "email",
        description: `Failed to send email: ${err instanceof Error ? err.message : "Unknown error"}`,
        status: "failed",
        timestamp: new Date(),
      };
      onSuccess(action);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setContext(initialContext || "");
    setRecipient("");
    setTone("professional");
    setError("");
    setResult(null);
    setToEmail("");
    setSending(false);
    setSendSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Email Draft"
      size="lg"
    >
      {!result ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Context / Topic *
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe what the email should be about..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
              rows={4}
            />
          </div>

          <Input
            label="Recipient (optional)"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient name or email"
          />

          <Select
            label="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            options={[
              { value: "professional", label: "Professional" },
              { value: "casual", label: "Casual" },
              { value: "formal", label: "Formal" },
              { value: "friendly", label: "Friendly" },
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
              onClick={handleGenerate}
              disabled={loading || !context.trim()}
              loading={loading}
            >
              Generate Draft
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="To (Email Address) *"
            type="text"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="recipient@example.com (comma-separated for multiple)"
            helperText="Enter recipient email address(es), separated by commas for multiple recipients"
            disabled={sending || sendSuccess}
          />

          <Input
            label="Subject"
            type="text"
            value={result.subject}
            onChange={(e) => setResult({ ...result, subject: e.target.value })}
            disabled={sending || sendSuccess}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body
            </label>
            <textarea
              value={result.body}
              onChange={(e) => setResult({ ...result, body: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              rows={10}
              disabled={sending || sendSuccess}
            />
          </div>

          {sendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
              Email sent successfully!
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="secondary"
              onClick={() => setResult(null)}
              disabled={sending || sendSuccess}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={sending || sendSuccess || !toEmail.trim()}
              loading={sending}
            >
              Send Email
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
