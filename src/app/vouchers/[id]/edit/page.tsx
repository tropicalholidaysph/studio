"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { VoucherForm } from "@/components/VoucherForm";
import { getVoucherById } from "@/lib/voucher-actions";
import { Voucher } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { useToast } from "@/hooks/use-toast";

export default function EditVoucherPage() {
  const { id } = useParams();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isAdmin, isEmployee, role } = useRole();
  const { toast } = useToast();

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (auth !== "true") {
      router.push("/login");
      return;
    }

    // Only authorized roles can access this page
    if (role && !isAdmin && !isEmployee) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to edit vouchers.",
      });
      router.push("/");
      return;
    }

    async function fetchVoucher() {
      if (typeof id === 'string') {
        const data = await getVoucherById(id);
        setVoucher(data);
      }
      setLoading(false);
    }
    
    if (role) {
      fetchVoucher();
    }
  }, [id, router, isAdmin, role, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-2xl font-bold mb-4">Voucher Not Found</h1>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-primary text-white rounded-md">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VoucherForm voucher={voucher} />
      </main>
    </div>
  );
}
