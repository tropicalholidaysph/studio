
"use client";

import Image from "next/image";
import { Voucher } from "@/lib/types";
import { format } from "date-fns";

interface VoucherVisualProps {
  voucher: Voucher;
}

export function VoucherVisual({ voucher }: VoucherVisualProps) {
  return (
    <div className="w-full max-w-[850px] mx-auto bg-[#FEF9E7] p-6 sm:p-10 border border-neutral-300 shadow-xl font-serif text-[#2c3e50] relative overflow-hidden">
      {/* Decorative inner border */}
      <div className="absolute inset-4 border border-[#d4af37]/20 pointer-events-none" />

      {/* Top Header Information */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="text-[10px] leading-tight space-y-0.5 w-1/3">
          <p>C.R.: 1209991</p>
          <p>P.O. Box: 821</p>
          <p>Postal Code: 130</p>
          <p>Sultanate of Oman</p>
          <p>GSM: 95304077</p>
          <p>Office: 24616541 / 2</p>
        </div>

        <div className="flex flex-col items-center justify-center w-1/3">
          <div className="relative w-24 h-20 mb-2">
            <Image 
              src="/logo.png" 
              alt="Tropical Holidays Logo" 
              fill
              className="object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#E66E38] tracking-tight">الاستوائية للعطلات</h1>
            <h1 className="text-lg font-bold text-[#E66E38] tracking-widest uppercase -mt-1">TROPICAL HOLIDAYS</h1>
            <p className="text-[9px] italic text-muted-foreground">Dream. Explore. Discover.</p>
            <p className="text-[10px] font-mono mt-1">E-mail : info@tropicalholidays.om</p>
          </div>
        </div>

        <div className="text-[10px] leading-tight space-y-0.5 w-1/3 text-right dir-rtl" dir="rtl">
          <p>س.ت : ١٢٠٩٩٩١</p>
          <p>ص.ب : ٨٢١</p>
          <p>الرمز البريدي : ١٣٠</p>
          <p>سلطنة عمان</p>
          <p>نقال : ٩٥٣٠٤٠٧٧</p>
          <p>المكتب : ٢٤٦١٦٥٤١/٢</p>
        </div>
      </div>

      {/* Voucher Title and Number */}
      <div className="flex justify-between items-center mb-8 relative z-10 border-t border-b border-[#d4af37]/30 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#DB0D3A]">No.</span>
          <span className="text-2xl font-black text-[#DB0D3A] tracking-tighter font-mono">
            {voucher.voucherNo.replace(/[^0-9]/g, '').padStart(4, '0') || '0000'}
          </span>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold border-b-2 border-[#E66E38] inline-block px-4 pb-1">سند صرف</h2>
          <h3 className="text-sm font-bold tracking-widest uppercase mt-1">PAYMENT VOUCHER</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">Date :</span>
          <div className="border-b border-dashed border-neutral-800 px-4 min-w-[120px] text-center font-mono">
             {format(new Date(voucher.date), 'dd - MM - yyyy')}
          </div>
          <span className="text-xs font-bold">التاريخ :</span>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="space-y-6 relative z-10 px-2">
        <div className="flex items-start gap-4">
          <div className="border-2 border-neutral-800 w-[220px]">
            <div className="grid grid-cols-2 text-center border-b border-neutral-800">
              <span className="text-[10px] font-bold py-0.5">بيسة Bz.</span>
              <span className="text-[10px] font-bold py-0.5 border-l border-neutral-800">ريال عماني R.O.</span>
            </div>
            <div className="grid grid-cols-2 text-center items-center h-12">
              <span className="text-2xl font-black">{voucher.amountBz.toString().padStart(3, '0')}</span>
              <span className="text-2xl font-black border-l border-neutral-800">{voucher.amountRO.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-3 w-full">
          <span className="text-sm font-bold whitespace-nowrap">Paid to Mr./M/s.</span>
          <div className="flex-1 border-b border-dotted border-neutral-500 pb-1 px-4 text-xl font-bold italic text-[#E66E38]">
            {voucher.recipient}
          </div>
          <span className="text-sm font-bold whitespace-nowrap">صرفنا إلى الفاضل / الأفاضل</span>
        </div>

        <div className="flex items-end gap-3 w-full">
          <span className="text-sm font-bold whitespace-nowrap">The sum of Rial Omani</span>
          <div className="flex-1 border-b border-dotted border-neutral-500 pb-1 px-4 text-lg italic font-medium">
            {voucher.sumInWords}
          </div>
          <span className="text-sm font-bold whitespace-nowrap">مبلغ وقدره ريال عماني</span>
        </div>

        <div className="flex items-end gap-3 w-full">
          <span className="text-sm font-bold whitespace-nowrap">By Cash / Cheque No.</span>
          <div className="flex-1 border-b border-dotted border-neutral-500 pb-1 px-4 font-mono">
            {voucher.paymentMethod === 'Cash' ? 'CASH' : (voucher.refNo || '.........................')}
          </div>
          <span className="text-sm font-bold whitespace-nowrap">نقداً / شيك رقم</span>
        </div>

        <div className="flex items-end gap-3 w-full">
          <span className="text-sm font-bold whitespace-nowrap">Bank</span>
          <div className="flex-1 border-b border-dotted border-neutral-500 pb-1 px-4 italic">
            {voucher.bankName || '...................................................'}
          </div>
          <span className="text-sm font-bold whitespace-nowrap">على بنك</span>
          <span className="text-sm font-bold whitespace-nowrap mx-2">Dated</span>
          <div className="w-[150px] border-b border-dotted border-neutral-500 pb-1 text-center font-mono">
            {voucher.refNo ? format(new Date(voucher.date), 'dd/MM/yyyy') : '................'}
          </div>
          <span className="text-sm font-bold whitespace-nowrap">بتاريخ</span>
        </div>

        <div className="flex items-start gap-3 w-full pt-2">
          <span className="text-sm font-bold whitespace-nowrap mt-1">Being</span>
          <div className="flex-1 border-b border-dotted border-neutral-500 min-h-[60px] px-4 py-1 text-lg leading-tight">
            {voucher.purpose}
          </div>
          <span className="text-sm font-bold whitespace-nowrap mt-1">وذلك عن</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-20 mt-16 relative z-10 px-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2 w-full">
            <span className="text-[11px] font-bold whitespace-nowrap">Receiver's Signature</span>
            <div className="flex-1 border-b border-neutral-800 h-8" />
            <span className="text-[11px] font-bold whitespace-nowrap">توقيع المستلم</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2 w-full">
            <span className="text-[11px] font-bold whitespace-nowrap">Signature</span>
            <div className="flex-1 border-b border-neutral-800 h-8" />
            <span className="text-[11px] font-bold whitespace-nowrap">التوقيع</span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-[0.03] pointer-events-none select-none">
        <h4 className="text-5xl font-black uppercase whitespace-nowrap">Tropical Holidays</h4>
      </div>
    </div>
  );
}
