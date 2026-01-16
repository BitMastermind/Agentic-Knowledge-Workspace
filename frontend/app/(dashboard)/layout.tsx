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
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      {/* Top Bar - Fixed height */}
      <nav className="bg-white border-b border-gray-200 flex-shrink-0 h-16">
        <div className="px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between h-full items-center">
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle Button - Only show hamburger when sidebar is closed (ChatGPT style) */}
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
                  aria-label="Open sidebar"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Tenant Switcher */}
              {tenants.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowTenantDropdown(!showTenantDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-gray-500">🏢</span>
                    <span className="font-medium">
                      {currentTenant?.name || "Select Tenant"}
                    </span>
                    <span className="text-gray-400">▼</span>
                  </button>
                  
                  {showTenantDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowTenantDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        {tenants.map((tenant) => (
                          <button
                            key={tenant.id}
                            onClick={() => handleTenantSwitch(tenant.id)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                              currentTenant?.id === tenant.id
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            <span>{tenant.name}</span>
                            {currentTenant?.id === tenant.id && (
                              <span className="text-blue-600">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Collapsible */}
        <aside
          className={`bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out flex flex-col ${
            sidebarOpen ? "w-64" : "w-16"
          }`}
        >
          {/* Sidebar Header - Show "Agentic Workspace" when open, empty when collapsed (ChatGPT style) */}
          {sidebarOpen && (
            <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Agentic Workspace</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Collapse sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <nav className="mt-5 px-2 space-y-6 flex-1">
            {filteredSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                {section.title && sidebarOpen && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center ${
                          sidebarOpen ? "px-2" : "px-2 justify-center"
                        } py-2 text-sm font-medium rounded-md transition-colors relative ${
                          isActive
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                        title={!sidebarOpen ? item.name : undefined}
                      >
                        <span className={`text-xl ${sidebarOpen ? "mr-3" : ""}`}>
                          {item.icon}
                        </span>
                        {sidebarOpen && (
                          <span className="opacity-100 transition-opacity duration-200">
                            {item.name}
                          </span>
                        )}
                        {/* Tooltip for collapsed state */}
                        {!sidebarOpen && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                            {item.name}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full border-4 border-transparent border-r-gray-900" />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
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
