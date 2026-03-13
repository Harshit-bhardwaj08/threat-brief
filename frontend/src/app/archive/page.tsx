"use client"

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ChevronDown, Archive, ExternalLink, ChevronUp, ChevronLeft, ChevronRight as ChevronRightIcon, AlertTriangle, Shield, CheckCircle, Zap, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { getPersonalizedThreats, PersonalizedThreatResponse } from "@/lib/api";
import { ThreatCard } from "@/components/dashboard/ThreatCard";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type SeverityFilter = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type StatusFilter = "ALL" | "PATCHED" | "UNKNOWN";
type SortKey = "date" | "severity" | "score";
type SortDir = "asc" | "desc";

function severityWeight(s: string) {
  switch (s?.toUpperCase()) {
    case "CRITICAL": return 4;
    case "HIGH": return 3;
    case "MEDIUM": return 2;
    case "LOW": return 1;
    default: return 0;
  }
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL": return <AlertTriangle size={12} className="text-red-400" />;
    case "HIGH": return <AlertTriangle size={12} className="text-orange-400" />;
    case "MEDIUM": return <Shield size={12} className="text-yellow-400" />;
    default: return <CheckCircle size={12} className="text-emerald-400" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfgMap: Record<string, string> = {
    CRITICAL: "bg-red-500/10 text-red-400 border-red-500/40",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/40",
    MEDIUM: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40",
    LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/40",
  };
  const cls = cfgMap[severity?.toUpperCase()] || "bg-white/5 text-muted-foreground border-white/10";
  return (
    <span className={`flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${cls}`}>
      <SeverityIcon severity={severity} />
      {severity || "UNKNOWN"}
    </span>
  );
}

function TableHeader({ label, sortKey, currentSort, currentDir, onSort }: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {active ? (currentDir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />) : null}
    </button>
  );
}

export default function ArchivePage() {
  const { onboardingComplete, userId } = useApp();
  const router = useRouter();
  const [allThreats, setAllThreats] = useState<PersonalizedThreatResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [techFilter, setTechFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!onboardingComplete) { router.replace("/onboarding"); return; }
    (async () => {
      try {
        const data = await getPersonalizedThreats(userId);
        setAllThreats(data.threats || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [onboardingComplete, userId, router]);

  // Unique tech tags
  const allTechTags = useMemo(() => {
    const tags = new Set<string>();
    allThreats.forEach(t => t.matched_tech?.forEach(m => tags.add(m.name)));
    return ["ALL", ...Array.from(tags).sort()];
  }, [allThreats]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let results = [...allThreats];
    const q = search.toLowerCase().trim();
    if (q) {
      results = results.filter(t =>
        t.cve_id?.toLowerCase().includes(q) ||
        t.ai_summary?.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== "ALL") {
      results = results.filter(t => t.severity?.toUpperCase() === severityFilter);
    }
    if (statusFilter === "PATCHED") results = results.filter(t => t.is_patched);
    if (statusFilter === "UNKNOWN") results = results.filter(t => !t.is_patched);
    if (techFilter !== "ALL") {
      results = results.filter(t => t.matched_tech?.some(m => m.name === techFilter));
    }
    results.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = (a.published_date || "").localeCompare(b.published_date || "");
      if (sortKey === "severity") cmp = severityWeight(a.severity) - severityWeight(b.severity);
      if (sortKey === "score") cmp = (a.relevance_score || 0) - (b.relevance_score || 0);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return results;
  }, [allThreats, search, severityFilter, statusFilter, techFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectCls = "bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-foreground outline-none transition-colors appearance-none cursor-pointer";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/3 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Archive size={20} className="text-sky-400" />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">ThreatBrief</span>
                <span className="text-[10px] font-mono text-muted-foreground/30">/</span>
                <span className="text-[10px] font-mono text-sky-400/70 uppercase tracking-widest">Intelligence Archive</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Intel Archive</h1>
            </div>
            <div className="ml-auto">
              <span className="text-xs font-mono text-sky-400 bg-sky-500/10 border border-sky-500/30 px-3 py-1 rounded-lg">
                {filtered.length} records
              </span>
            </div>
          </div>

          {/* Filter bar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-xl p-4 flex flex-wrap gap-3 items-center neon-border-cyan"
          >
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search CVE ID or AI summary..."
                className="w-full bg-white/5 border border-white/10 hover:border-sky-500/30 focus:border-sky-500/50 rounded-lg pl-8 pr-4 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors"
              />
            </div>

            {/* Severity dropdown */}
            <div className="relative">
              <select
                value={severityFilter}
                onChange={e => { setSeverityFilter(e.target.value as SeverityFilter); setPage(1); }}
                className={selectCls}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            {/* Status dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                className={selectCls}
              >
                <option value="ALL">All Statuses</option>
                <option value="PATCHED">Patched</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            {/* Tech Tag dropdown */}
            <div className="relative">
              <select
                value={techFilter}
                onChange={e => { setTechFilter(e.target.value); setPage(1); }}
                className={selectCls}
              >
                {allTechTags.map(t => (
                  <option key={t} value={t}>{t === "ALL" ? "All Tech Tags" : t}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </motion.div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-3">
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel rounded-xl p-12 text-center">
              <Archive size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-mono text-muted-foreground">No records match your filters</p>
            </div>
          ) : (
            <div className="glass-panel rounded-xl overflow-hidden neon-border-cyan">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_3fr_auto] gap-4 px-4 py-3 border-b border-white/5 bg-white/2">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">CVE ID</div>
                <TableHeader label="Date" sortKey="date" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <TableHeader label="Severity" sortKey="severity" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <TableHeader label="Score" sortKey="score" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Summary</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Link</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/5">
                {paginated.map((threat, i) => (
                  <div key={threat.cve_id}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setExpandedId(expandedId === threat.cve_id ? null : threat.cve_id)}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_3fr_auto] gap-4 px-4 py-3 hover:bg-white/3 cursor-pointer transition-colors group items-center"
                    >
                      {/* CVE ID */}
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-sky-400 group-hover:text-sky-300 transition-colors">
                          {threat.cve_id}
                        </span>
                        <div className="flex gap-1">
                          {threat.is_actively_exploited && (
                            <span className="text-[9px] font-mono text-red-400 border border-red-500/30 bg-red-500/10 px-1 rounded flex items-center gap-0.5">
                              <Zap size={7} /> LIVE
                            </span>
                          )}
                          {threat.is_patched && (
                            <span className="text-[9px] font-mono text-sky-400 border border-sky-500/30 bg-sky-500/10 px-1 rounded flex items-center gap-0.5">
                              <ShieldCheck size={7} /> Patched
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {threat.published_date?.split("T")[0] || "—"}
                      </span>

                      {/* Severity */}
                      <SeverityBadge severity={threat.severity} />

                      {/* Score */}
                      <span className="text-xs font-mono font-bold text-foreground/80">
                        {threat.relevance_score || 0}<span className="text-muted-foreground font-normal text-[10px]">/10</span>
                      </span>

                      {/* Summary snippet */}
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                        {threat.ai_summary}
                      </p>

                      {/* NVD Link */}
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${threat.cve_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-muted-foreground/50 hover:text-sky-400 transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </motion.div>

                    {/* Inline expanded ThreatCard */}
                    {expandedId === threat.cve_id && (
                      <div className="px-4 pb-4 bg-white/2">
                        <ThreatCard threat={threat} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/2">
                <span className="text-[10px] font-mono text-muted-foreground">
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span className="text-xs font-mono text-muted-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
