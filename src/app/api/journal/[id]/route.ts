import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { journalEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const currentUserId = (session.user as any).id || "user_coach_1";
    const { id } = await params;
    const entryId = parseInt(id);

    if (isNaN(entryId)) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid Entry ID" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { outcomeText, lessonsLearned, predictionEvaluation } = body;

    // Check if the record exists and belongs to the user
    const existing = await db.select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, currentUserId)));

    if (existing.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Entry not found" }), 
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update follow-up / evidence loop columns only
    const updated = await db.update(journalEntries)
      .set({
        outcomeText: outcomeText !== undefined ? outcomeText : null,
        lessonsLearned: lessonsLearned !== undefined ? lessonsLearned : null,
        predictionEvaluation: predictionEvaluation !== undefined ? predictionEvaluation : null
      })
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, currentUserId)))
      .returning();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("PATCH API FAILED in /api/journal/[id]:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Failed to update journal entry" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
