import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import { getClientPromise } from "../lib/mongodb.js";
import bcrypt from "bcryptjs";

async function seed() {
  try {
    const client = await getClientPromise();
    const db = client.db();

    // Clear existing data
    await db.collection("users").deleteMany({});
    await db.collection("courses").deleteMany({});

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Insert 3 Teachers and 3 Students
    await db.collection("users").insertMany([
      { username: "teacher1", email: "teacher1@test.com", password: hashedPassword, role: "Teacher" },
      { username: "teacher2", email: "teacher2@test.com", password: hashedPassword, role: "Teacher" },
      { username: "teacher3", email: "teacher3@test.com", password: hashedPassword, role: "Teacher" },
      { username: "student1", email: "student1@test.com", password: hashedPassword, role: "Student" },
      { username: "student2", email: "student2@test.com", password: hashedPassword, role: "Student" },
      { username: "student3", email: "student3@test.com", password: hashedPassword, role: "Student" },
    ]);

    console.log("Successfully seeded 3 Teachers and 3 Students into online_course_db!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();