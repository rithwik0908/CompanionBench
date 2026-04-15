import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const run = await prisma.run.findUnique({
    where: { id: params.id },
    include: {
      app: true,
      turns: { orderBy: { turnIndex: "asc" }, include: { artifacts: true } },
      artifacts: true,
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.run.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
