"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileUp, CheckCircle } from "lucide-react";

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/apps/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success(`Imported ${data.imported} apps`);
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/apps">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Import Apps from CSV
          </h1>
          <p className="text-sm text-slate-500">
            Upload a CSV file to add apps to the registry
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Expected columns: name, platform, developer, store_url, app_type, web_accessible,
            web_url, login_required, login_methods, age_verification_required,
            age_verification_method, subscription_required_for_long_chat,
            all_features_available_without_subscription, subscription_features,
            subscription_cost, languages_supported, notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragOver
                ? "border-violet-400 bg-violet-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {result ? (
              <div className="space-y-3">
                <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
                <div>
                  <p className="font-medium text-slate-900">
                    Imported {result.imported} of {result.total} apps
                  </p>
                  <p className="text-sm text-slate-500">from {fileName}</p>
                </div>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResult(null);
                      setFileName(null);
                    }}
                  >
                    Import Another
                  </Button>
                  <Link href="/apps">
                    <Button>View Registry</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <FileUp className="mx-auto h-10 w-10 text-slate-300" />
                <div>
                  <p className="font-medium text-slate-700">
                    {uploading ? "Uploading..." : "Drop CSV file here or click to browse"}
                  </p>
                  <p className="text-sm text-slate-400">
                    Supports standard CSV with headers
                  </p>
                </div>
                {!uploading && (
                  <Button
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sample Format */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Format Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-300">
{`name,platform,developer,app_type,web_accessible,web_url,login_required,login_methods
Character.AI,Cross-platform,Character Technologies Inc.,companion,True,https://character.ai,True,"email/password, Google"
Replika,Cross-platform,Luka Inc.,companion,True,https://replika.com,True,"email/password, Google, Apple"`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
