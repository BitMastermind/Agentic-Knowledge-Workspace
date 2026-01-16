"use client";

import React, { useEffect, useState } from "react";
import type { ToastProps } from "@/lib/component-types";

/**
 * Toast notification component
 */
export function Toast({
  type = "info",
  message,
  duration = 5000,
  onClose,
  action,
  className = "",
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for fade-out animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const typeClasses = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };
  
  const iconMap = {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ℹ",
  };
  
  if (!isVisible) return null;
  
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border rounded-lg shadow-lg ${typeClasses[type]} ${className} transition-opacity duration-300`}
      role="alert"
    >
      <span className="text-lg flex-shrink-0">{iconMap[type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(), 300);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Toast container for managing multiple toasts
 */
interface ToastItem {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
  action?: React.ReactNode;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };
  
  // Expose function to add toasts (can be called from anywhere)
  useEffect(() => {
    (window as any).showToast = (toast: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);
    };
    
    return () => {
      delete (window as any).showToast;
    };
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          action={toast.action}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
