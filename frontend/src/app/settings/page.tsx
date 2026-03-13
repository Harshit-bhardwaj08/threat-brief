"use client"

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { TechStackInput } from "@/components/dashboard/TechStackInput";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Shield, Info, ChevronLeft, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetUserStack, updateUserStack, TechNode } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const { userId, onboardingComplete, resetOnboarding, coreStack, setCoreStack } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [draftStack, setDraftStack] = useState<TechNode[]>([]);

  useEffect(() => {
    setDraftStack(coreStack);
  }, [coreStack]);

  const handleTechChange = (newStack: TechNode[]) => {
    setDraftStack(newStack);
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      setCoreStack(draftStack);
      await updateUserStack(userId, draftStack);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save draft stack:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!userId) return;
    const confirmed = window.confirm("🚨 EMERGENCY SYSTEM PURGE: This will wipe your core stack and reset your profile. Proceed?");
    if (confirmed) {
      try {
        await resetUserStack(userId);
        resetOnboarding();
        router.push("/onboarding");
        router.refresh(); 
      } catch (err) {
        console.error("Critical: System reset failed", err);
        alert("System reset failed.");
      }
    }
  };

  if (!onboardingComplete) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 relative z-10">
          
          <div className="flex flex-col gap-6 mb-2">
            <Link 
              href="/dashboard"
              className="group flex items-center gap-2 w-fit px-5 py-2.5 bg-white border border-[#E8E8ED] rounded-full text-[12px] font-bold text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to Command Center
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] bg-white border border-[#E8E8ED] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center">
                <Settings size={22} className="text-[#1D1D1F]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">ThreatBrief</span>
                  <span className="text-[11px] font-bold text-[#D2D2D7]">/</span>
                  <span className="text-[11px] font-bold text-[#0066CC] uppercase tracking-wider">Configuration Hub</span>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">System Settings</h1>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <section className="bg-white px-2 py-4 md:p-8 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-[#E8E8ED]/10 space-y-2">
                <div className="flex flex-col gap-2 px-5 lg:px-6">
                  <div className="flex items-center gap-2">
                    <Shield size={22} className="text-[#0066CC]" />
                    <h2 className="text-xl font-semibold text-[#1D1D1F]">Baseline Infrastructure</h2>
                  </div>
                  <p className="text-[15px] text-[#86868B] leading-relaxed max-w-2xl font-medium">
                    Define the permanent technologies and frameworks used within your organization. 
                    ThreatBrief uses this baseline to generate your <strong className="text-[#1D1D1F]">Priority AI Threat Briefing</strong> and automate risk prioritization.
                  </p>
                </div>

                <div className="pb-0 pt-2">
                     <TechStackInput userId={userId} readOnly={false} onStackChange={handleTechChange} isDraft={true} />
                </div>
                
                {/* Save Changes Button */}
                <div className="px-5 lg:px-6 pt-6 flex flex-col sm:flex-row sm:items-center gap-4 border-t border-[#F5F5F7] mt-4">
                  <button
                    onClick={handleSaveClick}
                    disabled={isSaving || isSaved}
                    className="w-full sm:w-auto px-10 py-4 rounded-full bg-[#1D1D1F] hover:bg-black text-white font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 transition-all duration-300 shadow-lg disabled:opacity-50"
                  >
                    {isSaving ? (
                       <><Loader2 size={18} className="animate-spin" /> SAVING...</>
                    ) : isSaved ? (
                       <><CheckCircle size={18} className="text-emerald-600" /> SAVED</>
                    ) : (
                       "SAVE CHANGES"
                    )}
                  </button>
                  <AnimatePresence>
                     {isSaved && (
                        <motion.span 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5"
                        >
                           <CheckCircle size={14} /> Profile updated
                        </motion.span>
                     )}
                  </AnimatePresence>
                </div>
              </section>

              <section className="bg-white rounded-[32px] p-8 border border-[#E8E8ED]/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-6">
                <h3 className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Deployment Instructions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-6 rounded-2xl bg-[#F5F5F7] space-y-2">
                    <div className="text-[11px] font-bold text-[#0066CC] tracking-wider uppercase">01. Add Nodes</div>
                    <p className="text-[14px] text-[#1D1D1F] leading-relaxed font-medium">
                      Use the input bar to add frameworks (e.g., React, FastAPI), cloud providers, or infrastructure tools.
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl bg-[#F5F5F7] space-y-2">
                    <div className="text-[11px] font-bold text-[#0066CC] tracking-wider uppercase">02. Sync Monitor</div>
                    <p className="text-[14px] text-[#1D1D1F] leading-relaxed font-medium">
                      Changes are synchronized immediately with the NVD analyzer. Your dashboard briefing will update in real-time.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0066CC] rounded-[32px] p-8 text-white shadow-[0_8px_32px_rgba(0,102,204,0.15)] space-y-5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none -mr-12 -mt-12" />
                <div className="flex items-center gap-2 relative z-10">
                  <Info size={18} />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider">Profile Logic</h3>
                </div>
                <div className="space-y-4 relative z-10">
                  <p className="text-[15px] leading-relaxed font-medium">
                    Baseline technologies are considered <strong className="text-white">Critical Assets</strong>. 
                  </p>
                  <ul className="space-y-3">
                    <li className="flex gap-2.5 text-[14px] font-medium items-start">
                      <span className="mt-0.5"><CheckCircle size={16} /></span>
                      <span className="leading-snug">Matches trigger high-priority alerts on the Command Center.</span>
                    </li>
                    <li className="flex gap-2.5 text-[14px] font-medium items-start">
                      <span className="mt-0.5"><CheckCircle size={16} /></span>
                      <span className="leading-snug">Used for primary automated relevance scoring (0-10).</span>
                    </li>
                  </ul>
                </div>
              </motion.div>

              <div className="p-8 bg-white border border-[#D70015]/10 rounded-[32px] space-y-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
                <h4 className="text-[11px] font-bold text-[#D70015] uppercase tracking-wider">Advanced Actions</h4>
                <button 
                  onClick={handleReset}
                  className="w-full text-left px-5 py-4 rounded-2xl bg-[#FFF2F4] hover:bg-[#D70015] text-[#D70015] hover:text-white font-bold transition-all text-[13px] shadow-sm flex items-center justify-between group"
                >
                  ⚠ Reset System Profile
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">PURGE ALL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
