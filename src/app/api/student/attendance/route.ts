import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendance } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { computeAttendanceStats } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select({ date: attendance.date, status: attendance.status })
      .from(attendance)
      .where(eq(attendance.studentId, session.studentId!));

    const stats = computeAttendanceStats(rows);
    const history = [...rows].sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ history, stats });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
