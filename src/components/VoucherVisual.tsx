
"use client";

import Image from "next/image";
import { Voucher } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface VoucherVisualProps {
  voucher: Voucher;
}

export function VoucherVisual({ voucher }: VoucherVisualProps) {
  // Helper to format date safely
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-- / -- / ----";
      return format(d, 'dd - MM - yyyy');
    } catch {
      return "-- / -- / ----";
    }
  };

  return (
    <div className={cn(
      "w-full max-w-[850px] mx-auto bg-[#FEF9E7] p-8 sm:p-12 border border-neutral-300 shadow-xl font-serif text-[#2c3e50] relative overflow-hidden print:shadow-none print:border-none",
      voucher.isVoid && "opacity-50 grayscale"
    )}>
      {/* Decorative Border */}
      <div className="absolute inset-4 border border-[#d4af37]/20 pointer-events-none" />

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="text-[10px] leading-tight space-y-0.5 w-1/3">
          <p>C.R.: 1209991</p>
          <p>P.O. Box: 821</p>
          <p>Postal Code: 130</p>
          <p>Sultanate of Oman</p>
          <p>GSM: 95304077</p>
          <p>Office: 24616541 / 2</p>
        </div>

        <div className="flex flex-col items-center justify-center w-1/3">
          <div className="relative w-28 h-24 mb-2">
            <Image 
              src="/logo.png" 
              alt="Tropical Holidays Logo" 
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#E66E38] tracking-tight">الاستوائية للعطلات</h1>
            <h1 className="text-xl font-bold text-[#E66E38] tracking-widest uppercase -mt-1">TROPICAL HOLIDAYS</h1>
            <p className="text-[9px] italic text-muted-foreground">Dream. Explore. Discover.</p>
            <p className="text-[10px] font-mono mt-1">E-mail : info@tropicalholidays.om</p>
          </div>
        </div>

        <div className="text-[10px] leading-tight space-y-0.5 w-1/3 text-right" dir="rtl">
          <p>س.ت : ١٢٠٩٩٩١</p>
          <p>ص.ب : ٨٢١</p>
          <p>الرمز البريدي : ١٣٠</p>
          <p>سلطنة عمان</p>
          <p>نقال : ١٢٠٩٩٩١</p>
          <p>المكتب : ٢٤٦١٦٥٤١/٢</p>
        </div>
      </div>

      {/* Title & Number Bar */}
      <div className="flex justify-between items-center mb-10 relative z-10 border-t border-b border-[#d4af37]/30 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#DB0D3A]">No.</span>
          <span className="text-3xl font-black text-[#DB0D3A] tracking-tighter font-mono bg-white/50 px-2 rounded">
            {voucher.voucherNo}
          </span>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold border-b-2 border-[#E66E38] inline-block px-6 pb-1">سند صرف</h2>
          <h3 className="text-sm font-bold tracking-widest uppercase mt-1">PAYMENT VOUCHER</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold whitespace-nowrap">Date :</span>
          <div className="border-b-2 border-dashed border-neutral-800 px-4 min-w-[140px] text-center font-mono text-lg font-bold">
             {formatDate(voucher.date)}
          </div>
          <span className="text-xs font-bold whitespace-nowrap">التاريخ :</span>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6 relative z-10">
        
        {/* Amount Box - R.O Left, Baisa Right */}
        <div className="flex items-start">
          <div className="border-2 border-neutral-800 w-[240px] bg-white">
            <div className="grid grid-cols-2 text-center border-b-2 border-neutral-800 bg-neutral-100">
              <span className="text-[10px] font-bold py-1">ريال عماني R.O.</span>
              <span className="text-[10px] font-bold py-1 border-l-2 border-neutral-800">بيسة Bz.</span>
            </div>
            <div className="grid grid-cols-2 text-center items-center h-14">
              <span className="text-3xl font-black">{voucher.isVoid ? "0" : voucher.amountRO.toLocaleString()}</span>
              <span className="text-3xl font-black border-l-2 border-neutral-800">{voucher.isVoid ? "000" : voucher.amountBz.toString().padStart(3, '0')}</span>
            </div>
          </div>
        </div>

        {/* Paid To Section - Using absolute positioning for labels or flexible layout to prevent overlap */}
        <div className="flex flex-col border-b-2 border-dotted border-neutral-400 pb-1">
          <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
            <span>Paid to Mr./M/s.</span>
            <span>صرفنا إلى الفاضل / الأفاضل</span>
          </div>
          <div className="text-2xl font-black italic text-[#E66E38] px-2 py-1 min-h-[40px] break-words">
            {voucher.recipient}
          </div>
        </div>

        {/* Sum In Words Section */}
        <div className="flex flex-col border-b-2 border-dotted border-neutral-400 pb-1">
          <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
            <span>The sum of Rial Omani</span>
            <span>مبلغ وقدره ريال عماني</span>
          </div>
          <div className="text-lg italic font-semibold text-neutral-800 px-2 py-1 min-h-[30px] break-words">
            {voucher.sumInWords}
          </div>
        </div>

        {/* Payment Method Section */}
        <div className="flex flex-col border-b-2 border-dotted border-neutral-400 pb-1">
          <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
            <span>By Cash / Cheque No.</span>
            <span>نقداً / شيك رقم</span>
          </div>
          <div className="font-mono font-bold text-lg px-2 py-1">
            {voucher.paymentMethod === 'Cash' ? 'CASH' : (voucher.refNo || '-')}
          </div>
        </div>

        {/* Bank & Date Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col border-b-2 border-dotted border-neutral-400 pb-1">
            <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
              <span>Bank</span>
              <span>على بنك</span>
            </div>
            <div className="italic font-bold px-2 py-1">{voucher.bankName || '-'}</div>
          </div>
          <div className="flex flex-col border-b-2 border-dotted border-neutral-400 pb-1">
            <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
              <span>Dated</span>
              <span>بتاريخ</span>
            </div>
            <div className="font-mono font-bold text-lg text-center px-2 py-1">
              {voucher.refNo ? formatDate(voucher.date) : '-'}
            </div>
          </div>
        </div>

        {/* Purpose Section */}
        <div className="flex flex-col border-b-2 border-dotted border-neutral-400 pb-1">
          <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
            <span>Being (Purpose)</span>
            <span>وذلك عن</span>
          </div>
          <div className="text-xl font-medium leading-relaxed bg-white/30 rounded px-2 py-2 min-h-[80px] break-words">
            {voucher.purpose}
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-32 mt-16 relative z-10 px-4 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex-1 border-b-2 border-neutral-800 h-12" />
          <div className="flex justify-between text-[11px] font-bold">
            <span>Receiver's Signature</span>
            <span>توقيع المستلم</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex-1 border-b-2 border-neutral-800 h-12" />
          <div className="flex justify-between text-[11px] font-bold">
            <span>Signature</span>
            <span>التوقيع</span>
          </div>
        </div>
      </div>
      
      {/* Background Watermark */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-[0.03] pointer-events-none select-none">
        <h4 className="text-6xl font-black uppercase whitespace-nowrap tracking-widest">Tropical Holidays</h4>
      </div>

      {/* VOID Overlay if applicable */}
      {voucher.isVoid && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="border-8 border-red-500/30 text-red-500/30 text-9xl font-black rotate-[-30deg] uppercase px-10 py-4">
            VOID
          </div>
        </div>
      )}
    </div>
  );
}
