import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { journalEntries } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      entryType, 
      situation, 
      emotionsJson, 
      automaticThought, 
      distortionsJson, 
      reframedThought 
    } = body;
    
    if (!situation || !emotionsJson || !reframedThought) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.insert(journalEntries).values({
      entryType: entryType || 'negative',
      situation,
      emotionsJson: typeof emotionsJson === 'string' ? emotionsJson : JSON.stringify(emotionsJson),
      automaticThought: automaticThought || null,
      distortionsJson: distortionsJson ? (typeof distortionsJson === 'string' ? distortionsJson : JSON.stringify(distortionsJson)) : null,
      reframedThought
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
