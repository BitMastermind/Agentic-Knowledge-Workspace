"use client";

import React, { useState, useRef, useEffect } from "react";
import type { DropdownMenuProps } from "@/lib/component-types";

/**
 * Dropdown menu component
 */
export function DropdownMenu({
  items,
  trigger,
  align = "right",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      });
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  
  const alignClasses = {
    left: "left-0",
    right: "right-0",
  };
  
  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute ${alignClasses[align]} mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50`}
          role="menu"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <hr key={`divider-${index}`} className="my-1 border-gray-200" />;
            }
            
            return (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 ${
                  item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                role="menuitem"
              >
                {item.icon && <span className="text-gray-400">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
