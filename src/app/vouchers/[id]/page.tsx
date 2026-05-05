"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { VoucherVisual } from "@/components/VoucherVisual";
import { getVoucherById } from "@/lib/voucher-actions";
import { Voucher } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Loader2, Edit2 } from "lucide-react";
import Link from "next/link";

export default function VoucherDetailPage() {
  const { id } = useParams();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (auth !== "true") {
      router.push("/login");
      return;
    }

    async function fetchVoucher() {
      if (typeof id === 'string') {
        const data = await getVoucherById(id);
        setVoucher(data);
      }
      setLoading(false);
    }
    fetchVoucher();
  }, [id, router]);

  const handlePrint = () => {
    window.print();
  };

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
        <Link href="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex justify-between items-center no-print">
          <Link href="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/vouchers/${voucher.id}/edit`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Record
              </Button>
            </Link>
            <Button 
              onClick={handlePrint}
              className="bg-accent hover:bg-accent/90 text-white flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              Print / Export PDF
            </Button>
          </div>
        </div>

        <div className="no-print bg-muted/40 border-2 border-dashed border-primary/20 p-4 rounded-lg text-center text-sm text-muted-foreground backdrop-blur-sm">
          Below is a preview of the digital voucher. Click <strong>Print</strong> to generate a physical-style PDF copy.
        </div>

        <VoucherVisual voucher={voucher} />
      </main>

      <div className="print-only">
        <VoucherVisual voucher={voucher} />
      </div>
    </div>
  );
}
