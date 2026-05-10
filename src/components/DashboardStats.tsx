"use client";

import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Layers, 
  BadgeIndianRupee, 
  Ban,
  TrendingUp
} from "lucide-react";

interface DashboardStatsProps {
  ledgerCount: number;
  voucherCount: number;
  totalRO: number;
  totalBz: number;
  voidCount: number;
}

export function DashboardStats({ 
  ledgerCount, 
  voucherCount, 
  totalRO, 
  totalBz, 
  voidCount 
}: DashboardStatsProps) {
  const stats = [
    {
      label: "Ledger Sheets",
      value: ledgerCount,
      icon: Layers,
      color: "text-blue-600",
      bg: "bg-blue-100/50"
    },
    {
      label: "Total Vouchers",
      value: voucherCount,
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-100/50"
    },
    {
      label: "Total Amount (R.O.)",
      value: `${totalRO.toLocaleString()}.${totalBz.toString().padStart(3, '0')}`,
      icon: BadgeIndianRupee,
      color: "text-[#E66E38]",
      bg: "bg-[#E66E38]/10"
    },
    {
      label: "Void Records",
      value: voidCount,
      icon: Ban,
      color: "text-red-600",
      bg: "bg-red-100/50"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, i) => (
        <Card key={i} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                {stat.label}
              </span>
              <span className={`text-lg font-black tracking-tight ${stat.color}`}>
                {stat.value}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
