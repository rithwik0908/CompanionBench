import { NextResponse } from "next/server";
import { hasStorageState, AUTH_STATE_PATH } from "@/automation/adapters/character-ai";
import * as fs from "fs/promises";

/**
 * GET /api/auth/character-ai/status
 *
 * Returns whether a Character.AI storage-state file exists and its metadata.
 */
export async function GET() {
  const exists = await hasStorageState();

  if (!exists) {
    return NextResponse.json({
      authenticated: false,
      path: AUTH_STATE_PATH,
      message:
        'No saved session found. Run "npm run auth:character-ai" in your terminal to log in and save a session.',
    });
  }

  try {
    const stat = await fs.stat(AUTH_STATE_PATH);
    return NextResponse.json({
      authenticated: true,
      path: AUTH_STATE_PATH,
      lastModified: stat.mtime.toISOString(),
      sizeBytes: stat.size,
    });
  } catch {
    return NextResponse.json({
      authenticated: false,
      path: AUTH_STATE_PATH,
      message: "Storage state file could not be read.",
    });
  }
}
