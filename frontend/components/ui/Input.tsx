"use client";

import React from "react";
import type { InputProps } from "@/lib/component-types";

/**
 * Input component with label, error, and helper text support
 */
export function Input({
  label,
  error,
  helperText,
  fullWidth = true,
  leftIcon,
  rightIcon,
  className = "",
  ...props
}: InputProps) {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseInputClasses = "block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-[3px] focus:ring-offset-0 transition-all duration-150 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-900 placeholder:text-slate-400 bg-white text-sm";
  const errorClasses = error
    ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
    : "border-slate-200 focus:ring-blue-500/15 focus:border-blue-500";
  const iconPadding = leftIcon ? "pl-10" : rightIcon ? "pr-10" : "";
  
  const widthClass = fullWidth ? "w-full" : "";
  
  return (
    <div className={widthClass}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-600 mb-1"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          className={`${baseInputClasses} ${errorClasses} ${iconPadding} ${className}`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-xs text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
}
