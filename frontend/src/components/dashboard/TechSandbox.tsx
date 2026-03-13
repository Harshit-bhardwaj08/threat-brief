"use client"

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FlaskConical, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function TechSandbox() {
  const { investigationStack, addSandboxTag, removeSandboxTag } = useApp();
  const [inputVal, setInputVal] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputVal.trim()) {
      e.preventDefault();
      addSandboxTag(inputVal.trim());
      setInputVal("");
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 neon-border-amber">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <FlaskConical size={16} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Tech Sandbox</h2>
          <p className="text-[10px] font-mono text-muted-foreground">Temporary investigation tags — not saved to profile</p>
        </div>
        {investigationStack.length > 0 && (
          <div className="ml-auto">
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              {investigationStack.length} ACTIVE
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
        <AnimatePresence>
          {investigationStack.map((tag) => (
            <motion.div
              key={tag.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/40 rounded-full px-3 py-1 text-xs font-mono text-amber-300 group hover:border-amber-500/70 transition-colors"
            >
              <span>◈ {tag.name}</span>
              <button
                onClick={() => removeSandboxTag(tag.name)}
                className="text-amber-400/50 hover:text-amber-300 transition-colors ml-0.5"
              >
                <X size={10} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {investigationStack.length === 0 && (
          <span className="text-xs font-mono text-muted-foreground/40 italic">No sandbox tags. Add below to investigate specific tech.</span>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Plus size={14} className="text-amber-400/60" />
        </div>
        <input
          type="text"
          className="w-full bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 focus:border-amber-500/60 rounded-lg pl-8 pr-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors"
          placeholder="Enter tech to investigate (e.g. Log4j, Spring Boot)..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent rounded-full" />
      </div>
    </div>
  );
}
