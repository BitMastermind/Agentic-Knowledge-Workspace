/**
 * Shared TypeScript types for UI components
 */

import { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "ai";
export type BadgeSize = "sm" | "md" | "lg";

export type StatusType = "pending" | "processing" | "completed" | "failed" | "active" | "inactive";

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
}

export interface BadgeProps extends BaseComponentProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export interface StatusBadgeProps extends BaseComponentProps {
  status: StatusType;
  size?: BadgeSize;
}

export interface CardProps extends BaseComponentProps {
  header?: ReactNode;
  footer?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showCloseButton?: boolean;
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export interface EmptyStateProps extends BaseComponentProps {
  icon?: string | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface ToastProps extends BaseComponentProps {
  type?: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
  onClose?: () => void;
  action?: ReactNode;
}

export interface TooltipProps extends BaseComponentProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownMenuProps {
  items: DropdownMenuItem[];
  trigger: ReactNode;
  align?: "left" | "right";
}
