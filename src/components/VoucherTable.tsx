"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Voucher, PaymentMethod, Ledger } from "@/lib/types";
import { 
  Search, 
  FileUp, 
  FileDown,
  Eye, 
  Loader2, 
  Plus, 
  MoreHorizontal, 
  Edit2, 
  Trash2,
  Trash,
  AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { 
  bulkImportVouchers, 
  createLedger, 
  renameLedger, 
  deleteLedger,
  bulkDeleteVouchers
} from "@/lib/voucher-actions";
import { convertAmountToWords } from "@/lib/amount-utils";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { cn } from "@/lib/utils";

function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 864e5));
    return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0]);
    let m = parseInt(parts[1]) - 1; 
    let y = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
    const manualDate = new Date(y, m, d);
    if (!isNaN(manualDate.getTime())) return manualDate.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

export function VoucherTable() {
  const { firestore, user, isUserLoading } = useFirebase();
  const [activeLedgerId, setActiveLedgerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isAddingLedger, setIsAddingLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState("");
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [editName, setEditName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const ledgersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, "ledgers"), orderBy("createdAt", "asc"));
  }, [firestore, user, isUserLoading]);

  const { data: ledgersData, isLoading: ledgersLoading } = useCollection<Ledger>(ledgersQuery);
  const ledgers = ledgersData || [];

  useEffect(() => {
    if (ledgers.length > 0 && !activeLedgerId) {
      setActiveLedgerId(ledgers[0].id);
    }
  }, [ledgers, activeLedgerId]);

  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !activeLedgerId || isUserLoading || ledgersLoading) return null;
    return query(
      collection(firestore, "vouchers"),
      where("ledgerId", "==", activeLedgerId)
    );
  }, [firestore, user, activeLedgerId, isUserLoading, ledgersLoading]);

  const { data: vouchersData, isLoading: vouchersLoading } = useCollection<Voucher>(vouchersQuery);
  const vouchers = vouchersData || [];

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeLedgerId]);

  async function handleAddLedger() {
    if (!newLedgerName.trim() || !firestore || !user) return;
    const ledger = await createLedger(newLedgerName, firestore);
    setActiveLedgerId(ledger.id);
    setNewLedgerName("");
    setIsAddingLedger(false);
  }

  async function handleRenameLedger() {
    if (!editingLedger || !editName.trim() || !firestore) return;
    await renameLedger(editingLedger.id, editName);
    setEditingLedger(null);
  }

  async function handleDeleteLedger(id: string) {
    await deleteLedger(id);
    if (activeLedgerId === id) setActiveLedgerId("");
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore || !user) return;

    setIsImporting(true);
    toast({ title: "Importing Ledger", description: "Processing data..." });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        
        let totalImportedCount = 0;
        const localExistingLedgers = new Map<string, string>();
        ledgers.forEach(l => localExistingLedgers.set(l.name.trim().toLowerCase(), l.id));

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as any[];
          
          if (rawJson.length === 0) continue;

          let targetLedgerId = localExistingLedgers.get(sheetName.trim().toLowerCase());
          
          if (!targetLedgerId) {
            const newLedger = await createLedger(sheetName.trim(), firestore);
            targetLedgerId = newLedger.id;
            localExistingLedgers.set(sheetName.trim().toLowerCase(), targetLedgerId);
            if (!activeLedgerId) setActiveLedgerId(targetLedgerId);
          }

          const vouchersForSheet: any[] = [];

          rawJson.forEach((row: any, index: number) => {
            const recipient = row["Paid To"] || row["Recipient"];
            const ro = Number(row["Amount (R.O.)"] || row["RO"] || 0);
            const bz = Number(row["Amount (Bz)"] || row["Bz"] || 0);
            const purpose = String(row["Being (Purpose)"] || row["Purpose"] || "").trim();
            const vNoRaw = row["Voucher No"] || row["Sl No"] || row["No"] || row["#"];

            if (!recipient && ro === 0 && bz === 0 && !purpose && !vNoRaw) return;

            const vNo = vNoRaw ? String(vNoRaw).replace(/\D/g, '').trim() : String(index + 1);
            const isActuallyVoid = !recipient || (ro === 0 && bz === 0) || String(recipient).includes("VOID");
            const totalAmount = ro + (bz / 1000);
            
            let method: PaymentMethod = "Cash";
            const methodStr = String(row["Payment Method"] || row["Method"] || "").toLowerCase();
            if (methodStr.includes("cheque")) method = "Cheque";
            if (methodStr.includes("transfer") || methodStr.includes("bank")) method = "Bank Transfer";

            vouchersForSheet.push({
              voucherNo: vNo, 
              date: parseExcelDate(row["Date"]),
              recipient: recipient ? String(recipient) : "VOID / NO DATA",
              amountRO: ro,
              amountBz: bz,
              sumInWords: isActuallyVoid ? "VOID" : convertAmountToWords(totalAmount),
              paymentMethod: method,
              bankName: String(row["Bank"] || ""),
              refNo: String(row["Cheque/Ref No"] || row["Ref No"] || row["Ref"] || ""),
              purpose: purpose || "N/A",
              ledgerId: targetLedgerId as string,
              isVoid: isActuallyVoid
            });
          });

          if (vouchersForSheet.length > 0) {
            await bulkImportVouchers(vouchersForSheet);
            totalImportedCount += vouchersForSheet.length;
          }
        }

        toast({ title: "Sync Complete", description: `Synchronized ${totalImportedCount} entries.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Import Error", description: "Failed to process spreadsheet." });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    if (filteredVouchers.length === 0) return;
    
    const header = [
      "Voucher No", 
      "Date", 
      "Paid To", 
      "Amount (R.O.)", 
      "Amount (Bz)", 
      "Payment Method", 
      "Being (Purpose)", 
      "Bank", 
      "Ref No"
    ];
    
    const rows = filteredVouchers.map(v => [
      v.voucherNo,
      v.date,
      v.recipient,
      v.amountRO,
      v.amountBz,
      v.paymentMethod,
      v.purpose,
      v.bankName || "",
      v.refNo || ""
    ]);

    const data = [header, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Tighten the reference to exactly the data range
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: data.length - 1, c: header.length - 1 }
    });

    // Apply Styles to Header
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        fill: { fgColor: { rgb: "E66E38" } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "left" }
      };
    }

    // Set Column Widths and Aggressively Hide everything from J (index 9) to XFD
    const wscols: any[] = [];
    wscols[0] = { wch: 12 }; // A: Voucher No
    wscols[1] = { wch: 12 }; // B: Date
    wscols[2] = { wch: 35 }; // C: Paid To
    wscols[3] = { wch: 14 }; // D: Amount RO
    wscols[4] = { wch: 8 };  // E: Amount Bz
    wscols[5] = { wch: 18 }; // F: Method
    wscols[6] = { wch: 45 }; // G: Purpose
    wscols[7] = { wch: 20 }; // H: Bank
    wscols[8] = { wch: 15 }; // I: Ref No
    
    // Hide columns from J (index 9) to 500 (covers J to XFD visually in most apps)
    for (let i = 9; i <= 500; i++) {
      wscols[i] = { hidden: true };
    }
    worksheet['!cols'] = wscols;

    // Aggressively Hide rows from the end of data to 5000
    const wsrows: any[] = [];
    for (let i = data.length; i <= 5000; i++) {
      wsrows[i] = { hidden: true, hpt: 0 };
    }
    worksheet['!rows'] = wsrows;

    const workbook = XLSX.utils.book_new();
    const ledgerName = ledgers.find(l => l.id === activeLedgerId)?.name || "Ledger";
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    XLSX.writeFile(workbook, `${ledgerName}_Export.xlsx`);
  };

  const filteredVouchers = vouchers
    .filter((v) => 
      v.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const numA = parseInt(a.voucherNo) || 0;
      const numB = parseInt(b.voucherNo) || 0;
      if (numA !== numB) return numA - numB;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredVouchers.length && filteredVouchers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVouchers.map(v => v.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await bulkDeleteVouchers(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast({ title: "Deleted Records" });
    } catch (e) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] border rounded-lg bg-card text-card-foreground shadow-xl overflow-hidden">
      <div className="p-3 bg-muted/30 border-b flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search active ledger..." 
              className="pl-9 h-9 text-xs bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={ledgers.length === 0}
            />
          </div>
          {selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="h-8 text-[11px]"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              <Trash className="w-3 h-3 mr-1" />
              Delete {selectedIds.size}
            </Button>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="h-9 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
            Import File
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
            disabled={filteredVouchers.length === 0}
            className="h-9 text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
          >
            <FileDown className="w-3 h-3" />
            Export Ledger
          </Button>
          <Link href="/vouchers/new">
            <Button size="sm" className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-3 h-3" />
              New Entry
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative bg-background">
        {(isImporting || vouchersLoading || ledgersLoading || isBulkDeleting) && (
          <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-primary/20 overflow-hidden">
            <div className="h-full bg-primary animate-[shimmer_1s_infinite_linear] bg-[length:200%_100%] bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
          </div>
        )}
        
        {ledgers.length === 0 && !ledgersLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-bold mb-1">Sequential Ledger</h3>
            <p className="max-w-xs text-sm opacity-70">Upload your Excel files to populate the digital ledger.</p>
          </div>
        ) : (
          <Table className="border-collapse table-fixed w-full">
            <TableHeader className="bg-slate-900 dark:bg-slate-950 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-none h-10">
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-10 px-2 text-left no-print">
                  <Checkbox 
                    checked={filteredVouchers.length > 0 && selectedIds.size === filteredVouchers.length}
                    onCheckedChange={toggleSelectAll}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
                  />
                </TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-24 px-2 text-left">Voucher No.</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-24 px-2 text-left">Date</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-48 px-2 text-left">Recipient</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-24 px-2 text-left">Amt (R.O.)</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-16 px-2 text-left">Bz</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-32 px-2 text-left">Method</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-64 px-2 text-left">Purpose</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-24 px-2 text-left">Bank</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700/50 w-24 px-2 text-left">Ref No</TableHead>
                <TableHead className="text-white font-bold text-[11px] w-24 px-2 text-left no-print">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVouchers.length === 0 && !vouchersLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-64 text-center text-muted-foreground italic text-xs">
                    No records found. Import a file to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVouchers.map((v) => {
                  const isActuallyVoid = v.isVoid || v.recipient === "VOID / NO DATA" || String(v.recipient).includes("VOID");
                  return (
                    <TableRow 
                      key={v.id} 
                      className={cn(
                        "border-none h-9 transition-colors",
                        isActuallyVoid 
                          ? "bg-[#ef4444] hover:bg-[#dc2626] text-white" 
                          : "bg-background hover:bg-muted/10"
                      )}
                    >
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-left no-print">
                        <Checkbox 
                          checked={selectedIds.has(v.id)}
                          onCheckedChange={() => toggleSelect(v.id)}
                          className={isActuallyVoid ? "border-white data-[state=checked]:bg-white data-[state=checked]:text-red-600" : ""}
                        />
                      </TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-[11px] font-mono font-bold text-left">
                        {v.voucherNo}
                      </TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-[11px] text-left">{v.date}</TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-[11px] font-semibold text-left">
                        {v.recipient}
                      </TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-left font-black text-[11px]">{v.amountRO.toLocaleString()}</TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-left font-mono text-[11px]">{v.amountBz.toString().padStart(3, '0')}</TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-[10px] uppercase font-semibold text-left">{v.paymentMethod}</TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-[11px] truncate text-left" title={v.purpose}>{v.purpose}</TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-[11px] truncate italic text-left">{v.bankName || "-"}</TableCell>
                      <TableCell className="border-r border-b border-border/50 px-2 py-1 text-[11px] truncate font-mono text-left">{v.refNo || "-"}</TableCell>
                      <TableCell className="border-b border-border/50 px-2 py-1 flex items-center justify-start gap-1 no-print">
                        <Link href={`/vouchers/${v.id}`}>
                          <Button variant="ghost" size="icon" className={cn("h-6 w-6", isActuallyVoid ? "text-white hover:bg-white/20" : "text-primary")}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/vouchers/${v.id}/edit`}>
                          <Button variant="ghost" size="icon" className={cn("h-6 w-6", isActuallyVoid ? "text-white/80 hover:bg-white/20" : "text-muted-foreground")}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="bg-muted/30 border-t flex items-center px-1 h-9 no-print">
        <Tabs value={activeLedgerId} onValueChange={setActiveLedgerId} className="flex-1 overflow-x-auto">
          <TabsList className="bg-transparent h-9 p-0 gap-0">
            {ledgers.map((ledger) => (
              <div key={ledger.id} className="flex items-center group">
                <TabsTrigger 
                  value={ledger.id}
                  className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-t-2 data-[state=active]:border-t-primary h-9 px-4 text-[11px] font-semibold rounded-none border-x border-border/50 -ml-[1px] transition-none"
                >
                  {ledger.name}
                </TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-9 w-5 hover:bg-muted flex items-center justify-center border-r border-border/50">
                      <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="text-xs">
                    <DropdownMenuItem onClick={() => { setEditingLedger(ledger); setEditName(ledger.name); }}>
                      <Edit2 className="w-3 h-3 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteLedger(ledger.id)}>
                      <Trash2 className="w-3 h-3 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsAddingLedger(true)}
              className="h-9 px-3 hover:bg-muted rounded-none border-r border-border/50"
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </TabsList>
        </Tabs>
      </div>

      <Dialog open={isAddingLedger} onOpenChange={setIsAddingLedger}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Create New Sheet</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g. Sales Jan 2024" 
              value={newLedgerName} 
              onChange={(e) => setNewLedgerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLedger()}
              autoFocus
              className="text-xs h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddingLedger(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddLedger}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLedger} onOpenChange={(open) => !open && setEditingLedger(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Rename Sheet</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              value={editName} 
              onChange={(e) => setEditName(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleRenameLedger()}
              autoFocus
              className="text-xs h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingLedger(null)}>Cancel</Button>
            <Button size="sm" onClick={handleRenameLedger}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
