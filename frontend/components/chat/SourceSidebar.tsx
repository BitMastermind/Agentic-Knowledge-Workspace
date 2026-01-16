"use client";

import type { Source } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SourceSidebarProps {
  sources: Source[];
  isOpen: boolean;
  onClose: () => void;
  onViewDocument?: (documentId: number) => void;
}

export function SourceSidebar({
  sources,
  isOpen,
  onClose,
  onViewDocument,
}: SourceSidebarProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could show a toast here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg overflow-hidden flex flex-col z-40">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h3 className="font-semibold text-gray-900">Sources</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Close sources"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sources.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No sources available
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sources.map((source, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <Badge
                    variant="info"
                    size="sm"
                    className="flex-shrink-0"
                  >
                    [{idx + 1}]
                  </Badge>
                  {source.id && onViewDocument && (
                    <button
                      onClick={() => onViewDocument(source.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      View Document →
                    </button>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1 truncate">
                  {source.document_name}
                </div>
                <div className="text-sm text-gray-600 leading-relaxed mb-2">
                  {source.snippet}
                </div>
                <button
                  onClick={() => copyToClipboard(source.snippet)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  📋 Copy snippet
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
