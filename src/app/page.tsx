"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { VoucherTable } from "@/components/VoucherTable";
import { LayoutDashboard, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@/firebase";
import { useRole } from "@/lib/role-context";

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { isAdmin, isEmployee } = useRole();
  const isRedirecting = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || isUserLoading || isRedirecting.current) return;

    const localAuth = localStorage.getItem("auth");

    // If we have no user and no local auth, redirect to login
    if (!user && localAuth !== "true") {
      isRedirecting.current = true;
      router.push("/login");
    }
    // If localAuth is true but Firebase session is missing after loading, force re-login
    else if (!user && localAuth === "true") {
      isRedirecting.current = true;
      localStorage.removeItem("auth");
      router.push("/login");
    }
  }, [user, isUserLoading, router, isClient]);

  // If we haven't mounted yet or we're waiting for critical auth, show minimal loader
  if (!isClient || isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
        <p className="text-muted-foreground text-sm animate-pulse">Initializing Secure Ledger...</p>
      </div>
    );
  }

  // Final security guard
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black font-headline text-foreground flex items-center gap-3">
              <LayoutDashboard className="text-primary w-8 h-8" />
              Secure Ledger
            </h1>
            <p className="text-muted-foreground mt-1">Real-time financial synchronization and voucher management</p>
          </div>
          {(isAdmin || isEmployee) && (
            <Link href="/vouchers/new">
              <Button className="bg-primary hover:bg-primary/90 shadow-md h-12 px-6">
                <PlusCircle className="w-5 h-5 mr-2" />
                New Voucher
              </Button>
            </Link>
          )}
        </div>

        <VoucherTable />
      </main>
    </div>
  );
}
