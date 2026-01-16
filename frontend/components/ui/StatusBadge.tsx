"use client";

import React from "react";
import type { StatusBadgeProps } from "@/lib/component-types";
import { Badge } from "./Badge";

/**
 * StatusBadge component for displaying document/agent status
 */
export function StatusBadge({
  status,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      variant: "warning" as const,
      label: "Pending",
    },
    processing: {
      variant: "info" as const,
      label: "Processing",
    },
    completed: {
      variant: "success" as const,
      label: "Completed",
    },
    failed: {
      variant: "error" as const,
      label: "Failed",
    },
    active: {
      variant: "success" as const,
      label: "Active",
    },
    inactive: {
      variant: "default" as const,
      label: "Inactive",
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}
