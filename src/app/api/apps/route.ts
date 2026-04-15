import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const appType = searchParams.get("appType");
  const webAccessible = searchParams.get("webAccessible");
  const loginRequired = searchParams.get("loginRequired");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (appType && appType !== "all") where.appType = appType;
  if (webAccessible === "true") where.webAccessible = true;
  if (webAccessible === "false") where.webAccessible = false;
  if (loginRequired === "true") where.loginRequired = true;
  if (loginRequired === "false") where.loginRequired = false;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { developer: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  const apps = await prisma.app.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { runs: true } } },
  });

  return NextResponse.json(apps);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const app = await prisma.app.create({ data: body });
  return NextResponse.json(app, { status: 201 });
}
