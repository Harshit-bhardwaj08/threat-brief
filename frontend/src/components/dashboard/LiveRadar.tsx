"use client"

import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";

export function LiveRadar() {
  const { lastSync } = useApp();

  const formatSyncTime = (ts: string | null) => {
    if (!ts) return "PENDING";
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(ts));
    } catch {
      return ts;
    }
  };

  return (
    <div className="glass-panel rounded-lg px-3 py-2.5 flex items-center gap-3 neon-border-green">
      {/* Pulsating radar dot */}
      <div className="relative flex-shrink-0">
        <motion.div
          className="w-2.5 h-2.5 rounded-full bg-primary"
          animate={{
            boxShadow: [
              "0 0 0 0 oklch(0.72 0.17 155 / 70%)",
              "0 0 0 6px oklch(0.72 0.17 155 / 0%)",
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Radio size={10} className="text-primary flex-shrink-0" />
          <span className="text-[10px] font-mono text-primary uppercase tracking-wider">NVD Feed</span>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground truncate">
          {lastSync ? `SYNCED ${formatSyncTime(lastSync)}` : "AWAITING SYNC"}
        </p>
      </div>
    </div>
  );
}
