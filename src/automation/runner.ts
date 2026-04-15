import { prisma } from "@/lib/db";
import type {
  RunConfig,
  RunProgress,
  TurnResult,
  PlatformAdapter,
} from "./types";
import { MockAdapter } from "./adapters/mock";
import { CharacterAIAdapter } from "./adapters/character-ai";
import { RunLogger, registerLogger, removeLogger } from "./logger";
import * as fs from "fs/promises";
import * as path from "path";

type ProgressCallback = (progress: RunProgress) => void;

/**
 * Instantiate the correct adapter based on adapterType.
 * No fallback — if an unknown type is passed, it throws.
 */
function getAdapter(adapterType: string, logger: RunLogger): PlatformAdapter {
  logger.info("adapter", `Instantiating adapter: ${adapterType}`);

  switch (adapterType) {
    case "mock":
      return new MockAdapter();
    case "character-ai": {
      const adapter = new CharacterAIAdapter();
      adapter.setLogger(logger);
      return adapter;
    }
    default:
      throw new Error(`Unknown adapter type: "${adapterType}". Valid types: mock, character-ai`);
  }
}

export async function executeRun(
  config: RunConfig,
  onProgress?: ProgressCallback
): Promise<void> {
  const logger = new RunLogger(config.runId, config.adapterType);
  registerLogger(logger);

  logger.info("run", "Starting execution", {
    runId: config.runId,
    appId: config.appId,
    adapterType: config.adapterType,
    messageCount: config.messages.length,
    hasCredentials: !!config.credentials,
    hasConversationTarget: !!config.conversationTarget,
  });

  const adapter = getAdapter(config.adapterType, logger);
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
    logger.info("run", "Initializing adapter");
    await adapter.initialize(adapterConfig);
    logger.info("run", "Adapter initialized");

    // Login if credentials provided (or env vars for real adapters)
    if (config.credentials || config.adapterType !== "mock") {
      const creds = config.credentials || { method: "email" };
      logger.info("run", "Starting login");
      const loginResult = await adapter.login(creds);
      if (!loginResult.success) {
        throw new Error(`Login failed: ${loginResult.error}`);
      }
      logger.info("run", "Login successful");
      // Store only redacted login metadata — never raw passwords
      await prisma.run.update({
        where: { id: config.runId },
        data: {
          loginMeta: JSON.stringify({
            method: creds.method,
            email: creds.email ? creds.email.replace(/(.{3}).*(@.*)/, "$1***$2") : undefined,
            ...loginResult.sessionInfo,
          }),
        },
      });
    }

    // Open conversation
    if (config.conversationTarget) {
      logger.info("run", "Opening conversation", {
        url: config.conversationTarget.conversationUrl,
        characterId: config.conversationTarget.characterId,
      });
      await adapter.openConversation(config.conversationTarget);
      logger.info("run", "Conversation opened");
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
        logger.info("turn", `Turn ${i + 1}/${turns.length}: Sending`, {
          messagePreview: config.messages[i].slice(0, 80),
        });

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

        logger.info("turn", `Turn ${i + 1}: Response received (${durationMs}ms)`, {
          responsePreview: response.slice(0, 100),
        });

        // Capture screenshot if enabled
        let screenshotPath: string | undefined;
        if (adapterConfig.captureScreenshots) {
          try {
            const screenshotBuffer = await adapter.captureScreenshot(
              `turn-${i}`
            );
            // Detect format from buffer content
            const isSvg = screenshotBuffer.slice(0, 100).toString("utf-8").trimStart().startsWith("<svg");
            const ext = isSvg ? "svg" : "png";
            const mimeType = isSvg ? "image/svg+xml" : "image/png";
            const filename = `turn-${i}-screenshot.${ext}`;
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
                mimeType,
                sizeBytes: screenshotBuffer.length,
              },
            });
            logger.info("turn", `Turn ${i + 1}: Screenshot saved`, { filename });
          } catch (screenshotErr) {
            const screenshotMsg = screenshotErr instanceof Error ? screenshotErr.message : String(screenshotErr);
            logger.warn("turn", `Turn ${i + 1}: Screenshot failed (non-fatal): ${screenshotMsg}`);
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

        logger.error("turn", `Turn ${i + 1}: Failed — ${errorMsg}`);

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

        // For real adapters, abort on first failure — don't continue with broken state
        if (config.adapterType !== "mock") {
          logger.error("run", "Aborting remaining turns after failure (real adapter)");
          // Mark remaining turns as skipped
          for (let j = i + 1; j < turns.length; j++) {
            await prisma.messageTurn.update({
              where: { id: turns[j].id },
              data: { status: "error", errorMessage: "Skipped: previous turn failed" },
            });
            failCount++;
          }
          break;
        }
      }
    }

    // Finalize run
    const summary = {
      adapterType: config.adapterType,
      totalTurns: turns.length,
      successCount,
      failCount,
      avgResponseTimeMs:
        successCount > 0 ? Math.round(totalResponseTime / successCount) : 0,
    };

    const finalStatus = failCount === turns.length ? "failed" : "completed";
    logger.info("run", `Run ${finalStatus}`, summary);

    await prisma.run.update({
      where: { id: config.runId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        summary: JSON.stringify(summary),
      },
    });

    // Persist logs to a file in artifacts
    await fs.writeFile(
      path.join(artifactsDir, "run-log.json"),
      logger.serialize(),
      "utf-8"
    );

    onProgress?.({
      runId: config.runId,
      status: failCount === turns.length ? "failed" : "completed",
      currentTurn: turns.length,
      totalTurns: turns.length,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("run", `Run failed with exception: ${errorMsg}`);

    await prisma.run.update({
      where: { id: config.runId },
      data: {
        status: "failed",
        errorMessage: errorMsg,
        completedAt: new Date(),
      },
    });

    // Persist logs even on failure
    try {
      await fs.writeFile(
        path.join(artifactsDir, "run-log.json"),
        logger.serialize(),
        "utf-8"
      );
    } catch {
      // Log persistence failure is non-fatal
    }

    onProgress?.({
      runId: config.runId,
      status: "failed",
      currentTurn: 0,
      totalTurns: config.messages.length,
      error: errorMsg,
    });
  } finally {
    await adapter.cleanup();
    removeLogger(config.runId);
  }
}
