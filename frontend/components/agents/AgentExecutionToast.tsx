"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/Toast";

interface AgentExecutionToastProps {
  type: "email" | "jira" | "report";
  status: "success" | "failed" | "executing";
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  onClose: () => void;
}

export function AgentExecutionToast({
  type,
  status,
  message,
  actionUrl,
  actionLabel,
  onClose,
}: AgentExecutionToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (status === "executing") {
      // Don't auto-dismiss executing toasts
      return;
    }
    // Auto-dismiss after 5 seconds for success/failed
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [status, onClose]);

  if (!isVisible) return null;

  const toastType =
    status === "success" ? "success" : status === "failed" ? "error" : "info";

  const action =
    actionUrl && actionLabel ? (
      <a
        href={actionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm underline hover:no-underline"
      >
        {actionLabel}
      </a>
    ) : undefined;

  return (
    <Toast
      type={toastType}
      message={message}
      duration={status === "executing" ? 0 : 5000}
      onClose={onClose}
      action={action}
    />
  );
}
