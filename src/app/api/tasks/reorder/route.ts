import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { orderedIds } = await req.json();
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "Invalid orderedIds" }, { status: 400 });
    }

    // Update sortOrder for each task sequentially in SQLite
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(tasks)
        .set({ sortOrder: i })
        .where(eq(tasks.id, orderedIds[i]));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Tasks Reorder Error:", error);
    return NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 });
  }
}
