import { NextResponse } from "next/server";
import { getClientPromise } from "@/lib/mongodb";
import { getJwtSecret } from "@/lib/jwt-secret";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

function getUserFromToken(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export async function POST(request, { params }) {
  try {
    const user = getUserFromToken(request);
    if (!user || user.role !== "Student") {
      return NextResponse.json(
        { error: "Unauthorized: Only students can enroll in courses" },
        { status: 403 }
      );
    }

    const { course_id } = await params;
    const client = await getClientPromise();
    const db = client.db();

    const course = await db
      .collection("courses")
      .findOne({ _id: new ObjectId(course_id) });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Rule 1: Cannot enroll in closed or cancelled courses
    if (course.status !== "Open") {
      return NextResponse.json(
        { error: `Cannot enroll: Course status is ${course.status}` },
        { status: 400 }
      );
    }

    const enrolledStudents = course.enrolledStudents || [];

    // Rule 2: Cannot enroll if course is full
    if (enrolledStudents.length >= course.maxStudents) {
      return NextResponse.json(
        { error: "Course is already full" },
        { status: 400 }
      );
    }

    // Rule 3: Cannot enroll twice
    const alreadyEnrolled = enrolledStudents.some(
      (s) => s.id === user.id || s === user.id
    );
    if (alreadyEnrolled) {
      return NextResponse.json(
        { error: "You are already enrolled in this course" },
        { status: 400 }
      );
    }

    // Add student to course
    await db.collection("courses").updateOne(
      { _id: new ObjectId(course_id) },
      {
        $push: {
          enrolledStudents: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        },
      }
    );

    return NextResponse.json({ message: "Successfully enrolled in course" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to enroll in course" },
      { status: 500 }
    );
  }
}