
"use client";

import { useState, useRef } from "react";
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
import { Voucher, PaymentMethod } from "@/lib/types";
import { Search, FileUp, Eye, FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { bulkImportVouchers } from "@/lib/voucher-actions";
import { convertAmountToWords } from "@/lib/amount-utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface VoucherTableProps {
  vouchers: Voucher[];
}

export function VoucherTable({ vouchers }: VoucherTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const filteredVouchers = vouchers.filter((v) => 
    v.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
          // Map Excel columns to Voucher object
          const ro = Number(row["Amount (R.O.)"]) || 0;
          const bz = Number(row["Amount (Bz)"]) || 0;
          const totalAmount = ro + (bz / 1000);
          
          let method: PaymentMethod = "Cash";
          if (row["Payment Method"]?.includes("Cheque")) method = "Cheque";
          if (row["Payment Method"]?.includes("Transfer")) method = "Bank Transfer";

          return {
            voucherNo: String(row["Voucher No"] || ""),
            date: row["Date"] ? new Date(row["Date"]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            recipient: String(row["Paid To"] || "N/A"),
            amountRO: ro,
            amountBz: bz,
            sumInWords: convertAmountToWords(totalAmount),
            paymentMethod: method,
            bankName: row["Bank"] || "",
            refNo: row["Cheque/Ref No"] || "",
            purpose: row["Being (Purpose)"] || "N/A",
          };
        });

        await bulkImportVouchers(vouchersToImport);
        
        toast({
          title: "Import Successful",
          description: `${vouchersToImport.length} vouchers have been added.`,
        });
        
        router.refresh();
        window.location.reload(); // Refresh to show new data
      } catch (error) {
        console.error("Import error:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "Check your Excel format and try again.",
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const exportToCSV = () => {
    const headers = ["Voucher No", "Date", "Paid To", "Amount (R.O.)", "Amount (Bz)", "Payment Method", "Being (Purpose)", "Bank", "Cheque/Ref No"];
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

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `tropical_ledger_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search vouchers, recipients, purpose..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload}
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-1 sm:flex-none flex items-center gap-2 border-primary/30 hover:bg-primary/10"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            Import XLSX
          </Button>
          <Button variant="outline" onClick={exportToCSV} className="flex-1 sm:flex-none flex items-center gap-2 border-accent/30 hover:bg-accent/10">
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-hidden shadow-sm">
        <Table className="border-collapse">
          <TableHeader className="bg-[#f1f5f9]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-r border-slate-200 font-bold text-slate-700">Voucher No</TableHead>
              <TableHead className="border-r border-slate-200 font-bold text-slate-700">Date</TableHead>
              <TableHead className="border-r border-slate-200 font-bold text-slate-700">Paid To</TableHead>
              <TableHead className="border-r border-slate-200 font-bold text-slate-700 text-right">Amount (R.O.)</TableHead>
              <TableHead className="border-r border-slate-200 font-bold text-slate-700 text-right">Amount (Bz)</TableHead>
              <TableHead className="border-r border-slate-200 font-bold text-slate-700">Payment Method</TableHead>
              <TableHead className="border-r border-slate-200 font-bold text-slate-700">Being (Purpose)</TableHead>
              <TableHead className="text-center no-print font-bold text-slate-700">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No vouchers found.
                </TableCell>
              </TableRow>
            ) : (
              filteredVouchers.map((v, idx) => (
                <TableRow 
                  key={v.id} 
                  className={idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-[#f8fafc] hover:bg-slate-100"}
                >
                  <TableCell className="border-r border-slate-200 font-medium py-3">{v.voucherNo}</TableCell>
                  <TableCell className="border-r border-slate-200">{format(new Date(v.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="border-r border-slate-200 font-medium">{v.recipient}</TableCell>
                  <TableCell className="border-r border-slate-200 text-right font-bold text-primary">
                    {v.amountRO.toLocaleString()}
                  </TableCell>
                  <TableCell className="border-r border-slate-200 text-right">
                    {v.amountBz.toString().padStart(3, '0')}
                  </TableCell>
                  <TableCell className="border-r border-slate-200">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      v.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' : 
                      v.paymentMethod === 'Cheque' ? 'bg-blue-100 text-blue-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {v.paymentMethod}
                    </span>
                  </TableCell>
                  <TableCell className="border-r border-slate-200 max-w-[200px] truncate">{v.purpose}</TableCell>
                  <TableCell className="text-center no-print">
                    <Link href={`/vouchers/${v.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
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
    </div>
  );
}
