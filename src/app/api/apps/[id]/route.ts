import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const app = await prisma.app.findUnique({
    where: { id: params.id },
    include: {
      runs: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { runs: true } },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return NextResponse.json(app);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const app = await prisma.app.update({
    where: { id: params.id },
    data: { ...body, updatedAt: new Date() },
  });
  return NextResponse.json(app);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.app.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
