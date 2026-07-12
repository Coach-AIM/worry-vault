import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { tasks } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const tasksToInsert = data.tasks;

    if (
      !tasksToInsert ||
      !Array.isArray(tasksToInsert) ||
      tasksToInsert.length === 0
    ) {
      return NextResponse.json({ success: true });
    }

    const insertData = tasksToInsert.map((t: any) => ({
      title: t.title,
      description: t.description || null,
      estimatedTime: t.estimatedTime,
      emotionalIntensity: t.emotionalIntensity,
      dueDate: t.dueDate || null,
      parentId: t.parentId || null,
      recurrence: t.recurrence || "none",
    }));

    await db.insert(tasks).values(insertData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Tasks Insert Error", error);
    return NextResponse.json(
      { error: "Failed to save tasks" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const allTasks = await db
      .select()
      .from(tasks)
      .orderBy(tasks.completed, tasks.sortOrder);
    return NextResponse.json({ tasks: allTasks });
  } catch (error) {
    console.error("DB Tasks Fetch Error", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const { eq } = await import("drizzle-orm");
    await db.delete(tasks).where(eq(tasks.completed, 1));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Tasks Clear Completed Error", error);
    return NextResponse.json(
      { error: "Failed to clear completed tasks" },
      { status: 500 },
    );
  }
}
