"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { CommandPalette } from "@/components/CommandPalette";

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
  adminOnly?: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, currentTenant, tenants, switchTenant } = useAuth();
  const pathname = usePathname();
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to true for SSR
  const [mounted, setMounted] = useState(false);

  // Load sidebar state from localStorage after mount (to avoid hydration mismatch)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarOpen");
      if (saved !== null) {
        setSidebarOpen(saved === "true");
      }
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("sidebarOpen", String(sidebarOpen));
    }
  }, [sidebarOpen, mounted]);

  // Command Palette keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (e.key === "Escape" && showCommandPalette) {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCommandPalette]);

  // Check if user is admin
  const isAdmin = currentTenant?.role === "admin" || currentTenant?.role === "owner";

  // Navigation structure with sections
  const navigationSections: NavSection[] = [
    {
      title: "Workspace",
      items: [
        { name: "Dashboard", href: "/app", icon: "🏠" },
        { name: "Documents", href: "/app/documents", icon: "📄" },
      ],
    },
    {
      title: "AI Assistant",
      items: [{ name: "Chat", href: "/app/chat", icon: "💬" }],
    },
    {
      title: "Agents & Actions",
      items: [
        { name: "Agents", href: "/app/agents", icon: "🤖" },
      ],
    },
    {
      title: "Settings",
      items: [
        { name: "Settings", href: "/app/settings", icon: "⚙️", adminOnly: true },
        { name: "Audit Log", href: "/app/settings/audit", icon: "📋", adminOnly: true },
      ],
    },
    {
      title: "Admin",
      items: [
        { name: "Evaluation", href: "/app/eval", icon: "📊", adminOnly: true },
      ],
    },
  ];

  // Filter navigation based on user role
  const filteredSections = navigationSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || isAdmin),
  })).filter((section) => section.items.length > 0);

  const handleTenantSwitch = async (tenantId: number) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      await switchTenant(tenant);
      setShowTenantDropdown(false);
    }
  };

  // Check if we're on the chat page
  const isChatPage = pathname === "/app/chat";

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50">
      {/* Top Bar */}
      <nav className="bg-white border-b border-slate-200 flex-shrink-0 h-14 z-10">
        <div className="px-4 sm:px-6 h-full flex items-center gap-3">
          {/* Hamburger — only when sidebar collapsed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* ⌘K command palette trigger */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors ml-auto"
          >
            <span>Search</span>
            <kbd className="font-mono text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500">⌘K</kbd>
          </button>

          {/* Tenant switcher */}
          {tenants.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowTenantDropdown(!showTenantDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="text-slate-400">🏢</span>
                <span className="font-medium text-slate-700">{currentTenant?.name || "Select Tenant"}</span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTenantDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTenantDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-[0_4px_12px_rgba(15,23,42,0.08)] border border-slate-200 py-1 z-20">
                    {tenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => handleTenantSwitch(tenant.id)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between transition-colors ${
                          currentTenant?.id === tenant.id
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-700"
                        }`}
                      >
                        <span>{tenant.name}</span>
                        {currentTenant?.id === tenant.id && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* User avatar */}
          <div className="relative">
            <button
              onClick={() => setShowTenantDropdown(false)}
              className="flex items-center gap-2 group"
              title={user?.email}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.email?.[0]?.toUpperCase() ?? "U"}
              </div>
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col shadow-[2px_0_8px_rgba(15,23,42,0.04)] ${
            sidebarOpen ? "w-64" : "w-16"
          }`}
        >
          {/* Brand header — expanded */}
          {sidebarOpen && (
            <div className="px-4 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs">
                    ⚡
                  </div>
                  <h2 className="font-display text-sm font-extrabold text-slate-900 tracking-tight">
                    Agentic Workspace
                  </h2>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Collapse sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Brand icon — collapsed */}
          {!sidebarOpen && (
            <div className="px-3 py-4 border-b border-slate-200 flex-shrink-0 flex justify-center">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm">
                ⚡
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="mt-3 px-2 space-y-5 flex-1">
            {filteredSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                {section.title && sidebarOpen && (
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {section.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center ${
                          sidebarOpen ? "px-3" : "px-2 justify-center"
                        } py-2 text-sm font-medium rounded-lg transition-all duration-100 relative border-l-2 ${
                          isActive
                            ? "bg-blue-50 text-blue-600 border-l-blue-600 font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-transparent"
                        }`}
                        title={!sidebarOpen ? item.name : undefined}
                      >
                        <span className={`text-base ${sidebarOpen ? "mr-2.5" : ""}`}>
                          {item.icon}
                        </span>
                        {sidebarOpen && (
                          <span>{item.name}</span>
                        )}
                        {!sidebarOpen && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                            {item.name}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full border-4 border-transparent border-r-slate-900" />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer user strip */}
          {sidebarOpen && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center gap-2.5 flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {user?.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-xs text-slate-400 truncate">{user?.email}</span>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 overflow-hidden ${
            isChatPage ? "" : "p-8 overflow-y-auto"
          }`}
        >
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
}
