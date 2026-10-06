-- ==============================================================================
-- Crest Wealth - Complete Production Supabase Database Schema & Security
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/panxaqueawnqrebikwvb/sql
-- ==============================================================================

-- 1. HELPER: NON-RECURSIVE ADMIN VERIFICATION
-- Uses SECURITY DEFINER to bypass RLS recursion on public.profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. PROFILES TABLE & COLUMN ENSURANCE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  cash_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
  invested_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  kyc_status TEXT DEFAULT 'unverified',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cash_balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invested_balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. DEPOSITS TABLE
CREATE TABLE IF NOT EXISTS public.deposits (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  method TEXT DEFAULT 'Bank Transfer',
  reference TEXT,
  status TEXT DEFAULT 'Pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- 4. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  amount NUMERIC(15, 2) NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'Pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 5. TRANSACTIONS LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  reference_id TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. USER INVESTMENTS & PORTFOLIO HOLDINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'stash', 'fixed_lock', 'stock', 'dollar_vault', 'tbills'
  amount_invested NUMERIC(15, 2) NOT NULL,
  current_value NUMERIC(15, 2) NOT NULL,
  return_rate NUMERIC(5, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'active', -- 'active', 'matured', 'liquidated'
  maturity_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'alert'
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. USER TASKS TABLE
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_key TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PROFILE AUTO-CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, cash_balance, invested_balance, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0.00,
    0.00,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. FIELD PROTECTION TRIGGER (Prevents client-side balance/role tampering)
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.cash_balance := OLD.cash_balance;
    NEW.invested_balance := OLD.invested_balance;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- 11. ATOMIC FINANCIAL RPC PROCEDURES

-- Admin Confirms Deposit
CREATE OR REPLACE FUNCTION public.admin_confirm_deposit(deposit_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_dep RECORD;
  v_new_bal NUMERIC;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT * INTO v_dep FROM public.deposits WHERE id = deposit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit % not found.', deposit_id;
  END IF;

  IF v_dep.status = 'Confirmed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Deposit already confirmed.');
  END IF;

  UPDATE public.deposits
  SET status = 'Confirmed', confirmed_at = NOW()
  WHERE id = deposit_id;

  UPDATE public.profiles
  SET cash_balance = cash_balance + v_dep.amount, updated_at = NOW()
  WHERE id = v_dep.user_id
  RETURNING cash_balance INTO v_new_bal;

  INSERT INTO public.transactions (user_id, type, amount, description, reference_id, status)
  VALUES (v_dep.user_id, 'deposit', v_dep.amount, 'Deposit confirmation #' || deposit_id, deposit_id, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_dep.user_id, 'Deposit Confirmed', 'Your deposit of ₦' || v_dep.amount || ' has been confirmed and credited.', 'success');

  RETURN jsonb_build_object('success', true, 'deposit_id', deposit_id, 'new_balance', v_new_bal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Requests Withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cur_bal NUMERIC;
  v_wth_id TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount.';
  END IF;

  SELECT cash_balance INTO v_cur_bal FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_cur_bal IS NULL OR v_cur_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient cash balance.';
  END IF;

  UPDATE public.profiles
  SET cash_balance = cash_balance - p_amount, updated_at = NOW()
  WHERE id = v_uid;

  v_wth_id := 'WTH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  INSERT INTO public.withdrawals (
    id, user_id, user_email, amount, bank_name, account_number, account_name, status
  ) VALUES (
    v_wth_id, v_uid, auth.jwt()->>'email', p_amount, p_bank_name, p_account_number, p_account_name, 'Pending'
  );

  INSERT INTO public.transactions (user_id, type, amount, description, reference_id, status)
  VALUES (v_uid, 'withdrawal', -p_amount, 'Withdrawal request to ' || p_bank_name, v_wth_id, 'pending');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_uid, 'Withdrawal Submitted', 'Your withdrawal request of ₦' || p_amount || ' is pending processing.', 'info');

  RETURN jsonb_build_object('success', true, 'withdrawal_id', v_wth_id, 'amount', p_amount, 'remaining_balance', v_cur_bal - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Rejects Withdrawal
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(
  withdrawal_id TEXT,
  p_reason TEXT DEFAULT 'Withdrawal rejected by administrator'
)
RETURNS JSONB AS $$
DECLARE
  v_wth RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT * INTO v_wth FROM public.withdrawals WHERE id = withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal % not found.', withdrawal_id;
  END IF;

  IF v_wth.status != 'Pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal is not pending.');
  END IF;

  UPDATE public.withdrawals
  SET status = 'Rejected', admin_notes = p_reason, processed_at = NOW()
  WHERE id = withdrawal_id;

  UPDATE public.profiles
  SET cash_balance = cash_balance + v_wth.amount, updated_at = NOW()
  WHERE id = v_wth.user_id;

  INSERT INTO public.transactions (user_id, type, amount, description, reference_id, status)
  VALUES (v_wth.user_id, 'adjustment', v_wth.amount, 'Refund for rejected withdrawal #' || withdrawal_id, withdrawal_id, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_wth.user_id, 'Withdrawal Refunded', 'Your withdrawal request #' || withdrawal_id || ' was rejected. Funds have been returned to your balance.', 'warning');

  RETURN jsonb_build_object('success', true, 'withdrawal_id', withdrawal_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

-- Clean existing policies first
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Profiles insert policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Deposits select policy" ON public.deposits;
DROP POLICY IF EXISTS "Deposits insert policy" ON public.deposits;
DROP POLICY IF EXISTS "Deposits update policy" ON public.deposits;
CREATE POLICY "Deposits select policy" ON public.deposits FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Deposits insert policy" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Deposits update policy" ON public.deposits FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Withdrawals select policy" ON public.withdrawals;
DROP POLICY IF EXISTS "Withdrawals insert policy" ON public.withdrawals;
DROP POLICY IF EXISTS "Withdrawals update policy" ON public.withdrawals;
CREATE POLICY "Withdrawals select policy" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Withdrawals insert policy" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Withdrawals update policy" ON public.withdrawals FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Transactions select policy" ON public.transactions;
DROP POLICY IF EXISTS "Transactions insert policy" ON public.transactions;
CREATE POLICY "Transactions select policy" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Transactions insert policy" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "User investments policy" ON public.user_investments;
CREATE POLICY "User investments policy" ON public.user_investments FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Notifications policy" ON public.notifications;
CREATE POLICY "Notifications policy" ON public.notifications FOR ALL USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "User tasks policy" ON public.user_tasks;
CREATE POLICY "User tasks policy" ON public.user_tasks FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- 13. INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_investments_user_id ON public.user_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 14. REALTIME REPLICATION (Safe blocks)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_investments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
