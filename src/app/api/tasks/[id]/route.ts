import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.estimatedTime !== undefined) updateData.estimatedTime = body.estimatedTime;
    if (body.emotionalIntensity !== undefined) updateData.emotionalIntensity = body.emotionalIntensity;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate || null;
    if (body.completed !== undefined) updateData.completed = body.completed;

    await db.update(tasks).set(updateData).where(eq(tasks.id, parseInt(id, 10)));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Patch Error", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
