import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (
      !username ||
      !password ||
      username.trim().length < 3 ||
      password.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "Username must be at least 3 characters and password at least 6 characters.",
        },
        { status: 400 },
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Prevent registering reserved default username
    if (cleanUsername === "coach") {
      return NextResponse.json(
        { error: "Username 'coach' is reserved." },
        { status: 400 },
      );
    }

    // Check if username already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, cleanUsername));
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Username is already taken." },
        { status: 400 },
      );
    }

    const id = "usr_" + crypto.randomBytes(8).toString("hex");
    const passwordHash = hashPassword(password);

    await db.insert(users).values({
      id,
      username: cleanUsername,
      passwordHash,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Register Error:", err);
    return NextResponse.json(
      { error: err.message || "Registration failed." },
      { status: 500 },
    );
  }
}
