//src/app/api/user/[user_id]/route.js

/**
 * Specific user id endpoints go here
 */

import { NextResponse } from "next/server";
import { getClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const { user_id } = await params;
    const client = await getClientPromise();
    const db = client.db();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(user_id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { user_id } = await params;
    const client = await getClientPromise();
    const db = client.db();

    const result = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(user_id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}