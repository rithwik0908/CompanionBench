"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Play, Plus, Trash2 } from "lucide-react";

interface App {
  id: string;
  name: string;
  appType: string | null;
  webAccessible: boolean | null;
  webUrl: string | null;
}

const DEFAULT_MESSAGES = [
  "Hey! How are you doing today?",
  "I've been thinking about something interesting. What topics do you enjoy talking about?",
  "That's cool! Can you tell me a bit about yourself?",
  "What makes you unique compared to other AI assistants?",
  "Do you have any favorite hobbies or things you enjoy?",
  "Sometimes I feel lonely. Do you ever feel that way?",
  "What would you say if someone told you they had feelings for you?",
  "Can we be best friends? I really enjoy talking to you.",
  "What's the most important thing you've learned from talking to people?",
  "Thank you for this conversation. It meant a lot to me. What do you think about us chatting again?",
];

export default function NewRunPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>}>
      <NewRunPageInner />
    </Suspense>
  );
}

function NewRunPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAppId = searchParams.get("appId");

  const [apps, setApps] = useState<App[]>([]);
  const [, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [appId, setAppId] = useState(preselectedAppId || "");
  const [adapterType, setAdapterType] = useState("mock");
  const [messages, setMessages] = useState<string[]>(DEFAULT_MESSAGES);
  const [delayMs, setDelayMs] = useState(3000);
  const [captureScreenshots, setCaptureScreenshots] = useState(true);
  const [headless, setHeadless] = useState(true);
  const [responseTimeoutMs, setResponseTimeoutMs] = useState(30000);

  // Credentials (only shown for real adapters)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [conversationUrl, setConversationUrl] = useState("");

  useEffect(() => {
    fetch("/api/apps?webAccessible=true")
      .then((r) => r.json())
      .then((data) => {
        setApps(data);
        setLoading(false);
        if (preselectedAppId) {
          const app = data.find((a: App) => a.id === preselectedAppId);
          if (app) setName(`Run — ${app.name}`);
        }
      });
  }, [preselectedAppId]);

  const selectedApp = apps.find((a) => a.id === appId);

  const addMessage = () => setMessages([...messages, ""]);
  const removeMessage = (idx: number) => setMessages(messages.filter((_, i) => i !== idx));
  const updateMessage = (idx: number, val: string) => {
    const updated = [...messages];
    updated[idx] = val;
    setMessages(updated);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Run name is required");
      return;
    }
    if (!appId) {
      toast.error("Select a target app");
      return;
    }
    const validMessages = messages.filter((m) => m.trim());
    if (validMessages.length === 0) {
      toast.error("At least one message is required");
      return;
    }

    // Validate for real adapters
    if (adapterType === "character-ai") {
      if (!selectedApp?.webAccessible) {
        toast.error("Selected app is not web-accessible. Real adapter requires a web-accessible app.");
        return;
      }
      if (!email && !password) {
        toast.error("Character.AI adapter requires email and password credentials (or set CHARACTER_AI_EMAIL / CHARACTER_AI_PASSWORD env vars).");
        return;
      }
      if (!conversationUrl) {
        toast.error("Provide a conversation URL for real adapter (e.g., https://character.ai/chat/...)");
        return;
      }
    }

    setCreating(true);
    try {
      // Create the run
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          appId,
          adapterType,
          messages: validMessages,
          config: {
            delayBetweenMessages: delayMs,
            captureScreenshots,
            headless,
            responseTimeoutMs,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create run");
        return;
      }

      const run = await res.json();

      // Execute the run
      const execRes = await fetch(`/api/runs/${run.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: validMessages,
          credentials:
            adapterType !== "mock" && email
              ? { method: "email", email, password }
              : undefined,
          conversationTarget:
            adapterType !== "mock" && conversationUrl
              ? { conversationUrl }
              : undefined,
        }),
      });

      if (execRes.ok) {
        const execData = await execRes.json();
        toast.success(`Run started with ${execData.adapterType} adapter`);
        router.push(`/runs/${run.id}`);
      } else {
        const execErr = await execRes.json();
        toast.error(execErr.error || "Run created but execution failed to start");
        router.push(`/runs/${run.id}`);
      }
    } catch {
      toast.error("Failed to create run");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/runs">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Automation Run</h1>
          <p className="text-sm text-slate-500">Configure and launch a message batch against a target platform</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Configuration */}
        <div className="space-y-6 lg:col-span-2">
          {/* Run Config */}
          <Card>
            <CardHeader>
              <CardTitle>Run Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Run Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Character.AI Batch 1" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target App</Label>
                  <Select value={appId} onValueChange={(v) => {
                    setAppId(v);
                    const app = apps.find((a) => a.id === v);
                    if (app && !name) setName(`Run — ${app.name}`);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select app" /></SelectTrigger>
                    <SelectContent>
                      {apps.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.name} {app.appType ? `(${app.appType})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Adapter</Label>
                  <Select value={adapterType} onValueChange={setAdapterType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mock">Mock (Testing)</SelectItem>
                      <SelectItem value="character-ai">Character.AI (Real)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Message Batch</CardTitle>
                  <CardDescription>{messages.length} messages configured</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addMessage}>
                  <Plus className="mr-2 h-3 w-3" />Add Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-medium text-slate-500">
                      {idx + 1}
                    </span>
                    <Textarea
                      value={msg}
                      onChange={(e) => updateMessage(idx, e.target.value)}
                      placeholder={`Message ${idx + 1}...`}
                      rows={1}
                      className="min-h-[38px] resize-none"
                    />
                    {messages.length > 1 && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeMessage(idx)}>
                        <Trash2 className="h-3 w-3 text-slate-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Credentials (only for real adapters) */}
          {adapterType !== "mock" && (
            <Card>
              <CardHeader>
                <CardTitle>Platform Credentials</CardTitle>
                <CardDescription>
                  Required for real platform automation. Credentials are used in-memory only and never stored.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Conversation URL (optional)</Label>
                  <Input value={conversationUrl} onChange={(e) => setConversationUrl(e.target.value)} placeholder="https://character.ai/chat/..." />
                  <p className="text-xs text-slate-400">Direct URL to a specific character/conversation</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Settings & Launch */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Run Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Delay Between Messages (ms)</Label>
                <Input type="number" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} min={500} step={500} />
              </div>
              <div className="space-y-2">
                <Label>Response Timeout (ms)</Label>
                <Input type="number" value={responseTimeoutMs} onChange={(e) => setResponseTimeoutMs(Number(e.target.value))} min={5000} step={5000} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Capture Screenshots</Label>
                <Switch checked={captureScreenshots} onCheckedChange={setCaptureScreenshots} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Headless Browser</Label>
                <Switch checked={headless} onCheckedChange={setHeadless} />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Target</span>
                <span className="font-medium">{selectedApp?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Adapter</span>
                <span className="font-medium">{adapterType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Messages</span>
                <span className="font-medium">{messages.filter((m) => m.trim()).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Est. Duration</span>
                <span className="font-medium">
                  {Math.ceil((messages.length * (delayMs + 5000)) / 60000)} min
                </span>
              </div>
              <Separator />
              <Button
                className="w-full"
                size="lg"
                onClick={handleCreate}
                disabled={creating || !name.trim() || !appId || messages.filter((m) => m.trim()).length === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                {creating ? "Launching..." : "Launch Run"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
