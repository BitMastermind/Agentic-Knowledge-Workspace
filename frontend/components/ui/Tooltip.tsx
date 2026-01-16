"use client";

import React, { useState, useRef, useEffect } from "react";
import type { TooltipProps } from "@/lib/component-types";

/**
 * Tooltip component that shows on hover
 */
export function Tooltip({
  content,
  children,
  position = "top",
  delay = 200,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case "top":
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + 8;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "left":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case "right":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + 8;
        break;
    }
    
    setTooltipPosition({ top, left });
  };
  
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setTimeout(updatePosition, 0);
    }, delay);
  };
  
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };
  
  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);
      
      return () => {
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isVisible]);
  
  return (
    <div
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg pointer-events-none ${className}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 ${
              position === "top"
                ? "top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-r-transparent border-b-transparent border-l-transparent"
                : position === "bottom"
                ? "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-r-transparent border-t-transparent border-l-transparent"
                : position === "left"
                ? "left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-r-transparent border-t-transparent border-b-transparent"
                : "right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-l-transparent border-t-transparent border-b-transparent"
            }`}
          />
        </div>
      )}
    </div>
  );
}
