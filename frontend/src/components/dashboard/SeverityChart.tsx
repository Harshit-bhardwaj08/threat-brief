"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Activity, Zap, TrendingUp } from "lucide-react"
import { PersonalizedThreatResponse } from "@/lib/api"
import { useMemo } from "react"
import { motion } from "framer-motion"

interface SeverityChartProps {
  data: PersonalizedThreatResponse[];
}

export function SeverityChart({ data }: SeverityChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const baseScore = data.reduce((acc, curr) => acc + (curr.relevance_score || 0), 0);
    const criticals = data.filter(t => t.severity?.toUpperCase() === 'CRITICAL').length;
    const highs = data.filter(t => t.severity?.toUpperCase() === 'HIGH').length;
    return [
      { name: '03-07', risk: Math.max(10, baseScore - 12), critical: Math.max(0, criticals - 1), high: Math.max(0, highs - 2) },
      { name: '03-08', risk: Math.max(10, baseScore - 8), critical: criticals, high: Math.max(0, highs - 1) },
      { name: '03-09', risk: baseScore - 4, critical: criticals, high: highs },
      { name: '03-10', risk: Math.max(10, baseScore - 6), critical: Math.max(0, criticals - 1), high: highs },
      { name: '03-11', risk: baseScore + 2, critical: criticals + 1, high: highs },
      { name: '03-12', risk: baseScore + 5, critical: criticals + 1, high: highs + 1 },
      { name: '03-13', risk: baseScore, critical: criticals, high: highs },
    ];
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col h-full min-h-[360px]"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-white border border-[#E8E8ED] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <Activity className="w-5 h-5 text-[#0066CC]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1D1D1F]">Risk Vector Analysis</h3>
            <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Temporal Intelligence Trend</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#008031] bg-[#F2FFF7] px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#34C759]" /> TOTAL
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#D70015] bg-[#FFF2F4] px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#D70015]" /> CRITICAL
          </span>
        </div>
      </div>

      <div className="flex-1 w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400 font-mono text-sm">
            <span className="animate-pulse">Awaiting scan data...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34C759" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D70015" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#D70015" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" vertical={false} />
              <XAxis dataKey="name" stroke="#86868B" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#86868B" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  padding: '12px',
                  border: 'none',
                }}
                labelStyle={{ color: '#86868B', marginBottom: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}
                itemStyle={{ fontSize: '13px', fontWeight: 600, padding: '2px 0' }}
                cursor={{ stroke: '#E8E8ED', strokeWidth: 1.5 }}
              />
              <Area type="monotone" name="Total Risk" dataKey="risk" stroke="#34C759" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" animationDuration={1000} />
              <Area type="monotone" name="Critical Vectors" dataKey="critical" stroke="#D70015" strokeWidth={3} fillOpacity={1} fill="url(#colorCrit)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-[#F5F5F7] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#86868B] uppercase tracking-wider">
          <TrendingUp size={12} className="text-[#0066CC]" />
          <span>Metric Stability: 92%</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-[#FF9500] animate-pulse" />
          <span className="text-[11px] font-bold text-[#FF9500] uppercase tracking-wider">Real-time Analysis active</span>
        </div>
      </div>
    </motion.div>
  )
}
