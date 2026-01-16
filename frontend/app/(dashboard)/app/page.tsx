"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { Document } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/Spinner";

interface DashboardStats {
  totalDocuments: number;
  completedDocuments: number;
  processingDocuments: number;
  recentDocuments: Document[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const documents = await apiClient.listDocuments();
      
      const totalDocuments = documents.length;
      const completedDocuments = documents.filter((d) => d.status === "completed").length;
      const processingDocuments = documents.filter(
        (d) => d.status === "processing" || d.status === "pending"
      ).length;
      
      // Get recent documents (last 5)
      const recentDocuments = documents
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setStats({
        totalDocuments,
        completedDocuments,
        processingDocuments,
        recentDocuments,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <LoadingState>Loading dashboard...</LoadingState>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const hasDocuments = stats && stats.totalDocuments > 0;

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome to your Agentic Knowledge Workspace</p>
      </div>

      {!hasDocuments ? (
        // Empty state for new users
        <Card padding="lg">
          <EmptyState
            icon="📚"
            title="Get Started with Your Knowledge Workspace"
            description="Upload documents to start asking questions and generating insights with AI"
            action={
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Link href="/app/documents">
                  <Button variant="primary" size="lg">
                    Upload Your First Document
                  </Button>
                </Link>
                <Link href="/app/chat">
                  <Button variant="secondary" size="lg">
                    Try Chat
                  </Button>
                </Link>
              </div>
            }
          />
          
          {/* Getting Started Guide */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">📄</div>
                <h3 className="font-semibold text-gray-900 mb-2">1. Upload Documents</h3>
                <p className="text-sm text-gray-600">
                  Upload PDFs, DOCX, CSV, Markdown, or text files to your workspace
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <h3 className="font-semibold text-gray-900 mb-2">2. Ask Questions</h3>
                <p className="text-sm text-gray-600">
                  Use AI-powered chat to query your documents and get instant answers
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🤖</div>
                <h3 className="font-semibold text-gray-900 mb-2">3. Take Action</h3>
                <p className="text-sm text-gray-600">
                  Use AI agents to generate emails, create Jira tickets, or generate reports
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Documents</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalDocuments}</p>
                </div>
                <div className="text-4xl">📄</div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completedDocuments}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Processing</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.processingDocuments}</p>
                </div>
                <div className="text-4xl">⚙️</div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card header={<h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/app/documents">
                <Button variant="primary" fullWidth>
                  📄 Upload Document
                </Button>
              </Link>
              <Link href="/app/chat">
                <Button variant="secondary" fullWidth>
                  💬 Ask a Question
                </Button>
              </Link>
              <Link href="/app/agents">
                <Button variant="secondary" fullWidth>
                  📊 Generate Report
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recent Documents */}
          <Card
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
                <Link href="/app/documents">
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    View all →
                  </button>
                </Link>
              </div>
            }
          >
            {stats.recentDocuments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No documents yet</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {stats.recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{doc.filename}</h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{doc.file_type.toUpperCase()}</span>
                        <span>{(doc.file_size / 1024).toFixed(2)} KB</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          doc.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : doc.status === "processing" || doc.status === "pending"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
