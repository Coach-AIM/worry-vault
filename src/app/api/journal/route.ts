import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { journalEntries } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Enforce that complex structures are properly stringified for SQLite
    const insertedRow = await db.insert(journalEntries).values({
      entryType: body.entryType || "negative",
      situation: body.situation,
      emotionsJson: typeof body.emotionsJson === "string" 
        ? body.emotionsJson 
        : JSON.stringify(body.emotionsJson || {}),
      automaticThought: body.automaticThought || null,
      distortionsJson: typeof body.distortionsJson === "string" 
        ? body.distortionsJson 
        : JSON.stringify(body.distortionsJson || []),
      reframedThought: body.reframedThought,
    }).returning();

    return NextResponse.json({ success: true, data: insertedRow });
  } catch (error: any) {
    console.error("CRITICAL API FAILURE IN /api/journal:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal Server Error" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET() {
  try {
    const entries = await db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt));
    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error("DB Journal Fetch Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Failed to fetch journals" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
