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
        <div className="mb-4 text-6xl">
          {typeof icon === "string" ? (
            <span role="img" aria-label="Empty state icon">
              {icon}
            </span>
          ) : (
            icon
          )}
        </div>
      )}
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      
      {description && (
        <p className="text-gray-600 max-w-md mb-6">{description}</p>
      )}
      
      {action && <div>{action}</div>}
    </div>
  );
}
