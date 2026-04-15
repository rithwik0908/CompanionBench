"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appTypeColor } from "@/lib/utils";
import {
  Search,
  FileUp,
  FileDown,
  Globe,
  Lock,
  Unlock,
} from "lucide-react";

interface App {
  id: string;
  name: string;
  platform: string | null;
  developer: string | null;
  appType: string | null;
  webAccessible: boolean | null;
  webUrl: string | null;
  loginRequired: boolean | null;
  subscriptionRequiredForLongChat: boolean | null;
  languagesSupported: string | null;
  evaluatedAt: string | null;
  _count: { runs: number };
}

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [webFilter, setWebFilter] = useState("all");
  const [loginFilter, setLoginFilter] = useState("all");

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("appType", typeFilter);
    if (webFilter !== "all") params.set("webAccessible", webFilter);
    if (loginFilter !== "all") params.set("loginRequired", loginFilter);

    const res = await fetch(`/api/apps?${params}`);
    const data = await res.json();
    setApps(data);
    setLoading(false);
  }, [search, typeFilter, webFilter, loginFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchApps, 300);
    return () => clearTimeout(timer);
  }, [fetchApps]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            App Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {apps.length} apps · Evaluate and classify AI companion applications
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/apps/import">
            <Button variant="outline" size="sm">
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
          </Link>
          <a href="/api/apps/export">
            <Button variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="App Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="companion">Companion</SelectItem>
                <SelectItem value="general_purpose">General Purpose</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={webFilter} onValueChange={setWebFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Web Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Access</SelectItem>
                <SelectItem value="true">Web Accessible</SelectItem>
                <SelectItem value="false">Not Web</SelectItem>
              </SelectContent>
            </Select>
            <Select value={loginFilter} onValueChange={setLoginFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Login" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Login</SelectItem>
                <SelectItem value="true">Login Required</SelectItem>
                <SelectItem value="false">No Login</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Platform</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">Web</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">Login</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">Subscription</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Languages</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">Runs</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No apps found. Try adjusting your filters or import a CSV.
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/apps/${app.id}`}
                        className="font-medium text-slate-900 hover:text-violet-600 transition-colors"
                      >
                        {app.name}
                      </Link>
                      {app.developer && (
                        <p className="text-xs text-slate-400">{app.developer}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${appTypeColor(app.appType)}`}>
                        {app.appType || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{app.platform || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {app.webAccessible ? (
                        <Globe className="mx-auto h-4 w-4 text-emerald-500" />
                      ) : app.webAccessible === false ? (
                        <span className="text-xs text-slate-400">No</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {app.loginRequired ? (
                        <Lock className="mx-auto h-4 w-4 text-amber-500" />
                      ) : app.loginRequired === false ? (
                        <Unlock className="mx-auto h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {app.subscriptionRequiredForLongChat ? (
                        <span className="text-xs text-amber-600">Required</span>
                      ) : app.subscriptionRequiredForLongChat === false ? (
                        <span className="text-xs text-emerald-600">Free</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {app.languagesSupported || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {app._count.runs || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {app.evaluatedAt ? (
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" title="Evaluated" />
                      ) : (
                        <span className="inline-flex h-2 w-2 rounded-full bg-slate-300" title="Not evaluated" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
