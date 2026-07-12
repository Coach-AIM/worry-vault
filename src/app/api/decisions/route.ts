import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { decisions, decisionOptions } from "@/db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id || "user_coach_1";

    const body = await req.json();
    const { title, timeframeDays, options } = body;

    if (
      !title ||
      !timeframeDays ||
      !options ||
      !Array.isArray(options) ||
      options.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    // Insert Decision
    const [insertedDecision] = await db
      .insert(decisions)
      .values({
        userId,
        title: title.trim(),
        timeframeDays: parseInt(timeframeDays) || 7,
        completed: 0,
      })
      .returning();

    // Insert Options
    for (const opt of options) {
      await db.insert(decisionOptions).values({
        decisionId: insertedDecision.id,
        label: opt.label.trim(),
        predictedFeeling: opt.predictedFeeling || "Unknown",
        alignsValues: opt.alignsValues || "Unsure",
        externalPressure: opt.externalPressure ? 1 : 0,
        makingAssumptions: opt.makingAssumptions ? 1 : 0,
        netScore: parseInt(opt.netScore) || 0,
      });
    }

    return NextResponse.json({
      success: true,
      decisionId: insertedDecision.id,
    });
  } catch (err: any) {
    console.error("Decision API Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create decision" },
      { status: 500 },
    );
  }
}
