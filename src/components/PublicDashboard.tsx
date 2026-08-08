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

            {/* PODIUM VIEW */}
            {viewMode === "podium" ? (
              <div className="space-y-10">
                {/* OLYMPIC TOP 3 PODIUM PEDESTALS */}
                {filtered.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-end pt-6">
                    {/* 2nd Place Pedestal (Left) */}
                    {top2 ? (
                      <motion.div
                        whileHover={{ y: -6 }}
                        onClick={() => { setDetailStudent(top2); playOpen(); }}
                        className="podium-silver rounded-3xl p-6 cursor-pointer relative overflow-hidden order-2 md:order-1 flex flex-col justify-between min-h-[300px]"
                      >
                        <div className="flex flex-col items-center text-center">
                          <span className="text-2xl mb-1">🥈</span>
                          <div className="relative mb-3">
                            {top2.profilePicture ? (
                              <img src={top2.profilePicture} alt={top2.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-300 shadow-xl" />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-slate-700 text-white flex items-center justify-center text-2xl font-black ring-4 ring-slate-300 shadow-xl">
                                {top2.name.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black bg-slate-300 text-black shadow-md">
                              2ND RANK
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white truncate max-w-full mt-2">{top2.name}</h4>
                          <p className="text-xs text-[#86868b] mb-4">Roll: {top2.rollNumber}</p>
                        </div>

                        <div className="w-full liquid-glass-sm p-3 rounded-2xl text-center space-y-1 border border-white/10">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#86868b]">{lang === "bn" ? "নম্বর" : "Score"}</span>
                            <span className="font-extrabold text-white">{top2.totalObtained} pts</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#86868b]">GPA</span>
                            <span className="font-black text-blue-400 font-mono">{top2.gpa.toFixed(2)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ) : null}

                    {/* 1st Place Pedestal (Center - Highest) */}
                    {top1 ? (
                      <motion.div
                        whileHover={{ y: -8 }}
                        onClick={() => { setDetailStudent(top1); playOpen(); }}
                        className="podium-gold rounded-3xl p-7 cursor-pointer relative overflow-hidden order-1 md:order-2 flex flex-col justify-between min-h-[360px] border-2 border-amber-500/60 shadow-2xl"
                      >
                        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex flex-col items-center text-center">
                          <span className="text-4xl mb-1 animate-bounce">👑</span>
                          <div className="relative mb-3">
                            {top1.profilePicture ? (
                              <img src={top1.profilePicture} alt={top1.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-amber-400 shadow-2xl" />
                            ) : (
                              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center text-3xl font-black ring-4 ring-amber-400 shadow-2xl">
                                {top1.name.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black shadow-xl uppercase tracking-wider">
                              1ST CHAMPION
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white truncate max-w-full mt-3">{top1.name}</h4>
                          <p className="text-xs text-amber-300 font-bold mb-4">Roll: {top1.rollNumber}</p>
                        </div>

                        <div className="w-full liquid-glass-sm p-3.5 rounded-2xl text-center space-y-1.5 border border-amber-500/40 bg-black/40">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-amber-200/70 font-semibold">{lang === "bn" ? "প্রাপ্ত নম্বর" : "Total Obtained"}</span>
                            <span className="font-black text-amber-400 text-sm">{top1.totalObtained} pts</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-amber-200/70 font-semibold">GPA</span>
                            <span className="font-black text-white font-mono text-sm">{top1.gpa.toFixed(2)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ) : null}

                    {/* 3rd Place Pedestal (Right) */}
                    {top3 ? (
                      <motion.div
                        whileHover={{ y: -6 }}
                        onClick={() => { setDetailStudent(top3); playOpen(); }}
                        className="podium-bronze rounded-3xl p-6 cursor-pointer relative overflow-hidden order-3 flex flex-col justify-between min-h-[280px]"
                      >
                        <div className="flex flex-col items-center text-center">
                          <span className="text-2xl mb-1">🥉</span>
                          <div className="relative mb-3">
                            {top3.profilePicture ? (
                              <img src={top3.profilePicture} alt={top3.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-amber-700 shadow-xl" />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-amber-900 text-amber-200 flex items-center justify-center text-2xl font-black ring-4 ring-amber-700 shadow-xl">
                                {top3.name.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black bg-amber-700 text-white shadow-md">
                              3RD RANK
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white truncate max-w-full mt-2">{top3.name}</h4>
                          <p className="text-xs text-[#86868b] mb-4">Roll: {top3.rollNumber}</p>
                        </div>

                        <div className="w-full liquid-glass-sm p-3 rounded-2xl text-center space-y-1 border border-white/10">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#86868b]">{lang === "bn" ? "নম্বর" : "Score"}</span>
                            <span className="font-extrabold text-white">{top3.totalObtained} pts</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#86868b]">GPA</span>
                            <span className="font-black text-blue-400 font-mono">{top3.gpa.toFixed(2)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </div>
                )}

                {/* REST OF PODIUM RANKERS (Ranks 4 to N) */}
                {restRankers.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-t border-white/10 pt-6">
                      <span className="text-sm font-bold text-[#86868b] uppercase tracking-wider">
                        {lang === "bn" ? "পরবর্তী পোডিয়াম স্থানসমূহ" : "Honorable Podium Rankers (Rank #4+)"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {restRankers.map((item, idx) => {
                        const rankNum = idx + 4;
                        const tier = getTier(item.gpa);
                        return (
                          <motion.div
                            key={item.studentId}
                            whileHover={{ y: -3 }}
                            onClick={() => { setDetailStudent(item); playOpen(); }}
                            className="liquid-glass-sm p-4 rounded-2xl border border-white/10 hover:border-blue-500/40 cursor-pointer space-y-3 transition-all relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600/20 text-blue-400 border border-blue-500/30">
                                Rank #{rankNum}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black tier-${tier.toLowerCase()}`}>
                                Tier {tier}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {item.profilePicture ? (
                                <img src={item.profilePicture} alt={item.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/10" />
                              ) : (
                                <div className="w-12 h-12 rounded-2xl bg-[#242426] text-white flex items-center justify-center font-bold text-lg">
                                  {item.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                                <p className="text-xs text-[#86868b]">Roll: {item.rollNumber}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-center text-xs">
                              <div>
                                <span className="text-[9px] text-[#86868b] block">CQ</span>
                                <span className="font-bold text-slate-300">{item.totalCq}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-[#86868b] block">MCQ</span>
                                <span className="font-bold text-slate-300">{item.totalMcq}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-[#86868b] block">GPA</span>
                                <span className="font-black text-blue-400">{item.gpa.toFixed(2)}</span>
                              </div>
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
