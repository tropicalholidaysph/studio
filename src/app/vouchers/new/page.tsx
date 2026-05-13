"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { VoucherForm } from "@/components/VoucherForm";
import { useRole } from "@/lib/role-context";
import { useToast } from "@/hooks/use-toast";

export default function NewVoucherPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
    const { isAdmin, isEmployee, role } = useRole();
    const { toast } = useToast();
    const isRedirecting = useRef(false);
  
    useEffect(() => {
      // Wait until role is loaded from context
      if (role === null || isRedirecting.current) return;

      const auth = localStorage.getItem("auth");
      if (auth !== "true") {
        isRedirecting.current = true;
        router.push("/login");
        return;
      }
      
      // Only authorized roles can access this page
      if (!isAdmin && !isEmployee) {
      isRedirecting.current = true;
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to create vouchers.",
      });
      router.push("/");
      return;
    }
    
    setIsAuthenticated(true);
  }, [router, isAdmin, isEmployee, role, toast]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VoucherForm />
      </main>
    </div>
  );
}
