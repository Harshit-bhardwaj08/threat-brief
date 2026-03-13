"use client"

import { useState, useEffect, useMemo, useRef } from "react";
import { Loader2, CheckCircle, Newspaper, AlertTriangle, Zap, Globe } from "lucide-react";
import { getPersonalizedThreats, PersonalizedThreatResponse, PersonalizedDashboardResponse, NewsItem } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { ThreatCard } from "@/components/dashboard/ThreatCard";
import { motion } from "framer-motion";

interface ThreatFeedProps {
  userId: number;
  triggerRefresh: number;
  onThreatsLoaded?: (data: PersonalizedDashboardResponse) => void;
  filterMode?: "all" | "core-only" | "sandbox-only";
}

function severityWeight(severity: string): number {
  switch (severity?.toUpperCase()) {
    case "CRITICAL": return 4;
    case "HIGH": return 3;
    case "MEDIUM": return 2;
    case "LOW": return 1;
    default: return 0;
  }
}

function GroupDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="h-[0.5px] flex-1 bg-[#D2D2D7]" />
      <span className="text-[11px] font-bold text-[#86868B] tracking-widest uppercase whitespace-nowrap">
        {label} · {count}
      </span>
      <div className="h-[0.5px] flex-1 bg-[#D2D2D7]" />
    </div>
  );
}

function NewsFeedList({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3 bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-4">
        <AlertTriangle className="w-8 h-8 text-[#86868B]" />
        <p className="text-sm font-medium text-[#86868B]">No industry intelligence available at this time.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {news.map((item, i) => (
        <motion.a
          key={item.link}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="group flex flex-col gap-2 p-5 rounded-[24px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:scale-[1.005] transition-all duration-300"
        >
          <div className="flex items-start justify-between gap-4">
            <h4 className="text-[15px] font-semibold text-[#1D1D1F] group-hover:text-[#0066CC] transition-colors line-clamp-2 leading-relaxed">
              {item.title}
            </h4>
            <span className="text-[10px] font-bold text-[#86868B] whitespace-nowrap bg-[#F5F5F7] px-2.5 py-1 rounded-full uppercase tracking-wider">
              {item.source}
            </span>
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            <div className="flex gap-1.5 focus:outline-none">
              {item.matched_tech.slice(0, 3).map((tag: string) => (
                <span key={tag} className="text-[9px] font-mono text-indigo-400 font-medium px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="h-1 w-1 rounded-full bg-gray-600" />
            {item.pub_date && (
              <span className="text-[10px] text-gray-400 font-mono">
                {item.pub_date.split(" ").slice(1, 4).join(" ")}
              </span>
            )}
          </div>
        </motion.a>
      ))}
    </div>
  );
}

function IntelligenceTabs({ 
  activeTab, 
  setActiveTab, 
  threatCount, 
  newsCount 
}: { 
  activeTab: 'threats' | 'news'; 
  setActiveTab: (tab: 'threats' | 'news') => void;
  threatCount: number;
  newsCount: number;
}) {
  return (
    <div className="flex items-center p-1 rounded-full bg-[#E8E8ED]/50 backdrop-blur-md w-fit">
      <button
        onClick={() => setActiveTab('threats')}
        className={`relative flex items-center gap-2 px-6 py-2 rounded-full text-[12px] font-bold tracking-tight transition-all duration-300 ${
          activeTab === 'threats' 
            ? 'text-[#1D1D1F] bg-white shadow-sm' 
            : 'text-[#86868B] hover:text-[#1D1D1F]'
        }`}
      >
        <Zap size={14} className={activeTab === 'threats' ? 'text-[#0066CC]' : 'text-[#86868B]'} />
        Active Threats
        <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 ${
          activeTab === 'threats' ? 'bg-[#0066CC]/10 text-[#0066CC]' : 'bg-[#D2D2D7]/50 text-[#86868B]'
        }`}>
          {threatCount}
        </span>
      </button>
      
      <button
        onClick={() => setActiveTab('news')}
        className={`relative flex items-center gap-2 px-6 py-2 rounded-full text-[12px] font-bold tracking-tight transition-all duration-300 ${
          activeTab === 'news' 
            ? 'text-[#1D1D1F] bg-white shadow-sm' 
            : 'text-[#86868B] hover:text-[#1D1D1F]'
        }`}
      >
        <Globe size={14} className={activeTab === 'news' ? 'text-[#0066CC]' : 'text-[#86868B]'} />
        Industry Intel
        <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 ${
          activeTab === 'news' ? 'bg-[#0066CC]/10 text-[#0066CC]' : 'bg-[#D2D2D7]/50 text-[#86868B]'
        }`}>
          {newsCount}
        </span>
      </button>
    </div>
  );
}

export function ThreatFeed({ userId, triggerRefresh, onThreatsLoaded, filterMode = "all" }: ThreatFeedProps) {
  const { threats, news: contextNews, investigationStack, isLoadingThreats, setThreats, setNews, setIsLoadingThreats, setLastSync } = useApp();
  const [activeTab, setActiveTab] = useState<'threats' | 'news'>('threats');
  const lastScrollTime = useRef<number>(0);

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 400) return;

    if (activeTab === 'threats' && e.deltaY > 50) {
      setActiveTab('news');
      lastScrollTime.current = now;
    } else if (activeTab === 'news' && e.deltaY < -50 && window.scrollY <= 10) {
      setActiveTab('threats');
      lastScrollTime.current = now;
    }
  };

  useEffect(() => {
    async function fetchThreats() {
      setIsLoadingThreats(true);
      try {
        const data = await getPersonalizedThreats(userId);
        const fetchedThreats = data.threats || [];
        setThreats(fetchedThreats);
        setNews(data.news || []);
        setLastSync(new Date().toISOString());
        if (onThreatsLoaded) onThreatsLoaded(data);
      } catch (error) {
        console.error("Failed to fetch threats:", error);
      } finally {
        setIsLoadingThreats(false);
      }
    }
    fetchThreats();
  }, [userId, triggerRefresh]);

  const sandboxNames = useMemo(
    () => investigationStack.map(t => t.name.toLowerCase()),
    [investigationStack]
  );

  const { coreMatches, sandboxMatches, others } = useMemo(() => {
    const core: PersonalizedThreatResponse[] = [];
    const sandbox: PersonalizedThreatResponse[] = [];
    const rest: PersonalizedThreatResponse[] = [];

    for (const t of threats) {
      const hasCoreMatch = t.matched_tech && t.matched_tech.length > 0;
      const hasSandboxMatch = sandboxNames.length > 0 && sandboxNames.some(s =>
        t.ai_summary?.toLowerCase().includes(s) ||
        t.matched_tech?.some(m => m.name.toLowerCase().includes(s))
      );

      if (hasCoreMatch) {
        core.push(t);
      } else if (hasSandboxMatch) {
        sandbox.push(t);
      } else {
        rest.push(t);
      }
    }

    const sortFn = (a: PersonalizedThreatResponse, b: PersonalizedThreatResponse) => {
      const scoreDiff = (b.relevance_score || 0) - (a.relevance_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return severityWeight(b.severity) - severityWeight(a.severity);
    };

    return {
      coreMatches: core.sort(sortFn),
      sandboxMatches: sandbox.sort(sortFn),
      others: rest.sort(sortFn),
    };
  }, [threats, sandboxNames]);

  const news = (contextNews || []) as NewsItem[];

  if (isLoadingThreats && threats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm font-mono text-gray-500 uppercase tracking-widest animate-pulse">Analyzing Intel Stream...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" onWheel={handleWheel}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <IntelligenceTabs 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          threatCount={threats.length} 
          newsCount={news.length}
        />
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[10px] font-mono text-indigo-400 font-semibold uppercase tracking-widest whitespace-nowrap">
            STRICT MATCHING ACTIVE
          </span>
        </div>
      </div>

      <div className="space-y-3 min-h-[400px]">
        {/* --- THREATS TAB --- */}
        {activeTab === 'threats' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {threats.length === 0 ? (
              <div className="space-y-8 py-2">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-1">Systems Nominal</h3>
                    <p className="text-xs font-mono text-emerald-500/80 max-w-xs mx-auto leading-relaxed">
                      No active threats detected against your core profile. Performance baseline secure.
                    </p>
                  </div>
                </motion.div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <Newspaper size={16} className="text-indigo-400" />
                    <h3 className="text-[11px] font-mono font-bold text-gray-200 uppercase tracking-widest">Latest Industry Intel</h3>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <NewsFeedList news={news.slice(0, 5)} />
                </div>
              </div>
            ) : (
              <>
                {filterMode !== "sandbox-only" && coreMatches.length > 0 && (
                  <div className="space-y-3">
                    {filterMode === "all" && <GroupDivider label="Core Baseline Matches" count={coreMatches.length} />}
                    {coreMatches.map((threat, i) => (
                      <motion.div key={threat.cve_id + "-core"} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <ThreatCard threat={threat} />
                      </motion.div>
                    ))}
                  </div>
                )}

                {filterMode !== "core-only" && sandboxMatches.length > 0 && (
                  <div className="space-y-3 mt-6">
                    {filterMode === "all" && <GroupDivider label="Active Investigation Matches" count={sandboxMatches.length} />}
                    {sandboxMatches.map((threat, i) => (
                      <motion.div key={threat.cve_id + "-sandbox"} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <ThreatCard threat={threat} />
                      </motion.div>
                    ))}
                  </div>
                )}

                {filterMode === "all" && others.length > 0 && (
                  <div className="space-y-3 mt-6">
                    {(coreMatches.length > 0 || sandboxMatches.length > 0) && (
                      <GroupDivider label="Non-Targeted Intel" count={others.length} />
                    )}
                    {others.map((threat, i) => (
                      <motion.div key={threat.cve_id + "-other"} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                        <ThreatCard threat={threat} />
                      </motion.div>
                    ))}
                  </div>
                )}

                {filterMode === "core-only" && coreMatches.length === 0 && (
                  <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#111111]/50">
                    <p className="text-xs font-mono text-gray-500 italic">No threats matching baseline profile.</p>
                  </div>
                )}
                {filterMode === "sandbox-only" && sandboxMatches.length === 0 && (
                  <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#111111]/50">
                    <p className="text-xs font-mono text-gray-500 italic">No threats matching active investigation tags.</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* --- NEWS TAB --- */}
        {activeTab === 'news' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <NewsFeedList news={news} />
          </motion.div>
        )}

        {/* Loading indicator */}
        {isLoadingThreats && threats.length > 0 && (
          <div className="flex items-center justify-center py-6 gap-2 border-t border-gray-100 mt-4">
            <Loader2 size={14} className="animate-spin text-indigo-500" />
            <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest">Real-time sync active...</span>
          </div>
        )}
      </div>
    </div>
  );
}
