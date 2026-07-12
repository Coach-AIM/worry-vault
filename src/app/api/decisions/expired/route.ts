import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { decisions, decisionOptions, decisionFollowUps } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id || "user_coach_1";

    // Query decisions where created_at + timeframe_days <= current date
    const expiredList = await db
      .select()
      .from(decisions)
      .where(
        sql`date(created_at, '+' || timeframe_days || ' days') <= date('now') AND completed = 0 AND user_id = ${userId}`,
      );

    const data = [];
    for (const dec of expiredList) {
      const opts = await db
        .select()
        .from(decisionOptions)
        .where(eq(decisionOptions.decisionId, dec.id));
      data.push({
        ...dec,
        options: opts,
      });
    }

    return NextResponse.json({ expiredDecisions: data });
  } catch (err: any) {
    console.error("Expired Decisions Fetch Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch expired decisions." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { decisionId, chosenOptionId, actualFeeling } = await req.json();

    if (!decisionId || !chosenOptionId || !actualFeeling) {
      return NextResponse.json(
        { error: "Missing decisionId, chosenOptionId, or actualFeeling." },
        { status: 400 },
      );
    }

    // Insert follow up record
    await db.insert(decisionFollowUps).values({
      decisionId: parseInt(decisionId),
      chosenOptionId: parseInt(chosenOptionId),
      actualFeeling: actualFeeling.trim(),
    });

    // Mark parent decision as completed
    await db
      .update(decisions)
      .set({ completed: 1 })
      .where(eq(decisions.id, parseInt(decisionId)));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Expired Decision Follow Up Save Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit decision follow up." },
      { status: 500 },
    );
  }
}
