-- Tropical Holidays Secure Ledger: Unified & Robust Supabase Schema
-- This script is idempotent: it can be run multiple times safely.

-- 1. Prerequisites & Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tables
-- User roles for access control
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'employee')) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger categories (Sheets)
CREATE TABLE IF NOT EXISTS public.ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial vouchers
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_number INTEGER NOT NULL,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recipient TEXT NOT NULL,
    amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    bank_name TEXT,
    ref_no TEXT,
    purpose TEXT NOT NULL,
    ledger_id UUID REFERENCES public.ledgers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'void')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    detail TEXT,
    uid UUID,
    role TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Clean and Re-create)
-- user_roles
DO $$ BEGIN
    DROP POLICY IF EXISTS "Full access for authenticated users on user_roles" ON public.user_roles;
EXCEPTION WHEN undefined_object THEN null; END $$;
CREATE POLICY "Full access for authenticated users on user_roles" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ledgers
DO $$ BEGIN
    DROP POLICY IF EXISTS "Full access for authenticated users on ledgers" ON public.ledgers;
EXCEPTION WHEN undefined_object THEN null; END $$;
CREATE POLICY "Full access for authenticated users on ledgers" ON public.ledgers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- vouchers
DO $$ BEGIN
    DROP POLICY IF EXISTS "Full access for authenticated users on vouchers" ON public.vouchers;
EXCEPTION WHEN undefined_object THEN null; END $$;
CREATE POLICY "Full access for authenticated users on vouchers" ON public.vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- activity_logs
DO $$ BEGIN
    DROP POLICY IF EXISTS "Full access for authenticated users on activity_logs" ON public.activity_logs;
EXCEPTION WHEN undefined_object THEN null; END $$;
CREATE POLICY "Full access for authenticated users on activity_logs" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Automation (Functions & Triggers)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vouchers trigger
DROP TRIGGER IF EXISTS trg_vouchers_updated_at ON vouchers;
CREATE TRIGGER trg_vouchers_updated_at 
BEFORE UPDATE ON vouchers 
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- User Roles trigger
DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON user_roles;
CREATE TRIGGER trg_user_roles_updated_at 
BEFORE UPDATE ON user_roles 
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
