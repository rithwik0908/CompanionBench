import { NextRequest, NextResponse } from "next/server";
import { getLogger } from "@/automation/logger";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * GET /api/runs/[id]/logs
 * Returns structured run logs — from memory if active, from disk if completed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check in-memory logger first (for active runs)
  const activeLogger = getLogger(params.id);
  if (activeLogger) {
    return NextResponse.json({
      source: "live",
      entries: activeLogger.getEntries(),
    });
  }

  // Fall back to disk-persisted log file
  const logPath = path.join(
    process.cwd(),
    "public",
    "artifacts",
    params.id,
    "run-log.json"
  );

  try {
    const content = await fs.readFile(logPath, "utf-8");
    return NextResponse.json({
      source: "disk",
      entries: JSON.parse(content),
    });
  } catch {
    return NextResponse.json({
      source: "none",
      entries: [],
    });
  }
}
