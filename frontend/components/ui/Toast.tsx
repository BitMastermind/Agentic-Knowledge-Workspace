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
    success: "bg-white border-slate-200 border-l-4 border-l-green-500 text-slate-800",
    error:   "bg-white border-slate-200 border-l-4 border-l-red-500 text-slate-800",
    warning: "bg-white border-slate-200 border-l-4 border-l-amber-500 text-slate-800",
    info:    "bg-white border-slate-200 border-l-4 border-l-blue-500 text-slate-800",
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
      className={`flex items-start gap-3 px-4 py-3 border rounded-lg shadow-[0_4px_12px_rgba(15,23,42,0.08)] ${typeClasses[type]} ${className} transition-opacity duration-300`}
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
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 text-lg leading-none"
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
