"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Archive, FlaskConical, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { LiveRadar } from "@/components/dashboard/LiveRadar";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={18} />, label: "Command Center", href: "/dashboard" },
  { icon: <FlaskConical size={18} />, label: "Active Investigation", href: "/sandbox" },
  { icon: <Archive size={18} />, label: "Intel Archive", href: "/archive" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen border-r border-[#D2D2D7] bg-white flex flex-col shrink-0 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-[#F5F5F7]">
        <div className="w-9 h-9 rounded-xl bg-[#0066CC] flex items-center justify-center shadow-sm">
          <ShieldAlert size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F] leading-none">
            ThreatBrief
          </h1>
          <span className="text-[10px] font-medium text-[#86868B] uppercase tracking-wider">SOC Operations</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-6 flex-1">
        <p className="text-[10px] font-semibold text-[#86868B] uppercase tracking-widest px-4 mb-3">Navigation</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] transition-all duration-200 cursor-pointer font-medium",
                isActive
                  ? "bg-[#0066CC]/5 text-[#0066CC]"
                  : "text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
              )}>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-[#0066CC]/5 border border-[#0066CC]/10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={cn("relative z-10 transition-colors", isActive ? "text-[#0066CC]" : "text-[#86868B]")}>
                  {item.icon}
                </span>
                <span className="relative z-10">{item.label}</span>
                {isActive && (
                  <div className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full bg-[#0066CC]" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100">
        <div className="px-4 py-3">
          <LiveRadar />
        </div>
        <ProfileDropdown />
      </div>
    </div>
  );
}
