import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { journalEntries } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const currentUserId = (session.user as any).id || "user_coach_1";

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "month";

    let lookbackDays = "-30 days";
    if (range === "week") {
      lookbackDays = "-7 days";
    } else if (range === "year") {
      lookbackDays = "-365 days";
    }

    const lookbackSql = sql`datetime(created_at) >= datetime('now', ${lookbackDays})`;
    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, currentUserId), lookbackSql))
      .orderBy(journalEntries.createdAt);

    const pointsMap: Record<
      string,
      { posSum: number; posCount: number; negSum: number; negCount: number }
    > = {};
    const keysOrder: string[] = [];

    entries.forEach((entry) => {
      let entryPosSum = 0,
        entryPosCount = 0;
      let entryNegSum = 0,
        entryNegCount = 0;

      if (entry.emotionsJson) {
        try {
          const emotions = JSON.parse(entry.emotionsJson);
          if (Array.isArray(emotions)) {
            emotions.forEach((em: any) => {
              const name = em.name || "";
              const weight = em.weight || 50;
              const isPos = [
                "Happy",
                "Proud",
                "Optimistic",
                "Calm",
                "Grateful",
                "Content",
                "Relieved",
                "Hopeful",
                "Excited",
                "Peaceful",
                "Energized",
                "Inspired",
                "Elated",
                "Serene",
              ].some((p) => name.toLowerCase() === p.toLowerCase());

              if (isPos) {
                entryPosSum += weight;
                entryPosCount++;
              } else {
                entryNegSum += weight;
                entryNegCount++;
              }
            });
          }
        } catch (e) {}
      }

      const computedPos =
        entryPosCount > 0 ? Math.round(entryPosSum / entryPosCount) : 0;
      const computedNeg =
        entryNegCount > 0 ? Math.round(entryNegSum / entryNegCount) : 0;

      const dateObj = new Date(entry.createdAt);
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      let key = "";
      if (range === "year") {
        key = monthNames[dateObj.getMonth()];
      } else {
        key = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
      }

      if (!pointsMap[key]) {
        pointsMap[key] = { posSum: 0, posCount: 0, negSum: 0, negCount: 0 };
        keysOrder.push(key);
      }

      if (computedPos > 0) {
        pointsMap[key].posSum += computedPos;
        pointsMap[key].posCount++;
      }
      if (computedNeg > 0) {
        pointsMap[key].negSum += computedNeg;
        pointsMap[key].negCount++;
      }
    });

    const timelineData = keysOrder.map((key) => {
      const g = pointsMap[key];
      return {
        date: key,
        positive: g.posCount > 0 ? Math.round(g.posSum / g.posCount) : 0,
        negative: g.negCount > 0 ? Math.round(g.negSum / g.negCount) : 0,
      };
    });

    return NextResponse.json({ success: true, timelineData });
  } catch (error: any) {
    console.error("Trends Fetch Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Failed to fetch trends" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
