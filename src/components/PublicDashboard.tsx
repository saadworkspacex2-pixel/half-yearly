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
  const [viewMode, setViewMode] = useState<"podium" | "table">("podium");
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

  // Sort logic for Leaderboard
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

  const top1 = filtered[0];
  const top2 = filtered[1];
  const top3 = filtered[2];
  const restRankers = filtered.slice(3);

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
      {/* 1. APPLE CONTROL BANNER (Class Teacher & Exam Selector) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Class Teacher */}
        <div className="md:col-span-6 liquid-glass-strong rounded-3xl p-5 flex items-center gap-4 border border-white/10 shadow-2xl">
          {settings?.classTeacherPicture ? (
            <img
              src={settings.classTeacherPicture}
              alt={settings.classTeacherName}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl gradient-royal flex items-center justify-center text-white text-xl font-extrabold ring-2 ring-blue-500/40 shadow-md flex-shrink-0">
              {settings?.classTeacherName ? settings.classTeacherName.charAt(0) : "T"}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-0.5">
              {t("dash.class_teacher")}
            </span>
            <h3 className="text-base md:text-lg font-bold text-white truncate">
              {settings?.classTeacherName || "Class Teacher"}
            </h3>
            {settings?.classTeacherDegree && (
              <p className="text-xs text-[#86868b] truncate">{settings.classTeacherDegree}</p>
            )}
          </div>
        </div>

        {/* Exam Selector */}
        <div className="md:col-span-6 liquid-glass-strong rounded-3xl p-5 flex flex-col justify-between border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-[#86868b] uppercase tracking-wider">
                {t("dash.exam")}
              </span>
            </div>
            <span className="text-[10px] text-blue-400 font-mono">
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
                    ? "gradient-royal text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
                    : "liquid-glass-sm text-[#86868b] hover:text-white hover:bg-white/10"
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
          {/* 2. APPLE OVERVIEW STAT METRIC CARDS */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-blue-500/40 transition-all">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">
                  {lang === "bn" ? "মোট শিক্ষার্থী" : "Total Students"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-white">{stats.totalStudents}</span>
                <span className="text-[10px] text-blue-400 block mt-1">
                  {stats.studentsWithMarks} {lang === "bn" ? "পরীক্ষায় উপস্থিত" : "Exam Attended"}
                </span>
              </div>

              <div className="liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">
                  {lang === "bn" ? "সর্বোচ্চ নম্বর" : "Highest Score"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-emerald-400">{stats.highest}</span>
                <span className="text-[10px] text-[#86868b] block mt-1">out of {stats.maxPossibleTotal}</span>
              </div>

              <div className="liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">
                  {lang === "bn" ? "শ্রেণি গড়" : "Class Average"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-cyan-400">{stats.average}%</span>
                <span className="text-[10px] text-[#86868b] block mt-1">Overall percentage</span>
              </div>

              <div className="liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">
                  {lang === "bn" ? "পাস হার" : "Pass Rate"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-amber-400">
                  {stats.totalStudents > 0 ? Math.round((stats.passCount / stats.totalStudents) * 100) : 0}%
                </span>
                <span className="text-[10px] text-[#86868b] block mt-1">{stats.passCount} Passed / {stats.failCount} Failed</span>
              </div>

              <div className="col-span-2 lg:col-span-1 liquid-glass-strong p-4 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">
                  {lang === "bn" ? "শীর্ষ স্থান GPA" : "Top GPA"}
                </span>
                <span className="text-2xl md:text-3xl font-black text-purple-400">
                  {top1?.gpa ? top1.gpa.toFixed(2) : "5.00"}
                </span>
                <span className="text-[10px] text-purple-300 block mt-1 truncate">
                  Top: {top1?.name || "—"}
                </span>
              </div>
            </div>
          )}

          {/* 3. VISUAL CHARTS & ANALYTICS SECTION */}
          {stats && <DashboardCharts stats={stats} />}

          {/* 4. FULL PODIUM-STYLE LEADERBOARD SECTION */}
          <div className="liquid-glass-strong rounded-3xl p-5 md:p-8 space-y-8 border border-white/10 shadow-2xl">
            {/* Leaderboard Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🏛️</span>
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {lang === "bn" ? "শ্রেণি পোডিয়াম লিডারবোর্ড" : "Class Podium Leaderboard"}
                  </h3>
                </div>
                <p className="text-xs text-[#86868b]">
                  {selectedSubject
                    ? `${tSubject(selectedSubject)} — ${filtered.length} ${lang === "bn" ? "শিক্ষার্থীর পোডিয়াম র্যাঙ্ক" : "Subject Rankers"}`
                    : `${filtered.length} ${lang === "bn" ? "শিক্ষার্থীর সামগ্রিক মেধা পোডিয়াম" : "Overall Student Podium Ranks"}`}
                </p>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-[#161617] p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => { setLeaderboardType("overall"); setSelectedSubject(null); playClick(); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      leaderboardType === "overall" && !selectedSubject
                        ? "gradient-royal text-white shadow-md"
                        : "text-[#86868b] hover:text-white"
                    }`}
                  >
                    {lang === "bn" ? "সামগ্রিক" : "Overall"}
                  </button>
                  <button
                    onClick={() => { setLeaderboardType("cq"); setSelectedSubject(null); playClick(); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      leaderboardType === "cq"
                        ? "gradient-royal text-white shadow-md"
                        : "text-[#86868b] hover:text-white"
                    }`}
                  >
                    CQ Rank
                  </button>
                  <button
                    onClick={() => { setLeaderboardType("mcq"); setSelectedSubject(null); playClick(); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      leaderboardType === "mcq"
                        ? "gradient-royal text-white shadow-md"
                        : "text-[#86868b] hover:text-white"
                    }`}
                  >
                    MCQ Rank
                  </button>
                </div>

                {/* View Switcher (Podium Grid vs Table) */}
                <div className="flex items-center bg-[#161617] p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setViewMode("podium")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === "podium" ? "gradient-royal text-white" : "text-[#86868b]"
                    }`}
                  >
                    <span>🏆</span> {lang === "bn" ? "পোডিয়াম" : "Podium"}
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === "table" ? "gradient-royal text-white" : "text-[#86868b]"
                    }`}
                  >
                    <span>📋</span> {lang === "bn" ? "তালিকা" : "Table"}
                  </button>
                </div>
              </div>
            </div>

            {/* Search & Subject Chips */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder={lang === "bn" ? "পোডিয়ামে নাম বা রোল দিয়ে খুঁজুন..." : "Search podium rankers by name or roll number..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161617] border border-white/12 rounded-2xl py-3.5 px-4 pl-11 text-xs text-white placeholder-[#86868b] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <svg
                  className="absolute left-4 top-4 w-4 h-4 text-[#86868b]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {/* Subject Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                <button
                  onClick={() => setSelectedSubject(null)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold flex-shrink-0 transition-all ${
                    selectedSubject === null
                      ? "bg-blue-600/25 text-blue-400 border border-blue-500/40 shadow-sm"
                      : "liquid-glass-sm text-[#86868b] hover:text-white"
                  }`}
                >
                  {lang === "bn" ? "সকল বিষয় (Overall)" : "All Subjects (Overall)"}
                </button>
                {SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(selectedSubject === sub ? null : sub)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold flex-shrink-0 transition-all ${
                      selectedSubject === sub
                        ? "bg-blue-600/25 text-blue-400 border border-blue-500/40 shadow-sm"
                        : "liquid-glass-sm text-[#86868b] hover:text-white"
                    }`}
                  >
                    {tSubject(sub)}
                  </button>
                ))}
              </div>
            </div>

            {/* PODIUM VIEW WITH 3D BLOCK PEDESTALS */}
            {viewMode === "podium" ? (
              <div className="space-y-6">
                {/* 3D EMBOSSED PODIUM PEDESTALS */}
                {filtered.length > 0 && (
                  <div className="relative pt-12 pb-4 px-2 bg-gradient-to-b from-[#161617]/40 via-[#161617] to-[#0d0d0e] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                    {/* Ambient Glow behind #1 */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-end justify-center max-w-2xl mx-auto gap-2 md:gap-4 relative z-10 px-2">
                      {/* RANK 2 PEDESTAL BLOCK (LEFT) */}
                      {top2 ? (
                        <div
                          onClick={() => { setDetailStudent(top2); playOpen(); }}
                          className="flex-1 flex flex-col items-center cursor-pointer group"
                        >
                          {/* Floating Avatar & Score Pill */}
                          <motion.div whileHover={{ y: -6 }} className="flex flex-col items-center mb-3">
                            <div className="relative">
                              {top2.profilePicture ? (
                                <img
                                  src={top2.profilePicture}
                                  alt={top2.name}
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-slate-300 shadow-2xl"
                                />
                              ) : (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-700 text-white flex items-center justify-center text-xl sm:text-2xl font-black ring-4 ring-slate-300 shadow-2xl">
                                  {top2.name.charAt(0)}
                                </div>
                              )}
                              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-300 text-black font-black text-[11px] flex items-center justify-center shadow-lg ring-2 ring-black">
                                2
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-white mt-2 truncate max-w-[100px] sm:max-w-[120px] text-center">
                              {top2.name}
                            </p>

                            <div className="mt-1 px-3 py-1 rounded-full bg-[#242426] border border-white/10 text-[11px] font-bold text-slate-300 flex items-center gap-1.5 shadow-md">
                              <span>🏆</span> {top2.totalObtained} pts
                            </div>
                          </motion.div>

                          {/* 3D Block Pedestal #2 */}
                          <div className="w-full h-36 sm:h-44 bg-gradient-to-b from-[#2a2b2e] via-[#1c1d1f] to-[#141415] rounded-t-2xl border-t-2 border-slate-400/50 flex flex-col items-center justify-center relative shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] group-hover:from-[#323338] transition-colors">
                            <span className="text-5xl sm:text-7xl font-black text-slate-500/30 select-none tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              2
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest -mt-2">
                              2ND PLACE
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {/* RANK 1 PEDESTAL BLOCK (CENTER - TALLEST) */}
                      {top1 ? (
                        <div
                          onClick={() => { setDetailStudent(top1); playOpen(); }}
                          className="flex-1 flex flex-col items-center cursor-pointer group z-20"
                        >
                          {/* Floating Crown, Avatar & Score Pill */}
                          <motion.div whileHover={{ y: -8 }} className="flex flex-col items-center mb-3">
                            <span className="text-3xl sm:text-4xl mb-1 animate-bounce">👑</span>
                            <div className="relative">
                              {top1.profilePicture ? (
                                <img
                                  src={top1.profilePicture}
                                  alt={top1.name}
                                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]"
                                />
                              ) : (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center text-2xl sm:text-3xl font-black ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                                  {top1.name.charAt(0)}
                                </div>
                              )}
                              <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-black font-black text-xs flex items-center justify-center shadow-xl ring-2 ring-black">
                                1
                              </span>
                            </div>

                            <p className="text-sm sm:text-base font-black text-white mt-2 truncate max-w-[110px] sm:max-w-[140px] text-center">
                              {top1.name}
                            </p>

                            <div className="mt-1 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-black text-amber-400 flex items-center gap-1.5 shadow-lg">
                              <span>👑</span> {top1.totalObtained} pts
                            </div>
                          </motion.div>

                          {/* 3D Block Pedestal #1 */}
                          <div className="w-full h-48 sm:h-56 bg-gradient-to-b from-[#3a3528] via-[#242017] to-[#14120e] rounded-t-2xl border-t-4 border-amber-400 flex flex-col items-center justify-center relative shadow-[inset_0_2px_15px_rgba(245,158,11,0.2)] group-hover:from-[#453e2e] transition-colors">
                            <span className="text-6xl sm:text-8xl font-black text-amber-500/30 select-none tracking-tighter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                              1
                            </span>
                            <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest -mt-3">
                              CHAMPION
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {/* RANK 3 PEDESTAL BLOCK (RIGHT) */}
                      {top3 ? (
                        <div
                          onClick={() => { setDetailStudent(top3); playOpen(); }}
                          className="flex-1 flex flex-col items-center cursor-pointer group"
                        >
                          {/* Floating Avatar & Score Pill */}
                          <motion.div whileHover={{ y: -6 }} className="flex flex-col items-center mb-3">
                            <div className="relative">
                              {top3.profilePicture ? (
                                <img
                                  src={top3.profilePicture}
                                  alt={top3.name}
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-amber-700 shadow-2xl"
                                />
                              ) : (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-900 text-amber-200 flex items-center justify-center text-xl sm:text-2xl font-black ring-4 ring-amber-700 shadow-2xl">
                                  {top3.name.charAt(0)}
                                </div>
                              )}
                              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-[11px] flex items-center justify-center shadow-lg ring-2 ring-black">
                                3
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-white mt-2 truncate max-w-[100px] sm:max-w-[120px] text-center">
                              {top3.name}
                            </p>

                            <div className="mt-1 px-3 py-1 rounded-full bg-[#242426] border border-white/10 text-[11px] font-bold text-slate-300 flex items-center gap-1.5 shadow-md">
                              <span>🏆</span> {top3.totalObtained} pts
                            </div>
                          </motion.div>

                          {/* 3D Block Pedestal #3 */}
                          <div className="w-full h-28 sm:h-36 bg-gradient-to-b from-[#2c221c] via-[#1e1713] to-[#120e0b] rounded-t-2xl border-t-2 border-amber-700/50 flex flex-col items-center justify-center relative shadow-[inset_0_2px_10px_rgba(255,255,255,0.08)] group-hover:from-[#352922] transition-colors">
                            <span className="text-4xl sm:text-6xl font-black text-amber-700/30 select-none tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              3
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-widest -mt-1">
                              3RD PLACE
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* REST OF LEADERBOARD LIST (RANKS #4+) — CONNECTED BOTTOM PANEL */}
                {restRankers.length > 0 && (
                  <div className="bg-[#161617] rounded-3xl p-4 sm:p-6 border border-white/10 shadow-2xl space-y-2">
                    <h4 className="text-xs font-bold text-[#86868b] uppercase tracking-wider px-2 mb-3">
                      {lang === "bn" ? "পরবর্তী মেধা তালিকা (রোল ৪+)" : "Class Rankers (#4 & Below)"}
                    </h4>

                    <div className="divide-y divide-white/5">
                      {restRankers.map((item, idx) => {
                        const rankNum = idx + 4;
                        const tier = getTier(item.gpa);
                        return (
                          <motion.div
                            key={item.studentId}
                            whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.04)" }}
                            onClick={() => { setDetailStudent(item); playOpen(); }}
                            className="flex items-center justify-between p-3 sm:p-4 rounded-2xl cursor-pointer transition-all gap-3"
                          >
                            {/* Left Rank & Student Info */}
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <span className="text-sm sm:text-base font-black text-[#86868b] w-6 text-center">
                                {rankNum}
                              </span>

                              {item.profilePicture ? (
                                <img
                                  src={item.profilePicture}
                                  alt={item.name}
                                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-white/10 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#242426] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                  {item.name.charAt(0)}
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-white truncate">{item.name}</p>
                                <p className="text-[10px] sm:text-xs text-[#86868b]">
                                  Roll: {item.rollNumber} • ID: {item.studentId}
                                </p>
                              </div>
                            </div>

                            {/* Right Metric Pills */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#242426] text-slate-200 border border-white/10 font-mono">
                                {item.totalObtained} pts
                              </span>

                              <span className="px-2.5 py-1 rounded-full text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 font-mono hidden sm:inline-block">
                                GPA {item.gpa.toFixed(2)}
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-black tier-${tier.toLowerCase()}`}>
                                {tier}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#161617] text-[#86868b] uppercase font-bold text-[10px] border-b border-white/10">
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
                  <tbody className="divide-y divide-white/5 bg-[#161617]/50">
                    {filtered.map((item, idx) => {
                      const displayRank = idx + 1;
                      const tier = getTier(item.gpa);
                      return (
                        <tr
                          key={item.studentId}
                          onClick={() => { setDetailStudent(item); playOpen(); }}
                          className="hover:bg-blue-600/10 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-black">
                            {displayRank === 1 ? (
                              <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center justify-center font-bold">1</span>
                            ) : displayRank === 2 ? (
                              <span className="w-7 h-7 rounded-full bg-slate-400/20 text-slate-300 inline-flex items-center justify-center font-bold">2</span>
                            ) : displayRank === 3 ? (
                              <span className="w-7 h-7 rounded-full bg-amber-800/20 text-amber-500 inline-flex items-center justify-center font-bold">3</span>
                            ) : (
                              <span className="text-[#86868b]">#{displayRank}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {item.profilePicture ? (
                                <img src={item.profilePicture} alt={item.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#242426] text-white flex items-center justify-center font-bold text-xs">
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
                          <td className="py-3.5 px-3 text-center text-[#86868b] font-mono">{item.rollNumber}</td>
                          <td className="py-3.5 px-3 text-center text-[#86868b] font-mono">{item.totalCq}</td>
                          <td className="py-3.5 px-3 text-center text-[#86868b] font-mono">{item.totalMcq}</td>
                          <td className="py-3.5 px-4 text-center font-extrabold text-white font-mono">
                            {item.totalObtained}
                          </td>
                          <td className="py-3.5 px-3 text-center font-black text-blue-400 font-mono">
                            {item.gpa.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-black"
                              style={{
                                backgroundColor: `${GRADE_COLORS[item.overallGrade] || "#86868B"}20`,
                                color: GRADE_COLORS[item.overallGrade] || "#86868B",
                                border: `1px solid ${GRADE_COLORS[item.overallGrade] || "#86868B"}40`,
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
            )}
          </div>

          {/* 5. EXTRA WIDGETS (Weekly Routine, Gallery Showcase, Materials & Events) */}
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
