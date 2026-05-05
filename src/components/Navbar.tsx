
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle, List, LogOut } from "lucide-react";
import logo from "@/app/public/logo.png";

export function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    router.push("/login");
  };

  return (
    <nav className="bg-white border-b sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 overflow-hidden rounded-lg">
                <Image 
                  src={logo} 
                  alt="Tropical Holidays Logo" 
                  width={40} 
                  height={40}
                  className="object-contain"
                  data-ai-hint="tropical palm"
                />
              </div>
              <span className="font-headline font-bold text-xl text-foreground hidden sm:block">
                Tropical Holidays
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Vouchers</span>
              </Button>
            </Link>
            <Link href="/vouchers/new">
              <Button size="sm" className="bg-primary hover:bg-primary/90 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">New Voucher</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-accent text-accent hover:bg-accent hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
