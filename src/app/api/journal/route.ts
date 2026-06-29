import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { journalEntries } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.situation || !body.emotionsJson || !body.reframedThought) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.insert(journalEntries).values({
      entryType: body.entryType || 'negative',
      situation: body.situation,
      emotionsJson: typeof body.emotionsJson === 'string' ? body.emotionsJson : JSON.stringify(body.emotionsJson),
      automaticThought: body.automaticThought || null,
      distortionsJson: typeof body.distortionsJson === 'string' ? body.distortionsJson : JSON.stringify(body.distortionsJson || []),
      reframedThought: body.reframedThought
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Journal Insert Error", error);
    return NextResponse.json({ error: "Failed to save journal" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const entries = await db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt));
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("DB Journal Fetch Error", error);
    return NextResponse.json({ error: "Failed to fetch journals" }, { status: 500 });
  }
}
