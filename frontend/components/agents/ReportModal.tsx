"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import type { Document, ReportResponse } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface AgentAction {
  id: string;
  type: "email" | "jira" | "report";
  description: string;
  status: "success" | "failed";
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (action: AgentAction) => void;
  initialDocumentIds?: number[];
}

export function ReportModal({
  isOpen,
  onClose,
  onSuccess,
  initialDocumentIds = [],
}: ReportModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>(initialDocumentIds);
  const [reportType, setReportType] = useState("summary");
  const [format, setFormat] = useState("html");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      if (initialDocumentIds.length > 0) {
        setSelectedDocIds(initialDocumentIds);
      }
    }
  }, [isOpen, initialDocumentIds]);

  const loadDocuments = async () => {
    try {
      const docs = await apiClient.listDocuments();
      setDocuments(docs.filter((d) => d.status === "completed"));
    } catch (err) {
      setError("Failed to load documents");
    }
  };

  const handleGenerate = async () => {
    if (selectedDocIds.length === 0) {
      setError("Please select at least one document");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await apiClient.generateReport(selectedDocIds, reportType, format);

      const action: AgentAction = {
        id: Date.now().toString(),
        type: "report",
        description: `${reportType} report generated from ${result.document_count} document(s)`,
        status: "success",
        timestamp: new Date(),
        metadata: {
          reportId: result.report_id,
          reportUrl: result.report_url,
          reportType: result.report_type,
          documentCount: result.document_count,
          documentNames: result.document_names,
        },
      };

      onSuccess(action);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
      const action: AgentAction = {
        id: Date.now().toString(),
        type: "report",
        description: `Failed to generate report: ${err instanceof Error ? err.message : "Unknown error"}`,
        status: "failed",
        timestamp: new Date(),
      };
      onSuccess(action);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDocIds(initialDocumentIds);
    setReportType("summary");
    setFormat("html");
    setError("");
    onClose();
  };

  const toggleDocument = (docId: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Report"
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Documents *
          </label>
          <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
            {documents.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm text-center">
                No completed documents available
              </div>
            ) : (
              <div className="divide-y">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => toggleDocument(doc.id)}
                      className="mr-3 rounded"
                    />
                    <span className="text-sm text-gray-900">{doc.filename}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <Select
          label="Report Type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          options={[
            { value: "summary", label: "Summary" },
            { value: "analysis", label: "Analysis" },
            { value: "detailed", label: "Detailed" },
          ]}
        />

        <Select
          label="Format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          options={[
            { value: "html", label: "HTML" },
            { value: "pdf", label: "PDF (Coming Soon)", disabled: true },
          ]}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={loading || selectedDocIds.length === 0}
            loading={loading}
          >
            Generate Report
          </Button>
        </div>
      </div>
    </Modal>
  );
}
