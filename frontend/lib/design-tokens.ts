/**
 * Design tokens for the Agentic Knowledge Workspace
 * 
 * These tokens define the visual design language and should be used
 * consistently across all components.
 */

export const tokens = {
  colors: {
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
    accent: {
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
    },
    success: {
      50: "#f0fdf4",
      100: "#dcfce7",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
    },
    warning: {
      50: "#fffbeb",
      100: "#fef3c7",
      500: "#f59e0b",
      600: "#d97706",
    },
    error: {
      50: "#fef2f2",
      100: "#fee2e2",
      500: "#ef4444",
      600: "#dc2626",
    },
    slate: {
      50:  "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    ai: {
      confidence: {
        high: "#16a34a",
        medium: "#d97706",
        low:  "#dc2626",
      },
    },
  },
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
    "3xl": "4rem", // 64px
  },
  typography: {
    fontFamily: {
      sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      mono: ["JetBrains Mono", "Menlo", "Monaco", "monospace"],
    },
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
      sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
      base: ["1rem", { lineHeight: "1.5rem" }], // 16px
      lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
      xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
      "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
      "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },
  borderRadius: {
    none: "0",
    sm: "0.25rem", // 4px
    md: "0.5rem", // 8px
    lg: "0.75rem", // 12px
    xl: "1rem", // 16px
    "2xl": "1.5rem", // 24px
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  },
  transitions: {
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
  },
} as const;

/**
 * Helper function to get Tailwind-compatible color classes
 * These can be used directly in className strings
 */
export const colorClasses = {
  primary: {
    bg: "bg-blue-600",
    text: "text-blue-600",
    border: "border-blue-600",
    hover: "hover:bg-blue-700",
  },
  success: {
    bg: "bg-green-600",
    text: "text-green-600",
    border: "border-green-600",
    hover: "hover:bg-green-700",
  },
  warning: {
    bg: "bg-amber-500",
    text: "text-amber-500",
    border: "border-amber-500",
    hover: "hover:bg-amber-600",
  },
  error: {
    bg: "bg-red-600",
    text: "text-red-600",
    border: "border-red-600",
    hover: "hover:bg-red-700",
  },
} as const;
