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
import { Progress } from "@/components/ui/progress";
import { Voucher, PaymentMethod, Ledger } from "@/lib/types";
import { 
  Search, 
  FileUp, 
  Eye, 
  FileSpreadsheet, 
  Loader2, 
  Plus, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
} from "lucide-react";
import { format } from "date-fns";
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
  const { firestore, user } = useFirebase();
  const [activeLedgerId, setActiveLedgerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isAddingLedger, setIsAddingLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState("");
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [editName, setEditName] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Real-time Ledgers
  const ledgersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "ledgers"), orderBy("createdAt", "asc"));
  }, [firestore, user]);

  const { data: ledgersData, isLoading: ledgersLoading } = useCollection<Ledger>(ledgersQuery);
  const ledgers = ledgersData || [];

  useEffect(() => {
    if (ledgers.length > 0 && !activeLedgerId) {
      setActiveLedgerId(ledgers[0].id);
    }
  }, [ledgers, activeLedgerId]);

  // Real-time Vouchers for active ledger
  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !activeLedgerId) return null;
    return query(
      collection(firestore, "vouchers"),
      where("ledgerId", "==", activeLedgerId),
      orderBy("createdAt", "desc")
    );
  }, [firestore, user, activeLedgerId]);

  const { data: vouchersData, isLoading: vouchersLoading } = useCollection<Voucher>(vouchersQuery);
  const vouchers = vouchersData || [];

  async function handleAddLedger() {
    if (!newLedgerName.trim()) return;
    const ledger = await createLedger(newLedgerName);
    setActiveLedgerId(ledger.id);
    setNewLedgerName("");
    setIsAddingLedger(false);
    toast({ title: "New Sheet Created", description: `"${newLedgerName}" is now ready.` });
  }

  async function handleRenameLedger() {
    if (!editingLedger || !editName.trim()) return;
    await renameLedger(editingLedger.id, editName);
    setEditingLedger(null);
    toast({ title: "Sheet Renamed", description: `Updated to "${editName}"` });
  }

  async function handleDeleteLedger(id: string) {
    if (ledgers.length <= 1) {
      toast({ variant: "destructive", title: "Action Denied", description: "You must have at least one sheet." });
      return;
    }
    await deleteLedger(id);
    if (activeLedgerId === id) {
      const nextLedger = ledgers.find(l => l.id !== id);
      if (nextLedger) setActiveLedgerId(nextLedger.id);
    }
    toast({ title: "Sheet Deleted" });
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!activeLedgerId) {
      toast({ 
        variant: "destructive", 
        title: "No Sheet Selected", 
        description: "Please select a ledger sheet before importing." 
      });
      return;
    }

    const activeSheetName = ledgers.find(l => l.id === activeLedgerId)?.name || "Sheet";
    setIsImporting(true);
    
    toast({ 
      title: "Syncing Data", 
      description: `Reading "${file.name}"... Updating ledger "${activeSheetName}".` 
    });
    
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
          const ro = Number(row["Amount (R.O.)"]) || Number(row["RO"]) || 0;
          const bz = Number(row["Amount (Bz)"]) || Number(row["Bz"]) || 0;
          const totalAmount = ro + (bz / 1000);
          
          let method: PaymentMethod = "Cash";
          const methodStr = String(row["Payment Method"] || row["Method"] || "").toLowerCase();
          if (methodStr.includes("cheque")) method = "Cheque";
          if (methodStr.includes("transfer") || methodStr.includes("bank")) method = "Bank Transfer";

          return {
            voucherNo: String(row["Voucher No"] || row["No"] || "V-0000"),
            date: row["Date"] ? new Date(row["Date"]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            recipient: String(row["Paid To"] || row["Recipient"] || "N/A"),
            amountRO: ro,
            amountBz: bz,
            sumInWords: convertAmountToWords(totalAmount),
            paymentMethod: method,
            bankName: row["Bank"] || "",
            refNo: row["Cheque/Ref No"] || row["Ref"] || "",
            purpose: row["Being (Purpose)"] || row["Purpose"] || "N/A",
            ledgerId: activeLedgerId
          };
        });

        await bulkImportVouchers(vouchersToImport);
        
        toast({ 
          title: "Import Successful", 
          description: `Added ${vouchersToImport.length} vouchers to "${activeSheetName}".` 
        });
      } catch (error) {
        console.error("Import error:", error);
        toast({ 
          variant: "destructive", 
          title: "Import Error", 
          description: "Check your file format and try again." 
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportToCSV = () => {
    const activeName = ledgers.find(l => l.id === activeLedgerId)?.name || "ledger";
    const headers = ["Voucher No", "Date", "Paid To", "Amount (R.O.)", "Amount (Bz)", "Payment Method", "Being (Purpose)", "Bank", "Cheque/Ref No"];
    const rows = filteredVouchers.map(v => [
      v.voucherNo, v.date, v.recipient, v.amountRO, v.amountBz, v.paymentMethod, v.purpose, v.bankName || "", v.refNo || ""
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tropical_${activeName}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const filteredVouchers = vouchers.filter((v) => 
    v.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search this sheet..." 
            className="pl-10 h-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-1 sm:flex-none h-10 flex items-center gap-2 bg-white"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            Import XLSX
          </Button>
          <Button variant="outline" onClick={exportToCSV} className="flex-1 sm:flex-none h-10 flex items-center gap-2 bg-white">
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-hidden shadow-sm relative min-h-[400px]">
        {/* Sleek Progress Bar for loading states instead of full overlay */}
        {(isImporting || vouchersLoading || ledgersLoading) && (
          <div className="absolute top-0 left-0 right-0 z-20 h-1">
            <div className="h-full bg-primary animate-[shimmer_1.5s_infinite_linear] bg-[length:200%_100%] bg-gradient-to-r from-primary via-primary/50 to-primary" />
          </div>
        )}
        
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="font-bold w-[120px]">Voucher No</TableHead>
              <TableHead className="font-bold w-[120px]">Date</TableHead>
              <TableHead className="font-bold">Paid To</TableHead>
              <TableHead className="text-right font-bold w-[100px]">R.O.</TableHead>
              <TableHead className="text-right font-bold w-[80px]">Bz</TableHead>
              <TableHead className="font-bold w-[120px]">Method</TableHead>
              <TableHead className="font-bold">Purpose</TableHead>
              <TableHead className="text-center no-print w-[60px]">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVouchers.length === 0 && !vouchersLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-muted-foreground italic">
                  {searchTerm ? "No matches found." : "This sheet is currently empty."}
                </TableCell>
              </TableRow>
            ) : (
              filteredVouchers.map((v, idx) => (
                <TableRow key={v.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <TableCell className="font-medium text-xs font-mono">{v.voucherNo}</TableCell>
                  <TableCell className="text-xs">{v.date}</TableCell>
                  <TableCell className="font-bold text-xs max-w-[200px] truncate">{v.recipient}</TableCell>
                  <TableCell className="text-right font-black text-primary text-xs">{v.amountRO.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{v.amountBz.toString().padStart(3, '0')}</TableCell>
                  <TableCell className="text-[10px] font-bold uppercase">{v.paymentMethod}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs">{v.purpose}</TableCell>
                  <TableCell className="text-center no-print p-1">
                    <Link href={`/vouchers/${v.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="bg-slate-200 p-0.5 rounded-b-lg flex items-center border border-t-0 overflow-x-auto no-print">
        <Tabs value={activeLedgerId} onValueChange={setActiveLedgerId} className="w-full">
          <TabsList className="bg-transparent justify-start h-9 p-0 gap-0">
            {ledgers.map((ledger) => (
              <div key={ledger.id} className="flex items-center group border-r border-slate-300">
                <TabsTrigger 
                  value={ledger.id}
                  className="data-[state=active]:bg-white data-[state=active]:text-primary h-9 px-6 text-xs font-bold rounded-none"
                >
                  {ledger.name}
                </TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-9 w-6 bg-slate-200 hover:bg-slate-300 flex items-center justify-center border-l border-slate-300">
                      <MoreHorizontal className="w-3 h-3 text-slate-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
              className="h-9 px-4 text-primary hover:bg-slate-300 rounded-none border-l border-slate-300"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="text-[10px] font-bold uppercase">New Sheet</span>
            </Button>
          </TabsList>
        </Tabs>
      </div>

      {/* Sheet Management Dialogs */}
      <Dialog open={isAddingLedger} onOpenChange={setIsAddingLedger}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Ledger Sheet</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g. October 2024" 
              value={newLedgerName} 
              onChange={(e) => setNewLedgerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLedger()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingLedger(false)}>Cancel</Button>
            <Button onClick={handleAddLedger}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLedger} onOpenChange={(open) => !open && setEditingLedger(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Sheet</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input 
              value={editName} 
              onChange={(e) => setEditName(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleRenameLedger()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLedger(null)}>Cancel</Button>
            <Button onClick={handleRenameLedger}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
