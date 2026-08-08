"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

interface DashboardChartsProps {
  stats: {
    gradeDistribution: Record<string, number>;
    subjectAverages: Array<{ subject: string; average: number; max: number }>;
    passCount: number;
    failCount: number;
    totalStudents: number;
    highest: number;
    lowest: number;
    average: number;
  };
}

const GRADE_COLORS_MAP: Record<string, string> = {
  "A+": "#10B981", // Emerald
  "A": "#3B82F6",  // Blue
  "A-": "#8B5CF6", // Purple
  "B": "#06B6D4",  // Cyan
  "C": "#F59E0B",  // Amber
  "D": "#F97316",  // Orange
  "F": "#EF4444",  // Red
};

export default function DashboardCharts({ stats }: DashboardChartsProps) {
  const { lang, tSubject } = useI18n();
  const [activeTab, setActiveTab] = useState<"grades" | "subjects" | "passfail">("grades");

  if (!stats) return null;

  // Prepare Grade Data
  const gradeData = Object.entries(stats.gradeDistribution || {})
    .filter(([_, count]) => count > 0)
    .map(([grade, count]) => ({
      name: grade,
      value: count,
      color: GRADE_COLORS_MAP[grade] || "#64748B"
    }));

  // Prepare Subject Data
  const subjectData = (stats.subjectAverages || []).map((s) => ({
    subjectName: tSubject(s.subject),
    average: Number(s.average.toFixed(1)),
    max: s.max || 100,
    percentage: Math.round((s.average / (s.max || 100)) * 100)
  }));

  // Prepare Pass/Fail Data
  const passFailData = [
    { name: lang === "bn" ? "উত্তীর্ণ (Pass)" : "Passed", value: stats.passCount, color: "#10B981" },
    { name: lang === "bn" ? "অনুত্তীর্ণ (Fail)" : "Failed", value: stats.failCount, color: "#EF4444" }
  ];

  const passRate = stats.totalStudents > 0 ? Math.round((stats.passCount / stats.totalStudents) * 100) : 0;

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="liquid-glass-dark px-3 py-2 rounded-xl text-xs shadow-2xl border border-indigo-500/30">
          <p className="font-bold text-white mb-0.5">{label || data.name}</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || data.fill }} />
            <span className="text-slate-300 font-semibold">{data.value} {data.unit || ""}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="liquid-glass-strong rounded-3xl p-5 md:p-7 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
              {lang === "bn" ? "পারফরম্যান্স অ্যানালিটিক্স" : "Performance Analytics & Charts"}
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {lang === "bn" ? "শ্রেণির সামগ্রিক ফলাফলের দৃশ্যমান বিশ্লেষণ" : "Visual breakdown of class grades, subjects, and pass rates"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950/60 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("grades")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "grades"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {lang === "bn" ? "গ্রেড বণ্টন" : "Grade Distribution"}
          </button>
          <button
            onClick={() => setActiveTab("subjects")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "subjects"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {lang === "bn" ? "বিষয়ভিত্তিক গড়" : "Subject Performance"}
          </button>
          <button
            onClick={() => setActiveTab("passfail")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "passfail"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {lang === "bn" ? "পাস/ফেল অনুপাত" : "Pass Ratio"}
          </button>
        </div>
      </div>

      {/* Chart Views */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-[280px]"
      >
        {/* TAB 1: GRADE DISTRIBUTION DONUT */}
        {activeTab === "grades" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 h-[260px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {gradeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">{stats.totalStudents}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {lang === "bn" ? "মোট পরীক্ষার্থী" : "Students"}
                </span>
              </div>
            </div>

            {/* Legend list */}
            <div className="md:col-span-5 grid grid-cols-2 gap-2">
              {gradeData.map((g) => {
                const percentage = stats.totalStudents > 0 ? Math.round((g.value / stats.totalStudents) * 100) : 0;
                return (
                  <div key={g.name} className="liquid-glass-sm p-3 rounded-2xl flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-lg flex-shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="text-xs font-bold text-white">{g.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-200">{g.value}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SUBJECT PERFORMANCE BARS */}
        {activeTab === "subjects" && (
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="subjectName"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="average"
                  name={lang === "bn" ? "গড় নম্বর" : "Average Mark"}
                  radius={[8, 8, 0, 0]}
                  fill="url(#colorSubjectBar)"
                >
                  {subjectData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.average >= 70 ? "#10B981" : entry.average >= 50 ? "#6366F1" : "#EF4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* TAB 3: PASS/FAIL RATIO */}
        {activeTab === "passfail" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-6 h-[240px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    startAngle={180}
                    endAngle={0}
                    dataKey="value"
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-pf-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-3xl font-black text-emerald-400">{passRate}%</span>
                <p className="text-xs text-slate-400 font-medium">
                  {lang === "bn" ? "শ্রেণির সামগ্রিক পাস হার" : "Overall Class Pass Rate"}
                </p>
              </div>
            </div>

            <div className="md:col-span-6 space-y-3">
              <div className="liquid-glass-sm p-4 rounded-2xl flex items-center justify-between border-l-4 border-emerald-500">
                <div>
                  <p className="text-xs text-slate-400 font-semibold">{lang === "bn" ? "পাস করেছে" : "Passed Students"}</p>
                  <p className="text-2xl font-black text-white">{stats.passCount}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                  {passRate}%
                </span>
              </div>

              <div className="liquid-glass-sm p-4 rounded-2xl flex items-center justify-between border-l-4 border-rose-500">
                <div>
                  <p className="text-xs text-slate-400 font-semibold">{lang === "bn" ? "অকৃতকার্য" : "Failed Students"}</p>
                  <p className="text-2xl font-black text-white">{stats.failCount}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400">
                  {100 - passRate}%
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
