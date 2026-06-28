import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { journalEntries } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { entryText, insights } = await req.json();
    
    if (!entryText) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    await db.insert(journalEntries).values({
      entryText,
      insights: insights ? JSON.stringify(insights) : null
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
