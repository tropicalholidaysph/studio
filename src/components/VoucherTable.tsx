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
  CheckSquare,
  Square
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

/**
 * Robust date parsing for Excel imports.
 */
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

    if (d > 31 && y <= 31) {
      const tmp = d; d = y; y = tmp;
    }
    
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
  
  const initRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const ledgersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, "ledgers"), orderBy("createdAt", "asc"));
  }, [firestore, user, isUserLoading]);

  const { data: ledgersData, isLoading: ledgersLoading } = useCollection<Ledger>(ledgersQuery);
  const ledgers = ledgersData || [];

  useEffect(() => {
    if (isUserLoading || !user || ledgersLoading || initRef.current) return;
    
    if (ledgers.length > 0) {
      if (!activeLedgerId) {
        setActiveLedgerId(ledgers[0].id);
      }
      return;
    }

    initRef.current = true;
    const initializeSheet = async () => {
      try {
        const ledger = await createLedger("Sheet1", firestore);
        setActiveLedgerId(ledger.id);
      } catch (e) {
        initRef.current = false;
      }
    };
    initializeSheet();
  }, [ledgers, activeLedgerId, ledgersLoading, user, isUserLoading, firestore]);

  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !activeLedgerId || isUserLoading || ledgersLoading) return null;
    return query(
      collection(firestore, "vouchers"),
      where("ledgerId", "==", activeLedgerId)
    );
  }, [firestore, user, activeLedgerId, isUserLoading, ledgersLoading]);

  const { data: vouchersData, isLoading: vouchersLoading } = useCollection<Voucher>(vouchersQuery);
  const vouchers = vouchersData || [];

  // Reset selection when changing tabs
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeLedgerId]);

  async function handleAddLedger() {
    if (!newLedgerName.trim() || !firestore || !user) return;
    const ledger = await createLedger(newLedgerName, firestore);
    setActiveLedgerId(ledger.id);
    setNewLedgerName("");
    setIsAddingLedger(false);
    toast({ title: "Sheet Created", description: `"${newLedgerName}" is now active.` });
  }

  async function handleRenameLedger() {
    if (!editingLedger || !editName.trim() || !firestore) return;
    await renameLedger(editingLedger.id, editName);
    setEditingLedger(null);
    toast({ title: "Renamed", description: `Sheet updated to "${editName}"` });
  }

  async function handleDeleteLedger(id: string) {
    if (ledgers.length <= 1) {
      toast({ variant: "destructive", title: "Cannot Delete", description: "You must have at least one sheet." });
      return;
    }
    await deleteLedger(id);
    if (activeLedgerId === id) {
      const nextLedger = ledgers.find(l => l.id !== id);
      if (nextLedger) setActiveLedgerId(nextLedger.id);
    }
    toast({ title: "Deleted", description: "Sheet has been removed." });
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) return;

    setIsImporting(true);
    toast({ title: "Importing File", description: "Reading all sheets from your file..." });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        
        let totalImportedCount = 0;
        const existingLedgerMap = new Map<string, string>();
        ledgers.forEach(l => existingLedgerMap.set(l.name.toLowerCase(), l.id));

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          if (json.length === 0) continue;

          let targetLedgerId = existingLedgerMap.get(sheetName.toLowerCase());
          
          if (!targetLedgerId) {
            const newLedger = await createLedger(sheetName, firestore);
            targetLedgerId = newLedger.id;
            existingLedgerMap.set(sheetName.toLowerCase(), targetLedgerId);
          }

          const vouchersForSheet = json.map((row: any) => {
            const ro = Number(row["Amount (R.O.)"] || row["RO"] || row["RIYAL"] || row["Amount"] || 0);
            const bz = Number(row["Amount (Bz)"] || row["Bz"] || row["BAISA"] || 0);
            const totalAmount = ro + (bz / 1000);
            
            let method: PaymentMethod = "Cash";
            const methodStr = String(row["Payment Method"] || row["Method"] || row["MODE"] || "").toLowerCase();
            if (methodStr.includes("cheque")) method = "Cheque";
            if (methodStr.includes("transfer") || methodStr.includes("bank")) method = "Bank Transfer";

            const vNo = row["Voucher No"] || row["Voucher No."] || row["Voucher #"] || row["No"] || row["Sl No"] || row["#"];

            return {
              voucherNo: String(vNo || "V-" + Math.floor(Math.random()*10000)),
              date: parseExcelDate(row["Date"] || row["DATE"]),
              recipient: String(row["Paid To"] || row["Recipient"] || row["PARTICULARS"] || row["Name"] || "N/A"),
              amountRO: ro,
              amountBz: bz,
              sumInWords: convertAmountToWords(totalAmount),
              paymentMethod: method,
              bankName: String(row["Bank"] || ""),
              refNo: String(row["Cheque/Ref No"] || row["Ref"] || row["CHQ NO"] || ""),
              purpose: String(row["Being (Purpose)"] || row["Purpose"] || row["DESCRIPTION"] || "N/A"),
              ledgerId: targetLedgerId
            };
          });

          if (vouchersForSheet.length > 0) {
            await bulkImportVouchers(vouchersForSheet);
            totalImportedCount += vouchersForSheet.length;
          }
        }

        toast({ title: "Success", description: `Imported ${totalImportedCount} records across detected sheets.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Import Error", description: "Failed to process the spreadsheet." });
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    toast({ title: "Deleting Records", description: `Removing ${selectedIds.size} vouchers...` });
    
    try {
      await bulkDeleteVouchers(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast({ title: "Deleted Successfully", description: "Records have been removed from the ledger." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete records." });
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
              placeholder="Search current sheet..." 
              className="pl-9 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-[11px] font-bold text-primary">{selectedIds.size} selected</span>
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-7 px-2 text-[10px]"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash className="w-3 h-3 mr-1" />}
                Delete Selected
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="h-9 text-xs flex items-center gap-2 border-[#E66E38] text-[#E66E38] hover:bg-[#E66E38] hover:text-white"
          >
            {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
            Import Spreadsheet (All Sheets)
          </Button>
          <Link href="/vouchers/new">
            <Button size="sm" className="h-9 text-xs bg-[#E66E38] hover:bg-[#E66E38]/90 flex items-center gap-2">
              <Plus className="w-3 h-3" />
              Manual Entry
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative">
        {(isImporting || vouchersLoading || ledgersLoading || isBulkDeleting) && (
          <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-orange-100 overflow-hidden">
            <div className="h-full bg-[#E66E38] animate-[shimmer_1s_infinite_linear] bg-[length:200%_100%] bg-gradient-to-r from-[#E66E38]/20 via-[#E66E38] to-[#E66E38]/20" />
          </div>
        )}
        
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
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-20 px-2">Voucher No.</TableHead>
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2">Date</TableHead>
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-48 px-2">Paid To</TableHead>
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2 text-right">Amt (R.O.)</TableHead>
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-16 px-2 text-right">Bz</TableHead>
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-32 px-2">Method</TableHead>
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-64 px-2">Purpose</TableHead>
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2">Bank</TableHead>
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-24 px-2">Ref No</TableHead>
              <TableHead className="text-white font-bold text-[11px] w-12 px-2 text-center no-print">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVouchers.length === 0 && !vouchersLoading && !ledgersLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-64 text-center text-slate-400 italic text-xs">
                  {searchTerm ? "No matching records found." : "This sheet is ready for data entry."}
                </TableCell>
              </TableRow>
            ) : (
              filteredVouchers.map((v, idx) => (
                <TableRow 
                  key={v.id} 
                  className={idx % 2 === 0 ? "bg-white border-b border-slate-100" : "bg-[#f0f7ff] border-b border-slate-100"}
                  onClick={() => toggleSelect(v.id)}
                >
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-center no-print" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.has(v.id)}
                      onCheckedChange={() => toggleSelect(v.id)}
                    />
                  </TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] font-mono text-[#DB0D3A] font-bold">{v.voucherNo}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px]">{v.date}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-800">{v.recipient}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] text-right font-black">{v.amountRO.toLocaleString()}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] text-right font-mono">{v.amountBz.toString().padStart(3, '0')}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-500">{v.paymentMethod}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate" title={v.purpose}>{v.purpose}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate text-slate-500 italic">{v.bankName || "-"}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate font-mono">{v.refNo || "-"}</TableCell>
                  <TableCell className="px-2 py-1 text-center no-print" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/vouchers/${v.id}`}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-[#E66E38] hover:text-white hover:bg-[#E66E38]">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
        <div className="px-4 text-[10px] text-slate-400 font-medium">
          {filteredVouchers.length} Records {selectedIds.size > 0 && `(${selectedIds.size} selected)`}
        </div>
      </div>

      <Dialog open={isAddingLedger} onOpenChange={setIsAddingLedger}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>New Sheet</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Sheet Name (e.g. Sales)" 
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
            <Button size="sm" onClick={handleRenameLedger}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
