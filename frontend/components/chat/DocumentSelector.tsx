"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import type { Document } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface DocumentSelectorProps {
  selectedDocumentIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

export function DocumentSelector({
  selectedDocumentIds,
  onSelectionChange,
}: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await apiClient.listDocuments();
      // Only show completed documents
      setDocuments(docs.filter((d) => d.status === "completed"));
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (docId: number) => {
    if (selectedDocumentIds.includes(docId)) {
      onSelectionChange(selectedDocumentIds.filter((id) => id !== docId));
    } else {
      onSelectionChange([...selectedDocumentIds, docId]);
    }
  };

  const selectedDocuments = documents.filter((d) =>
    selectedDocumentIds.includes(d.id)
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 flex-wrap">
        {selectedDocumentIds.length === 0 ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            + Select documents
          </button>
        ) : (
          <>
            {selectedDocuments.map((doc) => (
              <Badge
                key={doc.id}
                variant="default"
                size="sm"
                className="flex items-center gap-1 text-xs"
              >
                {doc.filename.length > 20 ? `${doc.filename.substring(0, 20)}...` : doc.filename}
                <button
                  onClick={() => toggleDocument(doc.id)}
                  className="ml-1 hover:text-gray-900 text-xs"
                  aria-label="Remove document"
                >
                  ×
                </button>
              </Badge>
            ))}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              + Add
            </button>
          </>
        )}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Select Documents</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-2">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : documents.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No completed documents available
                </div>
              ) : (
                <div className="space-y-1">
                  {documents.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(doc.id)}
                        onChange={() => toggleDocument(doc.id)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900 flex-1 truncate">
                        {doc.filename}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => {
                  onSelectionChange([]);
                  setIsOpen(false);
                }}
              >
                Clear selection (query all)
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
