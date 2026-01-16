"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { logAuditEvent } from "@/lib/audit-log";
import type { Document } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "size-desc" | "size-asc";
type StatusFilter = "all" | "completed" | "processing" | "failed";

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const documentsRef = useRef<Document[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep ref in sync with state
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    loadDocuments(true);

    // Smart polling: only poll when documents are processing
    const interval = setInterval(() => {
      const hasProcessing = documentsRef.current.some(
        (doc) => doc.status === "processing" || doc.status === "pending"
      );

      if (hasProcessing) {
        loadDocuments(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Filter and sort documents
  useEffect(() => {
    let filtered = [...documents];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc) =>
        doc.filename.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name-asc":
          return a.filename.localeCompare(b.filename);
        case "name-desc":
          return b.filename.localeCompare(a.filename);
        case "size-desc":
          return b.file_size - a.file_size;
        case "size-asc":
          return a.file_size - b.file_size;
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, statusFilter, sortOption]);

  const loadDocuments = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const docs = await apiClient.listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError("");

      await apiClient.uploadDocument(file);
      await loadDocuments(true);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const doc = documents.find((d) => d.id === docId);
      await apiClient.deleteDocument(docId);
      
      // Log audit event
      logAuditEvent(
        "Deleted document",
        "document",
        `Document "${doc?.filename || `ID ${docId}`}" deleted`,
        user?.email || "unknown",
        {
          document_id: docId,
          filename: doc?.filename,
          file_size: doc?.file_size,
        }
      );
      
      await loadDocuments(true);
      setSelectedIds(selectedIds.filter((id) => id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} document(s)?`)) return;

    try {
      const docsToDelete = documents.filter((d) => selectedIds.includes(d.id));
      await Promise.all(selectedIds.map((id) => apiClient.deleteDocument(id)));
      
      // Log audit event for bulk delete
      logAuditEvent(
        "Bulk deleted documents",
        "document",
        `${selectedIds.length} document(s) deleted`,
        user?.email || "unknown",
        {
          count: selectedIds.length,
          document_ids: selectedIds,
          filenames: docsToDelete.map((d) => d.filename),
        }
      );
      
      await loadDocuments(true);
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete documents");
    }
  };

  const toggleSelect = (docId: number) => {
    setSelectedIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDocuments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDocuments.map((d) => d.id));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="mt-2 text-gray-600">
          Upload and manage your documents for AI processing
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h2>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.md,.txt,.docx"
            onChange={handleFileInputChange}
            disabled={uploading}
            className="hidden"
          />
          <div className="space-y-2">
            {uploading ? (
              <>
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-gray-600 font-medium">Uploading...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto mt-4">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "100%" }} />
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">📄</div>
                <p className="text-gray-600 font-medium">
                  {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-gray-500">
                  PDF, CSV, MD, TXT, DOCX (max 10MB)
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card className="mb-6" padding="md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename..."
            className="text-gray-900 placeholder:text-gray-400"
            leftIcon={<span>🔍</span>}
          />

          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: "all", label: "All Status" },
              { value: "completed", label: "Completed" },
              { value: "processing", label: "Processing" },
              { value: "failed", label: "Failed" },
            ]}
          />

          <Select
            label="Sort By"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            options={[
              { value: "date-desc", label: "Date (Newest)" },
              { value: "date-asc", label: "Date (Oldest)" },
              { value: "name-asc", label: "Name (A-Z)" },
              { value: "name-desc", label: "Name (Z-A)" },
              { value: "size-desc", label: "Size (Largest)" },
              { value: "size-asc", label: "Size (Smallest)" },
            ]}
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedIds.length} document{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              Delete Selected
            </Button>
          </div>
        )}
      </Card>

      {/* Documents List */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Documents ({filteredDocuments.length})
          </h2>
          {filteredDocuments.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredDocuments.length && filteredDocuments.length > 0}
                onChange={toggleSelectAll}
                className="rounded"
              />
              Select all
            </label>
          )}
        </div>

        {loading ? (
          <LoadingState>Loading documents...</LoadingState>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon="📄"
            title={documents.length === 0 ? "No documents yet" : "No documents match your filters"}
            description={
              documents.length === 0
                ? "Upload your first document to get started with AI-powered Q&A"
                : "Try adjusting your search or filter criteria"
            }
            action={
              documents.length === 0 ? (
                <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
                  Upload Document
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}>
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(doc.id)}
                  onChange={() => toggleSelect(doc.id)}
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{doc.filename}</h3>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <StatusBadge status={doc.status as any} />
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
