import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students } from "@/db/schema";
import { computeAttendanceStats } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allStudents = await db
      .select({ id: students.id, name: students.name, rollNumber: students.rollNumber, profilePicture: students.profilePicture })
      .from(students);

    const allRecords = await db.select({ studentId: attendance.studentId, date: attendance.date, status: attendance.status }).from(attendance);

    const byStudent = new Map<number, { date: string; status: string }[]>();
    for (const r of allRecords) {
      if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, []);
      byStudent.get(r.studentId)!.push({ date: r.date, status: r.status });
    }

    const leaderboard = allStudents
      .map((s) => {
        const stats = computeAttendanceStats(byStudent.get(s.id) || []);
        return {
          studentId: s.id,
          name: s.name,
          rollNumber: s.rollNumber,
          profilePicture: s.profilePicture,
          ...stats,
        };
      })
      // Only rank students who actually have at least one recorded day
      .filter((s) => s.totalDays > 0)
      .sort((a, b) => b.percentage - a.percentage || b.currentStreak - a.currentStreak || a.rollNumber - b.rollNumber);

    return NextResponse.json({ leaderboard });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
