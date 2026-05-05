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
  Eye, 
  Loader2, 
  Plus, 
  MoreHorizontal, 
  Edit2, 
  Trash2,
  Trash,
  AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";
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
    toast({ title: "Importing Ledger", description: "Syncing exactly 50 rows per sheet..." });
    
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
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: null }).slice(0, 50) as any[];
          
          if (rawJson.length === 0) continue;

          let targetLedgerId = localExistingLedgers.get(sheetName.trim().toLowerCase());
          
          if (!targetLedgerId) {
            const newLedger = await createLedger(sheetName.trim(), firestore);
            targetLedgerId = newLedger.id;
            localExistingLedgers.set(sheetName.trim().toLowerCase(), targetLedgerId);
            if (!activeLedgerId) setActiveLedgerId(targetLedgerId);
          }

          const vouchersForSheet = rawJson.map((row: any, index: number) => {
            const vNoRaw = row["Voucher No"] || row["Sl No"] || row["No"] || row["#"] || String(index + 1);
            const vNo = String(vNoRaw).replace(/\D/g, '').trim(); 
            
            const recipient = row["Paid To"] || row["Recipient"];
            const ro = Number(row["Amount (R.O.)"] || row["RO"] || 0);
            const bz = Number(row["Amount (Bz)"] || row["Bz"] || 0);
            
            const isVoid = !recipient || (!ro && !bz);

            const totalAmount = ro + (bz / 1000);
            
            let method: PaymentMethod = "Cash";
            const methodStr = String(row["Payment Method"] || row["Method"] || "").toLowerCase();
            if (methodStr.includes("cheque")) method = "Cheque";
            if (methodStr.includes("transfer") || methodStr.includes("bank")) method = "Bank Transfer";

            return {
              voucherNo: vNo, 
              date: parseExcelDate(row["Date"]),
              recipient: recipient ? String(recipient) : "VOID / NO DATA",
              amountRO: ro,
              amountBz: bz,
              sumInWords: isVoid ? "VOID" : convertAmountToWords(totalAmount),
              paymentMethod: method,
              bankName: String(row["Bank"] || ""),
              refNo: String(row["Cheque/Ref No"] || row["Ref No"] || row["Ref"] || ""),
              purpose: String(row["Being (Purpose)"] || row["Purpose"] || "N/A"),
              ledgerId: targetLedgerId as string,
              isVoid: isVoid
            };
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

  const filteredVouchers = vouchers
    .filter((v) => 
      v.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const numA = parseInt(a.voucherNo) || 0;
      const numB = parseInt(b.voucherNo) || 0;
      return numA - numB;
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
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] border rounded-lg bg-white shadow-xl overflow-hidden">
      <div className="p-3 bg-slate-50 border-b flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search active ledger..." 
              className="pl-9 h-9 text-xs"
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
            className="h-9 text-xs border-primary text-primary hover:bg-primary hover:text-white"
          >
            {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
            Import Ledger File
          </Button>
          <Link href="/vouchers/new">
            <Button size="sm" className="h-9 text-xs bg-primary hover:bg-primary/90">
              <Plus className="w-3 h-3" />
              New Entry
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative">
        {(isImporting || vouchersLoading || ledgersLoading || isBulkDeleting) && (
          <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-primary/20 overflow-hidden">
            <div className="h-full bg-primary animate-[shimmer_1s_infinite_linear] bg-[length:200%_100%] bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
          </div>
        )}
        
        {ledgers.length === 0 && !ledgersLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-slate-600 mb-1">Spreadsheet Dashboard</h3>
            <p className="max-w-xs text-sm">Synchronize your Excel records. The system strictly processes the first 50 rows per sheet.</p>
          </div>
        ) : (
          <Table className="border-collapse table-fixed w-full">
            <TableHeader className="bg-[#2a4365] sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-none h-10">
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-10 px-2 text-center no-print">
                  <Checkbox 
                    checked={filteredVouchers.length > 0 && selectedIds.size === filteredVouchers.length}
                    onCheckedChange={toggleSelectAll}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#2a4365]"
                  />
                </TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2">Voucher No.</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2">Date</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-48 px-2">Recipient</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2 text-right">Amt (R.O.)</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-16 px-2 text-right">Bz</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-32 px-2">Method</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-64 px-2">Purpose</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2">Bank</TableHead>
                <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2">Ref No</TableHead>
                <TableHead className="text-white font-bold text-[11px] w-24 px-2 text-center no-print">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVouchers.length === 0 && !vouchersLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-64 text-center text-slate-400 italic text-xs">
                    No sequential records found in this ledger.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVouchers.map((v, idx) => (
                  <TableRow 
                    key={v.id} 
                    className={cn(
                      idx % 2 === 0 ? "bg-white border-b border-slate-100" : "bg-[#f0f7ff] border-b border-slate-100",
                      v.isVoid && "bg-red-500 text-white font-black hover:bg-red-600"
                    )}
                  >
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-center no-print">
                      <Checkbox 
                        checked={selectedIds.has(v.id)}
                        onCheckedChange={() => toggleSelect(v.id)}
                      />
                    </TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] font-mono font-bold">
                      {v.voucherNo}
                    </TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px]">{v.date}</TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] font-bold">
                      {v.recipient}
                    </TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-right font-black text-[11px]">{v.amountRO.toLocaleString()}</TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-right font-mono text-[11px]">{v.amountBz.toString().padStart(3, '0')}</TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[10px] uppercase font-semibold">{v.paymentMethod}</TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate" title={v.purpose}>{v.purpose}</TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate italic">{v.bankName || "-"}</TableCell>
                    <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate font-mono">{v.refNo || "-"}</TableCell>
                    <TableCell className="px-2 py-1 flex items-center justify-center gap-1 no-print">
                      <Link href={`/vouchers/${v.id}`}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:text-white hover:bg-primary">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/vouchers/${v.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white hover:bg-slate-500">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="bg-[#f1f5f9] border-t flex items-center px-1 h-9 no-print">
        <Tabs value={activeLedgerId} onValueChange={setActiveLedgerId} className="flex-1 overflow-x-auto">
          <TabsList className="bg-transparent h-9 p-0 gap-0">
            {ledgers.map((ledger) => (
              <div key={ledger.id} className="flex items-center group">
                <TabsTrigger 
                  value={ledger.id}
                  className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:border-t-2 data-[state=active]:border-t-blue-600 h-9 px-4 text-[11px] font-semibold rounded-none border-x border-slate-300 -ml-[1px]"
                >
                  {ledger.name}
                </TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-9 w-5 hover:bg-slate-200 flex items-center justify-center border-r border-slate-300">
                      <MoreHorizontal className="w-3 h-3 text-slate-400" />
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
              className="h-9 px-3 hover:bg-slate-200 rounded-none border-r border-slate-300"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
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
