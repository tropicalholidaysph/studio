export type PaymentMethod = 'Cash' | 'Cheque' | 'Bank Transfer';

export interface Ledger {
  id: string;
  name: string;
  createdAt: string;
}

export interface Voucher {
  id: string;
  voucherNo: string;
  date: string;
  recipient: string;
  amountRO: number;
  amountBz: number;
  sumInWords: string;
  paymentMethod: PaymentMethod;
  bankName?: string;
  refNo?: string;
  purpose: string;
  ledgerId: string;
  createdAt: string;
  updatedAt?: string;
  isVoid?: boolean;
}
