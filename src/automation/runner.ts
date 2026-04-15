import { prisma } from "@/lib/db";
import type {
  RunConfig,
  RunProgress,
  TurnResult,
  PlatformAdapter,
} from "./types";
import { MockAdapter } from "./adapters/mock";
import { CharacterAIAdapter } from "./adapters/character-ai";
import * as fs from "fs/promises";
import * as path from "path";

type ProgressCallback = (progress: RunProgress) => void;

function getAdapter(adapterType: string): PlatformAdapter {
  switch (adapterType) {
    case "mock":
      return new MockAdapter();
    case "character-ai":
      return new CharacterAIAdapter();
    default:
      throw new Error(`Unknown adapter type: ${adapterType}`);
  }
}

export async function executeRun(
  config: RunConfig,
  onProgress?: ProgressCallback
): Promise<void> {
  const adapter = getAdapter(config.adapterType);
  const artifactsDir = path.join(
    process.cwd(),
    "public",
    "artifacts",
    config.runId
  );
  await fs.mkdir(artifactsDir, { recursive: true });

  const adapterConfig = {
    ...config.adapterConfig,
    artifactsDir,
  };

  try {
    // Update run to running
    await prisma.run.update({
      where: { id: config.runId },
      data: { status: "running", startedAt: new Date() },
    });

    onProgress?.({
      runId: config.runId,
      status: "running",
      currentTurn: 0,
      totalTurns: config.messages.length,
    });

    // Initialize adapter
    await adapter.initialize(adapterConfig);

    // Login if credentials provided
    if (config.credentials) {
      const loginResult = await adapter.login(config.credentials);
      if (!loginResult.success) {
        throw new Error(`Login failed: ${loginResult.error}`);
      }
      await prisma.run.update({
        where: { id: config.runId },
        data: {
          loginMeta: JSON.stringify({
            method: config.credentials.method,
            ...loginResult.sessionInfo,
          }),
        },
      });
    }

    // Open conversation
    if (config.conversationTarget) {
      await adapter.openConversation(config.conversationTarget);
    }

    // Create all turns upfront
    const turns = await Promise.all(
      config.messages.map((msg, idx) =>
        prisma.messageTurn.create({
          data: {
            runId: config.runId,
            turnIndex: idx,
            inputMessage: msg,
            status: "pending",
          },
        })
      )
    );

    let successCount = 0;
    let failCount = 0;
    let totalResponseTime = 0;

    // Execute turns sequentially
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const sentAt = new Date();

      try {
        // Update turn status
        await prisma.messageTurn.update({
          where: { id: turn.id },
          data: { status: "sending", sentAt },
        });

        // Send message
        await adapter.sendMessage(config.messages[i]);

        // Wait for and extract response
        const response = await adapter.waitForResponse(
          adapterConfig.responseTimeoutMs
        );
        const receivedAt = new Date();
        const durationMs = receivedAt.getTime() - sentAt.getTime();

        // Capture screenshot if enabled
        let screenshotPath: string | undefined;
        if (adapterConfig.captureScreenshots) {
          try {
            const screenshotBuffer = await adapter.captureScreenshot(
              `turn-${i}`
            );
            const filename = `turn-${i}-screenshot.png`;
            const filepath = path.join(artifactsDir, filename);
            await fs.writeFile(filepath, screenshotBuffer);
            screenshotPath = `/artifacts/${config.runId}/${filename}`;

            await prisma.artifact.create({
              data: {
                runId: config.runId,
                turnId: turn.id,
                type: "screenshot",
                filename,
                path: screenshotPath,
                mimeType: "image/png",
                sizeBytes: screenshotBuffer.length,
              },
            });
          } catch {
            // Screenshot failure is non-fatal
          }
        }

        // Update turn with response
        await prisma.messageTurn.update({
          where: { id: turn.id },
          data: {
            response,
            status: "received",
            receivedAt,
            durationMs,
          },
        });

        successCount++;
        totalResponseTime += durationMs;

        const turnResult: TurnResult = {
          turnIndex: i,
          inputMessage: config.messages[i],
          response,
          status: "received",
          sentAt,
          receivedAt,
          durationMs,
          screenshotPath,
        };

        onProgress?.({
          runId: config.runId,
          status: "running",
          currentTurn: i + 1,
          totalTurns: turns.length,
          lastTurnResult: turnResult,
        });

        // Delay between messages
        if (i < turns.length - 1 && adapterConfig.delayBetweenMessages > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, adapterConfig.delayBetweenMessages)
          );
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        failCount++;

        await prisma.messageTurn.update({
          where: { id: turn.id },
          data: {
            status: "error",
            errorMessage: errorMsg,
          },
        });

        onProgress?.({
          runId: config.runId,
          status: "running",
          currentTurn: i + 1,
          totalTurns: turns.length,
          lastTurnResult: {
            turnIndex: i,
            inputMessage: config.messages[i],
            response: null,
            status: "error",
            errorMessage: errorMsg,
            sentAt,
          },
        });
      }
    }

    // Finalize run
    const summary = {
      totalTurns: turns.length,
      successCount,
      failCount,
      avgResponseTimeMs:
        successCount > 0 ? Math.round(totalResponseTime / successCount) : 0,
    };

    await prisma.run.update({
      where: { id: config.runId },
      data: {
        status: failCount === turns.length ? "failed" : "completed",
        completedAt: new Date(),
        summary: JSON.stringify(summary),
      },
    });

    onProgress?.({
      runId: config.runId,
      status: failCount === turns.length ? "failed" : "completed",
      currentTurn: turns.length,
      totalTurns: turns.length,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.run.update({
      where: { id: config.runId },
      data: {
        status: "failed",
        errorMessage: errorMsg,
        completedAt: new Date(),
      },
    });

    onProgress?.({
      runId: config.runId,
      status: "failed",
      currentTurn: 0,
      totalTurns: config.messages.length,
      error: errorMsg,
    });
  } finally {
    await adapter.cleanup();
  }
}
