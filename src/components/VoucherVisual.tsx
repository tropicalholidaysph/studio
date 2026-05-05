
"use client";

import Image from "next/image";
import { Voucher } from "@/lib/types";
import { format } from "date-fns";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface VoucherVisualProps {
  voucher: Voucher;
}

export function VoucherVisual({ voucher }: VoucherVisualProps) {
  const logoPath = PlaceHolderImages.find(img => img.id === 'logo')?.imageUrl || "/logo.png";

  return (
    <div className="w-full max-w-[800px] mx-auto bg-[#FFFDE7] p-8 border-[3px] border-primary shadow-lg font-serif">
      <div className="flex justify-between items-start mb-8 border-b-2 border-primary pb-4">
        <div className="space-y-1">
          <div className="w-24 h-24 relative flex items-center justify-center rounded-lg border-2 border-primary border-dashed bg-white">
            <Image 
              src={logoPath} 
              alt="Tropical Holidays Logo" 
              width={80} 
              height={80}
              className="object-contain p-1"
              data-ai-hint="tropical palm"
            />
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-widest mt-2 uppercase">Tropical Holidays</h1>
          <p className="text-xs text-muted-foreground">P.O. Box 1234, Muscat, Oman</p>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-black text-primary opacity-20 uppercase tracking-tighter mb-2">Payment Voucher</h2>
          <div className="space-y-2">
            <div className="flex justify-end items-center gap-2">
              <span className="text-sm font-bold uppercase text-primary">No:</span>
              <span className="bg-white px-4 py-1 border border-primary font-mono text-lg font-bold min-w-[120px] inline-block">{voucher.voucherNo}</span>
            </div>
            <div className="flex justify-end items-center gap-2">
              <span className="text-sm font-bold uppercase text-primary">Date:</span>
              <span className="bg-white px-4 py-1 border border-primary font-mono text-lg min-w-[120px] inline-block">{format(new Date(voucher.date), 'dd/MM/yyyy')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-end gap-3 border-b border-primary/40 pb-1">
          <span className="text-sm font-bold uppercase text-primary whitespace-nowrap">Paid To:</span>
          <span className="flex-1 text-xl font-bold italic px-2">{voucher.recipient}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="bg-white border-2 border-primary p-4">
            <div className="grid grid-cols-2 text-center border-b border-primary pb-1 mb-2">
              <span className="font-bold text-sm uppercase text-primary">Rial Omani</span>
              <span className="font-bold text-sm uppercase text-primary">Baisa</span>
            </div>
            <div className="grid grid-cols-2 text-center items-center">
              <span className="text-3xl font-black">{voucher.amountRO.toLocaleString()}</span>
              <span className="text-3xl font-black">{voucher.amountBz.toString().padStart(3, '0')}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold uppercase text-primary">Payment Method:</span>
              <div className="flex gap-4">
                {['Cash', 'Cheque', 'Bank Transfer'].map(m => (
                  <div key={m} className="flex items-center gap-1">
                    <div className={`w-4 h-4 border-2 border-primary ${voucher.paymentMethod === m ? 'bg-primary' : 'bg-white'}`} />
                    <span className="text-xs font-bold uppercase">{m}</span>
                  </div>
                ))}
              </div>
            </div>
            {voucher.bankName && (
              <div className="flex items-end gap-2 border-b border-primary/40 pb-1">
                <span className="text-xs font-bold uppercase text-primary">Bank:</span>
                <span className="text-sm italic">{voucher.bankName}</span>
              </div>
            )}
            {voucher.refNo && (
              <div className="flex items-end gap-2 border-b border-primary/40 pb-1">
                <span className="text-xs font-bold uppercase text-primary">Ref/Cheque No:</span>
                <span className="text-sm italic font-mono">{voucher.refNo}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-primary/40 pb-1">
          <span className="text-sm font-bold uppercase text-primary">Sum of Rial Omani:</span>
          <span className="text-lg italic px-2 font-medium">{voucher.sumInWords}</span>
        </div>

        <div className="flex flex-col gap-2 border-b-2 border-primary pb-1">
          <span className="text-sm font-bold uppercase text-primary">Being:</span>
          <span className="text-lg px-2 min-h-[60px] leading-relaxed">{voucher.purpose}</span>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-12">
          <div className="text-center space-y-2">
            <div className="border-t-2 border-primary pt-1">
              <span className="text-xs font-bold uppercase text-primary">Prepared By</span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="border-t-2 border-primary pt-1">
              <span className="text-xs font-bold uppercase text-primary">Receiver's Signature</span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="border-t-2 border-primary pt-1">
              <span className="text-xs font-bold uppercase text-primary">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
