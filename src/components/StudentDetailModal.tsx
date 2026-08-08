"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { GRADE_COLORS } from "@/lib/constants";

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
  subjectRanks?: Record<string, number | null>;
  gpa: number;
  hasMarks: boolean;
}

interface StudentDetailModalProps {
  student: StudentResult | null;
  onClose: () => void;
  examType?: string;
  schoolName?: string;
}

export default function StudentDetailModal({
  student,
  onClose,
  examType = "Exam",
  schoolName = "Sunshine Academy",
}: StudentDetailModalProps) {
  const { lang, tSubject, tExam } = useI18n();

  if (!student) return null;

  const getTier = (gpa: number) => {
    if (gpa >= 5.0) return "S";
    if (gpa >= 4.0) return "A";
    if (gpa >= 3.5) return "B";
    if (gpa >= 3.0) return "C";
    return "D";
  };

  const tier = getTier(student.gpa);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative liquid-glass-strong rounded-3xl overflow-hidden max-w-3xl w-full border border-indigo-500/20 shadow-2xl z-10 my-8"
        >
          {/* Top Banner Gradient */}
          <div className="h-32 bg-gradient-to-r from-indigo-900 via-indigo-600 to-blue-600 relative overflow-hidden p-6 flex items-start justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 text-white">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/30 backdrop-blur-md border border-white/20">
                {schoolName} • {tExam(examType)}
              </span>
              <h2 className="text-xl md:text-2xl font-black mt-1 tracking-tight">
                {lang === "bn" ? "শিক্ষার্থীর রিপোর্ট কার্ড" : "Student Academic Spotlight"}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="relative z-10 w-9 h-9 rounded-full bg-black/40 text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/20"
            >
              ✕
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Student Info Card Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 -mt-14 relative z-20">
              {student.profilePicture ? (
                <img
                  src={student.profilePicture}
                  alt={student.name}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-slate-900 shadow-2xl bg-slate-800"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl gradient-royal flex items-center justify-center text-white text-3xl font-black ring-4 ring-slate-900 shadow-2xl">
                  {student.name.charAt(0)}
                </div>
              )}

              <div className="flex-1 text-center sm:text-left min-w-0 pt-2 sm:pt-4">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h3 className="text-2xl font-extrabold text-white tracking-tight">{student.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black text-white tier-${tier.toLowerCase()}`}>
                    Tier {tier}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {lang === "bn" ? "রোল নম্বর:" : "Roll:"} <strong className="text-slate-200">{student.rollNumber}</strong> • {lang === "bn" ? "আইডি:" : "ID:"} <strong className="text-slate-200">{student.studentId}</strong>
                </p>
              </div>

              {/* Rank Pill */}
              <div className="liquid-glass-sm px-5 py-3 rounded-2xl text-center border border-indigo-500/30 flex-shrink-0">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                  {lang === "bn" ? "শ্রেণি মেধা স্থান" : "Class Rank"}
                </span>
                <span className="text-3xl font-black text-indigo-400">
                  {student.rank ? `#${student.rank}` : "—"}
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="liquid-glass-sm p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GPA</span>
                <span className="text-2xl font-black text-indigo-400">{student.gpa.toFixed(2)}</span>
              </div>

              <div className="liquid-glass-sm p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === "bn" ? "প্রাপ্ত নম্বর" : "Total Marks"}
                </span>
                <span className="text-2xl font-black text-white">{student.totalObtained} / {student.maxPossibleTotal}</span>
              </div>

              <div className="liquid-glass-sm p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === "bn" ? "গড় শতাংশ" : "Average"}
                </span>
                <span className="text-2xl font-black text-emerald-400">{student.average}%</span>
              </div>

              <div className="liquid-glass-sm p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === "bn" ? "ফলাফল" : "Status"}
                </span>
                <span className={`text-2xl font-black ${student.overallPass ? "text-emerald-400" : "text-rose-400"}`}>
                  {student.overallPass ? (lang === "bn" ? "উত্তীর্ণ" : "PASS") : (lang === "bn" ? "অনুত্তীর্ণ" : "FAIL")}
                </span>
              </div>
            </div>

            {/* Subject Marks Table */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                {lang === "bn" ? "বিষয়ভিত্তিক প্রাপ্ত নম্বরের বিবরণ" : "Subject Mark Breakdown"}
              </h4>

              <div className="liquid-glass-sm rounded-2xl overflow-hidden border border-white/5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">{lang === "bn" ? "বিষয়" : "Subject"}</th>
                      <th className="py-3 px-3 text-center">CQ</th>
                      <th className="py-3 px-3 text-center">MCQ</th>
                      <th className="py-3 px-4 text-center">{lang === "bn" ? "মোট" : "Total"}</th>
                      <th className="py-3 px-3 text-center">{lang === "bn" ? "গ্রেড" : "Grade"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {student.subjects?.map((sub) => (
                      <tr key={sub.subject} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {tSubject(sub.subject)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-300 font-mono">{sub.cq}</td>
                        <td className="py-3 px-3 text-center text-slate-300 font-mono">{sub.mcq}</td>
                        <td className="py-3 px-4 text-center font-bold text-white font-mono">
                          {sub.total} <span className="text-[10px] text-slate-500">/ {sub.maxTotal}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-black"
                            style={{
                              backgroundColor: `${GRADE_COLORS[sub.grade] || "#64748B"}20`,
                              color: GRADE_COLORS[sub.grade] || "#64748B",
                              border: `1px solid ${GRADE_COLORS[sub.grade] || "#64748B"}40`,
                            }}
                          >
                            {sub.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handlePrint}
                className="gradient-royal text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                {lang === "bn" ? "প্রিন্ট করুন" : "Print Report Card"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
