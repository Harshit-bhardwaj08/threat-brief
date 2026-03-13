"use client"

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Shield, CheckCircle, ChevronDown, ChevronUp,
  ExternalLink, Target, Zap, ShieldCheck, Eye
} from "lucide-react";
import { PersonalizedThreatResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ThreatCardProps {
  threat: PersonalizedThreatResponse;
  groupLabel?: string;
}

function getSeverityConfig(severity: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return {
        color: "text-[#D70015]",
        bg: "bg-[#FFF2F4]",
        border: "border-[#D70015]/10",
        glow: "shadow-[0_4px_20px_rgba(215,0,21,0.04)]",
        barColor: "bg-[#D70015]",
        barWidth: "w-full",
        icon: <AlertTriangle size={12} className="text-[#D70015]" />,
      };
    case "HIGH":
      return {
        color: "text-[#FF9500]",
        bg: "bg-[#FFF9F0]",
        border: "border-[#FF9500]/10",
        glow: "shadow-[0_4px_20px_rgba(255,149,0,0.04)]",
        barColor: "bg-[#FF9500]",
        barWidth: "w-[75%]",
        icon: <AlertTriangle size={12} className="text-[#FF9500]" />,
      };
    case "MEDIUM":
      return {
        color: "text-[#AF52DE]",
        bg: "bg-[#F5F0FF]",
        border: "border-[#AF52DE]/10",
        glow: "",
        barColor: "bg-[#AF52DE]",
        barWidth: "w-[50%]",
        icon: <Shield size={12} className="text-[#AF52DE]" />,
      };
    default:
      return {
        color: "text-[#008031]",
        bg: "bg-[#F2FFF7]",
        border: "border-[#008031]/10",
        glow: "",
        barColor: "bg-[#008031]",
        barWidth: "w-[25%]",
        icon: <CheckCircle size={12} className="text-[#008031]" />,
      };
  }
}

function getRelevanceConfig(score: number) {
  if (score >= 8) return { bg: "bg-[#FFF2F4]", text: "text-[#D70015]", border: "border-[#D70015]/10" };
  if (score >= 6) return { bg: "bg-[#FFF9F0]", text: "text-[#FF9500]", border: "border-[#FF9500]/10" };
  if (score >= 4) return { bg: "bg-[#F5F0FF]", text: "text-[#AF52DE]", border: "border-[#AF52DE]/10" };
  return { bg: "bg-[#F2F8FF]", text: "text-[#0066CC]", border: "border-[#0066CC]/10" };
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateStr));
  } catch {
    return dateStr.split("T")[0];
  }
}

function extractMitigations(summary: string): string[] {
  const lines = summary.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const mitigationKeywords = ["update", "patch", "upgrade", "disable", "restrict", "configure", "apply", "enable", "mitigate", "fix", "remediat"];
  return lines.filter(line =>
    mitigationKeywords.some(kw => line.toLowerCase().includes(kw))
  ).slice(0, 3);
}

export function ThreatCard({ threat }: ThreatCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sevCfg = getSeverityConfig(threat.severity);
  const relCfg = getRelevanceConfig(threat.relevance_score || 0);
  const mitigations = extractMitigations(threat.ai_summary || "");

  const hasCPEMatch = threat.matched_tech?.some(t => t.match_type === "Precise (CPE)");
  const matchTypeLabel = hasCPEMatch ? "CPE ✓" : "KWD ≈";
  const matchTypeTip = hasCPEMatch ? "Precise CPE Match" : "Semantic Keyword Match";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25 }}
      className={cn(
        "rounded-[24px] bg-white transition-all duration-300 cursor-pointer group shadow-[0_4px_24px_rgba(0,0,0,0.04)]",
        expanded ? "ring-2 ring-[#0066CC]/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]" : "hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:scale-[1.005]"
      )}
    >
      {/* === COLLAPSED HEADER === */}
      <div
        className="p-4 flex flex-col gap-2"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: CVE ID + Date */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "font-semibold text-base tracking-tight transition-all",
                sevCfg.color
              )}>
                {threat.cve_id}
              </span>
              <span className="text-[11px] font-medium text-[#86868B]">
                {formatDate(threat.published_date)}
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              {/* Severity badge */}
              <span className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full",
                sevCfg.bg, sevCfg.color
              )}>
                {threat.severity || "UNKNOWN"}
              </span>
              {/* Active exploit */}
              {threat.is_actively_exploited && (
                <span
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#D70015]/10 text-[#D70015]"
                >
                  <Zap size={9} className="fill-[#D70015]" /> ACTIVE EXPLOIT
                </span>
              )}
              {/* Patch badge */}
              {threat.is_patched && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0066CC]/5 text-[#0066CC]">
                  <ShieldCheck size={9} /> Patched
                </span>
              )}
            </div>
          </div>

          {/* Right: Relevance score */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
              relCfg.bg, relCfg.text
            )}>
              <Target size={11} />
              {threat.relevance_score || 0}/10
            </div>
            {threat.epss_score !== undefined && threat.epss_score > 0 && (
              <span className="text-[10px] font-bold text-[#FF9500] bg-[#FF9500]/5 px-2.5 py-1 rounded-full">
                EPSS {(threat.epss_score * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* AI summary */}
        <p className="text-[15px] text-[#1D1D1F] font-medium leading-relaxed line-clamp-2 px-0.5">
          {threat.ai_summary}
        </p>

        {/* Expand toggle */}
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
          <div className="flex gap-1.5 flex-wrap">
            {threat.matched_tech?.slice(0, 3).map(tech => (
              <span key={tech.name} className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                tech.match_type === "Precise (CPE)"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-sky-500/10 text-sky-400 border-sky-500/20"
              )}>
                {tech.match_type === "Precise (CPE)" ? "✓" : "≈"} {tech.name}
              </span>
            ))}
          </div>
          <button className="flex items-center gap-1 text-[10px] font-mono font-medium text-gray-500 hover:text-gray-300 transition-colors">
            {expanded ? (
              <><ChevronUp size={12} /> Less</>
            ) : (
              <><ChevronDown size={12} /> More</>
            )}
          </button>
        </div>
      </div>

      {/* === EXPANDED STATE === */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden bg-[#FBFBFD] rounded-b-[24px] border-t border-[#F5F5F7]"
          >
            <div className="px-6 py-6 space-y-6">
              {/* CVSS Score Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">Risk Level</span>
                  <span className={cn("text-[11px] font-bold", sevCfg.color)}>
                    {threat.severity || "UNKNOWN"}
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E8E8ED] rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", sevCfg.barColor)}
                    initial={{ width: 0 }}
                    animate={{ width: undefined }}
                    style={{ width: undefined }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <div className={cn("h-full rounded-full", sevCfg.barColor, sevCfg.barWidth)} />
                  </motion.div>
                </div>
              </div>

              {/* Full AI Summary */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={14} className="text-[#0066CC]" />
                  <span className="text-[11px] font-bold text-[#0066CC] uppercase tracking-wider">SOC Intelligence</span>
                </div>
                <div className="text-[15px] text-[#1D1D1F] font-medium leading-relaxed bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  {threat.ai_summary || "No AI summary available."}
                </div>
              </div>

              {/* Mitigation Steps */}
              {mitigations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-mono text-emerald-500 font-semibold uppercase tracking-wider">Mitigation</span>
                  </div>
                  <ul className="space-y-1.5">
                    {mitigations.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="text-emerald-500 font-mono text-xs flex-shrink-0 mt-0.5">›</span>
                        <span>{step}.</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bottom row: All tech tags + NVD link */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-1.5 flex-wrap">
                  {threat.matched_tech?.map(tech => (
                    <span key={tech.name} className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                      tech.match_type === "Precise (CPE)"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                    )}>
                      {tech.match_type === "Precise (CPE)" ? "✓" : "≈"} {tech.name}
                    </span>
                  ))}
                </div>
                <a
                  href={`https://nvd.nist.gov/vuln/detail/${threat.cve_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400 hover:text-indigo-300 font-medium transition-colors border border-indigo-500/20 hover:border-indigo-500/40 px-2.5 py-1 rounded-lg bg-indigo-500/10"
                >
                  <ExternalLink size={10} /> NVD →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
