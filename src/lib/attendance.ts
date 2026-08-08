// Shared attendance logic used by both admin and student-facing routes.
// Kept in one place so "what counts as a school day" is never defined twice.

const SCHOOL_TZ = "Asia/Dhaka";

/** Returns today's calendar date as YYYY-MM-DD, locked to the school's timezone
 *  regardless of what timezone the server happens to be running in. */
export function getTodayISODate(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  // en-CA locale formats as YYYY-MM-DD, which is exactly what we want.
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TZ }).format(d);
}

/** Friday and Saturday are hardcoded weekly-off days — no attendance is taken. */
export function isWeeklyOff(isoDate: string): boolean {
  // Parse as a plain calendar date (noon UTC avoids DST/timezone edge cases).
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay(); // 0=Sun ... 6=Sat
  return day === 5 || day === 6; // Friday, Saturday
}

export function weekdayLabel(isoDate: string): string {
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day];
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | string;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number; // 0-100, one decimal
  currentStreak: number; // consecutive present days ending at the most recent record
  longestStreak: number;
}

/** records should be all rows for one student, any order — this sorts internally. */
export function computeAttendanceStats(records: AttendanceRecord[]): AttendanceStats {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const totalDays = sorted.length;
  const presentDays = sorted.filter((r) => r.status === "present").length;
  const absentDays = totalDays - presentDays;
  const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0;

  let longestStreak = 0;
  let running = 0;
  for (const r of sorted) {
    if (r.status === "present") {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  // Current streak: walk backwards from the latest record while it's "present".
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].status === "present") currentStreak += 1;
    else break;
  }

  return { totalDays, presentDays, absentDays, percentage, currentStreak, longestStreak };
}
