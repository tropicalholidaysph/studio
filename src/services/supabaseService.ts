import { supabase } from '@/lib/supabase';
import { Voucher, PaymentMethod } from '@/lib/types';

/**
 * Interface matching the Supabase 'vouchers' table schema defined in 01_initial_schema.sql
 */
export interface SupabaseVoucher {
  id: string;
  sequence_number: number;
  employee_id: string | null;
  amount: number;
  status: string;
  recipient: string | null;
  purpose: string | null;
  payment_method: string | null;
  bank_name: string | null;
  ref_no: string | null;
  ledger_id: string | null;
  voucher_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches all vouchers from Supabase and transforms them to the internal Voucher format.
 */
export async function fetchAllVouchers(): Promise<Voucher[]> {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .order('sequence_number', { ascending: false });

  if (error) {
    console.error('Error fetching vouchers from Supabase:', error);
    throw error;
  }

  return (data as SupabaseVoucher[]).map(sv => transformSupabaseToVoucher(sv));
}

/**
 * Transforms a SupabaseVoucher record to the legacy Voucher interface format.
 */
function transformSupabaseToVoucher(sv: SupabaseVoucher): Voucher {
  // Split the numeric amount back into RO and Baisa for the legacy UI
  const amountRO = Math.floor(sv.amount);
  const amountBz = Math.round((sv.amount - amountRO) * 1000);

  return {
    id: sv.id,
    voucherNo: sv.sequence_number.toString(),
    date: sv.voucher_date || sv.created_at.split('T')[0],
    recipient: sv.recipient || '',
    amountRO,
    amountBz,
    sumInWords: '', // Stored as empty for now, UI should handle regeneration if needed
    paymentMethod: (sv.payment_method as PaymentMethod) || 'Cash',
    bankName: sv.bank_name || undefined,
    refNo: sv.ref_no || undefined,
    purpose: sv.purpose || '',
    ledgerId: sv.ledger_id || '',
    createdAt: sv.created_at,
    updatedAt: sv.updated_at,
    isVoid: sv.status === 'void'
  };
}
