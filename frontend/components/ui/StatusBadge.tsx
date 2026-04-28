"use client";

import React from "react";
import type { StatusBadgeProps } from "@/lib/component-types";

const statusConfig = {
  pending: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg:   "bg-amber-50",
    label: "Pending",
  },
  processing: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    bg:   "bg-blue-50",
    label: "Processing",
  },
  completed: {
    dot: "bg-green-500",
    text: "text-green-700",
    bg:   "bg-green-50",
    label: "Completed",
  },
  failed: {
    dot: "bg-red-500",
    text: "text-red-700",
    bg:   "bg-red-50",
    label: "Failed",
  },
  active: {
    dot: "bg-green-500",
    text: "text-green-700",
    bg:   "bg-green-50",
    label: "Active",
  },
  inactive: {
    dot: "bg-slate-400",
    text: "text-slate-600",
    bg:   "bg-slate-100",
    label: "Inactive",
  },
};

export function StatusBadge({ status, size = "md", className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1.5",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };
  const dotSize = size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${config.bg} ${config.text} ${sizeClasses[size]} ${className}`}
    >
      <span className={`${dotSize} rounded-full flex-shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  );
}
