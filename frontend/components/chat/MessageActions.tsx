"use client";

import { useState } from "react";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { DropdownMenuItem } from "@/lib/component-types";

interface MessageActionsProps {
  messageId: string;
  role: "user" | "assistant";
  onCopy: () => void;
  onRegenerate?: () => void;
  onDelete: () => void;
  onFeedback?: (feedback: "thumbs_up" | "thumbs_down") => void;
  currentFeedback?: "thumbs_up" | "thumbs_down" | null;
  showFeedback?: boolean; // Allow hiding feedback buttons if moved elsewhere
}

export function MessageActions({
  messageId,
  role,
  onCopy,
  onRegenerate,
  onDelete,
  onFeedback,
  currentFeedback,
  showFeedback = true,
}: MessageActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  const menuItems: DropdownMenuItem[] = [
    {
      label: "Copy",
      icon: "📋",
      onClick: () => {
        onCopy();
        setShowMenu(false);
      },
    },
  ];

  if (role === "assistant" && onRegenerate) {
    menuItems.push({
      label: "Regenerate",
      icon: "🔄",
      onClick: () => {
        onRegenerate();
        setShowMenu(false);
      },
    });
  }

  menuItems.push({
    label: "Delete",
    icon: "🗑️",
    onClick: () => {
      if (confirm("Delete this message?")) {
        onDelete();
        setShowMenu(false);
      }
    },
    divider: true,
  });

  return (
    <div className="flex items-center">
      <DropdownMenu
        items={menuItems}
        trigger={
          <button
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
            aria-label="More options"
            title="More options"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        }
        align="right"
      />

      {role === "assistant" && onFeedback && showFeedback && (
        <>
          <button
            onClick={() => onFeedback("thumbs_up")}
            className={`p-1 rounded ${
              currentFeedback === "thumbs_up"
                ? "bg-green-100 text-green-700"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            aria-label="Thumbs up"
          >
            👍
          </button>
          <button
            onClick={() => onFeedback("thumbs_down")}
            className={`p-1 rounded ${
              currentFeedback === "thumbs_down"
                ? "bg-red-100 text-red-700"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            aria-label="Thumbs down"
          >
            👎
          </button>
        </>
      )}
    </div>
  );
}
