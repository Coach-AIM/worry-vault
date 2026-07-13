import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { decisions, decisionOptions } from "@/db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { eq, sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id || "user_coach_1";

    const body = await req.json();
    delete body.id;
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
    const result = await db.run(sql`
      insert into "decisions" (
        "user_id",
        "title",
        "timeframe_days",
        "completed"
      ) values (
        ${userId},
        ${title.trim()},
        ${parseInt(timeframeDays) || 7},
        0
      )
    `);
    const lastId = Number(result.lastInsertRowid);
    const [insertedDecision] = await db
      .select()
      .from(decisions)
      .where(eq(decisions.id, lastId));

    // Insert Options
    for (const opt of options) {
      await db.run(sql`
        insert into "decision_options" (
          "decision_id",
          "label",
          "predicted_feeling",
          "aligns_values",
          "external_pressure",
          "making_assumptions",
          "net_score"
        ) values (
          ${insertedDecision.id},
          ${opt.label.trim()},
          ${opt.predictedFeeling || "Unknown"},
          ${opt.alignsValues || "Unsure"},
          ${opt.externalPressure ? 1 : 0},
          ${opt.makingAssumptions ? 1 : 0},
          ${parseInt(opt.netScore) || 0}
        )
      `);
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
