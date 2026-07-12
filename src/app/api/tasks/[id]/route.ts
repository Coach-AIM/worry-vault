import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description || null;
    if (body.estimatedTime !== undefined)
      updateData.estimatedTime = body.estimatedTime;
    if (body.emotionalIntensity !== undefined)
      updateData.emotionalIntensity = body.emotionalIntensity;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate || null;
    if (body.recurrence !== undefined) updateData.recurrence = body.recurrence;

    if (body.completed !== undefined) {
      updateData.completed = body.completed;

      // If task is completed and has recurrence, advance due date instead of checking off permanently
      if (body.completed === 1) {
        const records = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, parseInt(id, 10)))
          .limit(1);
        if (
          records.length > 0 &&
          records[0].recurrence &&
          records[0].recurrence !== "none"
        ) {
          const taskObj = records[0];
          const currentDueDate = taskObj.dueDate
            ? new Date(taskObj.dueDate)
            : new Date();

          // Avoid getting stuck in the past: if due date was long ago, advance from today
          const baseDate =
            currentDueDate < new Date() ? new Date() : currentDueDate;
          const nextDueDate = new Date(baseDate);

          if (taskObj.recurrence === "daily") {
            nextDueDate.setDate(nextDueDate.getDate() + 1);
          } else if (taskObj.recurrence === "twice-daily") {
            nextDueDate.setHours(nextDueDate.getHours() + 12);
          } else if (taskObj.recurrence === "weekly") {
            nextDueDate.setDate(nextDueDate.getDate() + 7);
          }

          const pad = (n: number) => String(n).padStart(2, "0");
          const nextDueDateStr = `${nextDueDate.getFullYear()}-${pad(nextDueDate.getMonth() + 1)}-${pad(nextDueDate.getDate())}T${pad(nextDueDate.getHours())}:${pad(nextDueDate.getMinutes())}`;

          updateData.completed = 0;
          updateData.dueDate = nextDueDateStr;
        }
      }
    }

    await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, parseInt(id, 10)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Patch Error", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}
