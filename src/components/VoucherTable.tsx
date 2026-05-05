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
} from "lucide-react";
import * as XLSX from "xlsx";
import { 
  bulkImportVouchers, 
  createLedger, 
  renameLedger, 
  deleteLedger 
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

export function VoucherTable() {
  const { firestore, user, isUserLoading } = useFirebase();
  const [activeLedgerId, setActiveLedgerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isAddingLedger, setIsAddingLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState("");
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [editName, setEditName] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Ensure we wait for user stability before running queries
  const ledgersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(collection(firestore, "ledgers"), orderBy("createdAt", "asc"));
  }, [firestore, user, isUserLoading]);

  const { data: ledgersData, isLoading: ledgersLoading } = useCollection<Ledger>(ledgersQuery);
  const ledgers = ledgersData || [];

  useEffect(() => {
    if (isUserLoading || !user || ledgersLoading) return;
    
    // Auto-initialize Sheet1 only if we are truly authenticated and ledgers are empty
    if (ledgers.length === 0 && !activeLedgerId && !ledgersLoading) {
      const initializeSheet = async () => {
        try {
          const ledger = await createLedger("Sheet1", firestore);
          setActiveLedgerId(ledger.id);
        } catch (e) {
          console.error("Failed to initialize sheet:", e);
        }
      };
      initializeSheet();
    } else if (ledgers.length > 0 && !activeLedgerId) {
      setActiveLedgerId(ledgers[0].id);
    }
  }, [ledgers, activeLedgerId, ledgersLoading, user, isUserLoading, firestore]);

  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !activeLedgerId || isUserLoading) return null;
    return query(
      collection(firestore, "vouchers"),
      where("ledgerId", "==", activeLedgerId),
      orderBy("createdAt", "desc")
    );
  }, [firestore, user, activeLedgerId, isUserLoading]);

  const { data: vouchersData, isLoading: vouchersLoading } = useCollection<Voucher>(vouchersQuery);
  const vouchers = vouchersData || [];

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
    if (!file) return;

    if (!activeLedgerId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a sheet first." });
      return;
    }

    setIsImporting(true);
    toast({ title: "Starting Import", description: "Processing your Excel file..." });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (json.length === 0) {
          toast({ variant: "destructive", title: "Empty File", description: "No data found in the spreadsheet." });
          setIsImporting(false);
          return;
        }

        const vouchersToImport = json.map((row: any) => {
          const ro = Number(row["Amount (R.O.)"] || row["RO"] || 0);
          const bz = Number(row["Amount (Bz)"] || row["Bz"] || 0);
          const totalAmount = ro + (bz / 1000);
          
          let method: PaymentMethod = "Cash";
          const methodStr = String(row["Payment Method"] || row["Method"] || "").toLowerCase();
          if (methodStr.includes("cheque")) method = "Cheque";
          if (methodStr.includes("transfer") || methodStr.includes("bank")) method = "Bank Transfer";

          return {
            voucherNo: String(row["Voucher No"] || row["No"] || "V-" + Math.floor(Math.random()*1000)),
            date: row["Date"] ? new Date(row["Date"]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            recipient: String(row["Paid To"] || row["Recipient"] || "N/A"),
            amountRO: ro,
            amountBz: bz,
            sumInWords: convertAmountToWords(totalAmount),
            paymentMethod: method,
            bankName: String(row["Bank"] || ""),
            refNo: String(row["Cheque/Ref No"] || row["Ref"] || ""),
            purpose: String(row["Being (Purpose)"] || row["Purpose"] || "N/A"),
            ledgerId: activeLedgerId
          };
        });

        await bulkImportVouchers(vouchersToImport);
        toast({ title: "Import Successful", description: `Successfully imported ${vouchersToImport.length} records.` });
      } catch (error) {
        toast({ variant: "destructive", title: "Import Error", description: "Failed to process the Excel data. Please check the format." });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredVouchers = vouchers.filter((v) => 
    v.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] border rounded-lg bg-white shadow-xl overflow-hidden">
      <div className="p-3 bg-slate-50 border-b flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search current sheet..." 
            className="pl-9 h-9 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
            Import XLSX
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
        {(isImporting || vouchersLoading || ledgersLoading) && (
          <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-orange-100 overflow-hidden">
            <div className="h-full bg-[#E66E38] animate-[shimmer_1s_infinite_linear] bg-[length:200%_100%] bg-gradient-to-r from-[#E66E38]/20 via-[#E66E38] to-[#E66E38]/20" />
          </div>
        )}
        
        <Table className="border-collapse table-fixed w-full">
          <TableHeader className="bg-[#2a4365] sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-none h-10">
              <TableHead className="text-white font-bold text-[11px] border-r border-slate-700 w-16 px-2">No.</TableHead>
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
                <TableCell colSpan={10} className="h-64 text-center text-slate-400 italic text-xs">
                  {searchTerm ? "No matching records found." : "This sheet is ready for data import."}
                </TableCell>
              </TableRow>
            ) : (
              filteredVouchers.map((v, idx) => (
                <TableRow 
                  key={v.id} 
                  className={idx % 2 === 0 ? "bg-white border-b border-slate-100" : "bg-[#f0f7ff] border-b border-slate-100"}
                >
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] font-mono text-[#DB0D3A] font-bold">{v.voucherNo}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px]">{v.date}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-800">{v.recipient}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] text-right font-black">{v.amountRO.toLocaleString()}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] text-right font-mono">{v.amountBz.toString().padStart(3, '0')}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[10px] uppercase font-semibold text-slate-500">{v.paymentMethod}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate" title={v.purpose}>{v.purpose}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate text-slate-500 italic">{v.bankName || "-"}</TableCell>
                  <TableCell className="border-r border-slate-100 px-2 py-1.5 text-[11px] truncate font-mono">{v.refNo || "-"}</TableCell>
                  <TableCell className="px-2 py-1 text-center no-print">
                    <Link href={`/vouchers/${v.id}`}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-[#E66E38] hover:text-white hover:bg-[#E66E38]">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!vouchersLoading && !ledgersLoading && Array.from({ length: Math.max(0, 50 - filteredVouchers.length) }).map((_, i) => (
              <TableRow key={`empty-${i}`} className="border-b border-slate-100 hover:bg-transparent">
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="border-r border-slate-100 h-8" />
                <TableCell className="h-8 no-print" />
              </TableRow>
            ))}
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
          {filteredVouchers.length} Records found
        </div>
      </div>

      <Dialog open={isAddingLedger} onOpenChange={setIsAddingLedger}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>New Spreadsheet Sheet</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Enter sheet name..." 
              value={newLedgerName} 
              onChange={(e) => setNewLedgerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLedger()}
              autoFocus
              className="text-xs h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddingLedger(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddLedger}>Create Sheet</Button>
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