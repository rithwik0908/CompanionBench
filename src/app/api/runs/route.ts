import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const runs = await prisma.run.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      app: { select: { id: true, name: true, appType: true } },
      _count: { select: { turns: true, artifacts: true } },
    },
  });
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, appId, adapterType, messages, config } = body;

  if (!name || !appId || !adapterType || !messages?.length) {
    return NextResponse.json(
      { error: "Missing required fields: name, appId, adapterType, messages" },
      { status: 400 }
    );
  }

  const run = await prisma.run.create({
    data: {
      name,
      appId,
      adapterType,
      status: "pending",
      config: JSON.stringify(config || {
        delayBetweenMessages: 3000,
        captureScreenshots: true,
        headless: true,
        responseTimeoutMs: 30000,
      }),
    },
    include: { app: true },
  });

  return NextResponse.json(run, { status: 201 });
}
