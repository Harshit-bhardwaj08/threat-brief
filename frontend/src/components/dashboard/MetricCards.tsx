"use client"

import { motion } from 'framer-motion';
import { AlertCircle, Target, ShieldCheck, Zap } from 'lucide-react';
import { PersonalizedThreatResponse } from '@/lib/api';

interface MetricCardsProps {
  threats: PersonalizedThreatResponse[];
}

export function MetricCards({ threats }: MetricCardsProps) {
  const criticals = threats.filter(t => t.severity?.toUpperCase() === 'CRITICAL').length;
  const highs = threats.filter(t => t.severity?.toUpperCase() === 'HIGH').length;
  const exploitMatches = threats.filter(t => t.matched_tech && t.matched_tech.length > 0).length;
  const activeExploits = threats.filter(t => t.is_actively_exploited).length;
  const avgScore = threats.length > 0
    ? (threats.reduce((acc, t) => acc + (t.relevance_score || 0), 0) / threats.length).toFixed(1)
    : '0';

    const cards = [
    {
      title: 'Critical Vectors',
      value: criticals,
      sub: `+${highs} High Severity`,
      icon: <AlertCircle size={20} />,
      iconColor: 'text-[#D70015]',
      iconBg: 'bg-[#FFF2F4]',
      valueCls: 'text-[#1D1D1F]',
    },
    {
      title: 'Infrastructure Matches',
      value: exploitMatches,
      sub: 'Against active nodes',
      icon: <Target size={20} />,
      iconColor: 'text-[#0066CC]',
      iconBg: 'bg-[#F2F8FF]',
      valueCls: 'text-[#1D1D1F]',
    },
    {
      title: 'Active Exploits',
      value: activeExploits,
      sub: activeExploits > 0 ? '⚠ Immediate response' : 'None detected',
      icon: <Zap size={20} />,
      iconColor: 'text-[#FF9500]',
      iconBg: 'bg-[#FFF9F0]',
      valueCls: 'text-[#1D1D1F]',
    },
    {
      title: 'Avg. Severity',
      value: avgScore,
      sub: `${threats.length} threats analyzed`,
      icon: <ShieldCheck size={20} />,
      iconColor: 'text-[#AF52DE]',
      iconBg: 'bg-[#F5F0FF]',
      valueCls: 'text-[#1D1D1F]',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          className="bg-white rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 border border-[#E8E8ED]/10 cursor-default transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">{card.title}</p>
            <div className={`w-10 h-10 rounded-2xl ${card.iconBg} flex items-center justify-center ${card.iconColor}`}>
              {card.icon}
            </div>
          </div>
          <div className={`text-4xl font-semibold tracking-tight ${card.valueCls} leading-none mb-2`}>{card.value}</div>
          <p className="text-[13px] text-[#86868B] font-medium">{card.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
