//src/app/api/course/route.js

/**
 * Course endpoints go here
 */

import { NextResponse } from "next/server";
import { getClientPromise } from "@/lib/mongodb";
import { getJwtSecret } from "@/lib/jwt-secret";
import jwt from "jsonwebtoken";

function getUserFromToken(request) {
  let token = null;

  // Check Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    // Fallback to cookie
    token = request.cookies.get("token")?.value;
  }

  if (!token) return null;

  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

export async function GET(request) {
  try {
    const client = await getClientPromise();
    const db = client.db();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const query = { status: { $ne: "Cancel" } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "teacher.username": { $regex: search, $options: "i" } },
      ];
    }

    const courses = await db.collection("courses").find(query).toArray();
    return NextResponse.json(courses, { status: 200 });
  } catch (error) {
    console.error("GET /api/course Error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromToken(request);
    if (!user || user.role !== "Teacher") {
      return NextResponse.json(
        { error: "Unauthorized: Only teachers can create courses" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, duration, topics, price, maxStudents } = body;

    if (!name || !duration || !price || !maxStudents) {
      return NextResponse.json(
        { error: "Missing required course fields" },
        { status: 400 }
      );
    }

    const client = await getClientPromise();
    const db = client.db();

    const newCourse = {
      name,
      duration: Number(duration),
      topics: Array.isArray(topics) ? topics : [],
      price: Number(price),
      maxStudents: Number(maxStudents),
      status: "Open",
      teacher: {
        id: user.id || user._id,
        username: user.username,
      },
      enrolledStudents: [],
      createdAt: new Date(),
    };

    const result = await db.collection("courses").insertOne(newCourse);
    return NextResponse.json(
      { ...newCourse, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/course Error:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}