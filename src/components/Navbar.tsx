"use client";

import LinkNext from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusCircle, List, LogOut, Shield, ShieldCheck, History } from "lucide-react";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { ModeToggle } from "@/components/ModeToggle";
import { useRole } from "@/lib/role-context";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

export function Navbar() {
  useSessionTimeout();
  const router = useRouter();
  const auth = useAuth();
  const { role, isAdmin, isEmployee, setRole } = useRole();

  const handleLogout = async () => {
    localStorage.removeItem("auth");
    setRole(null);
    await signOut(auth);
    router.push("/login");
  };

  return (
    <nav className="bg-background border-b sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <LinkNext href="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12">
                <Image 
                  src="/logo.png" 
                  alt="Tropical Holidays Logo" 
                  fill
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <span className="font-bold text-xl text-[#E66E38] hidden sm:block">
                Tropical Holidays
              </span>
            </LinkNext>
            {/* Role Badge */}
            <div className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isAdmin 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" 
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
            }`}>
              {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {role || "—"}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <LinkNext href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2" aria-label="View vouchers list">
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Vouchers</span>
              </Button>
            </LinkNext>
            {isAdmin && (
              <LinkNext href="/activity">
                <Button variant="ghost" size="sm" className="flex items-center gap-2" aria-label="View activity logs">
                  <History className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">Activity</span>
                </Button>
              </LinkNext>
            )}
            {(isAdmin || isEmployee) && (
              <LinkNext href="/vouchers/new">
                <Button size="sm" className="bg-[#E66E38] hover:bg-[#E66E38]/90 text-white flex items-center gap-2" aria-label="Create new voucher">
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">New Voucher</span>
                </Button>
              </LinkNext>
            )}
            <ModeToggle />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleLogout} className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" aria-label="Sign out">
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Logout</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </nav>
  );
}
