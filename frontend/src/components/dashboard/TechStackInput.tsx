"use client"

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Server, Loader2, UploadCloud, Plus, Settings } from "lucide-react";
import { getUser, createUser, updateUserStack, scanTechStackFile, UserResponse, TechNode } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TechStackInputProps {
  userId: number;
  onStackChange?: (newStack: TechNode[]) => void;
  readOnly?: boolean;
  isDraft?: boolean;
}
  
export function TechStackInput({ userId, onStackChange, readOnly = false, isDraft = false }: TechStackInputProps) {
  const { setCoreStack, coreStack } = useApp();
  const [techs, setTechs] = useState<TechNode[]>(coreStack);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(coreStack.length === 0);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function initUser() {
      if (coreStack.length > 0) {
        setTechs(coreStack);
        setLoading(false);
        return;
      }
      try {
        let user: UserResponse | null = await getUser(userId);
        if (!user) {
          user = await createUser("admin", [
            { name: "FastAPI", cpe: "cpe:2.3:a:tiangolo:fastapi:*:*:*:*:*:*:*:*" },
            { name: "React", cpe: "cpe:2.3:a:facebook:react:*:*:*:*:*:*:*:*" },
          ]);
        }
        setTechs(user.tech_stack);
        setCoreStack(user.tech_stack);
      } catch (error) {
        console.error("Failed to initialize user:", error);
      } finally {
        setLoading(false);
      }
    }
    initUser();
  }, [userId, coreStack, setCoreStack]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (e.key === "Enter" && inputVal.trim()) {
      e.preventDefault();
      const newTechName = inputVal.trim();
      if (!techs.find(t => t.name.toLowerCase() === newTechName.toLowerCase())) {
        const fallbackCpe = `cpe:2.3:a:${newTechName.toLowerCase()}:${newTechName.toLowerCase()}:*:*:*:*:*:*:*`;
        const newStack = [...techs, { name: newTechName, cpe: fallbackCpe }];
        setTechs(newStack);
        if (!isDraft) {
          setCoreStack(newStack);
          await updateUserStack(userId, newStack);
        }
        onStackChange?.(newStack);
      }
      setInputVal("");
    }
  };

  const removeTech = async (techToRemove: string) => {
    if (readOnly) return;
    const newStack = techs.filter(tech => tech.name !== techToRemove);
    setTechs(newStack);
    if (!isDraft) {
      setCoreStack(newStack);
      await updateUserStack(userId, newStack);
    }
    onStackChange?.(newStack);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setScanning(true);
      const updatedUser = await scanTechStackFile(userId, file);
      setTechs(updatedUser.tech_stack);
      if (!isDraft) {
        setCoreStack(updatedUser.tech_stack);
      }
      onStackChange?.(updatedUser.tech_stack);
    } catch (error) {
      console.error("Failed to scan file:", error);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn(
      "w-full h-full p-5 lg:p-6 transition-all duration-300 flex flex-col justify-center min-h-[140px]"
    )}>
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          "w-12 h-12 rounded-[14px] flex items-center justify-center transition-all bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E8E8ED]",
        )}>
          <Server size={22} className={readOnly ? "text-[#0066CC]" : "text-[#1D1D1F]"} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight leading-tight">Infrastructure Stack</h2>
          <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider mt-0.5">
            {readOnly ? "Verified Environment" : "System Baseline"}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#86868B]" />
          ) : readOnly ? (
            <Link 
              href="/settings"
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#0066CC] hover:bg-[#0066CC]/5 px-4 py-2 rounded-full transition-all border border-[#0066CC]/20"
            >
              <Settings size={12} />
              Manage
            </Link>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.json"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E8E8ED] px-4 py-2 rounded-full transition-all"
              >
                {scanning ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                Import SBOM
              </button>
            </>
          )}
          <span className={cn(
            "text-[10px] font-mono font-bold px-2 py-1 rounded-lg border shadow-sm transition-colors",
            readOnly ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          )}>
            {techs.length} NODES
          </span>
        </div>
      </div>

      {/* Tech tags */}
      <div className="flex flex-wrap gap-2.5">
        <AnimatePresence mode="popLayout">
          {techs.map((tech) => (
            <motion.div
              key={tech.name}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all shadow-sm",
                readOnly 
                  ? "bg-[#F5F5F7] text-[#1D1D1F] border border-[#E8E8ED] hover:bg-[#E8E8ED]"
                  : "bg-[#0066CC]/5 text-[#0066CC] border border-[#0066CC]/10 hover:bg-[#0066CC]/10"
              )}
            >
              {tech.name}
              {!readOnly && (
                <button
                  onClick={() => removeTech(tech.name)}
                  disabled={loading || scanning}
                  className="text-[#0066CC]/40 hover:text-[#D70015] transition-colors ml-1"
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {!loading && techs.length === 0 && (
          <div className="flex items-center gap-2 py-2">
            <span className="text-xs font-mono text-gray-400 italic">System requires baseline configuration.</span>
          </div>
        )}
      </div>

      {/* Input - Hidden in readOnly */}
      {!readOnly && (
        <div className="relative mt-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Plus size={18} className="text-[#0066CC]" />
          </div>
          <input
            className="w-full bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0066CC]/30 focus:ring-4 focus:ring-[#0066CC]/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-[#1D1D1F] placeholder:text-[#86868B] outline-none transition-all"
            placeholder="Add technology (e.g., Kubernetes, Redis)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}
