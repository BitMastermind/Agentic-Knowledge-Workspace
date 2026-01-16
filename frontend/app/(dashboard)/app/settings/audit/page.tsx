"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/utils";
import { getAuditLog, type AuditLogEntry } from "@/lib/audit-log";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface AuditLogEntry {
  id: string;
  action: string;
  type: "credential" | "document" | "agent" | "user";
  description: string;
  user_email: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export default function AuditLogPage() {
  const { currentTenant } = useAuth();
  const router = useRouter();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [filteredLog, setFilteredLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const userIsAdmin = isAdmin(currentTenant);

  useEffect(() => {
    if (!userIsAdmin) {
      router.push("/app/settings");
      return;
    }
    loadAuditLog();
    
    // Refresh audit log every 5 seconds
    const interval = setInterval(() => {
      loadAuditLog();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [userIsAdmin, router]);

  useEffect(() => {
    filterAuditLog();
  }, [auditLog, typeFilter, dateFilter]);

  const loadAuditLog = () => {
    try {
      setLoading(true);
      const log = getAuditLog();
      setAuditLog(
        log.sort(
          (a: AuditLogEntry, b: AuditLogEntry) =>
            b.timestamp.getTime() - a.timestamp.getTime()
        )
      );
    } catch (err) {
      console.error("Failed to load audit log:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterAuditLog = () => {
    let filtered = [...auditLog];

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((entry) => entry.type === typeFilter);
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(
            (entry) => entry.timestamp >= filterDate
          );
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(
            (entry) => entry.timestamp >= filterDate
          );
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(
            (entry) => entry.timestamp >= filterDate
          );
          break;
      }
    }

    setFilteredLog(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "Action", "Type", "Description", "User", "Metadata"];
    const rows = filteredLog.map((entry) => [
      entry.timestamp.toISOString(),
      entry.action,
      entry.type,
      entry.description,
      entry.user_email,
      JSON.stringify(entry.metadata || {}),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!userIsAdmin) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Audit Log</h1>
        <LoadingState>Loading audit log...</LoadingState>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
            <p className="mt-2 text-gray-600">
              Track all administrative actions and changes
            </p>
          </div>
          {filteredLog.length > 0 && (
            <Button variant="secondary" onClick={exportToCSV}>
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6" padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Filter by Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: "all", label: "All Types" },
              { value: "credential", label: "Credentials" },
              { value: "document", label: "Documents" },
              { value: "agent", label: "Agent Actions" },
              { value: "user", label: "User Actions" },
            ]}
          />

          <Select
            label="Filter by Date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            options={[
              { value: "all", label: "All Time" },
              { value: "today", label: "Today" },
              { value: "week", label: "Last 7 Days" },
              { value: "month", label: "Last 30 Days" },
            ]}
          />
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Activity Log ({filteredLog.length} entries)
          </h2>
        </div>

        {filteredLog.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No audit log entries"
            description={
              auditLog.length === 0
                ? "Audit log entries will appear here as actions are performed"
                : "No entries match your current filters"
            }
            action={
              auditLog.length > 0 ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTypeFilter("all");
                    setDateFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(entry.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        variant={
                          entry.type === "credential"
                            ? "info"
                            : entry.type === "document"
                            ? "default"
                            : entry.type === "agent"
                            ? "success"
                            : "warning"
                        }
                        size="sm"
                      >
                        {entry.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.user_email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
