import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "completed":
    case "received":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    case "running":
    case "sending":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "pending":
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    case "failed":
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "cancelled":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function appTypeColor(type: string | null): string {
  switch (type) {
    case "companion":
      return "bg-violet-100 text-violet-800";
    case "general_purpose":
      return "bg-sky-100 text-sky-800";
    case "mixed":
      return "bg-amber-100 text-amber-800";
    case "other":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-slate-50 text-slate-500";
  }
}
