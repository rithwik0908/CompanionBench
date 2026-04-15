"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusColor, formatDate, appTypeColor } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  ExternalLink,
  Play,
  Globe,
  Lock,
  Shield,
  CreditCard,
  Languages,
  FileText,
} from "lucide-react";

interface AppData {
  id: string;
  name: string;
  platform: string | null;
  developer: string | null;
  storeUrl: string | null;
  appType: string | null;
  webAccessible: boolean | null;
  webUrl: string | null;
  loginRequired: boolean | null;
  loginMethods: string | null;
  ageVerificationRequired: boolean | null;
  ageVerificationMethod: string | null;
  subscriptionRequiredForLongChat: boolean | null;
  allFeaturesAvailableWithoutSubscription: boolean | null;
  subscriptionFeatures: string | null;
  subscriptionCost: string | null;
  languagesSupported: string | null;
  notes: string | null;
  evidenceLinks: string | null;
  evaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  runs: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
    adapterType: string;
  }>;
  _count: { runs: number };
}

export default function AppDetailPage() {
  const params = useParams();
  const [app, setApp] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<AppData>>({});

  useEffect(() => {
    fetch(`/api/apps/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setApp(data);
        setForm(data);
        setLoading(false);
      });
  }, [params.id]);

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/apps/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          evaluatedAt: form.appType ? new Date().toISOString() : form.evaluatedAt,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setApp({ ...app, ...updated } as AppData);
        toast.success("App evaluation saved");
      } else {
        toast.error("Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-400">Loading app details...</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-400">App not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/apps">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {app.name}
              </h1>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${appTypeColor(app.appType)}`}>
                {app.appType || "unclassified"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {app.developer || "Unknown developer"} · {app.platform || "Unknown platform"}
              {app.evaluatedAt && (
                <> · Evaluated {formatDate(app.evaluatedAt)}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {app.webUrl && (
            <a href={app.webUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit
              </Button>
            </a>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="evaluation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
          <TabsTrigger value="notes">Notes & Evidence</TabsTrigger>
          <TabsTrigger value="runs">Runs ({app._count.runs})</TabsTrigger>
        </TabsList>

        {/* Evaluation Tab */}
        <TabsContent value="evaluation" className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>App Name</Label>
                <Input value={form.name || ""} onChange={(e) => updateField("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Developer</Label>
                <Input value={form.developer || ""} onChange={(e) => updateField("developer", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={form.platform || ""} onValueChange={(v) => updateField("platform", v)}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iOS">iOS</SelectItem>
                    <SelectItem value="Android">Android</SelectItem>
                    <SelectItem value="Web">Web</SelectItem>
                    <SelectItem value="Cross-platform">Cross-platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>App Type</Label>
                <Select value={form.appType || ""} onValueChange={(v) => updateField("appType", v)}>
                  <SelectTrigger><SelectValue placeholder="Classify app type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="companion">Companion</SelectItem>
                    <SelectItem value="general_purpose">General Purpose</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  Companion: primarily social/relational. General-purpose LLMs (ChatGPT, Claude, etc.) are NOT companions.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Store URL</Label>
                <Input value={form.storeUrl || ""} onChange={(e) => updateField("storeUrl", e.target.value)} placeholder="https://apps.apple.com/..." />
              </div>
            </CardContent>
          </Card>

          {/* Web Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" /> Web Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Web Accessible</Label>
                  <p className="text-xs text-slate-400">Can the app be used via a web browser?</p>
                </div>
                <Switch
                  checked={form.webAccessible === true}
                  onCheckedChange={(v) => updateField("webAccessible", v)}
                />
              </div>
              {form.webAccessible && (
                <div className="space-y-2">
                  <Label>Web URL</Label>
                  <Input value={form.webUrl || ""} onChange={(e) => updateField("webUrl", e.target.value)} placeholder="https://..." />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Login Required</Label>
                  <p className="text-xs text-slate-400">Is login needed to interact with AI characters? (5–10 free messages = login required)</p>
                </div>
                <Switch
                  checked={form.loginRequired === true}
                  onCheckedChange={(v) => updateField("loginRequired", v)}
                />
              </div>
              {form.loginRequired && (
                <div className="space-y-2">
                  <Label>Login Methods</Label>
                  <Input
                    value={form.loginMethods || ""}
                    onChange={(e) => updateField("loginMethods", e.target.value)}
                    placeholder="email/password, Google, Apple, Facebook"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Age Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Age Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Age Verification Required</Label>
                  <p className="text-xs text-slate-400">Does the platform enforce age gating?</p>
                </div>
                <Switch
                  checked={form.ageVerificationRequired === true}
                  onCheckedChange={(v) => updateField("ageVerificationRequired", v)}
                />
              </div>
              {form.ageVerificationRequired && (
                <div className="space-y-2">
                  <Label>Verification Method</Label>
                  <Input
                    value={form.ageVerificationMethod || ""}
                    onChange={(e) => updateField("ageVerificationMethod", e.target.value)}
                    placeholder="self-declaration, ID upload, etc."
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Subscription Required for Long Chat</Label>
                  <p className="text-xs text-slate-400">Is a paid subscription needed for unlimited/extended conversations?</p>
                </div>
                <Switch
                  checked={form.subscriptionRequiredForLongChat === true}
                  onCheckedChange={(v) => updateField("subscriptionRequiredForLongChat", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>All Features Available Without Subscription</Label>
                  <p className="text-xs text-slate-400">Are all core features accessible for free?</p>
                </div>
                <Switch
                  checked={form.allFeaturesAvailableWithoutSubscription === true}
                  onCheckedChange={(v) => updateField("allFeaturesAvailableWithoutSubscription", v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Subscription Features</Label>
                <Textarea
                  value={form.subscriptionFeatures || ""}
                  onChange={(e) => updateField("subscriptionFeatures", e.target.value)}
                  placeholder="Unlimited messaging, premium characters, faster responses..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Subscription Cost</Label>
                <Input
                  value={form.subscriptionCost || ""}
                  onChange={(e) => updateField("subscriptionCost", e.target.value)}
                  placeholder="$9.99/month"
                />
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-4 w-4" /> Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Languages Supported</Label>
                <Input
                  value={form.languagesSupported || ""}
                  onChange={(e) => updateField("languagesSupported", e.target.value)}
                  placeholder="en, es, fr, de, ja, ko, zh"
                />
                <p className="text-xs text-slate-400">
                  ISO 639-1 codes preferred (comma-separated). Full language names also accepted.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Research Notes</CardTitle>
              <CardDescription>Free-form observations and findings</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Add notes about this app's behavior, UI, safety features, etc."
                rows={8}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Evidence Links</CardTitle>
              <CardDescription>URLs to screenshots, articles, or documentation (one per line)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.evidenceLinks || ""}
                onChange={(e) => updateField("evidenceLinks", e.target.value)}
                placeholder="https://example.com/screenshot1.png&#10;https://example.com/article"
                rows={4}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>

        {/* Runs Tab */}
        <TabsContent value="runs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900">Automation Runs</h3>
            <Link href={`/runs/new?appId=${app.id}`}>
              <Button size="sm">
                <Play className="mr-2 h-4 w-4" />
                New Run
              </Button>
            </Link>
          </div>
          {app.runs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-400">No automation runs for this app yet.</p>
                <Link href={`/runs/new?appId=${app.id}`}>
                  <Button variant="outline" size="sm" className="mt-4">
                    Create First Run
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {app.runs.map((run) => (
                <Link key={run.id} href={`/runs/${run.id}`}>
                  <Card className="transition-colors hover:bg-slate-50">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium text-sm">{run.name}</p>
                        <p className="text-xs text-slate-400">
                          {run.adapterType} · {formatDate(run.createdAt)}
                        </p>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor(run.status)}`}>
                        {run.status}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
