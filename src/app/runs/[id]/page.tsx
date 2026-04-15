"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDuration, statusColor } from "@/lib/utils";
import {
  ArrowLeft,
  MessageSquare,
  Image as ImageIcon,
  Clock,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Turn {
  id: string;
  turnIndex: number;
  inputMessage: string;
  response: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  durationMs: number | null;
  artifacts: Artifact[];
}

interface Artifact {
  id: string;
  type: string;
  filename: string;
  path: string;
  mimeType: string | null;
}

interface RunData {
  id: string;
  name: string;
  status: string;
  adapterType: string;
  config: string | null;
  loginMeta: string | null;
  summary: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  app: { id: string; name: string; appType: string | null; webUrl: string | null };
  turns: Turn[];
  artifacts: Artifact[];
}

export default function RunDetailPage() {
  const params = useParams();
  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRun = () => {
    fetch(`/api/runs/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setRun(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRun();
    // Poll if running
    const interval = setInterval(() => {
      if (run?.status === "running" || run?.status === "pending") {
        fetchRun();
      }
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, run?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Run not found</p>
      </div>
    );
  }

  const summary = run.summary ? JSON.parse(run.summary) : null;
  const config = run.config ? JSON.parse(run.config) : null;

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "completed":
      case "received":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "error":
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
      case "sending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const exportBundle = () => {
    const bundle = {
      run: {
        id: run.id,
        name: run.name,
        app: run.app.name,
        adapter: run.adapterType,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        summary,
        config,
      },
      transcript: run.turns.map((t) => ({
        turn: t.turnIndex + 1,
        input: t.inputMessage,
        response: t.response,
        status: t.status,
        durationMs: t.durationMs,
        sentAt: t.sentAt,
        receivedAt: t.receivedAt,
        error: t.errorMessage,
      })),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `run-${run.id}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/runs">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{run.name}</h1>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor(run.status)}`}>
                {run.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <Link href={`/apps/${run.app.id}`} className="hover:text-violet-600 transition-colors">
                {run.app.name}
              </Link>
              {" · "}{run.adapterType} adapter · {formatDate(run.createdAt)}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportBundle}>
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Total Turns</p>
            <p className="text-2xl font-bold">{run.turns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Successful</p>
            <p className="text-2xl font-bold text-emerald-600">
              {summary?.successCount || run.turns.filter((t) => t.status === "received").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {summary?.failCount || run.turns.filter((t) => t.status === "error").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500">Avg Response Time</p>
            <p className="text-2xl font-bold">
              {summary?.avgResponseTimeMs
                ? formatDuration(summary.avgResponseTimeMs)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      {run.errorMessage && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Run Error</p>
              <p className="mt-1 text-sm text-red-700">{run.errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transcript">
        <TabsList>
          <TabsTrigger value="transcript">
            <MessageSquare className="mr-2 h-4 w-4" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="artifacts">
            <ImageIcon className="mr-2 h-4 w-4" />
            Artifacts ({run.artifacts.length})
          </TabsTrigger>
          <TabsTrigger value="config">
            <Clock className="mr-2 h-4 w-4" />
            Config & Timing
          </TabsTrigger>
        </TabsList>

        {/* Transcript */}
        <TabsContent value="transcript" className="space-y-4 mt-4">
          {run.turns.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-slate-400">
                {run.status === "pending"
                  ? "Run has not started yet."
                  : run.status === "running"
                  ? "Waiting for first response..."
                  : "No turns recorded."}
              </p>
            </Card>
          ) : (
            run.turns.map((turn) => (
              <Card key={turn.id} className={turn.status === "error" ? "border-red-200" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <StatusIcon status={turn.status} />
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                          Turn {turn.turnIndex + 1}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {turn.durationMs && (
                            <span>{formatDuration(turn.durationMs)}</span>
                          )}
                          <span className={`rounded px-1.5 py-0.5 font-medium ${statusColor(turn.status)}`}>
                            {turn.status}
                          </span>
                        </div>
                      </div>

                      {/* User message */}
                      <div className="rounded-lg bg-slate-100 p-3">
                        <p className="text-xs font-medium text-slate-500 mb-1">User</p>
                        <p className="text-sm text-slate-800">{turn.inputMessage}</p>
                      </div>

                      {/* Response */}
                      {turn.response && (
                        <div className="rounded-lg bg-violet-50 p-3">
                          <p className="text-xs font-medium text-violet-500 mb-1">AI Response</p>
                          <p className="text-sm text-slate-800">{turn.response}</p>
                        </div>
                      )}

                      {/* Error */}
                      {turn.errorMessage && (
                        <div className="rounded-lg bg-red-50 p-3">
                          <p className="text-xs font-medium text-red-500 mb-1">Error</p>
                          <p className="text-sm text-red-700">{turn.errorMessage}</p>
                        </div>
                      )}

                      {/* Screenshots */}
                      {turn.artifacts.filter((a) => a.type === "screenshot").length > 0 && (
                        <div className="flex gap-2">
                          {turn.artifacts
                            .filter((a) => a.type === "screenshot")
                            .map((art) => (
                              <a key={art.id} href={art.path} target="_blank" rel="noopener noreferrer">
                                <div className="h-16 w-24 rounded border border-slate-200 bg-slate-100 flex items-center justify-center hover:border-violet-300 transition-colors">
                                  <ImageIcon className="h-4 w-4 text-slate-400" />
                                </div>
                              </a>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Artifacts */}
        <TabsContent value="artifacts" className="mt-4">
          {run.artifacts.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-slate-400">No artifacts captured.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {run.artifacts.map((artifact) => (
                <Card key={artifact.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{artifact.filename}</p>
                        <p className="text-xs text-slate-400">{artifact.type} · {artifact.mimeType}</p>
                        <a
                          href={artifact.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex text-xs text-violet-600 hover:text-violet-700"
                        >
                          View →
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Config & Timing */}
        <TabsContent value="config" className="mt-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Run Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-300">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Timing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Created</span>
                  <span>{formatDate(run.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Started</span>
                  <span>{run.startedAt ? formatDate(run.startedAt) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed</span>
                  <span>{run.completedAt ? formatDate(run.completedAt) : "—"}</span>
                </div>
                {run.startedAt && run.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Duration</span>
                    <span className="font-medium">
                      {formatDuration(
                        new Date(run.completedAt).getTime() -
                          new Date(run.startedAt).getTime()
                      )}
                    </span>
                  </div>
                )}
                <Separator />
                {run.loginMeta && (
                  <>
                    <p className="text-xs font-medium text-slate-500">Login Metadata</p>
                    <pre className="overflow-x-auto rounded bg-slate-100 p-2 text-xs text-slate-600">
                      {JSON.stringify(JSON.parse(run.loginMeta), null, 2)}
                    </pre>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
