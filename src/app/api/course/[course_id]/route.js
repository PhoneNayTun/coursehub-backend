//src/app/api/course/[course_id]/route.js

/**
 * Specific course id API endpoints go here.
 */

import { NextResponse } from "next/server";
import { getClientPromise } from "@/lib/mongodb";
import { getJwtSecret } from "@/lib/jwt-secret";
import { ObjectId } from "mongodb";
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

export async function GET(request, { params }) {
  try {
    const { course_id } = await params;
    const client = await getClientPromise();
    const db = client.db();

    const course = await db.collection("courses").findOne({ _id: new ObjectId(course_id) });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getUserFromToken(request);
    if (!user || user.role !== "Teacher") {
      return NextResponse.json({ error: "Unauthorized access token" }, { status: 403 });
    }

    const { course_id } = await params;
    const client = await getClientPromise();
    const db = client.db();

    const course = await db.collection("courses").findOne({ _id: new ObjectId(course_id) });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.teacher.id !== user.id && course.teacher.id !== user._id) {
      return NextResponse.json({ error: "Forbidden: You do not own this course" }, { status: 403 });
    }

    const body = await request.json();
    const { name, duration, topics, price, maxStudents, status } = body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (duration) updateFields.duration = Number(duration);
    if (topics) updateFields.topics = Array.isArray(topics) ? topics : topics.split(",").map((t) => t.trim());
    if (price) updateFields.price = Number(price);
    if (maxStudents) updateFields.maxStudents = Number(maxStudents);
    if (status && ["Open", "Close", "Cancel"].includes(status)) updateFields.status = status;

    await db.collection("courses").updateOne(
      { _id: new ObjectId(course_id) },
      { $set: updateFields }
    );

    return NextResponse.json({ message: "Course updated successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getUserFromToken(request);
    if (!user || user.role !== "Teacher") {
      return NextResponse.json({ error: "Unauthorized access token" }, { status: 403 });
    }

    const { course_id } = await params;
    const client = await getClientPromise();
    const db = client.db();

    const course = await db.collection("courses").findOne({ _id: new ObjectId(course_id) });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.teacher.id !== user.id && course.teacher.id !== user._id) {
      return NextResponse.json({ error: "Forbidden: You do not own this course" }, { status: 403 });
    }

    if (course.enrolledStudents && course.enrolledStudents.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete course: Students are currently enrolled" },
        { status: 400 }
      );
    }

    await db.collection("courses").deleteOne({ _id: new ObjectId(course_id) });
    return NextResponse.json({ message: "Course deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}