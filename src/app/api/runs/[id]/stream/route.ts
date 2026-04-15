import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const run = await prisma.run.findUnique({
    where: { id: params.id },
    include: {
      turns: {
        orderBy: { turnIndex: "asc" },
        include: { artifacts: true },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send current state
      send({
        type: "init",
        run: {
          id: run.id,
          status: run.status,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          summary: run.summary ? JSON.parse(run.summary) : null,
          errorMessage: run.errorMessage,
        },
        turns: run.turns,
      });

      // Poll for updates if running
      if (run.status === "running" || run.status === "pending") {
        let lastTurnCount = run.turns.length;
        let attempts = 0;
        const maxAttempts = 300; // 5 minutes at 1s intervals

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;

          const updated = await prisma.run.findUnique({
            where: { id: params.id },
            include: {
              turns: {
                orderBy: { turnIndex: "asc" },
                include: { artifacts: true },
              },
            },
          });

          if (!updated) break;

          // Send new turns
          if (updated.turns.length > lastTurnCount) {
            const newTurns = updated.turns.slice(lastTurnCount);
            for (const turn of newTurns) {
              send({ type: "turn", turn });
            }
            lastTurnCount = updated.turns.length;
          } else if (updated.turns.length === lastTurnCount && updated.turns.length > 0) {
            // Check if last turn was updated
            const lastTurn = updated.turns[updated.turns.length - 1];
            send({ type: "turn_update", turn: lastTurn });
          }

          // Send status update
          send({
            type: "status",
            status: updated.status,
            summary: updated.summary ? JSON.parse(updated.summary) : null,
            errorMessage: updated.errorMessage,
          });

          if (
            updated.status === "completed" ||
            updated.status === "failed" ||
            updated.status === "cancelled"
          ) {
            send({ type: "done", status: updated.status });
            break;
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
