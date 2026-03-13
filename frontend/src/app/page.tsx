"use client"

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import OnboardingPage from "./onboarding/page";
import DashboardPage from "./dashboard/page";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const { onboardingComplete } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
      </div>
    );
  }

  if (onboardingComplete) {
    return <DashboardPage />;
  }

  return <OnboardingPage />;
}
