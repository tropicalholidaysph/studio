"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { VoucherTable } from "@/components/VoucherTable";
import { LayoutDashboard, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@/firebase";

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Fast check using local storage
    const localAuth = localStorage.getItem("auth");
    
    // If no local auth and firebase loading finished with no user, redirect
    if (!isUserLoading && !user && localAuth !== "true") {
      router.push("/login");
    }
  }, [user, isUserLoading, router, isClient]);

  // If we haven't mounted yet or we're waiting for critical auth, show minimal loader
  if (!isClient || (isUserLoading && !user && localStorage.getItem("auth") === "true")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
        <p className="text-muted-foreground text-sm animate-pulse">Initializing Secure Ledger...</p>
      </div>
    );
  }

  // Security guard
  if (!user && typeof window !== 'undefined' && localStorage.getItem("auth") !== "true") return null;

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
          <Link href="/vouchers/new">
            <Button className="bg-primary hover:bg-primary/90 shadow-md h-12 px-6">
              <PlusCircle className="w-5 h-5 mr-2" />
              New Voucher
            </Button>
          </Link>
        </div>

        <VoucherTable />
      </main>
    </div>
  );
}
