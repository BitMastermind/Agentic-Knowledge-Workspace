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
  const baseClasses = "bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.06)]";
  const hoverClass = hover
    ? "hover:shadow-[0_4px_12px_rgba(15,23,42,0.08),_0_1px_3px_rgba(15,23,42,0.05)] hover:-translate-y-px hover:border-slate-300 transition-all duration-150 ease-in-out cursor-pointer"
    : "";
  
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };
  
  return (
    <div className={`${baseClasses} ${hoverClass} ${className}`}>
      {header && (
        <div className="px-6 py-4 border-b border-slate-200">
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          {footer}
        </div>
      )}
    </div>
  );
}
