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
import { voucherAmountToWordsConverter } from "@/ai/flows/voucher-amount-to-words-converter";
import { createVoucher } from "@/lib/voucher-actions";
import { Save, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
});

export function VoucherForm() {
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversionError, setConversionError] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      voucherNo: "",
      date: "",
      recipient: "",
      amountRO: 0,
      amountBz: 0,
      sumInWords: "",
      paymentMethod: 'Cash',
      bankName: "",
      refNo: "",
      purpose: "",
    },
  });

  useEffect(() => {
    const randomNo = `V-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    
    form.setValue("voucherNo", randomNo);
    form.setValue("date", today);
  }, [form]);

  const amountRO = form.watch("amountRO");
  const amountBz = form.watch("amountBz");

  useEffect(() => {
    async function convert() {
      const ro = Number(amountRO) || 0;
      const bz = Number(amountBz) || 0;

      if (ro > 0 || bz > 0) {
        setIsConverting(true);
        setConversionError(false);
        try {
          const totalAmount = ro + (bz / 1000);
          const result = await voucherAmountToWordsConverter({ amountInRO: totalAmount });
          form.setValue("sumInWords", result.amountInWords);
        } catch (error: any) {
          setConversionError(true);
          toast({
            variant: "destructive",
            title: "AI Conversion Unavailable",
            description: "The AI service is currently experiencing high demand. Please enter the amount in words manually.",
          });
        } finally {
          setIsConverting(false);
        }
      }
    }

    const timer = setTimeout(convert, 1000);
    return () => clearTimeout(timer);
  }, [amountRO, amountBz, form, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const res = await createVoucher(values);
      if (res.success) {
        router.push(`/vouchers/${res.id}`);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save voucher. Please try again.",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-primary/20">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="flex items-center gap-2 text-primary font-headline">
          <Save className="w-5 h-5" />
          Create New Voucher
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="voucherNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voucher No.</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
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
                  <FormControl>
                    <Input placeholder="Enter full name or company" {...field} />
                  </FormControl>
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
                        <Input type="number" step="0.001" placeholder="Rial" {...field} />
                      </FormControl>
                      <FormMessage />
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
                        <Input type="number" placeholder="Baisa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="sumInWords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Sum of Rial Omani (In Words)
                      {isConverting && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                      {!isConverting && !conversionError && (Number(amountRO) > 0 || Number(amountBz) > 0) && <Sparkles className="w-3 h-3 text-primary" />}
                      {conversionError && <AlertCircle className="w-3 h-3 text-destructive" />}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={conversionError ? "Please enter manually..." : "Automatically generated..."} 
                        className={cn("bg-muted/30", conversionError && "border-destructive/50")} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
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
                    <FormControl>
                      <Input placeholder="e.g. Bank Muscat" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference / Cheque No.</FormLabel>
                    <FormControl>
                      <Input placeholder="Ref #" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Being (Purpose of Payment)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what the payment is for..." 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving Voucher...
                </>
              ) : (
                "Save and Generate Voucher"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
