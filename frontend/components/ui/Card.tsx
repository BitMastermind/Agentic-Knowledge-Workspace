"use client";

import React from "react";
import type { CardProps } from "@/lib/component-types";

/**
 * Card component with optional header and footer
 */
export function Card({
  children,
  header,
  footer,
  padding = "md",
  hover = false,
  className = "",
}: CardProps) {
  const baseClasses = "bg-white rounded-lg shadow border border-gray-200";
  const hoverClass = hover ? "hover:shadow-md hover:border-gray-300 transition-all duration-200 ease-in-out cursor-pointer" : "";
  
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };
  
  return (
    <div className={`${baseClasses} ${hoverClass} ${className}`}>
      {header && (
        <div className="px-6 py-4 border-b border-gray-200">
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
}
