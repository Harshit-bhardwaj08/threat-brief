"use client"

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThreatCard } from "@/components/dashboard/ThreatCard";
import { scanSandboxThreats, PersonalizedThreatResponse } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, X, Search, Info, ShieldAlert, Loader2 } from "lucide-react";

export default function SandboxPage() {
  const { onboardingComplete, investigationStack, addSandboxTag, removeSandboxTag } = useApp();
  const [inputVal, setInputVal] = useState("");
  const [sandboxThreats, setSandboxThreats] = useState<PersonalizedThreatResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const performScan = useCallback(async (tags: string[]) => {
    if (tags.length === 0) {
      setSandboxThreats([]);
      return;
    }
    setLoading(true);
    try {
      const data = await scanSandboxThreats(tags);
      setSandboxThreats(data.threats || []);
    } catch (err) {
      console.error("Sandbox scan failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tags = investigationStack.map(t => t.name);
    performScan(tags);
  }, [investigationStack, performScan]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputVal.trim()) {
      e.preventDefault();
      addSandboxTag(inputVal.trim());
      setInputVal("");
    }
  };

  if (!onboardingComplete) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 relative z-10 custom-scrollbar">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[14px] bg-white border border-[#E8E8ED] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <FlaskConical size={22} className="text-[#FF9500]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">ThreatBrief</span>
                <span className="text-[11px] font-bold text-[#D2D2D7]">/</span>
                <span className="text-[11px] font-bold text-[#FF9500] uppercase tracking-wider">Investigation Hub</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">Threat Sandbox</h1>
            </div>
          </div>

          <div className="max-w-4xl mx-auto w-full space-y-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white p-10 md:p-12 rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-[#E8E8ED]/10"
            >
              <div className="flex flex-col items-center text-center mb-10 space-y-4">
                <h2 className="text-2xl font-semibold text-[#1D1D1F]">Active Investigation</h2>
                <p className="text-[16px] text-[#86868B] max-w-lg font-medium leading-relaxed">
                  Inject temporary technology tags to pivot your focus. Sandbox analysis does not affect your baseline profile.
                </p>
              </div>

              {/* Large Input Bar */}
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[#FF9500] text-[#86868B]">
                  <Search size={22} />
                </div>
                <input
                  type="text"
                  className="w-full bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#FF9500]/30 focus:ring-4 focus:ring-[#FF9500]/10 rounded-[22px] pl-14 pr-4 py-5 text-lg font-semibold text-[#1D1D1F] placeholder:text-[#86868B] outline-none transition-all"
                  placeholder="Enter technology to investigate..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <kbd className="hidden md:inline-flex h-8 select-none items-center gap-1 rounded-lg border border-[#D2D2D7] bg-white px-3 font-bold text-[11px] text-[#86868B] shadow-sm">
                    ENTER
                  </kbd>
                </div>
              </div>

              {/* Tag Cloud */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-6 min-h-[40px]">
                <AnimatePresence mode="popLayout">
                  {investigationStack.map((tag) => (
                    <motion.div
                      key={tag.name}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-full px-5 py-2.5 text-sm font-bold text-[#FF9500] hover:bg-[#FF9500]/10 transition-all shadow-sm"
                    >
                      <span>{tag.name}</span>
                      <button
                         onClick={() => removeSandboxTag(tag.name)}
                        className="text-[#FF9500]/50 hover:text-[#D70015] transition-colors ml-1 focus:outline-none"
                      >
                         <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {investigationStack.length === 0 && (
                  <div className="flex items-center gap-2 text-gray-500 font-mono text-[10px] uppercase tracking-widest font-semibold">
                    <Info size={14} />
                    <span>Awaiting Investigation Parameters</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sandbox Feed Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#D2D2D7] pb-4 mt-12">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={20} className="text-[#FF9500]" />
                  <h3 className="text-base font-bold text-[#1D1D1F] uppercase tracking-wider">Sandbox Intel Stream</h3>
                </div>
                <div className="flex items-center gap-4">
                  {loading && (
                    <div className="flex items-center gap-2 text-[#FF9500] font-bold animate-pulse">
                      <Loader2 size={12} className="animate-spin" />
                      <span className="text-[11px]">SCANNING...</span>
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider hidden sm:block">Strict Matching Center</span>
                  <button 
                    onClick={() => {
                        investigationStack.forEach(t => removeSandboxTag(t.name));
                    }}
                    className="text-[10px] font-mono font-bold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                  >
                    [PURGE ALL]
                  </button>
                </div>
              </div>

              <div className="space-y-4 min-h-[200px]">
                {loading && sandboxThreats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-[#FF9500]" />
                    <p className="text-base font-bold text-[#FF9500] animate-pulse tracking-widest uppercase">Analyzing Sandbox Pivot...</p>
                  </div>
                ) : sandboxThreats.length > 0 ? (
                  sandboxThreats.map((threat, idx) => (
                    <motion.div
                      key={threat.cve_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <ThreatCard threat={threat} />
                    </motion.div>
                  ))
                ) : (
                  <div className="p-16 text-center bg-white border border-[#E8E8ED] rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <p className="text-[15px] font-medium text-[#86868B]">
                      {investigationStack.length > 0 ? "No threats matching active investigation tags." : "Add technology tags above to begin an analytical pivot."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
