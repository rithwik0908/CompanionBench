"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, statusColor } from "@/lib/utils";
import { FlaskConical, Play, ArrowRight } from "lucide-react";

interface Run {
  id: string;
  name: string;
  status: string;
  adapterType: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  summary: string | null;
  errorMessage: string | null;
  app: { id: string; name: string; appType: string | null };
  _count: { turns: number; artifacts: number };
}

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((data) => {
        setRuns(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Automation Runs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {runs.length} runs · Browser automation executions
          </p>
        </div>
        <Link href="/runs/new">
          <Button>
            <FlaskConical className="mr-2 h-4 w-4" />
            New Run
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">Loading runs...</div>
      ) : runs.length === 0 ? (
        <Card className="py-20 text-center">
          <div className="space-y-3">
            <Play className="mx-auto h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">No automation runs yet.</p>
            <Link href="/runs/new">
              <Button variant="outline" size="sm" className="mt-2">
                Create First Run
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const summary = run.summary ? JSON.parse(run.summary) : null;
            return (
              <Link key={run.id} href={`/runs/${run.id}`}>
                <Card className="transition-colors hover:bg-slate-50">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        run.status === "completed"
                          ? "bg-emerald-100"
                          : run.status === "failed"
                          ? "bg-red-100"
                          : run.status === "running"
                          ? "bg-blue-100"
                          : "bg-slate-100"
                      }`}>
                        <Play className={`h-4 w-4 ${
                          run.status === "completed"
                            ? "text-emerald-600"
                            : run.status === "failed"
                            ? "text-red-600"
                            : run.status === "running"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{run.name}</p>
                        <p className="text-xs text-slate-400">
                          {run.app.name} · {run.adapterType} adapter · {run._count.turns} turns · {run._count.artifacts} artifacts
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {summary && (
                        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
                          <span className="text-emerald-600">{summary.successCount} ok</span>
                          {summary.failCount > 0 && (
                            <span className="text-red-500">{summary.failCount} failed</span>
                          )}
                          {summary.avgResponseTimeMs > 0 && (
                            <span>avg {(summary.avgResponseTimeMs / 1000).toFixed(1)}s</span>
                          )}
                        </div>
                      )}
                      <div className="text-right">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusColor(run.status)}`}>
                          {run.status}
                        </span>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(run.createdAt)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
