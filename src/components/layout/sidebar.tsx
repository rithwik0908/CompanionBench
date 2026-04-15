"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Play,
  FlaskConical,
  FileDown,
  FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "App Registry", href: "/apps", icon: Database },
  { name: "Automation Runs", href: "/runs", icon: Play },
  { name: "New Run", href: "/runs/new", icon: FlaskConical },
];

const secondaryNav = [
  { name: "Import CSV", href: "/apps/import", icon: FileUp },
  { name: "Export CSV", href: "/api/apps/export", icon: FileDown, external: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <FlaskConical className="h-6 w-6 text-violet-600" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            CompanionBench
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Research Platform
          </p>
        </div>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </p>
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-violet-600" : "text-slate-400")} />
              {item.name}
            </Link>
          );
        })}

        <div className="my-4 h-px bg-slate-100" />

        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Data
        </p>
        {secondaryNav.map((item) => {
          if (item.external) {
            return (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <item.icon className="h-4 w-4 text-slate-400" />
                {item.name}
              </a>
            );
          }
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-violet-600" : "text-slate-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4">
        <p className="text-xs text-slate-400">
          Internal Research Tool
        </p>
        <p className="text-[10px] text-slate-300">
          v1.0.0 — Local Instance
        </p>
      </div>
    </aside>
  );
}
