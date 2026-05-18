"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Voucher, PaymentMethod, Ledger } from "@/lib/types";
import {
  Search,
  FileUp,
  Eye,
  Loader2,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Trash,
  AlertCircle,
  Download,
  FileDown,
  Globe,
  Clock
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { useSupabase } from "@/supabase/provider";
import { useRole } from "@/lib/role-context";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  bulkImportVouchers,
  createLedger,
  renameLedger,
  deleteLedger,
  getLedgers,
  bulkDeleteVouchers,
} from "@/lib/voucher-actions";
import { convertAmountToWords } from "@/lib/amount-utils";
import { DashboardStats } from "./DashboardStats";
import { useToast } from "@/hooks/use-toast";

export function VoucherTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(true);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(true);
  const [activeLedgerId, setActiveLedgerId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState("");
  const [showAddLedger, setShowAddLedger] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteLedgerConfirm, setShowDeleteLedgerConfirm] = useState(false);
  const [pendingDeleteLedgerId, setPendingDeleteLedgerId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { isAdmin, isEmployee } = useRole();
  const { user, supabase } = useSupabase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Ledgers
  useEffect(() => {
    async function fetchLedgers() {
      setLedgersLoading(true);
      try {
        const data = await getLedgers();
        setLedgers(data);
        if (data.length > 0 && !activeLedgerId) {
          setActiveLedgerId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching ledgers:", error);
      } finally {
        setLedgersLoading(false);
      }
    }
    fetchLedgers();
  }, [activeLedgerId]);

  // Fetch Vouchers for Active Ledger
  useEffect(() => {
    if (!activeLedgerId) return;

    async function fetchVouchers() {
      setVouchersLoading(true);
      try {
        const { data, error } = await supabase
          .from("vouchers")
          .select("*")
          .eq("ledger_id", activeLedgerId)
          .order("sequence_number", { ascending: true });

        if (error) throw error;

        // Transform Supabase data to legacy Voucher format
        const legacyVouchers: Voucher[] = data.map(sv => {
          const amountRO = Math.floor(sv.amount);
          const amountBz = Math.round((sv.amount - amountRO) * 1000);
          return {
            id: sv.id,
            voucherNo: sv.sequence_number.toString(),
            date: sv.voucher_date || sv.created_at.split('T')[0],
            recipient: sv.recipient || '',
            amountRO,
            amountBz,
            sumInWords: '',
            paymentMethod: sv.payment_method || 'Cash',
            bankName: sv.bank_name || undefined,
            refNo: sv.ref_no || undefined,
            purpose: sv.purpose || '',
            ledgerId: sv.ledger_id || '',
            createdAt: sv.created_at,
            updatedAt: sv.updated_at,
            isVoid: sv.status === 'void'
          };
        });

        setVouchers(legacyVouchers);
        setLastRefresh(new Date());
      } catch (error: any) {
        console.error("Error fetching vouchers:", error);
      } finally {
        setVouchersLoading(false);
      }
    }

    fetchVouchers();
  }, [activeLedgerId, supabase]);

  // Reset selection on ledger or mode change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeLedgerId]);

  async function handleAddLedger() {
    if (!newLedgerName.trim() || !user) return;
    try {
      const ledger = await createLedger(newLedgerName, null, user.id);
      if (ledger) {
        setLedgers([...ledgers, ledger]);
        setActiveLedgerId(ledger.id);
        setNewLedgerName("");
        setShowAddLedger(false);
        toast({ title: "Ledger Created", description: `"${newLedgerName}" is now active.` });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not create ledger." });
    }
  }

  async function handleDeleteLedger(id: string) {
    if (!user) return;
    try {
      await deleteLedger(id, user.id);
      const updated = ledgers.filter(l => l.id !== id);
      setLedgers(updated);
      if (activeLedgerId === id) {
        setActiveLedgerId(updated.length > 0 ? updated[0].id : "");
      }
      setPendingDeleteLedgerId(null);
      setShowDeleteLedgerConfirm(false);
      toast({ title: "Ledger Deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete ledger." });
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        
        let totalImportedCount = 0;
        let sheetsToProcess = wb.SheetNames;

        for (const sheetName of sheetsToProcess) {
          const ws = wb.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(ws);
          
          let ledgerId = "";
          const existingLedger = ledgers.find(l => l.name.toLowerCase() === sheetName.toLowerCase());
          
          if (existingLedger) {
            ledgerId = existingLedger.id;
          } else {
            const newLedger = await createLedger(sheetName, null, user.id);
            if (newLedger) {
              ledgerId = newLedger.id;
              setLedgers(prev => [...prev, newLedger]);
            }
          }

          if (!ledgerId) continue;

          // Fetch existing voucher numbers for this ledger to prevent duplicates
          const { data: existingSnap } = await supabase
            .from("vouchers")
            .select("sequence_number")
            .eq("ledger_id", ledgerId);
          
          const existingNos = new Set(existingSnap?.map(d => d.sequence_number.toString()) || []);

          const vouchersForSheet = rawData.map((row: any) => {
            const rawPaymentMethod = String(row["Payment Method"] || "Cash").toLowerCase();
            let paymentMethod: PaymentMethod = "Cash";
            if (rawPaymentMethod.includes("transfer")) paymentMethod = "Bank Transfer";
            else if (rawPaymentMethod.includes("cheque")) paymentMethod = "Cheque";

            const amountRO = Number(row["Amount (R.O.)"] || row["Amount RO"] || 0);
            const amountBz = Number(row["Amount (Bz)"] || row["Amount Bz"] || 0);
            const totalAmount = amountRO + (amountBz / 1000);

            return {
              ledgerId,
              voucherNo: String(row["Voucher No"] || row["Voucher No."] || ""),
              date: String(row["Date"] || ""),
              recipient: String(row["Paid To"] || row["Recipient"] || ""),
              amountRO: isNaN(amountRO) ? 0 : amountRO,
              amountBz: isNaN(amountBz) ? 0 : amountBz,
              paymentMethod,
              bankName: String(row["Bank"] || ""),
              refNo: String(row["Cheque/Ref No"] || row["Ref No"] || ""),
              purpose: String(row["Being (Purpose)"] || row["Purpose"] || ""),
              sumInWords: String(row["Sum in Words"] || convertAmountToWords(totalAmount)),
            };
          }).filter(v => v.voucherNo && v.recipient);
          const newVouchers = vouchersForSheet.filter(v => !existingNos.has(v.voucherNo));
          const skippedCount = vouchersForSheet.length - newVouchers.length;

          if (newVouchers.length > 0) {
            await bulkImportVouchers(newVouchers, user!.id);
            totalImportedCount += newVouchers.length;
          }

          if (skippedCount > 0) {
            console.log(`Skipped ${skippedCount} duplicate vouchers in sheet ${sheetName}`);
          }
        }

        toast({ 
          title: "Import Complete", 
          description: `Successfully imported ${totalImportedCount} new vouchers.` 
        });
        
        // Refresh current view
        if (activeLedgerId) {
          const { data: snapshot } = await supabase
            .from("vouchers")
            .select("*")
            .eq("ledger_id", activeLedgerId)
            .order("sequence_number", { ascending: true });
            
          if (snapshot) {
            setVouchers(snapshot.map(sv => {
              const amountRO = Math.floor(sv.amount);
              const amountBz = Math.round((sv.amount - amountRO) * 1000);
              return {
                id: sv.id,
                voucherNo: sv.sequence_number.toString(),
                date: sv.voucher_date || sv.created_at.split('T')[0],
                recipient: sv.recipient || '',
                amountRO,
                amountBz,
                sumInWords: '',
                paymentMethod: sv.payment_method || 'Cash',
                bankName: sv.bank_name || undefined,
                refNo: sv.ref_no || undefined,
                purpose: sv.purpose || '',
                ledgerId: sv.ledger_id || '',
                createdAt: sv.created_at,
                updatedAt: sv.updated_at,
                isVoid: sv.status === 'void'
              };
            }));
          }
        }
      } catch (error) {
        console.error("Import error:", error);
        const errorMessage = error instanceof Error ? error.message : "Please check your Excel format.";
        toast({ variant: "destructive", title: "Import Failed", description: errorMessage });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExportFullFile = async () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      for (const ledger of ledgers) {
        const { data: ledgerVouchers } = await supabase
          .from("vouchers")
          .select("*")
          .eq("ledger_id", ledger.id)
          .order("sequence_number", { ascending: true });

        if (!ledgerVouchers) continue;

        const data = ledgerVouchers.map(v => {
          const amountRO = Math.floor(v.amount);
          const amountBz = Math.round((v.amount - amountRO) * 1000);
          return {
            "Voucher No": v.sequence_number,
            "Date": v.voucher_date,
            "Paid To": v.recipient,
            "Amount (R.O.)": amountRO,
            "Amount (Bz)": amountBz,
            "Payment Method": v.payment_method,
            "Bank": v.bank_name || "",
            "Cheque/Ref No": v.ref_no || "",
            "Being (Purpose)": v.purpose,
            "Void": v.status === 'void' ? "YES" : "NO"
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // Add column widths to prevent cramping
        worksheet['!cols'] = [
          { wch: 15 }, // Voucher No
          { wch: 12 }, // Date
          { wch: 30 }, // Paid To
          { wch: 15 }, // Amount RO
          { wch: 10 }, // Amount Bz
          { wch: 15 }, // Payment Method
          { wch: 20 }, // Bank
          { wch: 15 }, // Ref No
          { wch: 40 }, // Purpose
          { wch: 10 }, // Void
        ];

        // Styling...
        const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1");
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            if (!worksheet[addr]) continue;
            
            const cellStyle: any = {
              font: { sz: 10 },
              border: {
                top: { style: "thin", color: { rgb: "E2E8F0" } },
                bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                left: { style: "thin", color: { rgb: "E2E8F0" } },
                right: { style: "thin", color: { rgb: "E2E8F0" } }
              }
            };

            if (R === 0) {
              cellStyle.fill = { patternType: "solid", fgColor: { rgb: "0F172A" } };
              cellStyle.font = { color: { rgb: "FFFFFF" }, bold: true, sz: 10 };
            } else {
              const v = ledgerVouchers[R - 1];
              if (v?.isVoid) {
                cellStyle.fill = { patternType: "solid", fgColor: { rgb: "EF4444" } };
                cellStyle.font = { color: { rgb: "FFFFFF" }, bold: true, sz: 10 };
              }
            }
            worksheet[addr].s = cellStyle;
          }
        }

        const sheetName = ledger.name.substring(0, 31).replace(/[\[\]\*\?\/\\\:]/g, '');
        XLSX.utils.book_append_sheet(wb, worksheet, sheetName || `Sheet_${ledger.id.substring(0, 5)}`);
      }

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Tropical_Ledger_Complete_${today}.xlsx`);
      toast({ title: "Export Ready" });
    } catch (error) {
      toast({ variant: "destructive", title: "Export Error" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSingleSheet = async () => {
    if (!activeLedgerId) return;
    setIsExporting(true);
    try {
      const ledger = ledgers.find(l => l.id === activeLedgerId);
      const sheetName = ledger?.name || "Ledger";
      const wb = XLSX.utils.book_new();
      
      const data = vouchers.map(v => ({
        "Voucher No": v.voucherNo,
        "Date": v.date,
        "Paid To": v.recipient,
        "Amount (R.O.)": v.amountRO,
        "Amount (Bz)": v.amountBz,
        "Payment Method": v.paymentMethod,
        "Bank": v.bankName || "",
        "Cheque/Ref No": v.refNo || "",
        "Being (Purpose)": v.purpose,
        "Void": v.isVoid ? "YES" : "NO"
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Add column widths to prevent cramping
      ws['!cols'] = [
        { wch: 15 }, // Voucher No
        { wch: 12 }, // Date
        { wch: 30 }, // Paid To
        { wch: 15 }, // Amount RO
        { wch: 10 }, // Amount Bz
        { wch: 15 }, // Payment Method
        { wch: 20 }, // Bank
        { wch: 15 }, // Ref No
        { wch: 40 }, // Purpose
        { wch: 10 }, // Void
      ];

      // Apply consistent styling
      const range = XLSX.utils.decode_range(ws['!ref'] || "A1");
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) continue;
          
          const cellStyle: any = {
            font: { sz: 10 },
            border: {
              top: { style: "thin", color: { rgb: "E2E8F0" } },
              bottom: { style: "thin", color: { rgb: "E2E8F0" } },
              left: { style: "thin", color: { rgb: "E2E8F0" } },
              right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
          };

          if (R === 0) {
            cellStyle.fill = { patternType: "solid", fgColor: { rgb: "0F172A" } };
            cellStyle.font = { color: { rgb: "FFFFFF" }, bold: true, sz: 10 };
          } else {
            const v = vouchers[R - 1];
            if (v?.isVoid) {
              cellStyle.fill = { patternType: "solid", fgColor: { rgb: "EF4444" } };
              cellStyle.font = { color: { rgb: "FFFFFF" }, bold: true, sz: 10 };
            }
          }
          ws[addr].s = cellStyle;
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
      XLSX.writeFile(wb, `Tropical_Holidays_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Sheet Exported" });
    } catch (error) {
      toast({ variant: "destructive", title: "Export Error" });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredVouchers = useMemo(() => {
    return vouchers
      .filter((v) =>
        v.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const numA = parseInt(a.voucherNo) || 0;
        const numB = parseInt(b.voucherNo) || 0;
        if (numA !== numB) return numA - numB; // Ascending
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [vouchers, searchTerm]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredVouchers.length && filteredVouchers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVouchers.map(v => v.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !user) return;
    setIsBulkDeleting(true);
    try {
      await bulkDeleteVouchers(Array.from(selectedIds), user!.id);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      toast({ title: "Deleted Records" });
    } catch (e) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const voucherNoCounts = useMemo(() => {
    return vouchers.reduce((acc, v) => {
      acc[v.voucherNo] = (acc[v.voucherNo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [vouchers]);

  const stats = useMemo(() => {
    const totalRO = vouchers.reduce((acc, v) => acc + (v.isVoid ? 0 : v.amountRO), 0);
    const totalBz = vouchers.reduce((acc, v) => acc + (v.isVoid ? 0 : v.amountBz), 0);
    const normalizedRO = totalRO + Math.floor(totalBz / 1000);
    const normalizedBz = totalBz % 1000;
    const voidCount = vouchers.filter(v => v.isVoid || v.recipient === "VOID / NO DATA").length;

    return {
      ledgerCount: ledgers.length,
      voucherCount: vouchers.length,
      totalRO: normalizedRO,
      totalBz: normalizedBz,
      voidCount
    };
  }, [vouchers, ledgers]);

  return (
    <div className="space-y-6">
      <DashboardStats {...stats} />
      
      <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] border rounded-lg bg-card text-card-foreground shadow-xl overflow-hidden">
        <div className="p-3 bg-muted/30 border-b flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search sheet..."
                className="pl-9 h-9 text-xs bg-background border-border/50 focus:border-primary transition-all pr-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {(isAdmin || isEmployee) && selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkDeleting}
              >
                <Trash className="w-3 h-3 mr-1" />
                {selectedIds.size}
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {isAdmin && (
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="h-9 text-xs border-primary text-primary">
                  {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
                  Import
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting} className="h-9 text-xs border-emerald-600 text-emerald-600">
                  <FileDown className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportSingleSheet} disabled={vouchers.length === 0}>
                  Export Current Sheet
                </DropdownMenuItem>
                {(isAdmin || isEmployee) && (
                  <DropdownMenuItem onClick={handleExportFullFile}>
                    Export All Sheets
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {(isAdmin || isEmployee) && (
              <Link href="/vouchers/new">
                <Button size="sm" className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-3 h-3" />
                  New
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto relative bg-background">
          {(isImporting || vouchersLoading || ledgersLoading || isBulkDeleting || isExporting) && (
            <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-primary/20 overflow-hidden">
              <div className="h-full bg-primary animate-pulse" />
            </div>
          )}

          {ledgers.length === 0 && !ledgersLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-bold">No Sheets Found</h3>
              <p className="text-sm opacity-70">Import or create a new sheet to begin.</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Desktop Table View */}
              <div className="hidden md:block flex-1 overflow-auto">
                <Table className="border-collapse table-fixed w-full min-w-[1200px]">
                  <TableHeader className="bg-slate-900 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-none">
                      {(isAdmin || isEmployee) && (
                        <TableHead className="text-white w-10 px-2 text-left">
                          <Checkbox
                            checked={filteredVouchers.length > 0 && selectedIds.size === filteredVouchers.length}
                            onCheckedChange={toggleSelectAll}
                            className="border-white"
                          />
                        </TableHead>
                      )}
                      <TableHead className="text-white w-24 px-2 text-[11px] font-bold">Voucher No.</TableHead>
                      <TableHead className="text-white w-24 px-2 text-[11px] font-bold">Date</TableHead>
                      <TableHead className="text-white w-48 px-2 text-[11px] font-bold">Recipient</TableHead>
                      <TableHead className="text-white w-24 px-2 text-[11px] font-bold">Amt (R.O.)</TableHead>
                      <TableHead className="text-white w-16 px-2 text-[11px] font-bold">Bz</TableHead>
                      <TableHead className="text-white w-32 px-2 text-[11px] font-bold">Method</TableHead>
                      <TableHead className="text-white w-64 px-2 text-[11px] font-bold">Purpose</TableHead>
                      <TableHead className="text-white w-24 px-2 text-[11px] font-bold">Bank</TableHead>
                      <TableHead className="text-white w-20 px-2 text-[11px] font-bold">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.map((v) => {
                      const isVoid = v.isVoid || v.recipient.includes("VOID");
                      return (
                        <TableRow 
                          key={v.id} 
                          className={cn("h-9 border-b", isVoid ? "bg-red-50 text-red-900" : "hover:bg-muted/30")}
                          title={v.updatedAt ? `Edited: ${new Date(v.updatedAt).toLocaleString()}` : `Created: ${new Date(v.createdAt).toLocaleString()}`}
                        >
                          {(isAdmin || isEmployee) && (
                            <TableCell className="px-2 py-1">
                              <Checkbox checked={selectedIds.has(v.id)} onCheckedChange={() => toggleSelect(v.id)} />
                            </TableCell>
                          )}
                          <TableCell className="px-2 py-1 text-[11px] font-bold">
                            {v.voucherNo}
                            {voucherNoCounts[v.voucherNo] > 1 && <span className="ml-1 bg-yellow-400 text-[9px] px-1 rounded">DUP</span>}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px]">{v.date}</TableCell>
                          <TableCell className="px-2 py-1 text-[11px] font-semibold">{v.recipient}</TableCell>
                          <TableCell className="px-2 py-1 text-[11px] font-bold">{v.amountRO.toLocaleString()}</TableCell>
                          <TableCell className="px-2 py-1 text-[11px] font-mono">{v.amountBz.toString().padStart(3, '0')}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px] uppercase">{v.paymentMethod}</TableCell>
                          <TableCell className="px-2 py-1 text-[11px] truncate" title={v.purpose}>{v.purpose}</TableCell>
                          <TableCell className="px-2 py-1 text-[11px] italic">{v.bankName || "-"}</TableCell>
                          <TableCell className="px-2 py-1 flex gap-1">
                            <Link href={`/vouchers/${v.id}`}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-primary"><Eye className="w-3.5 h-3.5" /></Button>
                            </Link>
                            {(isAdmin || isEmployee) && (
                              <Link href={`/vouchers/${v.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"><Edit2 className="w-3.5 h-3.5" /></Button>
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden flex-1 overflow-auto divide-y">
                {filteredVouchers.map((v) => {
                  const isVoid = v.isVoid || v.recipient.includes("VOID");
                  return (
                    <div key={v.id} className={cn("p-4 flex justify-between", isVoid ? "bg-red-50" : "hover:bg-muted/10")}>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-black text-xs">#{v.voucherNo}</span>
                          <span className="text-[10px] text-muted-foreground">{v.date}</span>
                        </div>
                        <p className="text-sm font-bold truncate">{v.recipient}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{v.purpose}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-base">{v.amountRO.toLocaleString()}<span className="text-[10px] ml-0.5">RO</span></p>
                        <p className="text-[10px] font-mono text-muted-foreground">{v.amountBz.toString().padStart(3, '0')} BZ</p>
                        <div className="flex gap-2 mt-2 justify-end">
                          <Link href={`/vouchers/${v.id}`}>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"><Eye className="w-4 h-4" /></Button>
                          </Link>
                          {(isAdmin || isEmployee) && (
                            <Link href={`/vouchers/${v.id}/edit`}>
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"><Edit2 className="w-4 h-4" /></Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Tabs */}
        <div className="bg-muted/30 border-t flex items-center px-1 h-9 no-print">
          <Tabs value={activeLedgerId} onValueChange={setActiveLedgerId} className="flex-1 overflow-x-auto">
            <TabsList className="bg-transparent h-9 p-0 gap-0">
              {ledgers.map((ledger) => (
                <div key={ledger.id} className="flex items-center group">
                  <TabsTrigger
                    value={ledger.id}
                    className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-t-2 data-[state=active]:border-t-primary h-9 px-4 text-[11px] font-semibold rounded-none border-x border-border/50 -ml-[1px]"
                  >
                    {ledger.name}
                  </TabsTrigger>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-6 rounded-none opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDeleteLedgerId(ledger.id);
                        setShowDeleteLedgerConfirm(true);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-none border-x border-border/50 text-[11px] px-4 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setShowAddLedger(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Sheet
                </Button>
              )}
            </TabsList>
          </Tabs>
          <div className="flex items-center px-3 gap-2 border-l border-border/50 h-full">
             <div className={cn("w-2 h-2 rounded-full", isRefreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
             <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
               UP: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showAddLedger} onOpenChange={setShowAddLedger}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Ledger Sheet</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter sheet name (e.g., Petty Cash 2024)"
              value={newLedgerName}
              onChange={(e) => setNewLedgerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLedger()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLedger(false)}>Cancel</Button>
            <Button onClick={handleAddLedger} disabled={!newLedgerName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteLedgerConfirm} onOpenChange={setShowDeleteLedgerConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ledger Sheet?</DialogTitle>
            <DialogDescription>
              This will permanently delete this sheet and all its vouchers. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteLedgerConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => pendingDeleteLedgerId && handleDeleteLedger(pendingDeleteLedgerId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Vouchers?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete these records? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
