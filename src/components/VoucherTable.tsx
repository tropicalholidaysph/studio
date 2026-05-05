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
  getVouchersByLedger, 
  getLedgers, 
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

export function VoucherTable() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [activeLedgerId, setActiveLedgerId] = useState<string>("");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddingLedger, setIsAddingLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState("");
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [editName, setEditName] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLedgers();
  }, []);

  useEffect(() => {
    if (activeLedgerId) {
      loadVouchers(activeLedgerId);
    }
  }, [activeLedgerId]);

  async function loadLedgers() {
    const data = await getLedgers();
    setLedgers(data);
    if (data.length > 0 && !activeLedgerId) {
      setActiveLedgerId(data[0].id);
    } else if (data.length === 0) {
      const defaultLedger = await createLedger("Main Ledger");
      setLedgers([defaultLedger]);
      setActiveLedgerId(defaultLedger.id);
    }
  }

  async function loadVouchers(ledgerId: string) {
    setLoading(true);
    const data = await getVouchersByLedger(ledgerId);
    setVouchers(data);
    setLoading(false);
  }

  async function handleAddLedger() {
    if (!newLedgerName.trim()) return;
    const ledger = await createLedger(newLedgerName);
    setLedgers([...ledgers, ledger]);
    setActiveLedgerId(ledger.id);
    setNewLedgerName("");
    setIsAddingLedger(false);
    toast({ title: "New Ledger Created", description: `${newLedgerName} is now ready.` });
  }

  async function handleRenameLedger() {
    if (!editingLedger || !editName.trim()) return;
    await renameLedger(editingLedger.id, editName);
    setLedgers(ledgers.map(l => l.id === editingLedger.id ? { ...l, name: editName } : l));
    setEditingLedger(null);
    toast({ title: "Ledger Renamed" });
  }

  async function handleDeleteLedger(id: string) {
    if (ledgers.length <= 1) {
      toast({ variant: "destructive", title: "Cannot Delete", description: "At least one ledger must remain." });
      return;
    }
    await deleteLedger(id);
    const updated = ledgers.filter(l => l.id !== id);
    setLedgers(updated);
    if (activeLedgerId === id) {
      setActiveLedgerId(updated[0].id);
    }
    toast({ title: "Ledger Deleted" });
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeLedgerId) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const vouchersToImport = json.map((row: any) => {
          const ro = Number(row["Amount (R.O.)"]) || 0;
          const bz = Number(row["Amount (Bz)"]) || 0;
          const totalAmount = ro + (bz / 1000);
          
          let method: PaymentMethod = "Cash";
          const methodStr = String(row["Payment Method"] || "").toLowerCase();
          if (methodStr.includes("cheque")) method = "Cheque";
          if (methodStr.includes("transfer") || methodStr.includes("bank")) method = "Bank Transfer";

          return {
            voucherNo: String(row["Voucher No"] || "V-0000"),
            date: row["Date"] ? new Date(row["Date"]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            recipient: String(row["Paid To"] || "N/A"),
            amountRO: ro,
            amountBz: bz,
            sumInWords: convertAmountToWords(totalAmount),
            paymentMethod: method,
            bankName: row["Bank"] || "",
            refNo: row["Cheque/Ref No"] || "",
            purpose: row["Being (Purpose)"] || "N/A",
            ledgerId: activeLedgerId
          };
        });

        await bulkImportVouchers(vouchersToImport);
        toast({ title: "Import Successful", description: `${vouchersToImport.length} vouchers added.` });
        loadVouchers(activeLedgerId);
      } catch (error) {
        console.error("Import error:", error);
        toast({ variant: "destructive", title: "Import Failed", description: "Check Excel format." });
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
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search records..." 
            className="pl-10"
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
            className="flex-1 sm:flex-none flex items-center gap-2 border-primary/30"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            Import XLSX
          </Button>
          <Button variant="outline" onClick={exportToCSV} className="flex-1 sm:flex-none flex items-center gap-2 border-accent/30">
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-md border bg-white overflow-hidden shadow-sm relative">
        {isImporting && (
          <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="font-bold text-primary animate-pulse">Processing Spreadsheet Data...</p>
          </div>
        )}
        
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table className="border-collapse">
            <TableHeader className="bg-[#f1f5f9]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="border-r border-slate-200 font-bold text-slate-700">Voucher No</TableHead>
                <TableHead className="border-r border-slate-200 font-bold text-slate-700">Date</TableHead>
                <TableHead className="border-r border-slate-200 font-bold text-slate-700">Paid To</TableHead>
                <TableHead className="border-r border-slate-200 font-bold text-slate-700 text-right">Amount (R.O.)</TableHead>
                <TableHead className="border-r border-slate-200 font-bold text-slate-700 text-right">Amount (Bz)</TableHead>
                <TableHead className="border-r border-slate-200 font-bold text-slate-700">Method</TableHead>
                <TableHead className="border-r border-slate-200 font-bold text-slate-700">Purpose</TableHead>
                <TableHead className="text-center no-print font-bold text-slate-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center text-muted-foreground">
                    No records in this sheet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVouchers.map((v, idx) => (
                  <TableRow 
                    key={v.id} 
                    className={idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-[#f8fafc] hover:bg-slate-100"}
                  >
                    <TableCell className="border-r border-slate-200 font-medium py-2 text-xs">{v.voucherNo}</TableCell>
                    <TableCell className="border-r border-slate-200 text-xs">{v.date}</TableCell>
                    <TableCell className="border-r border-slate-200 font-medium text-xs truncate max-w-[150px]">{v.recipient}</TableCell>
                    <TableCell className="border-r border-slate-200 text-right font-bold text-primary text-xs">
                      {v.amountRO.toLocaleString()}
                    </TableCell>
                    <TableCell className="border-r border-slate-200 text-right text-xs">
                      {v.amountBz.toString().padStart(3, '0')}
                    </TableCell>
                    <TableCell className="border-r border-slate-200 text-[10px] font-bold uppercase">
                      {v.paymentMethod}
                    </TableCell>
                    <TableCell className="border-r border-slate-200 max-w-[180px] truncate text-xs">{v.purpose}</TableCell>
                    <TableCell className="text-center no-print p-1">
                      <Link href={`/vouchers/${v.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="w-4 h-4" />
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

      {/* Sheet Tabs - Moved to Bottom (Excel Style) */}
      <div className="bg-slate-100 p-1 rounded-b-lg flex items-center border border-t-0 overflow-x-auto shadow-inner">
        <Tabs value={activeLedgerId} onValueChange={setActiveLedgerId} className="w-full">
          <TabsList className="bg-transparent justify-start h-9 p-0 gap-0">
            {ledgers.map((ledger) => (
              <div key={ledger.id} className="flex items-center group">
                <TabsTrigger 
                  value={ledger.id}
                  className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border-t-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-9 px-6 text-xs font-bold border-r border-slate-300 transition-all"
                >
                  {ledger.name}
                </TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-9 w-6 bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-r border-slate-300">
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
              className="h-9 px-4 hover:bg-slate-200 rounded-none text-primary"
            >
              <Plus className="w-4 h-4" />
              <span className="ml-1 text-[10px] font-bold">NEW SHEET</span>
            </Button>
          </TabsList>
        </Tabs>
      </div>

      {/* Management Dialogs */}
      <Dialog open={isAddingLedger} onOpenChange={setIsAddingLedger}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Sheet</DialogTitle></DialogHeader>
          <Input 
            placeholder="e.g. June 2024" 
            value={newLedgerName} 
            onChange={(e) => setNewLedgerName(e.target.value)}
            autoFocus 
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingLedger(false)}>Cancel</Button>
            <Button onClick={handleAddLedger}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLedger} onOpenChange={(open) => !open && setEditingLedger(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Sheet</DialogTitle></DialogHeader>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLedger(null)}>Cancel</Button>
            <Button onClick={handleRenameLedger}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
