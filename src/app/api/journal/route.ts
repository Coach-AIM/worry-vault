import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { journalEntries } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const currentUserId = (session.user as any).id || "user_coach_1";

    const body = await request.json();

    // Enforce that complex structures are properly stringified for SQLite
    const insertedRow = await db
      .insert(journalEntries)
      .values({
        entryType: body.entryType || "negative",
        situation: body.situation,
        emotionsJson:
          typeof body.emotionsJson === "string"
            ? body.emotionsJson
            : JSON.stringify(body.emotionsJson || {}),
        automaticThought: body.automaticThought || null,
        distortionsJson:
          typeof body.distortionsJson === "string"
            ? body.distortionsJson
            : JSON.stringify(body.distortionsJson || []),
        reframedThought: body.reframedThought,
        userId: currentUserId,
      })
      .returning();

    return NextResponse.json({ success: true, data: insertedRow });
  } catch (error: any) {
    console.error("CRITICAL API FAILURE IN /api/journal:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const currentUserId = (session.user as any).id || "user_coach_1";

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, currentUserId))
      .orderBy(desc(journalEntries.createdAt));

    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error("DB Journal Fetch Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Failed to fetch journals" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
