"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { PersonalizedThreatResponse, TechNode } from "@/lib/api";

// --- Types ---
export interface SandboxTag {
  name: string;
}

export interface AppState {
  userId: number;
  username: string;
  onboardingComplete: boolean;
  coreStack: TechNode[];
  investigationStack: SandboxTag[];
  threats: PersonalizedThreatResponse[];
  news: any[]; // Matches NewsItem[] from api.ts
  lastSync: string | null;
  isLoadingThreats: boolean;
}

export interface AppContextType extends AppState {
  setUsername: (name: string) => void;
  setCoreStack: (stack: TechNode[]) => void;
  addSandboxTag: (tag: string) => void;
  removeSandboxTag: (tag: string) => void;
  setThreats: (threats: PersonalizedThreatResponse[]) => void;
  setNews: (news: any[]) => void;
  setLastSync: (time: string) => void;
  setIsLoadingThreats: (loading: boolean) => void;
  completeOnboarding: (username: string, stack: TechNode[]) => void;
  resetOnboarding: () => void;
}

// --- Context ---
const AppContext = createContext<AppContextType | null>(null);

const ONBOARDING_KEY = "threatbrief_onboarding_complete";
const USERNAME_KEY = "threatbrief_username";

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId] = useState(1); // MVP: hardcoded user
  const [username, setUsernameState] = useState("");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [coreStack, setCoreStackState] = useState<TechNode[]>([]);
  const [investigationStack, setInvestigationStack] = useState<SandboxTag[]>([]);
  const [threats, setThreatsState] = useState<PersonalizedThreatResponse[]>([]);
  const [news, setNewsState] = useState<any[]>([]);
  const [lastSync, setLastSyncState] = useState<string | null>(null);
  const [isLoadingThreats, setIsLoadingThreatsState] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY) === "true";
    const savedUsername = localStorage.getItem(USERNAME_KEY) || "";
    const savedStack = localStorage.getItem("threatbrief_core_stack");
    if (savedStack) {
      try { setCoreStackState(JSON.parse(savedStack)); } catch(e) {}
    }
    setOnboardingComplete(done);
    setUsernameState(savedUsername);
  }, []);

  const setUsername = useCallback((name: string) => {
    setUsernameState(name);
    localStorage.setItem(USERNAME_KEY, name);
  }, []);

  const setCoreStack = useCallback((stack: TechNode[]) => {
    setCoreStackState(stack);
    localStorage.setItem("threatbrief_core_stack", JSON.stringify(stack));
  }, []);

  const addSandboxTag = useCallback((tag: string) => {
    setInvestigationStack(prev => {
      if (prev.find(t => t.name.toLowerCase() === tag.toLowerCase())) return prev;
      return [...prev, { name: tag }];
    });
  }, []);

  const removeSandboxTag = useCallback((tag: string) => {
    setInvestigationStack(prev => prev.filter(t => t.name !== tag));
  }, []);

  const setThreats = useCallback((t: PersonalizedThreatResponse[]) => {
    setThreatsState(t);
  }, []);

  const setNews = useCallback((n: any[]) => {
    setNewsState(n);
  }, []);

  const setLastSync = useCallback((time: string) => {
    setLastSyncState(time);
  }, []);

  const setIsLoadingThreats = useCallback((loading: boolean) => {
    setIsLoadingThreatsState(loading);
  }, []);

  const completeOnboarding = useCallback((name: string, stack: TechNode[]) => {
    setUsernameState(name);
    setCoreStackState(stack);
    setOnboardingComplete(true);
    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.setItem(USERNAME_KEY, name);
    localStorage.setItem("threatbrief_core_stack", JSON.stringify(stack));
  }, []);

  const resetOnboarding = useCallback(() => {
    setOnboardingComplete(false);
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem("threatbrief_core_stack");
  }, []);

  const value: AppContextType = {
    userId,
    username,
    onboardingComplete,
    coreStack,
    investigationStack,
    threats,
    news,
    lastSync,
    isLoadingThreats,
    setUsername,
    setCoreStack,
    addSandboxTag,
    removeSandboxTag,
    setThreats,
    setNews,
    setLastSync,
    setIsLoadingThreats,
    completeOnboarding,
    resetOnboarding,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
