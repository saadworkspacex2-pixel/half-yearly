"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/Toast";

interface Rec { id: number; rollNumber: number; name: string | null; status: string; }
interface DateSummary { date: string; present: number; absent: number; }

export default function AttendancePage() {
  const [today, setToday] = useState("");
  const [weekday, setWeekday] = useState("");
  const [isOff, setIsOff] = useState(false);
  const [rollsInput, setRollsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ present: number; absent: number; total: number; unknownRolls: number[] } | null>(null);

  const [viewDate, setViewDate] = useState("");
  const [records, setRecords] = useState<Rec[]>([]);
  const [recentDates, setRecentDates] = useState<DateSummary[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Auto-lock onto today's date (client-clock is just for display; server re-derives it independently)
  useEffect(() => {
    const now = new Date();
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(now);
    const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
    const label = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day];
    setToday(iso);
    setWeekday(label);
    setIsOff(day === 5 || day === 6);
    setViewDate(iso);
  }, []);

  const loadRecent = useCallback(() => {
    fetch("/api/attendance").then((r) => r.json()).then((d) => setRecentDates(d.dates || [])).catch(() => {});
  }, []);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  const loadDate = useCallback((date: string) => {
    if (!date) return;
    setLoadingRecords(true);
    fetch(`/api/attendance?date=${date}`).then((r) => r.json()).then((d) => setRecords(d.records || [])).finally(() => setLoadingRecords(false));
  }, []);
  useEffect(() => { if (viewDate) loadDate(viewDate); }, [viewDate, loadDate]);

  const handleSubmit = async () => {
    setSaving(true);
    setResult(null);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollsAbsent: rollsInput, date: today }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(`Attendance saved — ${data.present} present, ${data.absent} absent`, "success");
      setResult(data);
      setRollsInput("");
      loadRecent();
      if (viewDate === today) loadDate(today);
    } else {
      toast(data.error || "Failed to save attendance", "error");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Attendance</h1>
        <p className="text-sm text-muted">Paste absent roll numbers — everyone else is auto-marked present</p>
      </div>

      {/* Input box */}
      <div className="liquid-glass-strong rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider font-semibold">Locked date</p>
            <p className="text-lg font-bold text-charcoal">{today} <span className="text-muted font-medium text-sm">({weekday})</span></p>
          </div>
          {isOff && (
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber/10 text-amber">Weekly Off — attendance not required</span>
          )}
        </div>

        {isOff ? (
          <div className="text-center py-10 text-muted text-sm">
            Friday and Saturday are hardcoded weekly-off days. No attendance can be recorded today.
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Absent roll numbers (comma-separated)</label>
            <textarea
              value={rollsInput}
              onChange={(e) => setRollsInput(e.target.value)}
              placeholder="e.g. 6, 8, 24, 5, 7"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-white/40 bg-white/40 text-sm backdrop-blur-sm resize-none font-mono"
            />
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="mt-4 gradient-royal text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-royal/25 disabled:opacity-60"
            >
              {saving ? "Saving..." : "✅ Save Today's Attendance"}
            </button>

            {result && (
              <div className="mt-4 flex gap-3 flex-wrap text-sm">
                <span className="px-3 py-1.5 rounded-xl bg-emerald/10 text-emerald font-semibold">{result.present} Present</span>
                <span className="px-3 py-1.5 rounded-xl bg-crimson/10 text-crimson font-semibold">{result.absent} Absent</span>
                {result.unknownRolls.length > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-amber/10 text-amber font-semibold">
                    Unrecognized rolls ignored: {result.unknownRolls.join(", ")}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Browse a date */}
      <div className="liquid-glass-strong rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-bold text-charcoal">Records</h3>
          <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/40 bg-white/40 text-sm" />
        </div>

        {loadingRecords ? (
          <div className="h-24 rounded-2xl skeleton" />
        ) : records.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm">No attendance recorded for this date yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/30">
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 px-3">Roll</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 px-3">Name</th>
                  <th className="text-center text-xs font-semibold text-muted uppercase tracking-wider py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-white/20">
                    <td className="py-2 px-3">{r.rollNumber}</td>
                    <td className="py-2 px-3">{r.name || "—"}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${r.status === "present" ? "bg-emerald/10 text-emerald" : "bg-crimson/10 text-crimson"}`}>
                        {r.status === "present" ? "Present" : "Absent"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent days */}
      {recentDates.length > 0 && (
        <div className="liquid-glass-strong rounded-3xl p-6">
          <h3 className="text-lg font-bold text-charcoal mb-4">Recent Days</h3>
          <div className="flex gap-2 flex-wrap">
            {recentDates.map((d) => (
              <button key={d.date} onClick={() => setViewDate(d.date)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold liquid-glass-sm hover:bg-white/50 transition-all ${viewDate === d.date ? "ring-2 ring-royal" : ""}`}>
                {d.date} <span className="text-emerald">{d.present}P</span> / <span className="text-crimson">{d.absent}A</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        PDF/CSV export and disciplinary flagging are coming in the next update to this module.
      </p>
    </div>
  );
}
