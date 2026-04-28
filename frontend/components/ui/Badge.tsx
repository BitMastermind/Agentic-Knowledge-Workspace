"use client";

import React from "react";
import type { BadgeProps } from "@/lib/component-types";

/**
 * Badge component for displaying status, tags, or labels
 */
export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
}: BadgeProps) {
  const baseClasses = "inline-flex items-center font-medium rounded-full";
  
  const variantClasses = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    error:   "bg-red-50 text-red-700",
    info:    "bg-blue-50 text-blue-700",
    ai:      "bg-violet-50 text-violet-700",
  };
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}
