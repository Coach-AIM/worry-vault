import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { therapistContact } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const records = await db.select().from(therapistContact).limit(1);
    return NextResponse.json({ contact: records[0] || null });
  } catch (error) {
    console.error("DB Therapist Fetch Error", error);
    return NextResponse.json(
      { error: "Failed to fetch therapist" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, notes } = body;

    if (!name)
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const records = await db.select().from(therapistContact).limit(1);

    if (records.length > 0) {
      await db
        .update(therapistContact)
        .set({ name, phone, email, notes })
        .where(eq(therapistContact.id, records[0].id));
    } else {
      await db.run(sql`
        insert into "therapist_contact" (
          "name",
          "phone",
          "email",
          "notes"
        ) values (
          ${name},
          ${phone || null},
          ${email || null},
          ${notes || null}
        )
      `);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Therapist Save Error", error);
    return NextResponse.json(
      { error: "Failed to save therapist" },
      { status: 500 },
    );
  }
}
