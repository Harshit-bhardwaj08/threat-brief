"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ChevronRight,
  Server,
  CheckCircle,
  Loader2,
  Box,
  Code2,
  Database as DbIcon,
  Cloud as CloudIcon,
  Terminal,
  Layers,
  ShieldAlert
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createUser, updateUserStack, TechNode, getUser } from "@/lib/api";

const PRESET_TECHS: { name: string; cpe: string; category: string }[] = [
  { name: "React", cpe: "cpe:2.3:a:facebook:react:*:*:*:*:*:*:*:*", category: "Frontend" },
  { name: "Next.js", cpe: "cpe:2.3:a:vercel:next.js:*:*:*:*:*:*:*:*", category: "Frontend" },
  { name: "Vue", cpe: "cpe:2.3:a:vuejs:vue:*:*:*:*:*:*:*:*", category: "Frontend" },
  { name: "Node.js", cpe: "cpe:2.3:a:nodejs:node.js:*:*:*:*:*:*:*:*", category: "Backend" },
  { name: "Python", cpe: "cpe:2.3:a:python:python:*:*:*:*:*:*:*:*", category: "Backend" },
  { name: "Go", cpe: "cpe:2.3:a:golang:go:*:*:*:*:*:*:*:*", category: "Backend" },
  { name: "PostgreSQL", cpe: "cpe:2.3:a:postgresql:postgresql:*:*:*:*:*:*:*:*", category: "Database" },
  { name: "MongoDB", cpe: "cpe:2.3:a:mongodb:mongodb:*:*:*:*:*:*:*:*", category: "Database" },
  { name: "MySQL", cpe: "cpe:2.3:a:mysql:mysql:*:*:*:*:*:*:*:*", category: "Database" },
  { name: "Redis", cpe: "cpe:2.3:a:redis:redis:*:*:*:*:*:*:*:*", category: "Database" },
  { name: "Docker", cpe: "cpe:2.3:a:docker:docker:*:*:*:*:*:*:*:*", category: "Infra" },
  { name: "Kubernetes", cpe: "cpe:2.3:a:kubernetes:kubernetes:*:*:*:*:*:*:*:*", category: "Infra" },
  { name: "Terraform", cpe: "cpe:2.3:a:hashicorp:terraform:*:*:*:*:*:*:*:*", category: "Infra" },
  { name: "Ansible", cpe: "cpe:2.3:a:ansible:ansible:*:*:*:*:*:*:*:*", category: "Infra" },
  { name: "Prometheus", cpe: "cpe:2.3:a:prometheus:prometheus:*:*:*:*:*:*:*:*", category: "Infra" },
  { name: "AWS", cpe: "cpe:2.3:a:amazon:amazon_web_services:*:*:*:*:*:*:*:*", category: "Cloud" },
  { name: "Azure", cpe: "cpe:2.3:a:microsoft:azure:*:*:*:*:*:*:*:*", category: "Cloud" },
  { name: "GCP", cpe: "cpe:2.3:a:google:google_cloud_platform:*:*:*:*:*:*:*:*", category: "Cloud" },
  { name: "Vercel", cpe: "cpe:2.3:a:vercel:vercel:*:*:*:*:*:*:*:*", category: "Cloud" },
];

const CATEGORIES = ["Frontend", "Backend", "Cloud", "Database", "Infra"];

const CATEGORY_ICONS: Record<string, any> = {
  Frontend: Code2,
  Backend: Terminal,
  Infra: Box,
  Database: DbIcon,
  Cloud: CloudIcon,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState("");
  const [customTechs, setCustomTechs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStep1 = () => {
    if (!username.trim()) {
      setUsernameError("Callsign required to proceed.");
      return;
    }
    setUsernameError("");
    setStep(2);
  };

  const toggleTech = (name: string) => {
    setSelectedTechs(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const addCustomTech = () => {
    if (customInput.trim() && !customTechs.includes(customInput.trim())) {
      setCustomTechs(prev => [...prev, customInput.trim()]);
    }
    setCustomInput("");
  };

  const handleDeploy = async () => {
    setIsSubmitting(true);
    try {
      const stack: TechNode[] = [
        ...PRESET_TECHS.filter(t => selectedTechs.has(t.name)).map(t => ({ name: t.name, cpe: t.cpe })),
        ...customTechs.map(t => ({
          name: t,
          cpe: `cpe:2.3:a:${t.toLowerCase().replace(/\s/g, "_")}:${t.toLowerCase().replace(/\s/g, "_")}:*:*:*:*:*:*:*:*`,
        })),
      ];

      let user = await getUser(1);
      if (!user) {
        user = await createUser(username.trim(), stack);
      } else {
        await updateUserStack(1, stack);
      }

      completeOnboarding(username.trim(), stack);
      router.push("/dashboard");
    } catch (err) {
      console.error("Onboarding error:", err);
      // Failsafe routing
      completeOnboarding(username.trim(), []);
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 md:p-12 relative">
      <div className="w-full max-w-2xl text-[#1D1D1F] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02]">
              <ShieldAlert size={32} className="text-[#1D1D1F]" />
            </div>
          </div>
          <h1 className="text-4xl font-semibold tracking-tighter text-[#1D1D1F]">
            ThreatBrief
          </h1>
          <p className="text-[#86868B] mt-2 text-[10px] font-bold tracking-[0.2em] uppercase">Security Operations Center Setup</p>
        </motion.div>

        <div className="flex items-center justify-center gap-4 mb-10">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-500 ${
                s < step ? "bg-[#1D1D1F] text-white" :
                s === step ? "bg-white text-[#1D1D1F] shadow-sm ring-1 ring-black/[0.1]" :
                "bg-[#E8E8ED] text-[#86868B]"
              }`}>
                {s < step ? <CheckCircle size={16} /> : s}
              </div>
              <span className={`text-[11px] font-semibold uppercase tracking-wider hidden sm:block ${s === step ? "text-[#1D1D1F]" : "text-[#86868B]"}`}>
                {s === 1 ? "Authentication" : "Infrastructure"}
              </span>
              {s < 2 && <ChevronRight size={18} className="text-[#D2D2D7] mx-1" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white rounded-[32px] p-10 shadow-[0_8px_40px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <User size={24} className="text-[#0066CC]" />
                <h2 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">Operator Access</h2>
              </div>
              <p className="text-base text-[#86868B] mb-8 leading-relaxed">
                Enter your secure callsign to initialize your unified threat intelligence feed.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-2.5 block ml-1">
                    Operator Callsign
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleStep1()}
                      className="w-full bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0066CC]/20 focus:ring-4 focus:ring-[#0066CC]/5 rounded-2xl px-5 py-4 text-base font-medium text-[#1D1D1F] placeholder:text-[#A1A1A6] outline-none transition-all"
                      placeholder="e.g. Lead_Architect"
                      autoFocus
                    />
                  </div>
                  {usernameError && (
                    <p className="text-xs text-[#FF3B30] font-medium mt-2 ml-1">{usernameError}</p>
                  )}
                </div>

                <button
                  onClick={handleStep1}
                  className="w-full py-4 rounded-full bg-[#1D1D1F] hover:bg-black text-white font-semibold text-base tracking-wide flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] shadow-sm shadow-black/10 active:scale-[0.98]"
                >
                  Authorization
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.04)] flex flex-col"
            >
              <div className="flex items-center gap-3 mb-1 flex-shrink-0">
                <Server size={20} className="text-[#1D1D1F]" />
                <h2 className="text-xl font-semibold tracking-tight text-[#1D1D1F]">Core Infrastructure</h2>
                {selectedTechs.size + customTechs.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="ml-auto text-[10px] font-bold text-[#1D1D1F] bg-[#1D1D1F]/5 ring-1 ring-black/[0.05] px-2.5 py-1 rounded-full"
                  >
                    {selectedTechs.size + customTechs.length} NODES
                  </motion.span>
                )}
              </div>
              <p className="text-sm text-[#86868B] mb-6 flex-shrink-0 leading-relaxed">
                Define your primary technology ecosystem for real-time relevance scoring.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {CATEGORIES.map(cat => {
                  const techs = PRESET_TECHS.filter(t => t.category === cat);
                  if (techs.length === 0) return null;
                  const Icon = CATEGORY_ICONS[cat] || Layers;
                  const isLarge = cat === "Infra";
                  
                  return (
                    <div 
                      key={cat} 
                      className={`p-6 rounded-3xl bg-white/40 backdrop-blur-md border border-[#E8E8ED] ring-1 ring-black/[0.01] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] transition-all hover:bg-white/60 ${isLarge ? "md:col-span-2" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-sm border border-black/[0.03]">
                          <Icon size={14} className="text-[#1D1D1F]" />
                        </div>
                        <p className="text-[10px] font-bold text-[#1D1D1F] uppercase tracking-[0.2em]">{cat}</p>
                      </div>
                      <div className="flex flex-row flex-wrap gap-2">
                        {techs.map(tech => {
                          const selected = selectedTechs.has(tech.name);
                          return (
                            <motion.button
                              key={tech.name}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => toggleTech(tech.name)}
                              className={`text-[12px] font-medium px-4 py-2 rounded-full transition-all duration-300 border ${
                                selected
                                  ? "bg-[#1D1D1F] border-[#1D1D1F] text-white shadow-md shadow-black/10"
                                  : "bg-white border-[#E8E8ED] text-[#1D1D1F] hover:border-[#D2D2D7] hover:bg-[#F5F5F7]"
                              }`}
                            >
                              {tech.name}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-[#F5F5F7] mt-4">
                <div className="p-6 rounded-3xl bg-[#F5F5F7]/40 border border-[#E8E8ED] ring-1 ring-black/[0.01]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-sm border border-black/[0.03]">
                      <Terminal size={14} className="text-[#1D1D1F]" />
                    </div>
                    <p className="text-[10px] font-bold text-[#1D1D1F] uppercase tracking-[0.2em]">Custom Environment</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCustomTech()}
                      className="flex-1 bg-white border border-[#E8E8ED] focus:border-[#D2D2D7] rounded-xl px-4 py-3 text-sm font-medium text-[#1D1D1F] placeholder:text-[#A1A1A6] outline-none transition-all shadow-sm"
                      placeholder="Add tech..."
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addCustomTech}
                      className="px-6 py-3 rounded-xl bg-[#1D1D1F] text-white font-semibold text-xs hover:bg-black transition-all shadow-md active:scale-95"
                    >
                      Add
                    </motion.button>
                  </div>
                {customTechs.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-4">
                    {customTechs.map(t => (
                      <motion.span 
                        key={t}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 text-[10px] font-bold px-3.5 py-1.5 rounded-full border border-[#E8E8ED] bg-white text-[#1D1D1F] shadow-sm uppercase tracking-wider"
                      >
                        {t}
                        <button onClick={() => setCustomTechs(prev => prev.filter(x => x !== t))} className="text-[#86868B] hover:text-[#FF3B30] transition-colors ml-1">✕</button>
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
            </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleDeploy}
                disabled={isSubmitting || (selectedTechs.size + customTechs.length === 0)}
                className="w-full py-4 mt-8 flex-shrink-0 rounded-2xl bg-[#1D1D1F] hover:bg-black text-white font-semibold text-base tracking-wide flex items-center justify-center gap-2 transition-all duration-500 shadow-xl disabled:opacity-20 disabled:scale-100"
              >
                {isSubmitting ? (
                  <><Loader2 size={20} className="animate-spin" /> Finalizing...</>
                ) : (
                  <><CheckCircle size={20} /> Complete Setup</>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
