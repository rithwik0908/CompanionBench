import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, statusColor, appTypeColor } from "@/lib/utils";
import {
  Database,
  Play,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  FlaskConical,
  FileUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [appCount, runCount, recentApps, recentRuns, appsByType] =
    await Promise.all([
      prisma.app.count(),
      prisma.run.count(),
      prisma.app.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.run.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          app: { select: { name: true } },
          _count: { select: { turns: true } },
        },
      }),
      prisma.app.groupBy({ by: ["appType"], _count: true }),
    ]);

  const completedRuns = await prisma.run.count({ where: { status: "completed" } });
  const evaluatedApps = await prisma.app.count({ where: { evaluatedAt: { not: null } } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI Companion Research Platform — Overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Apps</CardTitle>
            <Database className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appCount}</div>
            <p className="text-xs text-slate-500">{evaluatedApps} evaluated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Automation Runs</CardTitle>
            <Play className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runCount}</div>
            <p className="text-xs text-slate-500">{completedRuns} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Companion Apps</CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appsByType.find((t) => t.appType === "companion")?._count || 0}
            </div>
            <p className="text-xs text-slate-500">classified as companion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">App Types</CardTitle>
            <AlertCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {appsByType.map((t) => (
                <span key={t.appType || "none"} className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${appTypeColor(t.appType)}`}>
                  {t.appType || "unclassified"}: {t._count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/runs/new">
          <Button><FlaskConical className="mr-2 h-4 w-4" />New Automation Run</Button>
        </Link>
        <Link href="/apps/import">
          <Button variant="outline"><FileUp className="mr-2 h-4 w-4" />Import CSV</Button>
        </Link>
        <Link href="/apps">
          <Button variant="outline"><Database className="mr-2 h-4 w-4" />View Registry</Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Apps</CardTitle>
                <CardDescription>Recently updated evaluations</CardDescription>
              </div>
              <Link href="/apps">
                <Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3 w-3" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentApps.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No apps yet. Import a CSV to get started.</p>
              ) : (
                recentApps.map((app) => (
                  <Link key={app.id} href={`/apps/${app.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm text-slate-900">{app.name}</p>
                      <p className="text-xs text-slate-400">{app.developer || "Unknown"} · {app.platform || "Unknown"}</p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${appTypeColor(app.appType)}`}>
                      {app.appType || "—"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Runs</CardTitle>
                <CardDescription>Latest automation executions</CardDescription>
              </div>
              <Link href="/runs">
                <Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3 w-3" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRuns.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No runs yet. Create one to get started.</p>
              ) : (
                recentRuns.map((run) => (
                  <Link key={run.id} href={`/runs/${run.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm text-slate-900">{run.name}</p>
                      <p className="text-xs text-slate-400">{run.app.name} · {run._count.turns} turns · {formatDate(run.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${statusColor(run.status)}`}>
                      {run.status}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
