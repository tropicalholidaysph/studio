"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { VoucherVisual } from "@/components/VoucherVisual";
import { getVoucherById, voidVoucher } from "@/lib/voucher-actions";
import { Voucher } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Loader2, Edit2, Ban } from "lucide-react";
import Link from "next/link";
import { useRole } from "@/lib/role-context";
import { useFirebase } from "@/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function VoucherDetailPage() {
  const { id } = useParams();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVoiding, setIsVoiding] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const router = useRouter();
  const { isAdmin, isEmployee } = useRole();
  const { user } = useFirebase();
  const { toast } = useToast();

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

  const handleVoid = async () => {
    if (!voucher || !user) return;
    setIsVoiding(true);
    try {
      await voidVoucher(voucher.id, user.uid);
      const updated = await getVoucherById(voucher.id);
      setVoucher(updated);
      setShowVoidDialog(false);
      toast({ title: "Voucher Voided", description: "The voucher has been marked as void." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to void voucher." });
    } finally {
      setIsVoiding(false);
    }
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
            {(isAdmin || isEmployee) && (
              <Link href={`/vouchers/${voucher.id}/edit`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit Record
                </Button>
              </Link>
            )}
            {(isAdmin || isEmployee) && !voucher.isVoid && (
              <Button 
                variant="destructive"
                onClick={() => setShowVoidDialog(true)}
                className="flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Mark as Void
              </Button>
            )}
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

      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Voucher as Void?</DialogTitle>
            <DialogDescription>
              This will set the amount to zero and mark the recipient as VOID. This action is tracked but cannot be easily reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={isVoiding}>
              {isVoiding ? "Voiding..." : "Confirm Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
