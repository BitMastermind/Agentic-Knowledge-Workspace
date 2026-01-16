"use client";

import React from "react";
import type { SelectProps } from "@/lib/component-types";

/**
 * Select component with label, error, and helper text support
 */
export function Select({
  label,
  error,
  helperText,
  fullWidth = true,
  options,
  className = "",
  ...props
}: SelectProps) {
  const selectId = props.id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseSelectClasses = "block w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-900";
  const errorClasses = error
    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
    : "border-gray-300 focus:ring-blue-500 focus:border-blue-500";
  
  const widthClass = fullWidth ? "w-full" : "";
  
  return (
    <div className={widthClass}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={selectId}
        className={`${baseSelectClasses} ${errorClasses} ${className}`}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={
          error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
        }
        {...props}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p
          id={`${selectId}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
