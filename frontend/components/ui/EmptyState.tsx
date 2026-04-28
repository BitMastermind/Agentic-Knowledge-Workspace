"use client";

import React from "react";
import type { EmptyStateProps } from "@/lib/component-types";

/**
 * EmptyState component for displaying empty states with icon, title, description, and action
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="mb-5 w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-3xl">
          {typeof icon === "string" ? (
            <span role="img" aria-label="Empty state icon">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">{description}</p>
      )}
      
      {action && <div>{action}</div>}
    </div>
  );
}
