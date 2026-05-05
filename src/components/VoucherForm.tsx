
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createVoucher, getLedgers } from "@/lib/voucher-actions";
import { convertAmountToWords } from "@/lib/amount-utils";
import { Save, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Ledger, Voucher } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const formSchema = z.object({
  voucherNo: z.string().min(1, "Voucher number is required"),
  date: z.string().min(1, "Date is required"),
  recipient: z.string().min(2, "Recipient name is required"),
  amountRO: z.coerce.number().min(0, "Amount must be positive"),
  amountBz: z.coerce.number().min(0).max(999, "Baisa must be between 0 and 999"),
  sumInWords: z.string().min(1, "Sum in words is required"),
  paymentMethod: z.enum(['Cash', 'Cheque', 'Bank Transfer']),
  bankName: z.string().optional(),
  refNo: z.string().optional(),
  purpose: z.string().min(2, "Purpose is required"),
  ledgerId: z.string().min(1, "Ledger selection is required"),
});

export function VoucherForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      voucherNo: "",
      date: new Date().toISOString().split('T')[0],
      recipient: "",
      amountRO: 0,
      amountBz: 0,
      sumInWords: "Sum of Rial Omani Zero only",
      paymentMethod: 'Cash',
      bankName: "",
      refNo: "",
      purpose: "",
      ledgerId: "",
    },
  });

  const selectedLedgerId = form.watch("ledgerId");

  useEffect(() => {
    async function loadLedgers() {
      const data = await getLedgers();
      setLedgers(data);
      if (data.length > 0 && !selectedLedgerId) {
        form.setValue("ledgerId", data[0].id);
      }
    }
    loadLedgers();
  }, [form, selectedLedgerId]);

  useEffect(() => {
    async function calculateNextNo() {
      if (!selectedLedgerId || !db) return;

      const q = query(collection(db, "vouchers"), where("ledgerId", "==", selectedLedgerId));
      const snapshot = await getDocs(q);
      const existingVouchers = snapshot.docs.map(doc => doc.data() as Voucher);
      
      const numbers = existingVouchers
        .map(v => parseInt(v.voucherNo))
        .filter(n => !isNaN(n));
      
      const nextNo = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      form.setValue("voucherNo", String(nextNo));
    }
    calculateNextNo();
  }, [selectedLedgerId, db, form]);

  const amountRO = form.watch("amountRO");
  const amountBz = form.watch("amountBz");

  useEffect(() => {
    const totalAmount = (Number(amountRO) || 0) + ((Number(amountBz) || 0) / 1000);
    form.setValue("sumInWords", convertAmountToWords(totalAmount));
  }, [amountRO, amountBz, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const res = createVoucher(values, db);
    toast({ 
      title: "Saving Record", 
      description: "Generating your new sequential voucher..." 
    });
    router.push(`/vouchers/${res.id}`);
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-primary/20">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="flex items-center gap-2 text-primary font-headline">
          <FileText className="w-5 h-5" />
          Create New Voucher
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="ledgerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sheet / Ledger</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select sheet" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ledgers.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="voucherNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voucher No.</FormLabel>
                    <FormControl><Input placeholder="000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid To (Recipient)</FormLabel>
                  <FormControl><Input placeholder="Recipient name or company" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="amountRO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount R.O.</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                          onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amountBz"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Baisa</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                          onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="sumInWords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sum in Words</FormLabel>
                    <FormControl>
                      <Textarea 
                        readOnly 
                        className="bg-muted/30 italic font-medium text-primary h-10 min-h-[40px] resize-none" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. Bank Muscat" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference / Cheque No.</FormLabel>
                    <FormControl><Input placeholder="Ref #" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Being (Purpose)</FormLabel>
                  <FormControl><Textarea placeholder="Details of payment..." className="min-h-[80px]" {...field} /></FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Recording...</> : <><Save className="mr-2 h-5 w-5" /> Save Voucher</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
