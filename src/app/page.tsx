"use client";

import { useState, useEffect } from "react";
import ToastContainer from "@/components/Toast";
import PublicDashboard from "@/components/PublicDashboard";
import LoginModal from "@/components/LoginModal";
import DynamicIsland from "@/components/DynamicIsland";
import DashNav from "@/components/DashNav";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { playToggle, playOpen } from "@/lib/sounds";

function HomeContent() {
  const { t, lang, toggleLang } = useI18n();
  const [showLogin, setShowLogin] = useState(false);
  const [settings, setSettings] = useState<{ schoolName: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => setSettings(d)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[130px]" />
      </div>

      <DynamicIsland />

      {/* Hero Header */}
      <header className="relative pt-6 pb-16 md:pb-24 overflow-hidden border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Top Navigation */}
          <div className="flex items-center justify-between gap-4 py-2">
            {/* School Logo & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/20 flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-xl font-black text-white tracking-tight truncate">
                  {settings?.schoolName || "Sunshine Academy"}
                </h1>
                <p className="text-[10px] md:text-xs text-indigo-300 truncate font-medium">
                  {t("site.subtitle")}
                </p>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <a
                href="/portal"
                className="liquid-glass-sm text-white px-3.5 py-2 md:px-4 md:py-2.5 rounded-2xl text-xs md:text-sm font-semibold transition-all hover:bg-white/10 flex items-center gap-2 border border-white/10"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <span className="hidden sm:inline">{lang === "bn" ? "স্টুডেন্ট পোর্টাল" : "Student Portal"}</span>
              </a>

              <button
                onClick={() => { toggleLang(); playToggle(); }}
                className="liquid-glass-sm px-3 py-2 rounded-2xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 border border-white/10"
              >
                <span>🌐</span>
                <span className="hidden sm:inline">{lang === "en" ? "বাংলা" : "English"}</span>
                <span className="sm:hidden">{lang === "en" ? "BN" : "EN"}</span>
              </button>

              <button
                onClick={() => { setShowLogin(true); playOpen(); }}
                className="gradient-royal text-white px-4 py-2 md:px-5 md:py-2.5 rounded-2xl text-xs md:text-sm font-bold shadow-lg shadow-indigo-600/30 hover:brightness-110 transition-all flex items-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>{t("nav.admin_login")}</span>
              </button>
            </div>
          </div>

          {/* Hero Banner Text */}
          <div className="mt-10 md:mt-14 text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {t("nav.live")}
            </div>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
              {t("dash.result")}
            </h2>

            <p className="text-sm md:text-base text-slate-400 font-normal leading-relaxed max-w-xl mx-auto">
              {t("dash.desc")}
            </p>
          </div>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-16 relative z-10">
        <PublicDashboard />
      </main>

      <footer className="py-8 text-center text-xs text-slate-500 border-t border-white/10">
        <p>© 2025 {settings?.schoolName || "Sunshine Academy"}. {t("footer.rights")}</p>
      </footer>

      <DashNav />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      <ToastContainer />
    </div>
  );
}

export default function HomePage() {
  return (
    <I18nProvider>
      <HomeContent />
    </I18nProvider>
  );
}
