"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import type { Document } from "@/lib/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const documentsRef = useRef<Document[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    // Initial load with loading spinner
    loadDocuments(true);
    
    // Smart polling: only poll when documents are processing
    const interval = setInterval(() => {
      const hasProcessing = documentsRef.current.some(
        (doc) => doc.status === "processing" || doc.status === "pending"
      );
      
      // Only fetch if there are documents being processed
      if (hasProcessing) {
        loadDocuments(false); // Background poll without loading spinner
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []); // Run once on mount, ref prevents stale closure

  const loadDocuments = async (showLoading: boolean = true) => {
    try {
      // Only show loading spinner on initial load or explicit refresh
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      
      // Upload document
      const uploadedDoc = await apiClient.uploadDocument(file);
      
      // Immediately refresh the list to show the new document (with loading spinner)
      await loadDocuments(true);
      
      // Reset file input
      e.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await apiClient.deleteDocument(docId);
      await loadDocuments(true); // Refresh with loading spinner
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
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
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
        <div className="flex items-center space-x-4">
          <label className="flex-1">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer transition">
              <input
                type="file"
                accept=".pdf,.csv,.md,.txt,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="space-y-2">
                <p className="text-gray-600">
                  {uploading
                    ? "Uploading..."
                    : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-gray-500">
                  PDF, CSV, MD, TXT, DOCX (max 10MB)
                </p>
                {uploading && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: "100%"}}></div>
                  </div>
                )}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Your Documents</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No documents yet. Upload your first document to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{doc.filename}</h3>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>{(doc.file_size / 1024).toFixed(2)} KB</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                      doc.status
                    )}`}
                  >
                    {doc.status}
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

