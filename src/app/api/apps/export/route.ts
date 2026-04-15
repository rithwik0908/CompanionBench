import { exportAppsToCsv } from "@/lib/csv";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const csv = await exportAppsToCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="companion-bench-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
