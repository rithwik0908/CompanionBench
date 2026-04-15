import { parseCsvContent, importAppsFromCsv } from "@/lib/csv";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const content = await file.text();
    const rows = parseCsvContent(content);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty or invalid" }, { status: 400 });
    }

    const count = await importAppsFromCsv(rows);
    return NextResponse.json({ imported: count, total: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
