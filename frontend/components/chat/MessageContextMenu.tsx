"use client";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { DropdownMenuItem } from "@/lib/component-types";

interface MessageContextMenuProps {
  messageContent: string;
  onEmailClick: () => void;
  onJiraClick: () => void;
  onReportClick: () => void;
}

export function MessageContextMenu({
  messageContent,
  onEmailClick,
  onJiraClick,
  onReportClick,
}: MessageContextMenuProps) {
  const menuItems: DropdownMenuItem[] = [
    {
      label: "Create Jira ticket from this",
      icon: "🎫",
      onClick: onJiraClick,
    },
    {
      label: "Generate email from this",
      icon: "📧",
      onClick: onEmailClick,
    },
    {
      label: "Generate report from this",
      icon: "📊",
      onClick: onReportClick,
    },
  ];

  return (
    <DropdownMenu
      items={menuItems}
      trigger={
        <button
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Message actions"
        >
          ⋮
        </button>
      }
      align="right"
    />
  );
}
