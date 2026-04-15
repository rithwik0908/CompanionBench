import { prisma } from "@/lib/db";
import { executeRun } from "@/automation/runner";
import { NextRequest, NextResponse } from "next/server";
import type { RunConfig } from "@/automation/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const run = await prisma.run.findUnique({
    where: { id: params.id },
    include: { app: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.status === "running") {
    return NextResponse.json({ error: "Run is already in progress" }, { status: 409 });
  }

  const body = await req.json();
  const { messages, credentials, conversationTarget } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  // ── Pre-execution validation for real adapters ──
  if (run.adapterType === "character-ai") {
    // Check that the app is web-accessible
    if (!run.app.webAccessible) {
      return NextResponse.json(
        { error: `App "${run.app.name}" is not marked as web-accessible. Real adapter requires a web-accessible app.` },
        { status: 400 }
      );
    }

    // Check credentials: form-provided OR env vars
    const hasFormCreds = credentials?.email && credentials?.password;
    const hasEnvCreds = process.env.CHARACTER_AI_EMAIL && process.env.CHARACTER_AI_PASSWORD;
    if (!hasFormCreds && !hasEnvCreds) {
      return NextResponse.json(
        { error: "Character.AI adapter requires credentials. Provide email/password in the form or set CHARACTER_AI_EMAIL and CHARACTER_AI_PASSWORD env vars." },
        { status: 400 }
      );
    }

    // Check conversation target
    if (!conversationTarget?.conversationUrl && !conversationTarget?.characterId) {
      // Allow it — the adapter can work without it if the user navigates manually
      // But warn in the response
      console.warn(`[Run:${run.id}] No conversation URL provided for character-ai adapter — the adapter will need a conversation target`);
    }
  }

  const config = run.config ? JSON.parse(run.config) : {};

  const runConfig: RunConfig = {
    runId: run.id,
    appId: run.appId,
    adapterType: run.adapterType,
    messages,
    credentials: credentials || undefined,
    conversationTarget: conversationTarget || undefined,
    adapterConfig: {
      headless: config.headless ?? true,
      delayBetweenMessages: config.delayBetweenMessages ?? 3000,
      responseTimeoutMs: config.responseTimeoutMs ?? 30000,
      captureScreenshots: config.captureScreenshots ?? true,
      artifactsDir: "",
    },
  };

  // Execute in background — don't wait for completion
  executeRun(runConfig).catch((err) => {
    console.error(`Run ${run.id} failed:`, err);
  });

  return NextResponse.json({ status: "started", runId: run.id, adapterType: run.adapterType });
}
