-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create metadata table
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0
);

-- Initialize current_voucher_index
INSERT INTO metadata (key, value) 
VALUES ('current_voucher_index', 0)
ON CONFLICT (key) DO NOTHING;

-- Create vouchers table based on the specified requirements and Firebase model
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_number INTEGER UNIQUE,
    employee_id UUID, -- Links to the employee who created/modified it
    amount NUMERIC(15, 3) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'void'
    
    -- Additional fields from Firebase model (src/lib/types.ts)
    recipient TEXT,
    purpose TEXT,
    payment_method TEXT,
    bank_name TEXT,
    ref_no TEXT,
    ledger_id UUID,
    voucher_date DATE DEFAULT CURRENT_DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SQL Function to handle automated indexing
CREATE OR REPLACE FUNCTION handle_voucher_indexing()
RETURNS TRIGGER AS $$
DECLARE
    next_index INTEGER;
BEGIN
    -- Only auto-index if sequence_number is not provided
    IF NEW.sequence_number IS NULL THEN
        UPDATE metadata
        SET value = value + 1
        WHERE key = 'current_voucher_index'
        RETURNING value INTO next_index;
        
        NEW.sequence_number := next_index;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the indexing function before insert
CREATE TRIGGER trg_vouchers_indexing
BEFORE INSERT ON vouchers
FOR EACH ROW
EXECUTE FUNCTION handle_voucher_indexing();

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trg_vouchers_updated_at
BEFORE UPDATE ON vouchers
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
