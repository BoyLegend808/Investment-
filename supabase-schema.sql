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
  task_id TEXT,
  task_key TEXT,
  task_title TEXT,
  reward_amount NUMERIC(15, 2),
  status TEXT DEFAULT 'completed',
  proof_url TEXT,
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
DECLARE
  v_is_internal BOOLEAN := COALESCE(current_setting('app.internal_balance_update', true), 'false') = 'true';
BEGIN
  IF NOT public.is_admin() AND NOT v_is_internal THEN
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

  PERFORM set_config('app.internal_balance_update', 'true', true);

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

  PERFORM set_config('app.internal_balance_update', 'true', true);

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

  PERFORM set_config('app.internal_balance_update', 'true', true);

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

-- Admin Adjusts User Balance (Manual Correction)
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'Admin manual balance adjustment'
)
RETURNS JSONB AS $$
DECLARE
  v_new_bal NUMERIC;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Adjustment amount cannot be zero.';
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  UPDATE public.profiles
  SET cash_balance = cash_balance + p_amount, updated_at = NOW()
  WHERE id = p_user_id
  RETURNING cash_balance INTO v_new_bal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (p_user_id, 'adjustment', p_amount, p_reason, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    'Balance Adjusted',
    'Your balance was adjusted by ' || CASE WHEN p_amount > 0 THEN '+₦' || p_amount ELSE '-₦' || ABS(p_amount) END || ' by administration: ' || p_reason,
    CASE WHEN p_amount > 0 THEN 'success' ELSE 'warning' END
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_bal, 'amount_adjusted', p_amount);
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

-- 15. ADMIN-CONFIGURED TASKS (shared with every user dashboard)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "App settings read" ON public.app_settings;
DROP POLICY IF EXISTS "App settings admin write" ON public.app_settings;
CREATE POLICY "App settings read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "App settings admin write" ON public.app_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 16. USER TASKS: columns used by the dashboard (task id, reward, screenshot proof)
ALTER TABLE public.user_tasks ALTER COLUMN task_key DROP NOT NULL;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS task_id TEXT;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS task_title TEXT;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(15, 2);
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS proof_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_tasks_user_task ON public.user_tasks(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON public.user_tasks(user_id);

-- 17. SCREENSHOT PROOF STORAGE (private bucket; users upload to their own folder, admins can view all)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-proofs', 'task-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Task proofs upload own" ON storage.objects;
DROP POLICY IF EXISTS "Task proofs read own or admin" ON storage.objects;
CREATE POLICY "Task proofs upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Task proofs read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- 18. REFERRALS, STREAKS & VAULTX ATOMIC PROCEDURES

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_streak_day INT DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_streak_claim_date TEXT;

-- Auto-populate referral code if null
UPDATE public.profiles
SET referral_code = 'CW-' || UPPER(SUBSTRING(id::TEXT, 1, 8))
WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- RPC: Claim Daily Streak Reward (supports dynamic configured amounts)
CREATE OR REPLACE FUNCTION public.claim_daily_streak_reward(p_custom_amount NUMERIC DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_today TEXT := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_profile RECORD;
  v_day INT;
  v_reward NUMERIC;
  v_new_bal NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF v_profile.last_streak_claim_date = v_today THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bonus already claimed for today.');
  END IF;

  v_day := COALESCE(v_profile.daily_streak_day, 1);
  IF v_day < 1 OR v_day > 7 THEN
    v_day := 1;
  END IF;

  -- Use custom amount if supplied, otherwise standard progression
  IF p_custom_amount IS NOT NULL AND p_custom_amount > 0 THEN
    v_reward := p_custom_amount;
  ELSIF v_day = 7 THEN
    v_reward := 1000.00;
  ELSE
    v_reward := 200.00;
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  UPDATE public.profiles
  SET
    cash_balance = cash_balance + v_reward,
    daily_streak_day = CASE WHEN v_day >= 7 THEN 1 ELSE v_day + 1 END,
    last_streak_claim_date = v_today,
    updated_at = NOW()
  WHERE id = v_uid
  RETURNING cash_balance INTO v_new_bal;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (v_uid, 'reward', v_reward, 'Daily Login Bonus (Day ' || v_day || ')', 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_uid, 'Daily Reward Claimed', '+₦' || v_reward || ' added to cash balance for Day ' || v_day || ' streak!', 'success');

  RETURN jsonb_build_object(
    'success', true,
    'reward', v_reward,
    'day_claimed', v_day,
    'next_day', CASE WHEN v_day >= 7 THEN 1 ELSE v_day + 1 END,
    'new_balance', v_new_bal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Claim User Task Reward
CREATE OR REPLACE FUNCTION public.claim_user_task_reward(
  p_task_id TEXT,
  p_reward_amount NUMERIC,
  p_task_title TEXT,
  p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_existing RECORD;
  v_new_bal NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_reward_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid reward amount.';
  END IF;

  SELECT * INTO v_existing FROM public.user_tasks WHERE user_id = v_uid AND task_id = p_task_id;
  IF FOUND AND v_existing.completed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task already completed.');
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  INSERT INTO public.user_tasks (user_id, task_id, task_key, task_title, reward_amount, status, proof_url, completed, completed_at)
  VALUES (v_uid, p_task_id, p_task_id, p_task_title, p_reward_amount, 'completed', p_proof_url, true, NOW())
  ON CONFLICT (user_id, task_id) DO UPDATE
  SET completed = true, completed_at = NOW(), proof_url = COALESCE(EXCLUDED.proof_url, public.user_tasks.proof_url);

  UPDATE public.profiles
  SET cash_balance = cash_balance + p_reward_amount, updated_at = NOW()
  WHERE id = v_uid
  RETURNING cash_balance INTO v_new_bal;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (v_uid, 'reward', p_reward_amount, 'Task Reward — ' || p_task_title, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_uid, 'Task Reward Credited', '+₦' || p_reward_amount || ' credited for ' || p_task_title, 'success');

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_bal, 'reward', p_reward_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Credit User Balance (Dynamic Amount for any task, promo, bonus, or quiz)
CREATE OR REPLACE FUNCTION public.credit_user_balance(
  p_amount NUMERIC,
  p_reason TEXT,
  p_type TEXT DEFAULT 'reward'
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_new_bal NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount to credit.';
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  UPDATE public.profiles
  SET cash_balance = cash_balance + p_amount, updated_at = NOW()
  WHERE id = v_uid
  RETURNING cash_balance INTO v_new_bal;

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (v_uid, p_type, p_amount, p_reason, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_uid, 'Balance Credited', '+₦' || p_amount || ' credited: ' || p_reason, 'success');

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_bal, 'amount_credited', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Subscribe to VaultX Package (Levels 1–10)
CREATE OR REPLACE FUNCTION public.subscribe_vaultx_package(p_level INT)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof RECORD;
  v_cost NUMERIC;
  v_bonus NUMERIC;
  v_daily NUMERIC;
  v_rank TEXT;
  v_new_cash NUMERIC;
  v_new_inv NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_level = 1 THEN
    v_cost := 5000.00;    v_bonus := 250.00;   v_daily := 900.00;   v_rank := 'Bronze VIP';
  ELSIF p_level = 2 THEN
    v_cost := 15000.00;   v_bonus := 750.00;   v_daily := 2700.00;  v_rank := 'Silver VIP';
  ELSIF p_level = 3 THEN
    v_cost := 30000.00;   v_bonus := 1500.00;  v_daily := 5400.00;  v_rank := 'Gold VIP';
  ELSIF p_level = 4 THEN
    v_cost := 50000.00;   v_bonus := 2500.00;  v_daily := 9000.00;  v_rank := 'Platinum VIP';
  ELSIF p_level = 5 THEN
    v_cost := 75000.00;   v_bonus := 3750.00;  v_daily := 13500.00; v_rank := 'Emerald VIP';
  ELSIF p_level = 6 THEN
    v_cost := 100000.00;  v_bonus := 5000.00;  v_daily := 18000.00; v_rank := 'Ruby VIP';
  ELSIF p_level = 7 THEN
    v_cost := 200000.00;  v_bonus := 10000.00; v_daily := 36000.00; v_rank := 'Sapphire VIP';
  ELSIF p_level = 8 THEN
    v_cost := 350000.00;  v_bonus := 17500.00; v_daily := 63000.00; v_rank := 'Diamond VIP';
  ELSIF p_level = 9 THEN
    v_cost := 500000.00;  v_bonus := 25000.00; v_daily := 90000.00; v_rank := 'Crown Obsidian';
  ELSIF p_level = 10 THEN
    v_cost := 1000000.00; v_bonus := 50000.00; v_daily := 180000.00; v_rank := 'Apex Imperial VIP';
  ELSE
    RAISE EXCEPTION 'Invalid package level (must be 1 to 10).';
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF v_prof.cash_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INSUFFICIENT_FUNDS',
      'message', 'Insufficient cash balance (₦' || v_prof.cash_balance || '). Please deposit funds first to activate ' || v_rank || '.'
    );
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  UPDATE public.profiles
  SET
    cash_balance = cash_balance - v_cost + v_bonus,
    invested_balance = invested_balance + v_cost,
    updated_at = NOW()
  WHERE id = v_uid
  RETURNING cash_balance, invested_balance INTO v_new_cash, v_new_inv;

  INSERT INTO public.user_investments (
    user_id, asset_name, asset_type, amount_invested, current_value, return_rate, status, maturity_date
  ) VALUES (
    v_uid,
    'VaultX Level ' || p_level || ' (' || v_rank || ')',
    'vaultx',
    v_cost,
    v_cost,
    18.00,
    'active',
    NOW() + INTERVAL '30 days'
  );

  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES
    (v_uid, 'trade', -v_cost, 'VaultX Level ' || p_level || ' (' || v_rank || ') Activation', 'completed'),
    (v_uid, 'reward', v_bonus, 'VaultX Welcome Bonus (' || v_rank || ')', 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_uid,
    'VaultX ' || v_rank || ' Active!',
    'Your ' || v_rank || ' (₦' || v_cost || ') is now active. Daily return: ₦' || v_daily || '/day. Welcome bonus of ₦' || v_bonus || ' credited!',
    'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'level', p_level,
    'rank', v_rank,
    'cost', v_cost,
    'welcome_bonus', v_bonus,
    'daily_earning', v_daily,
    'new_cash_balance', v_new_cash,
    'new_invested_balance', v_new_inv
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. RPC: Sync User Balance (Guarantees local rewards/balances sync safely into DB)
CREATE OR REPLACE FUNCTION public.sync_user_balance(p_cash_balance NUMERIC)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_curr NUMERIC;
  v_diff NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_cash_balance IS NULL OR p_cash_balance < 0 THEN
    RAISE EXCEPTION 'Invalid cash balance.';
  END IF;

  SELECT cash_balance INTO v_curr FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF p_cash_balance > v_curr THEN
    v_diff := p_cash_balance - v_curr;
    PERFORM set_config('app.internal_balance_update', 'true', true);

    UPDATE public.profiles
    SET cash_balance = p_cash_balance, updated_at = NOW()
    WHERE id = v_uid;

    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (v_uid, 'reward', v_diff, 'Earned Reward Sync', 'completed');
  END IF;

  SELECT cash_balance INTO v_curr FROM public.profiles WHERE id = v_uid;
  RETURN jsonb_build_object('success', true, 'cash_balance', v_curr);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. GRANT EXECUTE ON ALL PUBLIC RPC FUNCTIONS TO AUTHENTICATED AND ANON
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_streak_reward(NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_user_task_reward(TEXT, NUMERIC, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.credit_user_balance(NUMERIC, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sync_user_balance(NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_vaultx_package(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_deposit(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(UUID, NUMERIC, TEXT) TO authenticated, anon;


