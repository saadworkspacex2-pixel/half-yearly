import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, auditLogs } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getSession, isAnyAdmin } from "@/lib/auth";
import { queueIfSecondary } from "@/lib/pending";
import { getTodayISODate, isWeeklyOff, weekdayLabel } from "@/lib/attendance";

export const dynamic = "force-dynamic";

// GET /api/attendance                -> recent dates with present/absent counts (admin)
// GET /api/attendance?date=YYYY-MM-DD -> full roll-by-roll list for that date (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAnyAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (date) {
      const rows = await db
        .select({
          id: attendance.id,
          studentId: attendance.studentId,
          rollNumber: attendance.rollNumber,
          status: attendance.status,
          name: students.name,
        })
        .from(attendance)
        .leftJoin(students, eq(students.id, attendance.studentId))
        .where(eq(attendance.date, date))
        .orderBy(attendance.rollNumber);

      const present = rows.filter((r) => r.status === "present").length;
      const absent = rows.filter((r) => r.status === "absent").length;
      return NextResponse.json({ date, isWeeklyOff: isWeeklyOff(date), records: rows, present, absent });
    }

    const summary = await db
      .select({
        date: attendance.date,
        present: sql<number>`count(*) filter (where ${attendance.status} = 'present')`.mapWith(Number),
        absent: sql<number>`count(*) filter (where ${attendance.status} = 'absent')`.mapWith(Number),
      })
      .from(attendance)
      .groupBy(attendance.date)
      .orderBy(sql`${attendance.date} desc`)
      .limit(60);

    return NextResponse.json({ dates: summary });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

// POST { rollsAbsent: string | number[], date?: string, force?: boolean }
// Anyone NOT in rollsAbsent is auto-marked present. Rejects Fri/Sat unless force=true.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAnyAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const date: string = body.date || getTodayISODate();

    if (isWeeklyOff(date) && !body.force) {
      return NextResponse.json(
        { error: `${weekdayLabel(date)} is a weekly off day — no attendance is required.`, isWeeklyOff: true },
        { status: 400 }
      );
    }

    // Accept either "6,8,24" or [6,8,24]
    const raw = body.rollsAbsent;
    const rollList: number[] = Array.isArray(raw)
      ? raw.map(Number)
      : String(raw || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number);
    const absentSet = new Set(rollList.filter((n) => Number.isFinite(n)));

    const check = await queueIfSecondary(
      session,
      "mark_attendance",
      `Mark attendance for ${date} (${absentSet.size} absent)`,
      "/api/attendance",
      "POST",
      body
    );
    if (check.queued) return NextResponse.json(check.response, { status: 202 });

    const allStudents = await db.select({ id: students.id, rollNumber: students.rollNumber }).from(students);
    const knownRolls = new Set(allStudents.map((s) => s.rollNumber));
    const unknownRolls = [...absentSet].filter((r) => !knownRolls.has(r));

    if (allStudents.length === 0) {
      return NextResponse.json({ error: "No students in the system yet" }, { status: 400 });
    }

    for (const s of allStudents) {
      const status = absentSet.has(s.rollNumber) ? "absent" : "present";
      await db
        .insert(attendance)
        .values({ studentId: s.id, rollNumber: s.rollNumber, date, status, markedBy: session.role })
        .onConflictDoUpdate({
          target: [attendance.date, attendance.rollNumber],
          set: { status, studentId: s.id, markedBy: session.role },
        });
    }

    await db.insert(auditLogs).values({
      action: "mark_attendance",
      details: `${date}: ${allStudents.length - absentSet.size} present, ${absentSet.size} absent`,
      performedBy: session.role,
    });

    return NextResponse.json({
      date,
      totalStudents: allStudents.length,
      present: allStudents.length - absentSet.size,
      absent: absentSet.size,
      unknownRolls,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
