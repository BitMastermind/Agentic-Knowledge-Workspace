"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { isAdmin } from "@/lib/utils";
import { logAuditEvent } from "@/lib/audit-log";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmailCredsModal } from "@/components/settings/EmailCredsModal";
import { JiraCredsModal } from "@/components/settings/JiraCredsModal";
import Link from "next/link";

interface Credential {
  id: number;
  integration_type: string;
  metadata: Record<string, any>;
  is_active: string;
  last_used_at?: string;
  created_at: string;
}

export default function SettingsPage() {
  const { user, currentTenant } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showJiraModal, setShowJiraModal] = useState(false);

  const userIsAdmin = isAdmin(currentTenant);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      setError("");
      const creds = await apiClient.listCredentials();
      setCredentials(creds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credentials");
    } finally {
      setLoading(false);
    }
  };

  const getCredential = (type: string): Credential | undefined => {
    return credentials.find((c) => c.integration_type === type);
  };

  const emailCreds = getCredential("email");
  const jiraCreds = getCredential("jira");

  const handleDeleteCredential = async (type: string) => {
    if (!confirm(`Are you sure you want to disconnect ${type}?`)) return;

    try {
      await apiClient.deleteCredentials(type);

      // Log audit event
      logAuditEvent(
        "Deleted credentials",
        "credential",
        `${type.charAt(0).toUpperCase() + type.slice(1)} credentials disconnected`,
        user?.email || "unknown",
        {
          integration_type: type,
        }
      );

      await loadCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete credentials");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight mb-8">Settings</h1>
        <LoadingState>Loading settings...</LoadingState>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your workspace integrations and profile</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Integrations Section - Admin Only */}
      {userIsAdmin ? (
        <section className="mb-8">
          <h2 className="font-display text-base font-bold text-slate-900 mb-4">Integrations</h2>

          {/* Email Integration */}
          <Card className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-2xl">
                  📧
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">Email (SMTP)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Send emails via SMTP</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {emailCreds ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        Connected
                      </span>
                      <Badge variant="success" size="sm" className="flex items-center gap-1">
                        ✓ Verified
                      </Badge>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowEmailModal(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteCredential("email")}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowEmailModal(true)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>

            {emailCreds && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                  <div>
                    <span className="text-slate-500">Server:</span>
                    <span className="ml-2 font-mono text-slate-900">
                      {emailCreds.metadata?.smtp_host || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Last used:</span>
                    <span className="ml-2 text-slate-900">
                      {emailCreds.last_used_at
                        ? new Date(emailCreds.last_used_at).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Badge variant="info" size="sm" className="flex items-center gap-1">
                    🔒 Encrypted
                  </Badge>
                  <span className="text-slate-400">Credentials are encrypted and stored securely</span>
                </div>
              </div>
            )}
          </Card>

          {/* Jira Integration */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-2xl">
                  🎟️
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">Jira</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Create and manage Jira tickets</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {jiraCreds ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        Connected
                      </span>
                      <Badge variant="success" size="sm" className="flex items-center gap-1">
                        ✓ Verified
                      </Badge>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowJiraModal(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteCredential("jira")}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowJiraModal(true)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>

            {jiraCreds && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                  <div>
                    <span className="text-slate-500">Server URL:</span>
                    <span className="ml-2 font-mono text-slate-900">
                      {jiraCreds.metadata?.jira_url || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Last used:</span>
                    <span className="ml-2 text-slate-900">
                      {jiraCreds.last_used_at
                        ? new Date(jiraCreds.last_used_at).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Badge variant="info" size="sm" className="flex items-center gap-1">
                    🔒 Encrypted
                  </Badge>
                  <span className="text-slate-400">Credentials are encrypted and stored securely</span>
                </div>
              </div>
            )}
          </Card>
        </section>
      ) : (
        <section className="mb-8">
          <Card>
            <EmptyState
              icon="🔒"
              title="Admin Access Required"
              description="Only administrators can manage integrations. Contact your workspace administrator for access."
            />
          </Card>
        </section>
      )}

      {/* Profile Section */}
      <section className="mb-8">
        <h2 className="font-display text-base font-bold text-slate-900 mb-4">Profile</h2>
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Email
              </label>
              <p className="text-sm text-slate-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Full Name
              </label>
              <p className="text-sm text-slate-900">{user?.full_name || "Not set"}</p>
            </div>
            {currentTenant && (
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Current Tenant
                </label>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-900">{currentTenant.name}</p>
                  <Badge
                    variant={
                      currentTenant.role === "owner" || currentTenant.role === "admin"
                        ? "success"
                        : "default"
                    }
                    size="sm"
                  >
                    {currentTenant.role.charAt(0).toUpperCase() + currentTenant.role.slice(1)}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tenant ID: {currentTenant.id}
                </p>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Admin Section */}
      {userIsAdmin && (
        <section>
          <h2 className="font-display text-base font-bold text-slate-900 mb-4">Administration</h2>
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">
                    📋
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">Audit Log</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      View all administrative actions and changes
                    </p>
                  </div>
                </div>
                <Link href="/app/settings/audit">
                  <Button variant="secondary" size="sm">
                    View Audit Log →
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Modals */}
      <EmailCredsModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          loadCredentials();
        }}
        existingCreds={emailCreds}
      />

      <JiraCredsModal
        isOpen={showJiraModal}
        onClose={() => {
          setShowJiraModal(false);
          loadCredentials();
        }}
        existingCreds={jiraCreds}
      />
    </div>
  );
}
