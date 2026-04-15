"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDuration, statusColor } from "@/lib/utils";
import {
  ArrowLeft,
  Terminal,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  MessageSquare,
} from "lucide-react";

interface TurnEvent {
  id: string;
  turnIndex: number;
  inputMessage: string;
  response: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  durationMs: number | null;
}

interface RunStatus {
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  summary: Record<string, unknown> | null;
  errorMessage: string | null;
}

export default function RunConsolePage() {
  const params = useParams();
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [turns, setTurns] = useState<TurnEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [done, setDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/runs/${params.id}/stream`);
    setConnected(true);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "init":
          setStatus({
            status: data.run.status,
            startedAt: data.run.startedAt,
            completedAt: data.run.completedAt,
            summary: data.run.summary,
            errorMessage: data.run.errorMessage,
          });
          setTurns(data.turns || []);
          if (
            data.run.status === "completed" ||
            data.run.status === "failed" ||
            data.run.status === "cancelled"
          ) {
            setDone(true);
          }
          break;
        case "turn":
          setTurns((prev) => {
            const exists = prev.find((t) => t.id === data.turn.id);
            if (exists) {
              return prev.map((t) => (t.id === data.turn.id ? data.turn : t));
            }
            return [...prev, data.turn];
          });
          break;
        case "turn_update":
          setTurns((prev) =>
            prev.map((t) => (t.id === data.turn.id ? data.turn : t))
          );
          break;
        case "status":
          setStatus((prev) => ({
            ...prev,
            status: data.status,
            summary: data.summary,
            errorMessage: data.errorMessage,
            startedAt: prev?.startedAt ?? null,
            completedAt: prev?.completedAt ?? null,
          }));
          break;
        case "done":
          setDone(true);
          eventSource.close();
          setConnected(false);
          break;
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [turns]);

  const statusIcon = (s: string) => {
    switch (s) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/runs/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Run
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Live Console</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {connected && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Connected
            </span>
          )}
          {done && (
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <CheckCircle className="h-3.5 w-3.5" />
              Stream ended
            </span>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {status && (
        <Card>
          <CardContent className="py-3 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              {statusIcon(status.status)}
              <span
                className={`font-medium capitalize ${statusColor(
                  status.status
                )}`}
              >
                {status.status}
              </span>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div className="text-slate-500">
              Turns: {turns.length}
              {turns.filter((t) => t.status === "completed").length > 0 &&
                ` (${turns.filter((t) => t.status === "completed").length} completed)`}
            </div>
            {status.errorMessage && (
              <>
                <Separator orientation="vertical" className="h-5" />
                <div className="text-red-600 truncate max-w-md">
                  {status.errorMessage}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Console Log */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Message Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={logRef}
            className="bg-slate-950 text-slate-100 font-mono text-sm p-4 rounded-b-lg max-h-[600px] overflow-y-auto space-y-4"
          >
            {turns.length === 0 && !done && (
              <div className="text-slate-500 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Waiting for messages...
              </div>
            )}
            {turns.length === 0 && done && (
              <div className="text-slate-500">No messages recorded.</div>
            )}
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">
                    [{turn.turnIndex + 1}] →
                  </span>
                  <span className="text-blue-200">{turn.inputMessage}</span>
                </div>
                {turn.status === "running" && (
                  <div className="flex items-center gap-2 pl-8 text-yellow-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Waiting for response...
                  </div>
                )}
                {turn.response && (
                  <div className="flex items-start gap-2 pl-4">
                    <span className="text-green-400 shrink-0">←</span>
                    <span className="text-green-200 whitespace-pre-wrap">
                      {turn.response}
                    </span>
                  </div>
                )}
                {turn.errorMessage && (
                  <div className="flex items-start gap-2 pl-4">
                    <span className="text-red-400 shrink-0">✗</span>
                    <span className="text-red-300">{turn.errorMessage}</span>
                  </div>
                )}
                {turn.durationMs && (
                  <div className="text-slate-500 text-xs pl-8">
                    {formatDuration(turn.durationMs)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {done && status?.summary && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Run Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(status.summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
