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
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.10)] overflow-hidden flex flex-col z-40">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <h3 className="font-display text-sm font-bold text-slate-900">Sources</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Close sources"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sources.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No sources available
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sources.map((source, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-start justify-between mb-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-violet-50 text-violet-700 font-bold text-[10px] rounded flex-shrink-0">
                    {idx + 1}
                  </span>
                  {source.id && onViewDocument && (
                    <button
                      onClick={() => onViewDocument(source.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      View Document →
                    </button>
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-900 mb-1 truncate">{source.document_name}</div>
                <div className="text-xs text-slate-500 leading-relaxed mb-2">{source.snippet}</div>
                <button
                  onClick={() => copyToClipboard(source.snippet)}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
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
