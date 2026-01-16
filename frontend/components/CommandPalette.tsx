"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Document } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  action: () => void;
  category: "navigation" | "action" | "document";
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [documents, setDocuments] = useState<Document[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      loadDocuments();
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex, isOpen]);

  const loadDocuments = async () => {
    try {
      const docs = await apiClient.listDocuments();
      setDocuments(docs.filter((d) => d.status === "completed"));
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  const navigationCommands: Command[] = [
    {
      id: "dashboard",
      label: "Go to Dashboard",
      description: "View workspace overview",
      icon: "🏠",
      category: "navigation",
      action: () => {
        router.push("/app");
        onClose();
      },
    },
    {
      id: "documents",
      label: "Go to Documents",
      description: "Manage your documents",
      icon: "📄",
      category: "navigation",
      action: () => {
        router.push("/app/documents");
        onClose();
      },
    },
    {
      id: "chat",
      label: "Go to Chat",
      description: "Ask questions about your documents",
      icon: "💬",
      category: "navigation",
      action: () => {
        router.push("/app/chat");
        onClose();
      },
    },
    {
      id: "agents",
      label: "Go to Agents",
      description: "Manage AI agents",
      icon: "🤖",
      category: "navigation",
      action: () => {
        router.push("/app/agents");
        onClose();
      },
    },
    {
      id: "settings",
      label: "Go to Settings",
      description: "Configure integrations and profile",
      icon: "⚙️",
      category: "navigation",
      action: () => {
        router.push("/app/settings");
        onClose();
      },
    },
  ];

  const actionCommands: Command[] = [
    {
      id: "upload",
      label: "Upload Document",
      description: "Upload a new document",
      icon: "📤",
      category: "action",
      keywords: ["upload", "add", "new"],
      action: () => {
        router.push("/app/documents");
        onClose();
        // Could trigger file input here
      },
    },
    {
      id: "new-chat",
      label: "New Chat",
      description: "Start a new conversation",
      icon: "💬",
      category: "action",
      keywords: ["chat", "new", "ask"],
      action: () => {
        router.push("/app/chat");
        onClose();
      },
    },
  ];

  const documentCommands: Command[] = documents.map((doc) => ({
    id: `doc-${doc.id}`,
    label: doc.filename,
    description: `View ${doc.filename}`,
    icon: "📄",
    category: "document",
    keywords: [doc.filename.toLowerCase()],
    action: () => {
      router.push("/app/documents");
      onClose();
    },
  }));

  const allCommands = [...navigationCommands, ...actionCommands, ...documentCommands];

  const filteredCommands = allCommands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.keywords?.some((k) => k.includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-200 animate-in fade-in" />

      {/* Command Palette */}
      <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-200">
          <Input
            ref={inputRef}
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            leftIcon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
            rightIcon={
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
                ESC
              </kbd>
            }
          />
        </div>

        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto divide-y divide-gray-100"
        >
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              const categoryColors = {
                navigation: "blue",
                action: "green",
                document: "gray",
              } as const;

              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                    isSelected
                      ? "bg-blue-50 border-l-4 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="text-xl flex-shrink-0">{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {cmd.label}
                      </span>
                      <Badge
                        variant={categoryColors[cmd.category] as any}
                        size="sm"
                      >
                        {cmd.category}
                      </Badge>
                    </div>
                    {cmd.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {cmd.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">
                Enter
              </kbd>
              Select
            </span>
          </div>
          <span>{filteredCommands.length} result{filteredCommands.length !== 1 ? "s" : ""}</span>
        </div>
      </Card>
    </div>
  );
}
