"use client"

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, LogOut, User, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { resetUserStack } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const { username, userId, resetOnboarding } = useApp();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const initial = username?.charAt(0).toUpperCase() ?? 'U';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReset = async () => {
    if (!userId) return;
    const confirmed = window.confirm('🚨 EMERGENCY SYSTEM PURGE: This will wipe your core stack and reset your profile. Proceed?');
    if (confirmed) {
      try {
        await resetUserStack(userId);
        resetOnboarding();
        localStorage.clear();
        router.push('/onboarding');
        router.refresh();
      } catch (err) {
        console.error('Critical: System reset failed', err);
        alert('System reset failed. Please contact administrator.');
      }
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative px-3 pb-4">
      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bottom-[72px] left-0 right-0 mx-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Profile Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-sm font-semibold text-gray-900">{username ?? 'Operator'}</p>
              <p className="text-xs text-gray-400 font-mono">SOC Operator</p>
            </div>

            {/* Menu Items */}
            <div className="p-1.5 space-y-0.5">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
              >
                <Settings2 size={15} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                System Settings
              </Link>

              <button
                onClick={handleReset}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors group"
              >
                <LogOut size={15} className="text-red-400" />
                Emergency Reset
              </button>
            </div>

            {/* Version */}
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="text-[10px] font-mono text-gray-300 uppercase tracking-widest">ThreatBrief v2.0 · SOC</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-gray-50 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{username ?? 'Operator'}</p>
          <p className="text-[10px] font-mono text-gray-400">SOC Operator</p>
        </div>
        <ChevronUp
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-180'}`}
        />
      </button>
    </div>
  );
}
