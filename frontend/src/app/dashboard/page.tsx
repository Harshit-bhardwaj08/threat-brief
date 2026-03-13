"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { MorningBriefingBanner } from '@/components/dashboard/MorningBriefingBanner';
import { ThreatFeed } from '@/components/dashboard/ThreatFeed';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { TechStackInput } from '@/components/dashboard/TechStackInput';
import { SeverityChart } from '@/components/dashboard/SeverityChart';
import { PersonalizedDashboardResponse } from '@/lib/api';

const SLIDE_UP = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' as const },
});

export default function DashboardPage() {
  const { onboardingComplete, userId, threats, username } = useApp();
  const router = useRouter();
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  useEffect(() => {
    if (!onboardingComplete) router.replace('/onboarding');
  }, [onboardingComplete, router]);

  const handleStackChange = () => setTriggerRefresh(prev => prev + 1);
  const handleThreatsLoaded = (data: PersonalizedDashboardResponse) => { void data; };

  if (!onboardingComplete) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">

          {/* Header */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">ThreatBrief</span>
                <span className="text-[11px] font-bold text-[#D2D2D7]">/</span>
                <span className="text-[11px] font-bold text-[#0066CC] uppercase tracking-wider">Command Center</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">Operational Overview</h1>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E8E8ED]">
              <div className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
              <span className="text-[11px] font-bold text-[#1D1D1F] uppercase tracking-wider">Baseline Secure</span>
            </div>
          </motion.div>

          {/* Morning Briefing */}
          <motion.div {...SLIDE_UP(0)}>
            <MorningBriefingBanner threats={threats} username={username} />
          </motion.div>

          {/* Metric KPI Cards */}
          <motion.div {...SLIDE_UP(0.08)}>
            <MetricCards threats={threats} />
          </motion.div>

          {/* Core Baseline - Full-Width Tile */}
          <motion.div
            {...SLIDE_UP(0.16)}
            whileHover={{ y: -1, transition: { duration: 0.2 } }}
            className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/40 overflow-hidden hover:shadow-xl transition-shadow duration-300"
          >
            <TechStackInput userId={userId} onStackChange={handleStackChange} readOnly={true} />
          </motion.div>

          {/* Intelligence Feed */}
          <div className="w-full">
            <motion.div
              {...SLIDE_UP(0.24)}
              whileHover={{ y: -1, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/40 p-6 min-h-0 hover:shadow-xl transition-shadow duration-300 w-full"
            >
              <ThreatFeed
                userId={userId}
                triggerRefresh={triggerRefresh}
                onThreatsLoaded={handleThreatsLoaded}
              />
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}
