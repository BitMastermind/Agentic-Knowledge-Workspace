"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { Document } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";

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
        <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight mb-8">Dashboard</h1>
        <LoadingState>Loading dashboard...</LoadingState>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl">
        <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight mb-8">Dashboard</h1>
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
        <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">Welcome to your Agentic Knowledge Workspace</p>
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
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-6">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">📄</div>
                <h3 className="font-display font-semibold text-slate-900 text-sm mb-2">1. Upload Documents</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload PDFs, DOCX, CSV, Markdown, or text files to your workspace
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <h3 className="font-display font-semibold text-slate-900 text-sm mb-2">2. Ask Questions</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Use AI-powered chat to query your documents and get instant answers
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🤖</div>
                <h3 className="font-display font-semibold text-slate-900 text-sm mb-2">3. Take Action</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
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
                  <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">Total Documents</p>
                  <p className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">{stats.totalDocuments}</p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">📄</div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">Completed</p>
                  <p className="font-display text-3xl font-extrabold text-green-600 tracking-tight">{stats.completedDocuments}</p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">✅</div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wide">Processing</p>
                  <p className="font-display text-3xl font-extrabold text-blue-600 tracking-tight">{stats.processingDocuments}</p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">⚙️</div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card header={<h2 className="font-display text-sm font-bold text-slate-900">Quick Actions</h2>} className="mb-8">
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
                <h2 className="font-display text-sm font-bold text-slate-900">Recent Documents</h2>
                <Link href="/app/documents">
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</button>
                </Link>
              </div>
            }
          >
            {stats.recentDocuments.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No documents yet</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {stats.recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors px-1 -mx-1 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-sm flex-shrink-0">📄</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 text-sm">{doc.filename}</h3>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                        <span className="font-mono">{doc.file_type.toUpperCase()}</span>
                        <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <StatusBadge status={doc.status as any} size="sm" />
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
