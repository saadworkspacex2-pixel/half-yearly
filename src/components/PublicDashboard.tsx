"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EXAM_TYPES, SUBJECTS, GRADE_COLORS } from "@/lib/constants";
import { GalleryShowcase, WeeklyRoutineTable } from "@/components/BentoWidgets";
import { StudyMaterials, UpcomingEvents, MarkFinder } from "@/components/StudentWidgets";
import DashboardCharts from "@/components/DashboardCharts";
import StudentDetailModal from "@/components/StudentDetailModal";
import { useI18n } from "@/lib/i18n";
import { playClick, playOpen } from "@/lib/sounds";

interface SubjectResult {
  subject: string;
  cq: number;
  mcq: number;
  total: number;
  maxTotal: number;
  grade: string;
  pass: boolean;
}

interface StudentResult {
  studentId: number;
  name: string;
  rollNumber: number;
  profilePicture: string;
  totalObtained: number;
  maxPossibleTotal: number;
  average: number;
  overallGrade: string;
  overallPass: boolean;
  rank: number | null;
  cqRank: number | null;
  mcqRank: number | null;
  totalCq: number;
  totalMcq: number;
  subjects: SubjectResult[];
  subjectRanks: Record<string, number | null>;
  gpa: number;
  hasMarks: boolean;
}

interface Stats {
  totalStudents: number;
  studentsWithMarks: number;
  highest: number;
  lowest: number;
  average: number;
  passCount: number;
  failCount: number;
  maxPossibleTotal: number;
  gradeDistribution: Record<string, number>;
  subjectAverages: Array<{ subject: string; average: number; max: number }>;
}

interface Teacher {
  id: number;
  name: string;
  degree: string;
  subject: string;
  profilePicture: string;
}

interface Settings {
  schoolName: string;
  classTeacherName: string;
  classTeacherDegree: string;
  classTeacherPicture: string;
  developerName: string;
  developerRoll: number;
  developerBio: string;
  developerPicture: string;
  captainRoll: number | null;
  captainTitle: string;
  monitorRoll: number | null;
  monitorTitle: string;
}

interface StudentInfo {
  id: number;
  name: string;
  rollNumber: number;
  profilePicture: string;
  studentId: string;
  fatherName: string;
  motherName: string;
  mobileNumber: string;
}

type LeaderboardType = "overall" | "cq" | "mcq" | "attendance";

interface AttendanceLeaderboardEntry {
  studentId: number;
  name: string;
  rollNumber: number;
  profilePicture: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
  currentStreak: number;
  longestStreak: number;
}

export default function PublicDashboard() {
  const { t, lang, tSubject, tExam } = useI18n();

  const [examType, setExamType] = useState<string>("");
  const [examReady, setExamReady] = useState(false);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("overall");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [attendanceLeaderboard, setAttendanceLeaderboard] = useState<AttendanceLeaderboardEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allStudents, setAllStudents] = useState<StudentInfo[]>([]);

  const [detailStudent, setDetailStudent] = useState<StudentResult | null>(null);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setAllStudents(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d);
        const savedExam = (d as any).publicDashboardExamType || "Half Yearly";
        setExamType(savedExam);
        setExamReady(true);
      })
      .catch(() => {
        setExamType("Half Yearly");
        setExamReady(true);
      });

    fetch("/api/teachers")
      .then((r) => r.json())
      .then((d) => setTeachers(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch("/api/attendance/leaderboard")
      .then((r) => r.json())
      .then((d) => setAttendanceLeaderboard(Array.isArray(d.leaderboard) ? d.leaderboard : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!examReady || !examType) return;
    setLoading(true);
    fetch(`/api/results?examType=${encodeURIComponent(examType)}`)
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results || []);
        setStats(d.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [examReady, examType]);

  // Sort logic
  const ranked = results
    .filter((r) => r.hasMarks)
    .sort((a, b) => {
      if (leaderboardType === "cq") return b.totalCq - a.totalCq;
      if (leaderboardType === "mcq") return b.totalMcq - a.totalMcq;
      if (b.gpa !== a.gpa) return b.gpa - a.gpa;
      return b.totalObtained - a.totalObtained;
    });

  const subjectRanked = selectedSubject
    ? results.filter((r) => r.hasMarks).sort((a, b) => {
        const aTotal = a.subjects.find((s) => s.subject === selectedSubject)?.total ?? 0;
        const bTotal = b.subjects.find((s) => s.subject === selectedSubject)?.total ?? 0;
        return bTotal - aTotal;
      })
    : [];

  const displayList = selectedSubject ? subjectRanked : ranked;

  const filtered = searchQuery
    ? displayList.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.rollNumber.toString().includes(searchQuery)
      )
    : displayList;

  const top3 = ranked.slice(0, 3);
  const devRoll = settings?.developerRoll || 6;
  const devStudent = results.find((r) => r.rollNumber === devRoll);

  const getTier = (gpa: number) => {
    if (gpa >= 5.0) return "S";
    if (gpa >= 4.0) return "A";
    if (gpa >= 3.5) return "B";
    if (gpa >= 3.0) return "C";
    return "D";
  };

  const Skeleton = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 rounded-2xl skeleton" />
      ))}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. TOP CONTROL BANNER (Class Teacher & Exam Selector) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Class Teacher */}
        <div className="md:col-span-6 liquid-glass-strong rounded-3xl p-5 flex items-center gap-4 border border-white/10 shadow-xl">
          {settings?.classTeacherPicture ? (
            <img
              src={settings.classTeacherPicture}
              alt={settings.classTeacherName}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl gradient-royal flex items-center justify-center text-white text-xl font-extrabold ring-2 ring-indigo-500/50 shadow-md flex-shrink-0">
              {settings?.classTeacherName ? settings.classTeacherName.charAt(0) : "T"}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">
              {t("dash.class_teacher")}
            </span>
            <h3 className="text-base md:text-lg font-bold text-white truncate">
              {settings?.classTeacherName || "Class Teacher"}
            </h3>
            {settings?.classTeacherDegree && (
              <p className="text-xs text-slate-400 truncate">{settings.classTeacherDegree}</p>
            )}
          </div>
        </div>

        {/* Exam Type Selector */}
        <div className="md:col-span-6 liquid-glass-strong rounded-3xl p-5 flex flex-col justify-between border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t("dash.exam")}
              </span>
            </div>
            <span className="text-[10px] text-indigo-300 font-mono">
              {EXAM_TYPES.length} Exams Available
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {EXAM_TYPES.map((exam) => (
              <button
                key={exam}
                onClick={() => {
                  setExamType(exam);
                  playClick();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  examType === exam
                    ? "gradient-royal text-white shadow-lg shadow-indigo-500/30 scale-[1.02]"
                    : "liquid-glass-sm text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {tExam(exam)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : (
        <>
          {/* 2. STATS OVERVIEW CARDS */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {lang === "bn" ? "মোট শিক্ষার্থী" : "Total Students"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-white">{stats.totalStudents}</span>
                <span className="text-[10px] text-indigo-400 block mt-1">
                  {stats.studentsWithMarks} {lang === "bn" ? "পরীক্ষায় উপস্থিত" : "Exam Attended"}
                </span>
              </div>

              <div className="liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {lang === "bn" ? "সর্বোচ্চ নম্বর" : "Highest Score"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-emerald-400">{stats.highest}</span>
                <span className="text-[10px] text-slate-400 block mt-1">out of {stats.maxPossibleTotal}</span>
              </div>

              <div className="liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {lang === "bn" ? "শ্রেণি গড়" : "Class Average"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-cyan-400">{stats.average}%</span>
                <span className="text-[10px] text-slate-400 block mt-1">Overall percentage</span>
              </div>

              <div className="liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {lang === "bn" ? "পাস হার" : "Pass Rate"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-amber-400">
                  {stats.totalStudents > 0 ? Math.round((stats.passCount / stats.totalStudents) * 100) : 0}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">{stats.passCount} Passed / {stats.failCount} Failed</span>
              </div>

              <div className="col-span-2 lg:col-span-1 liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {lang === "bn" ? "শীর্ষ স্থান GPA" : "Top GPA"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-purple-400">
                  {top3[0]?.gpa ? top3[0].gpa.toFixed(2) : "5.00"}
                </span>
                <span className="text-[10px] text-purple-300 block mt-1 truncate">
                  Top: {top3[0]?.name || "—"}
                </span>
              </div>
            </div>
          )}

          {/* 3. VISUAL CHARTS & ANALYTICS SECTION */}
          {stats && <DashboardCharts stats={stats} />}

          {/* 4. CLASS PODIUM (TOP 3 PERFORMERS) */}
          {top3.length > 0 && leaderboardType === "overall" && !selectedSubject && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <h3 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
                  {lang === "bn" ? "শ্রেণি মেধা পোডিয়াম" : "Class Podium — Top Rankers"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* 2nd Place */}
                {top3[1] && (
                  <motion.div
                    whileHover={{ y: -4 }}
                    onClick={() => { setDetailStudent(top3[1]); playOpen(); }}
                    className="liquid-glass-strong p-5 rounded-3xl border border-slate-700/50 shadow-xl cursor-pointer order-2 md:order-1 relative overflow-hidden"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-3">
                        {top3[1].profilePicture ? (
                          <img src={top3[1].profilePicture} alt={top3[1].name} className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-400 shadow-xl" />
                        ) : (
                          <div className="w-20 h-20 rounded-full podium-silver flex items-center justify-center text-white text-2xl font-black ring-4 ring-slate-400 shadow-xl">
                            {top3[1].name.charAt(0)}
                          </div>
                        )}
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-700 text-slate-200 border border-slate-400">
                          2nd Rank
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white truncate max-w-full mt-2">{top3[1].name}</h4>
                      <p className="text-xs text-slate-400 mb-3">Roll: {top3[1].rollNumber}</p>

                      <div className="w-full flex justify-between items-center liquid-glass-sm px-3 py-2 rounded-2xl text-xs">
                        <span className="font-bold text-white">{top3[1].totalObtained} pts</span>
                        <span className="font-bold text-indigo-400 font-mono">GPA {top3[1].gpa.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place (Center & Highest) */}
                {top3[0] && (
                  <motion.div
                    whileHover={{ y: -6 }}
                    onClick={() => { setDetailStudent(top3[0]); playOpen(); }}
                    className="liquid-glass-strong p-6 rounded-3xl border-2 border-amber-500/50 shadow-2xl cursor-pointer order-1 md:order-2 relative overflow-hidden bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-900"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex flex-col items-center text-center">
                      <span className="text-3xl mb-1 animate-bounce">👑</span>
                      <div className="relative mb-3">
                        {top3[0].profilePicture ? (
                          <img src={top3[0].profilePicture} alt={top3[0].name} className="w-24 h-24 rounded-full object-cover ring-4 ring-amber-400 shadow-2xl" />
                        ) : (
                          <div className="w-24 h-24 rounded-full podium-gold flex items-center justify-center text-white text-3xl font-black ring-4 ring-amber-400 shadow-2xl">
                            {top3[0].name.charAt(0)}
                          </div>
                        )}
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black shadow-lg">
                          1ST RANK
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-white truncate max-w-full mt-2">{top3[0].name}</h4>
                      <p className="text-xs text-amber-300 font-medium mb-3">Roll: {top3[0].rollNumber}</p>

                      <div className="w-full flex justify-between items-center liquid-glass-sm px-4 py-2.5 rounded-2xl text-xs border border-amber-500/30">
                        <span className="font-extrabold text-amber-400">{top3[0].totalObtained} pts</span>
                        <span className="font-black text-white font-mono">GPA {top3[0].gpa.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <motion.div
                    whileHover={{ y: -4 }}
                    onClick={() => { setDetailStudent(top3[2]); playOpen(); }}
                    className="liquid-glass-strong p-5 rounded-3xl border border-amber-700/30 shadow-xl cursor-pointer order-3 relative overflow-hidden"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-3">
                        {top3[2].profilePicture ? (
                          <img src={top3[2].profilePicture} alt={top3[2].name} className="w-20 h-20 rounded-full object-cover ring-4 ring-amber-700 shadow-xl" />
                        ) : (
                          <div className="w-20 h-20 rounded-full podium-bronze flex items-center justify-center text-white text-2xl font-black ring-4 ring-amber-700 shadow-xl">
                            {top3[2].name.charAt(0)}
                          </div>
                        )}
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-800 text-amber-200 border border-amber-600">
                          3rd Rank
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white truncate max-w-full mt-2">{top3[2].name}</h4>
                      <p className="text-xs text-slate-400 mb-3">Roll: {top3[2].rollNumber}</p>

                      <div className="w-full flex justify-between items-center liquid-glass-sm px-3 py-2 rounded-2xl text-xs">
                        <span className="font-bold text-white">{top3[2].totalObtained} pts</span>
                        <span className="font-bold text-indigo-400 font-mono">GPA {top3[2].gpa.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* 5. MAIN LEADERBOARD & CLASS ROSTER */}
          <div className="liquid-glass-strong rounded-3xl p-5 md:p-7 space-y-6 border border-white/10 shadow-2xl">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  {lang === "bn" ? "মেধাক্রম ও শিক্ষার্থী তালিকা" : "Academic Leaderboard & Class Roster"}
                </h3>
                <p className="text-xs text-slate-400">
                  {filtered.length} {lang === "bn" ? "শিক্ষার্থী প্রদর্শিত হচ্ছে" : "Students listed"}
                </p>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-950/70 p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => { setLeaderboardType("overall"); setSelectedSubject(null); playClick(); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      leaderboardType === "overall" && !selectedSubject
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {lang === "bn" ? "সামগ্রিক" : "Overall"}
                  </button>
                  <button
                    onClick={() => { setLeaderboardType("cq"); setSelectedSubject(null); playClick(); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      leaderboardType === "cq"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    CQ Rank
                  </button>
                  <button
                    onClick={() => { setLeaderboardType("mcq"); setSelectedSubject(null); playClick(); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      leaderboardType === "mcq"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    MCQ Rank
                  </button>
                </div>

                {/* View Switcher (Table vs Grid) */}
                <div className="flex items-center bg-slate-950/70 p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-xl text-xs transition-all ${
                      viewMode === "table" ? "bg-indigo-600 text-white" : "text-slate-400"
                    }`}
                  >
                    📋
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-xl text-xs transition-all ${
                      viewMode === "grid" ? "bg-indigo-600 text-white" : "text-slate-400"
                    }`}
                  >
                    🎴
                  </button>
                </div>
              </div>
            </div>

            {/* Search & Subject Chips */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={lang === "bn" ? "নাম বা রোল দিয়ে খুঁজুন..." : "Search student name or roll number..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-2xl py-3 px-4 pl-11 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <svg
                  className="absolute left-4 top-3.5 w-4 h-4 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {/* Subject Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                <button
                  onClick={() => setSelectedSubject(null)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all ${
                    selectedSubject === null
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                      : "liquid-glass-sm text-slate-400 hover:text-white"
                  }`}
                >
                  {lang === "bn" ? "সকল বিষয়" : "All Subjects"}
                </button>
                {SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(selectedSubject === sub ? null : sub)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all ${
                      selectedSubject === sub
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                        : "liquid-glass-sm text-slate-400 hover:text-white"
                    }`}
                  >
                    {tSubject(sub)}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLE VIEW */}
            {viewMode === "table" ? (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4 text-center">{lang === "bn" ? "স্থান" : "Rank"}</th>
                      <th className="py-3.5 px-4">{lang === "bn" ? "শিক্ষার্থীর নাম" : "Student"}</th>
                      <th className="py-3.5 px-3 text-center">{lang === "bn" ? "রোল" : "Roll"}</th>
                      <th className="py-3.5 px-3 text-center">CQ</th>
                      <th className="py-3.5 px-3 text-center">MCQ</th>
                      <th className="py-3.5 px-4 text-center">{lang === "bn" ? "প্রাপ্ত নম্বর" : "Total Obtained"}</th>
                      <th className="py-3.5 px-3 text-center">GPA</th>
                      <th className="py-3.5 px-3 text-center">{lang === "bn" ? "গ্রেড" : "Grade"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/40">
                    {filtered.map((item, idx) => {
                      const displayRank = idx + 1;
                      const tier = getTier(item.gpa);
                      return (
                        <tr
                          key={item.studentId}
                          onClick={() => { setDetailStudent(item); playOpen(); }}
                          className="hover:bg-indigo-500/10 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-black">
                            {displayRank === 1 ? (
                              <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center justify-center font-bold">1</span>
                            ) : displayRank === 2 ? (
                              <span className="w-7 h-7 rounded-full bg-slate-400/20 text-slate-300 inline-flex items-center justify-center font-bold">2</span>
                            ) : displayRank === 3 ? (
                              <span className="w-7 h-7 rounded-full bg-amber-800/20 text-amber-500 inline-flex items-center justify-center font-bold">3</span>
                            ) : (
                              <span className="text-slate-400">#{displayRank}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {item.profilePicture ? (
                                <img src={item.profilePicture} alt={item.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                                  {item.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white">{item.name}</p>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded tier-${tier.toLowerCase()}`}>
                                  Tier {tier}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center text-slate-300 font-mono">{item.rollNumber}</td>
                          <td className="py-3.5 px-3 text-center text-slate-400 font-mono">{item.totalCq}</td>
                          <td className="py-3.5 px-3 text-center text-slate-400 font-mono">{item.totalMcq}</td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-white font-mono">
                            {item.totalObtained}
                          </td>
                          <td className="py-3.5 px-3 text-center font-black text-indigo-400 font-mono">
                            {item.gpa.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-black"
                              style={{
                                backgroundColor: `${GRADE_COLORS[item.overallGrade] || "#64748B"}20`,
                                color: GRADE_COLORS[item.overallGrade] || "#64748B",
                                border: `1px solid ${GRADE_COLORS[item.overallGrade] || "#64748B"}40`,
                              }}
                            >
                              {item.overallGrade}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* GRID CARD VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filtered.map((item, idx) => {
                  const displayRank = idx + 1;
                  const tier = getTier(item.gpa);
                  return (
                    <motion.div
                      key={item.studentId}
                      whileHover={{ y: -3 }}
                      onClick={() => { setDetailStudent(item); playOpen(); }}
                      className="liquid-glass-sm p-4 rounded-2xl border border-white/10 cursor-pointer space-y-3 relative overflow-hidden hover:border-indigo-500/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
                          Rank #{displayRank}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tier-${tier.toLowerCase()}`}>
                          Tier {tier}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {item.profilePicture ? (
                          <img src={item.profilePicture} alt={item.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-lg">
                            {item.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                          <p className="text-xs text-slate-400">Roll: {item.rollNumber}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-slate-500 block">CQ</span>
                          <span className="font-bold text-slate-300">{item.totalCq}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">MCQ</span>
                          <span className="font-bold text-slate-300">{item.totalMcq}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">GPA</span>
                          <span className="font-black text-indigo-400">{item.gpa.toFixed(2)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. EXTRA BENTO WIDGETS (Routine, Gallery, Study Materials, Events) */}
          <div className="space-y-8">
            <WeeklyRoutineTable />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GalleryShowcase />
              <UpcomingEvents />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StudyMaterials />
              <MarkFinder />
            </div>
          </div>
        </>
      )}

      {/* STUDENT SPOTLIGHT DETAIL MODAL */}
      <StudentDetailModal
        student={detailStudent}
        onClose={() => setDetailStudent(null)}
        examType={examType}
        schoolName={settings?.schoolName}
      />
    </div>
  );
}
