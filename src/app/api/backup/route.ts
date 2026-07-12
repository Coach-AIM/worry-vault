import { NextResponse } from "next/server";
import { db } from "@/db/index";
import {
  journalEntries,
  positiveThoughts,
  tasks,
  therapistContact,
} from "@/db/schema";

export async function GET() {
  try {
    const [journal, positives, taskList, contact] = await Promise.all([
      db.select().from(journalEntries),
      db.select().from(positiveThoughts),
      db.select().from(tasks),
      db.select().from(therapistContact),
    ]);

    return NextResponse.json({
      journal_entries: journal,
      positive_thoughts: positives,
      tasks: taskList,
      therapist_contact: contact,
    });
  } catch (err) {
    console.error("Backup compilation error:", err);
    return NextResponse.json(
      { error: "Failed to compile backup" },
      { status: 500 },
    );
  }
}
