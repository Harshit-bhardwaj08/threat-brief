"use client"

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, ShieldOff, TrendingUp, Calendar } from "lucide-react";
import { PersonalizedThreatResponse } from "@/lib/api";

interface MorningBriefingBannerProps {
  threats: PersonalizedThreatResponse[];
  username?: string;
}

type RiskLevel = "NOMINAL" | "ELEVATED" | "CRITICAL";

function getRiskLevel(threats: PersonalizedThreatResponse[]): RiskLevel {
  const criticals = threats.filter(t => t.severity?.toUpperCase() === "CRITICAL").length;
  const actives = threats.filter(t => t.is_actively_exploited).length;
  if (criticals >= 3 || actives >= 1) return "CRITICAL";
  if (threats.length > 0) return "ELEVATED";
  return "NOMINAL";
}

const RISK_CONFIG = {
  CRITICAL: {
    label: "CRITICAL THREAT",
    color: "text-[#D70015]", // Apple System Red
    bg: "bg-[#FFF2F4] border border-[#D70015]/10",
    iconBg: "bg-[#D70015]/10",
    statusDot: "bg-[#D70015]",
    icon: ShieldOff,
    statColor: "text-[#D70015]",
  },
  ELEVATED: {
    label: "ELEVATED RISK",
    color: "text-[#AF52DE]", // Apple System Purple
    bg: "bg-[#F5F0FF] border border-[#AF52DE]/10",
    iconBg: "bg-[#AF52DE]/10",
    statusDot: "bg-[#AF52DE]",
    icon: AlertTriangle,
    statColor: "text-[#AF52DE]",
  },
  NOMINAL: {
    label: "SYSTEMS NOMINAL",
    color: "text-[#008031]", // Apple System Green
    bg: "bg-[#F2FFF7] border border-[#008031]/10",
    iconBg: "bg-[#008031]/10",
    statusDot: "bg-[#008031]",
    icon: CheckCircle,
    statColor: "text-[#008031]",
  },
};

export function MorningBriefingBanner({ threats, username }: MorningBriefingBannerProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const riskLevel = getRiskLevel(threats);
  const cfg = RISK_CONFIG[riskLevel];
  const Icon = cfg.icon;

  const criticals = threats.filter(t => t.severity?.toUpperCase() === "CRITICAL").length;
  const highs = threats.filter(t => t.severity?.toUpperCase() === "HIGH").length;
  const actives = threats.filter(t => t.is_actively_exploited).length;
  const coreMatches = threats.filter(t => t.matched_tech && t.matched_tech.length > 0).length;

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(new Date());

  const summaryText = (() => {
    if (riskLevel === "NOMINAL") return "Your infrastructure is clear. No active threats detected against your core stack.";
    const parts: string[] = [];
    if (coreMatches > 0) parts.push(`${coreMatches} CVE${coreMatches !== 1 ? "s" : ""} affect your Core Stack`);
    if (actives > 0) parts.push(`${actives} actively exploited`);
    if (criticals > 0) parts.push(`${criticals} CRITICAL severity`);
    if (highs > 0) parts.push(`${highs} HIGH severity`);
    return parts.join(" · ") + ".";
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-3xl ${cfg.bg} p-5`}
    >
      <div className="flex items-center gap-5">
        {/* Icon */}
        <div className={`hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl ${cfg.iconBg} flex-shrink-0`}>
          <Icon size={26} className={cfg.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <motion.div
              className={`w-2 h-2 rounded-full ${cfg.statusDot}`}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className={`text-xs font-mono tracking-[0.2em] uppercase font-semibold ${cfg.color}`}>
              {cfg.label}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 ml-auto font-mono">
              <Calendar size={10} />
              <span>{today}</span>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1D1D1F]">
            {username ? `${greeting}, ${username}.` : `${greeting} Briefing.`}
          </h2>
          <p className="text-base text-[#86868B] mt-1 font-medium leading-relaxed">{summaryText}</p>
        </div>

        {/* Stats mini-grid */}
        {threats.length > 0 && (
          <div className="hidden lg:grid grid-cols-2 gap-2 flex-shrink-0">
            <StatBadge label="Total" value={threats.length} color="text-[#1D1D1F]" bg="bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]" />
            <StatBadge label="Critical" value={criticals} color="text-[#D70015]" bg="bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]" />
            <StatBadge label="Active" value={actives} color="text-[#AF52DE]" bg="bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]" />
            <StatBadge label="Relevant" value={coreMatches} color="text-[#008031]" bg="bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]" />
          </div>
        )}
      </div>

      {/* Bottom divider */}
      <div className="mt-4 pt-3 border-t border-black/5 flex items-center gap-2 text-[10px] font-mono text-gray-400">
        <TrendingUp size={10} className={cfg.color} />
        <span>THREATBRIEF SOC · REAL-TIME INTELLIGENCE PLATFORM</span>
        <div className={`ml-auto w-1.5 h-1.5 rounded-full ${cfg.statusDot} animate-pulse`} />
      </div>
    </motion.div>
  );
}

function StatBadge({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} border border-white/10 rounded-xl px-3 py-2 text-center min-w-[64px] shadow-sm`}>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[9px] text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}
