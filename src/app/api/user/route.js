//src/app/api/user/route.js

/**
 * User API endpoints go here
 */

import { NextResponse } from "next/server";
import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const client = await getClientPromise();
    const db = client.db();

    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, email, password, role } = body;

    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { error: "Username, email, password, and role are required" },
        { status: 400 }
      );
    }

    if (!["Teacher", "Student"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be either 'Teacher' or 'Student'" },
        { status: 400 }
      );
    }

    const client = await getClientPromise();
    const db = client.db();

    const existingUser = await db.collection("users").findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(
      { ...userWithoutPassword, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}