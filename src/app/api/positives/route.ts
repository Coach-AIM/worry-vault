import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { positiveThoughts } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const glimmers = await db
      .select()
      .from(positiveThoughts)
      .orderBy(desc(positiveThoughts.createdAt));
    return NextResponse.json({ glimmers });
  } catch (error) {
    console.error("DB Positives Fetch Error", error);
    return NextResponse.json(
      { error: "Failed to fetch positive thoughts" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { thoughtText, category } = await req.json();
    if (!thoughtText || !thoughtText.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    await db.insert(positiveThoughts).values({
      thoughtText: thoughtText.trim(),
      category: category || "General",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Positives Save Error", error);
    return NextResponse.json(
      { error: "Failed to save positive thought" },
      { status: 500 },
    );
  }
}
