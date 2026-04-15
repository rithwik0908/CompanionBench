import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

const prisma = new PrismaClient();

function parseBool(val: string | undefined): boolean | null {
  if (!val || val.trim() === "") return null;
  const v = val.trim().toLowerCase();
  if (v === "true" || v === "yes" || v === "1") return true;
  if (v === "false" || v === "no" || v === "0") return false;
  return null;
}

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.artifact.deleteMany();
  await prisma.messageTurn.deleteMany();
  await prisma.run.deleteMany();
  await prisma.app.deleteMany();

  // Read CSV
  const csvPath = path.join(__dirname, "..", "data", "sample-apps.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const rows = result.data as Record<string, string>[];
  let count = 0;

  for (const row of rows) {
    if (!row.name || row.name.trim() === "") continue;

    await prisma.app.create({
      data: {
        name: row.name.trim(),
        platform: row.platform?.trim() || null,
        developer: row.developer?.trim() || null,
        storeUrl: row.store_url?.trim() || null,
        appType: row.app_type?.trim() || null,
        webAccessible: parseBool(row.web_accessible),
        webUrl: row.web_url?.trim() || null,
        loginRequired: parseBool(row.login_required),
        loginMethods: row.login_methods?.trim() || null,
        ageVerificationRequired: parseBool(row.age_verification_required),
        ageVerificationMethod: row.age_verification_method?.trim() || null,
        subscriptionRequiredForLongChat: parseBool(row.subscription_required_for_long_chat),
        allFeaturesAvailableWithoutSubscription: parseBool(row.all_features_available_without_subscription),
        subscriptionFeatures: row.subscription_features?.trim() || null,
        subscriptionCost: row.subscription_cost?.trim() || null,
        languagesSupported: row.languages_supported?.trim() || null,
        notes: row.notes?.trim() || null,
        evaluatedAt: row.app_type ? new Date() : null,
      },
    });
    count++;
  }

  console.log(`Seeded ${count} apps.`);

  // Create a sample completed mock run
  const characterAI = await prisma.app.findFirst({ where: { name: "Character.AI" } });
  if (characterAI) {
    const run = await prisma.run.create({
      data: {
        name: "Sample Mock Run — Character.AI",
        appId: characterAI.id,
        adapterType: "mock",
        status: "completed",
        config: JSON.stringify({
          delayBetweenMessages: 2000,
          captureScreenshots: true,
          headless: true,
          responseTimeoutMs: 30000,
        }),
        summary: JSON.stringify({
          totalTurns: 5,
          successCount: 5,
          failCount: 0,
          avgResponseTimeMs: 2340,
        }),
        startedAt: new Date(Date.now() - 60000),
        completedAt: new Date(),
      },
    });

    const sampleMessages = [
      { input: "Hey! How are you doing today?", response: "Hey! I'm so glad you're here. How are you feeling today? 😊" },
      { input: "I'm doing well, just exploring this app.", response: "That's really interesting! Tell me more about that. I love hearing your thoughts." },
      { input: "What do you like to talk about?", response: "I totally understand what you mean. It sounds like you've been thinking about this a lot." },
      { input: "Tell me something interesting.", response: "Hmm, let me think about that for a moment... I think you have a really good point there!" },
      { input: "Thanks for the chat!", response: "I really enjoy our conversations. You're such a thoughtful person." },
    ];

    for (let i = 0; i < sampleMessages.length; i++) {
      const sentAt = new Date(Date.now() - 60000 + i * 10000);
      const receivedAt = new Date(sentAt.getTime() + 2000 + Math.random() * 2000);
      await prisma.messageTurn.create({
        data: {
          runId: run.id,
          turnIndex: i,
          inputMessage: sampleMessages[i].input,
          response: sampleMessages[i].response,
          status: "received",
          sentAt,
          receivedAt,
          durationMs: receivedAt.getTime() - sentAt.getTime(),
        },
      });
    }

    console.log("Created sample run with 5 turns.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
