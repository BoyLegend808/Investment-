-- ==============================================================================
-- Crest Wealth - Complete Production Supabase Database Schema & Security
-- THE ALL-IN-ONE SCRIPT. This is the only SQL file in the project.
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/panxaqueawnqrebikwvb/sql
-- ==============================================================================
--
-- Paste the whole file and run it. It is idempotent, so it is the correct move
-- in both situations:
--
--   * A brand-new, empty project — it creates every table, function, trigger,
--     policy and index, then seeds the plan list and the treasury account.
--   * The project that is already live — it re-creates the same objects and
--     pushes the corrected plan list (welcome bonuses 1,500 … 350,000, plus the
--     level-matched referral commissions) over whatever is published now.
--
-- Nothing here drops a table or deletes rows. The only ORDER-dependent seed is
-- the plan list, which uses ON CONFLICT DO UPDATE on purpose so the corrected
-- values overwrite the stale ones. The treasury row uses DO NOTHING so that a
-- re-run never reverts an account you have since changed from the admin panel.
-- ==============================================================================

-- 0. EXTENSIONS
-- pgcrypto provides crypt()/gen_salt(), which hash the withdrawal PIN. It ships
-- with every Supabase project; this line only guarantees it is present.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_streak_day INT DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_streak_claim_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_claimed_streak_day INT DEFAULT 0;
-- These two are declared here, not in section 18, because the profiles RLS
-- policy in section 12 references them. Creating that policy first would fail
-- on a fresh project with "column referred_by does not exist".
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
-- Declared with the rest of the profile columns: request_withdrawal() reads it.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;
-- Active investment plan. NULL means the user has not been activated on a plan
-- yet, which is what gates the daily claim box and the task list.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_level INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_activated_at TIMESTAMPTZ;
-- Last date the plan's daily reward was claimed, as YYYY-MM-DD text.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_last_claim_date TEXT;
-- The plan's one-off welcome bonus is paid once, on the first daily claim.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_welcome_paid BOOLEAN DEFAULT FALSE;
-- Welcome bonus balance tracked separately so it can be withdrawn at any time
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_bonus_balance NUMERIC(15, 2) DEFAULT 0.00;
-- Hashed 4-digit withdrawal PIN (bcrypt via pgcrypto). NULL means the member has
-- not set one yet, and request_withdrawal() refuses to move money until they
-- have. Written only by set_withdrawal_pin(); the profile trigger below pins it
-- for ordinary client updates, so the hash can never be overwritten from the
-- browser.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS withdrawal_pin_hash TEXT;
-- Email one-time-code second factor, switched on by the member from Settings.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

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
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS proof_url TEXT;
-- The dashboard's deposit submit sends these three. They were never declared
-- here, so every user-submitted deposit was rejected by PostgREST with
-- "column does not exist" and silently never reached the admin desk.
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS account_name TEXT;
-- Set when the deposit is a plan purchase. admin_confirm_deposit() uses it to
-- activate the matching level on approval; a plain deposit leaves it NULL.
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS plan_level INT;

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
  title TEXT,
  description TEXT,
  reference_id TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.transactions ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN title SET DEFAULT 'Transaction';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.transactions ALTER COLUMN description DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN description SET DEFAULT '';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
-- admin_adjust_balance() writes these three. They were never declared here, so
-- the admin "Adjust Balance" action failed at runtime with "column does not
-- exist" on every attempt.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(15, 2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference TEXT;

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
--
-- Who these guards are FOR matters. They exist to stop the API, not the person
-- who owns the database. A write arriving through PostgREST carries a JWT, so
-- auth.role() reads 'anon' or 'authenticated'. A statement typed into the
-- Supabase SQL editor carries no JWT at all, so auth.role() is NULL there.
--
-- Without that distinction the trigger could not tell a browser apart from the
-- owner, and a hand-run "UPDATE profiles SET is_admin = true" was silently
-- reverted: auth.uid() is NULL in the SQL editor, is_admin() returned FALSE,
-- and the trigger put the old value back. The row reported "1 row updated" and
-- changed nothing. Promotion by hand is now possible, because the owner is
-- recognised and left alone.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_is_internal BOOLEAN := COALESCE(current_setting('app.internal_balance_update', true), 'false') = 'true';
  v_from_api BOOLEAN := COALESCE(auth.role(), '') IN ('anon', 'authenticated');
BEGIN
  IF v_from_api THEN
    IF TG_OP = 'INSERT' THEN
      -- A profile created through the API is never an admin and never carries
      -- money. handle_new_user() is unaffected: it runs as the table owner, so
      -- v_from_api is false for the signup path.
      NEW.is_admin := FALSE;
      NEW.cash_balance := 0.00;
      NEW.invested_balance := 0.00;
      NEW.is_frozen := FALSE;
      NEW.kyc_status := 'unverified';
      NEW.plan_level := NULL;
      NEW.plan_activated_at := NULL;
      NEW.plan_last_claim_date := NULL;
      NEW.plan_welcome_paid := FALSE;
      NEW.welcome_bonus_balance := 0.00;
      -- A brand-new row can never carry a pre-made PIN hash.
      NEW.withdrawal_pin_hash := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      -- is_admin is pinned for EVERY API caller, including an existing admin.
      -- Nothing that reaches the API - not the app, not a stolen admin token -
      -- can create another administrator. The only way to promote someone is a
      -- deliberate SQL statement run by the owner, and that is the intent.
      NEW.is_admin := OLD.is_admin;

      IF NOT public.is_admin() THEN
        NEW.is_frozen := OLD.is_frozen;
        NEW.kyc_status := OLD.kyc_status;
        -- Balances and plan state are writable only by our SECURITY DEFINER RPCs,
        -- which raise app.internal_balance_update for the duration of the call.
        -- A plain table update from the browser has no such flag, so a user cannot
        -- self-activate a plan or reset their own claim date.
        IF NOT v_is_internal THEN
          NEW.cash_balance := OLD.cash_balance;
          NEW.invested_balance := OLD.invested_balance;
          NEW.plan_level := OLD.plan_level;
          NEW.plan_activated_at := OLD.plan_activated_at;
          NEW.plan_last_claim_date := OLD.plan_last_claim_date;
          NEW.plan_welcome_paid := OLD.plan_welcome_paid;
          -- welcome_bonus_balance decides how much is withdrawable on a non-Friday
          -- (request_withdrawal lets you pull up to the welcome bonus any day), so
          -- a user who could write it could inflate it to their cash balance and
          -- drain the whole account mid-week. It is RPC-only, same as the rest.
          NEW.welcome_bonus_balance := OLD.welcome_bonus_balance;
          -- Same rule for the PIN hash: only set_withdrawal_pin() may change it.
          NEW.withdrawal_pin_hash := OLD.withdrawal_pin_hash;
        END IF;
        -- Referral attribution is written once, at signup. It has to stay
        -- settable on that first write, but if it stayed writable afterwards a
        -- user could re-point referred_by at an accomplice just before their
        -- deposit was approved, or clone someone else's referral_code so that
        -- their referrals resolved to the wrong account.
        IF OLD.referred_by IS NOT NULL THEN
          NEW.referred_by := OLD.referred_by;
        END IF;
        IF OLD.referral_code IS NOT NULL THEN
          NEW.referral_code := OLD.referral_code;
        END IF;
      END IF;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- 11. ATOMIC FINANCIAL RPC PROCEDURES

-- Admin Confirms Deposit
CREATE OR REPLACE FUNCTION public.admin_confirm_deposit(deposit_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_dep RECORD;
  v_new_bal NUMERIC;
  v_plan JSONB;
  v_plan_name TEXT;
  v_welcome_bonus NUMERIC := 0;
  v_ref_id UUID;
  v_ref_bonus NUMERIC := 0;
  v_buyer_name TEXT;
  v_plan_price NUMERIC;
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

  -- A plan purchase must be for exactly the published price.
  --
  -- The depositing user writes this row's amount (the dashboard inserts it
  -- directly, and the insert policy only pins user_id and status='Pending'), so
  -- without this check a user could file a ₦100 transfer tagged as Level 10 and
  -- be credited the full ₦350,000 welcome bonus plus a ₦1,000,000 plan on
  -- confirmation. Legitimate purchases go through submit_plan_payment(), which
  -- reads the price from the same published list — so a genuine plan deposit
  -- always matches. The admin's own bank/receipt check still applies; this only
  -- stops a mismatch from ever reaching the ledger.
  IF v_dep.plan_level IS NOT NULL THEN
    SELECT elem INTO v_plan
    FROM public.app_settings s
    CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
    WHERE s.key = 'investment_plans'
      AND jsonb_typeof(s.value) = 'array'
      AND (elem->>'level')::INT = v_dep.plan_level
    LIMIT 1;

    IF v_plan IS NOT NULL THEN
      v_plan_price := COALESCE(NULLIF(v_plan->>'price', '')::NUMERIC, 0);
      IF v_plan_price > 0 AND v_dep.amount <> v_plan_price THEN
        RAISE EXCEPTION
          'Amount mismatch: deposit % was filed for ₦% but % costs ₦%. Reject it, or correct the amount before confirming.',
          deposit_id, v_dep.amount,
          COALESCE(v_plan->>'name', 'Level ' || v_dep.plan_level), v_plan_price;
      END IF;
    END IF;
  END IF;

  UPDATE public.deposits
  SET status = 'Confirmed', confirmed_at = NOW()
  WHERE id = deposit_id;

  UPDATE public.profiles
  SET cash_balance = cash_balance + v_dep.amount, updated_at = NOW()
  WHERE id = v_dep.user_id
  RETURNING cash_balance INTO v_new_bal;

  -- A plan purchase also activates the plan. That unlocks the daily claim box,
  -- tasks, credits the welcome bonus immediately, and awards referral commissions.
  IF v_dep.plan_level IS NOT NULL THEN
    SELECT elem INTO v_plan
    FROM public.app_settings s
    CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
    WHERE s.key = 'investment_plans'
      AND jsonb_typeof(s.value) = 'array'
      AND (elem->>'level')::INT = v_dep.plan_level
    LIMIT 1;

    v_plan_name := COALESCE(v_plan->>'name', 'Level ' || v_dep.plan_level);

    -- Level-based welcome bonus. The published plan list is the authority here;
    -- the CASE values are only a safety net for levels outside 1-10.
    v_welcome_bonus := COALESCE(NULLIF(v_plan->>'welcomeBonus', '')::NUMERIC, 0);
    IF v_welcome_bonus = 0 THEN
      v_welcome_bonus := CASE v_dep.plan_level
        WHEN 1 THEN 1500
        WHEN 2 THEN 5000
        WHEN 3 THEN 10000
        WHEN 4 THEN 17000
        WHEN 5 THEN 25000
        WHEN 6 THEN 35000
        WHEN 7 THEN 70000
        WHEN 8 THEN 90000
        WHEN 9 THEN 150000
        WHEN 10 THEN 350000
        ELSE 0
      END;
    END IF;

    -- Credit welcome bonus directly into cash balance and welcome bonus balance
    UPDATE public.profiles
    SET plan_level = v_dep.plan_level,
        plan_activated_at = NOW(),
        plan_last_claim_date = NULL,
        plan_welcome_paid = TRUE,
        welcome_bonus_balance = COALESCE(welcome_bonus_balance, 0) + v_welcome_bonus,
        cash_balance = cash_balance + v_welcome_bonus,
        updated_at = NOW()
    WHERE id = v_dep.user_id
    RETURNING cash_balance INTO v_new_bal;

    IF v_welcome_bonus > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, title, description, reference_id, status)
      VALUES (
        v_dep.user_id, 'reward', v_welcome_bonus,
        'Welcome Bonus',
        'One-time welcome bonus — ' || v_plan_name || ' (Withdrawable anytime)',
        deposit_id, 'completed'
      );
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_dep.user_id, 'Plan Activated',
      'Your ' || v_plan_name || ' plan is now active! ₦' || TO_CHAR(v_welcome_bonus, 'FM999,999,990') ||
      ' welcome bonus has been credited to your balance (withdrawable anytime). Your daily earning is ₦' ||
      COALESCE(NULLIF(v_plan->>'dailyEarning', ''), '0') || '.', 'success');

    -- Award referral bonus to the referrer based on the level purchased
    SELECT referred_by, full_name INTO v_ref_id, v_buyer_name
    FROM public.profiles
    WHERE id = v_dep.user_id;

    IF v_ref_id IS NOT NULL THEN
      -- Same rule: the published list drives the commission, keyed to the level
      -- the referred member bought.
      v_ref_bonus := COALESCE(NULLIF(v_plan->>'referralBonus', '')::NUMERIC, 0);
      IF v_ref_bonus = 0 THEN
        v_ref_bonus := CASE v_dep.plan_level
          WHEN 1 THEN 1000
          WHEN 2 THEN 3000
          WHEN 3 THEN 6000
          WHEN 4 THEN 10000
          WHEN 5 THEN 12500
          WHEN 6 THEN 15000
          WHEN 7 THEN 30000
          WHEN 8 THEN 60000
          WHEN 9 THEN 100000
          WHEN 10 THEN 200000
          ELSE 0
        END;
      END IF;

      IF v_ref_bonus > 0 THEN
        UPDATE public.profiles
        SET cash_balance = cash_balance + v_ref_bonus, updated_at = NOW()
        WHERE id = v_ref_id;

        INSERT INTO public.transactions (user_id, type, amount, title, description, reference_id, status)
        VALUES (
          v_ref_id, 'reward', v_ref_bonus,
          'Referral Commission',
          'Referral bonus for downline member investing in ' || v_plan_name || ' (Level ' || v_dep.plan_level || ')',
          deposit_id, 'completed'
        );

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
          v_ref_id,
          'Referral Commission Earned',
          'You earned ₦' || TO_CHAR(v_ref_bonus, 'FM999,999,990') || ' referral commission because your referral ' ||
          COALESCE(v_buyer_name, 'a member') || ' invested in ' || v_plan_name || ' (Level ' || v_dep.plan_level || ').',
          'success'
        );
      END IF;
    END IF;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, title, description, reference_id, status)
  VALUES (
    v_dep.user_id, 'deposit', v_dep.amount,
    CASE WHEN v_dep.plan_level IS NOT NULL
         THEN 'Plan Purchase — ' || COALESCE(v_dep.plan, 'Level ' || v_dep.plan_level)
         ELSE 'Deposit Confirmation' END,
    'Deposit confirmation #' || deposit_id, deposit_id, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_dep.user_id, 'Deposit Confirmed', 'Your deposit of ₦' || v_dep.amount || ' has been confirmed and credited.', 'success');

  RETURN jsonb_build_object(
    'success', true,
    'deposit_id', deposit_id,
    'new_balance', v_new_bal,
    'plan_level', v_dep.plan_level,
    'plan_activated', v_dep.plan_level IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Requests Withdrawal
-- The 4-argument overload is dropped first. PostgREST cannot pick between two
-- overloads that share a name, so leaving it in place would make every call
-- ambiguous the moment the PIN argument is added.
DROP FUNCTION IF EXISTS public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT DEFAULT NULL,
  p_pin TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cur_bal NUMERIC;
  v_welcome_bal NUMERIC;
  v_pin_hash TEXT;
  v_dow INT;
  v_wth_id TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amount.';
  END IF;

  -- A frozen account must not be able to move money out.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND is_frozen IS TRUE) THEN
    RAISE EXCEPTION 'This account is frozen. Please contact support.';
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  SELECT cash_balance, COALESCE(welcome_bonus_balance, 0.00), withdrawal_pin_hash
  INTO v_cur_bal, v_welcome_bal, v_pin_hash
  FROM public.profiles
  WHERE id = v_uid FOR UPDATE;

  -- The PIN gate sits before any balance logic, so a wrong PIN reveals nothing
  -- about the account. A member who has never set a PIN is told to set one
  -- instead of being shown a misleading "incorrect PIN".
  IF v_pin_hash IS NULL THEN
    RAISE EXCEPTION 'Set your 4-digit withdrawal PIN in Settings before requesting a withdrawal.';
  END IF;
  IF p_pin IS NULL OR crypt(p_pin, v_pin_hash) IS DISTINCT FROM v_pin_hash THEN
    RAISE EXCEPTION 'Incorrect withdrawal PIN.';
  END IF;

  IF v_cur_bal IS NULL OR v_cur_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient cash balance.';
  END IF;

  -- Day of week: 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  v_dow := EXTRACT(DOW FROM NOW())::INT;
  IF v_dow != 5 THEN
    -- On non-Fridays, only the welcome bonus is withdrawable anytime
    IF v_welcome_bal <= 0 THEN
      RAISE EXCEPTION 'Regular withdrawals (daily earnings, tasks, and referral bonuses) are only available on Fridays. You currently have no withdrawable welcome bonus.';
    ELSIF p_amount > v_welcome_bal THEN
      RAISE EXCEPTION 'Regular earnings can only be withdrawn on Fridays. Only your welcome bonus (₦% available) can be withdrawn today.', TO_CHAR(v_welcome_bal, 'FM999,999,990.00');
    END IF;
  END IF;

  UPDATE public.profiles
  SET cash_balance = cash_balance - p_amount,
      welcome_bonus_balance = GREATEST(0.00, COALESCE(welcome_bonus_balance, 0.00) - p_amount),
      updated_at = NOW()
  WHERE id = v_uid;

  v_wth_id := 'WTH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  INSERT INTO public.withdrawals (
    id, user_id, user_email, amount, bank_name, account_number, account_name, status
  ) VALUES (
    v_wth_id, v_uid, auth.jwt()->>'email', p_amount, p_bank_name, p_account_number, p_account_name, 'Pending'
  );

  INSERT INTO public.transactions (user_id, type, amount, title, description, reference_id, status)
  VALUES (v_uid, 'withdrawal', -p_amount, 'Withdrawal to ' || p_bank_name, 'Withdrawal request to ' || p_bank_name, v_wth_id, 'pending');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_uid, 'Withdrawal Submitted', 'Your withdrawal request of ₦' || p_amount || ' is pending processing.', 'info');

  RETURN jsonb_build_object('success', true, 'withdrawal_id', v_wth_id, 'amount', p_amount, 'remaining_balance', v_cur_bal - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Member Sets / Changes Their Withdrawal PIN
-- The PIN is bcrypt-hashed here and never stored in clear text. Because the
-- profile trigger pins withdrawal_pin_hash for any ordinary client update, this
-- RPC is the only path that can change it.
CREATE OR REPLACE FUNCTION public.set_withdrawal_pin(p_pin TEXT)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'Your PIN must be exactly 4 digits.';
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  UPDATE public.profiles
  SET withdrawal_pin_hash = crypt(p_pin, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_uid;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Whether the member has set a PIN and whether their 2FA toggle is on, so the
-- dashboard can label the Settings rows without exposing the hash.
CREATE OR REPLACE FUNCTION public.get_my_security_settings()
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pin_set BOOLEAN;
  v_twofa BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT withdrawal_pin_hash IS NOT NULL, COALESCE(two_factor_enabled, FALSE)
  INTO v_pin_set, v_twofa
  FROM public.profiles
  WHERE id = v_uid;

  RETURN jsonb_build_object('pin_set', COALESCE(v_pin_set, FALSE), 'two_factor_enabled', COALESCE(v_twofa, FALSE));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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

  INSERT INTO public.transactions (user_id, type, amount, title, description, reference_id, status)
  VALUES (v_wth.user_id, 'adjustment', v_wth.amount, 'Withdrawal Refund', 'Refund for rejected withdrawal #' || withdrawal_id, withdrawal_id, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_wth.user_id, 'Withdrawal Refunded', 'Your withdrawal request #' || withdrawal_id || ' was rejected. Funds have been returned to your balance.', 'warning');

  RETURN jsonb_build_object('success', true, 'withdrawal_id', withdrawal_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Adjusts User Balance (Manual Correction)
-- Defined once, in section 22, as admin_adjust_balance(UUID, NUMERIC, TEXT, TEXT).
-- A second 3-argument overload used to live here; it was never called by the
-- admin panel and only made the function ambiguous to GRANT and to PostgREST.

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
-- NOTE: this policy previously also carried "OR referral_code IS NOT NULL".
-- referral_code is auto-populated for every profile, so that clause made the
-- policy effectively USING (true) and let any signed-in user read every
-- investor's email, phone and balance. Referral lookup goes through the
-- SECURITY DEFINER lookup_referral_code() RPC instead, which needs no such hole.
CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT USING (auth.uid() = id OR referred_by = auth.uid() OR public.is_admin());
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin()) WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "Profiles insert policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Deposits select policy" ON public.deposits;
DROP POLICY IF EXISTS "Deposits insert policy" ON public.deposits;
DROP POLICY IF EXISTS "Deposits update policy" ON public.deposits;
CREATE POLICY "Deposits select policy" ON public.deposits FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
-- A user may file a deposit of their own, but only as Pending. Allowing them to
-- write status='Confirmed' would let them pre-confirm their own deposit row.
-- plan_level must stay NULL here: a row carrying a plan_level is a plan
-- purchase, and those are created only by submit_plan_payment(), which resolves
-- the price server-side. A user-set plan_level would let them tag a token
-- amount as Level 10 and have admin_confirm_deposit activate and bonus it.
CREATE POLICY "Deposits insert policy" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'Pending' AND plan_level IS NULL);
CREATE POLICY "Deposits update policy" ON public.deposits FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Withdrawals select policy" ON public.withdrawals;
DROP POLICY IF EXISTS "Withdrawals insert policy" ON public.withdrawals;
DROP POLICY IF EXISTS "Withdrawals update policy" ON public.withdrawals;
CREATE POLICY "Withdrawals select policy" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
-- Withdrawals are created only by request_withdrawal(), which debits the
-- balance before inserting (and is SECURITY DEFINER, so it bypasses this rule).
-- A direct insert let a user file a pending payout with no matching debit, which
-- the admin desk would then approve and pay out.
CREATE POLICY "Withdrawals insert policy" ON public.withdrawals FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Withdrawals update policy" ON public.withdrawals FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Transactions select policy" ON public.transactions;
DROP POLICY IF EXISTS "Transactions insert policy" ON public.transactions;
CREATE POLICY "Transactions select policy" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
-- The ledger is written only by SECURITY DEFINER RPCs. Letting a user insert
-- their own rows let them fabricate entries that never happened, and the admin
-- desk reconciles payouts against exactly this table.
CREATE POLICY "Transactions insert policy" ON public.transactions FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "User investments policy" ON public.user_investments;
DROP POLICY IF EXISTS "User investments select policy" ON public.user_investments;
DROP POLICY IF EXISTS "User investments admin write" ON public.user_investments;
-- Portfolio rows are written only by privileged RPCs. The old FOR ALL
-- policy let a user insert, edit or delete their own portfolio rows directly.
CREATE POLICY "User investments select policy" ON public.user_investments FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "User investments admin write" ON public.user_investments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Notifications policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications select own" ON public.notifications;
DROP POLICY IF EXISTS "Notifications admin write" ON public.notifications;
-- Notifications are written by the SECURITY DEFINER RPCs only. The old FOR ALL
-- policy let a user insert messages into their own feed, which in a finance
-- product means a forgeable "Deposit Confirmed" style notification.
CREATE POLICY "Notifications select own" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Notifications admin write" ON public.notifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Users may read their own task rows and record a completion of their own, but
-- must NOT update or delete them: flipping `completed` back to false, or
-- deleting the row, clears the "already completed" guard in
-- claim_user_task_reward and lets the same task be paid twice. The RPC is
-- SECURITY DEFINER, so it retains full write access regardless of these rules.
DROP POLICY IF EXISTS "User tasks policy" ON public.user_tasks;
DROP POLICY IF EXISTS "User tasks select own" ON public.user_tasks;
DROP POLICY IF EXISTS "User tasks insert own" ON public.user_tasks;
DROP POLICY IF EXISTS "User tasks admin write" ON public.user_tasks;

CREATE POLICY "User tasks select own" ON public.user_tasks FOR SELECT
  USING (auth.uid() = user_id);

-- There is deliberately no INSERT policy for ordinary users. A "WITH CHECK
-- (auth.uid() = user_id)" rule let a signed-in user insert their own
-- completed rows straight into the table, which forged the prerequisite
-- without doing the task. That also defeats the newer rule in
-- claim_plan_daily_reward that pays the daily reward only once every task is
-- done, because the count it reads comes from this table. Completion rows are
-- written only by claim_user_task_reward, which is SECURITY DEFINER and so
-- bypasses RLS entirely.

CREATE POLICY "User tasks admin write" ON public.user_tasks FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

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

-- 17b. DEPOSIT RECEIPT STORAGE
-- The dashboard uploaded every bank-transfer receipt to a 'receipts' bucket that
-- this script never created, so each upload failed and the deposit row recorded
-- the placeholder text "base64_attached" instead of an image. The admin's
-- receipt viewer therefore had nothing to show, which meant deposits were being
-- confirmed without the proof of payment ever being seen.
--
-- The bucket is private and each member writes into their own folder. The
-- deposit row stores the object *path*, and the admin panel mints a short-lived
-- signed URL when it opens one, so a bank receipt is never exposed by a URL
-- that outlives the review.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Deposit receipts upload own" ON storage.objects;
DROP POLICY IF EXISTS "Deposit receipts read own or admin" ON storage.objects;
CREATE POLICY "Deposit receipts upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Deposit receipts read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- 18. REFERRALS, STREAKS & TASK ATOMIC PROCEDURES

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_streak_day INT DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_streak_claim_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_claimed_streak_day INT DEFAULT 0;
UPDATE public.profiles SET daily_streak_day = 1 WHERE daily_streak_day IS NULL;

-- Auto-populate referral code if null
UPDATE public.profiles
SET referral_code = 'CW-' || UPPER(SUBSTRING(id::TEXT, 1, 8))
WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- RPC: Claim Daily Streak Reward
-- The payout is derived from the streak day on the server. It is never read
-- from the caller, who could otherwise simply name their own amount.
DROP FUNCTION IF EXISTS public.claim_daily_streak_reward(NUMERIC);
DROP FUNCTION IF EXISTS public.claim_daily_streak_reward();
CREATE OR REPLACE FUNCTION public.claim_daily_streak_reward()
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof RECORD;
  v_cur_day INT;
  v_next_day INT;
  v_reward NUMERIC;
  v_new_bal NUMERIC;
  v_today_str TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
  v_yesterday_str TEXT := TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD');
  v_last_claim_str TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  SELECT * INTO v_prof
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profile not found.');
  END IF;

  -- Normalize last claim date to YYYY-MM-DD text string
  IF v_prof.last_streak_claim_date IS NOT NULL THEN
    v_last_claim_str := SUBSTRING(v_prof.last_streak_claim_date::text FROM 1 FOR 10);
  ELSE
    v_last_claim_str := NULL;
  END IF;

  -- Check if already claimed today (safe text comparison)
  IF v_last_claim_str IS NOT NULL AND v_last_claim_str = v_today_str THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You have already claimed today''s login streak reward! Come back tomorrow.',
      'already_claimed', true,
      'day_claimed', COALESCE(v_prof.last_claimed_streak_day, 1),
      'current_balance', v_prof.cash_balance
    );
  END IF;

  -- Determine streak progression
  -- If last claim was yesterday, continue streak
  -- If streak was broken (> 1 day ago) or first time ever, reset to Day 1
  IF v_last_claim_str IS NOT NULL AND v_last_claim_str = v_yesterday_str THEN
    v_cur_day := COALESCE(v_prof.daily_streak_day, 1);
    IF v_cur_day < 1 OR v_cur_day > 7 THEN
      v_cur_day := 1;
    END IF;
  ELSE
    v_cur_day := 1;
  END IF;

  -- Determine reward amount (server-side only)
  IF v_cur_day = 7 THEN
    v_reward := 1000.00;
  ELSE
    v_reward := 200.00;
  END IF;

  -- Compute next day (rolls over after Day 7)
  IF v_cur_day >= 7 THEN
    v_next_day := 1;
  ELSE
    v_next_day := v_cur_day + 1;
  END IF;

  -- Bypass field protection trigger
  PERFORM set_config('app.internal_balance_update', 'true', true);

  v_new_bal := COALESCE(v_prof.cash_balance, 0.00) + v_reward;

  UPDATE public.profiles
  SET
    cash_balance = v_new_bal,
    daily_streak_day = v_next_day,
    last_streak_claim_date = v_today_str,
    last_claimed_streak_day = v_cur_day,
    updated_at = NOW()
  WHERE id = v_uid;

  INSERT INTO public.transactions (user_id, type, amount, title, description, status)
  VALUES (
    v_uid,
    'reward',
    v_reward,
    'Daily Login Streak Bonus (Day ' || v_cur_day || ')',
    'Daily Login Streak Bonus (Day ' || v_cur_day || ')',
    'completed'
  );

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_uid,
    'Daily Bonus Received! (Day ' || v_cur_day || ')',
    '+₦' || TO_CHAR(v_reward, 'FM999,999,990') || ' has been added to your cash balance.',
    'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'day_claimed', v_cur_day,
    'next_day', v_next_day,
    'reward', v_reward,
    'new_balance', v_new_bal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Claim User Task Reward
-- The payout is derived from the caller's active investment plan, never from
-- the caller and never from the task. Every published task is worth an equal
-- share of one day's plan earning, so the tasks together can never pay out
-- more than the plan's daily figure.
DROP FUNCTION IF EXISTS public.claim_user_task_reward(TEXT, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.claim_user_task_reward(TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.claim_user_task_reward(TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.claim_user_task_reward(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.claim_user_task_reward(
  p_task_id TEXT,
  p_task_title TEXT DEFAULT 'Task Completed',
  p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_existing RECORD;
  v_prof RECORD;
  v_task JSONB;
  v_plan JSONB;
  v_daily NUMERIC;
  v_task_count INT;
  v_reward NUMERIC;
  v_new_bal NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profile not found.');
  END IF;

  -- Tasks only exist for funded accounts: the reward is paid out of the plan
  -- the user has actually paid for, so an account with no active plan has
  -- nowhere for the money to come from.
  IF v_prof.plan_level IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Pick and pay for an investment plan first — task rewards are paid from your plan.'
    );
  END IF;

  -- Look the task up in the published task list so a made-up id cannot be paid.
  SELECT elem INTO v_task
  FROM public.app_settings s
  CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
  WHERE s.key = 'tasks_config'
    AND jsonb_typeof(s.value) = 'array'
    AND elem->>'id' = p_task_id
  LIMIT 1;

  IF v_task IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'This task is not in the published task list, so its reward cannot be verified.'
    );
  END IF;

  -- Resolve the caller's plan daily earning.
  SELECT elem INTO v_plan
  FROM public.app_settings s
  CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
  WHERE s.key = 'investment_plans'
    AND jsonb_typeof(s.value) = 'array'
    AND (elem->>'level')::INT = v_prof.plan_level
  LIMIT 1;

  v_daily := NULLIF(v_plan->>'dailyEarning', '')::NUMERIC;

  IF v_daily IS NULL OR v_daily <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Your plan has no daily earning configured.');
  END IF;

  SELECT COUNT(*) INTO v_task_count
  FROM public.app_settings s
  CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
  WHERE s.key = 'tasks_config' AND jsonb_typeof(s.value) = 'array';

  IF COALESCE(v_task_count, 0) = 0 THEN
    v_task_count := 1;
  END IF;

  v_reward := ROUND(v_daily / v_task_count, 2);
  IF v_reward <= 0 THEN
    v_reward := v_daily;
  END IF;

  SELECT * INTO v_existing FROM public.user_tasks WHERE user_id = v_uid AND task_id = p_task_id;
  IF FOUND AND v_existing.completed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task already completed.');
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  INSERT INTO public.user_tasks (user_id, task_id, task_key, task_title, reward_amount, status, proof_url, completed, completed_at)
  VALUES (v_uid, p_task_id, p_task_id, p_task_title, v_reward, 'completed', p_proof_url, true, NOW())
  ON CONFLICT (user_id, task_id) DO UPDATE
  SET completed = true, completed_at = NOW(), proof_url = COALESCE(EXCLUDED.proof_url, public.user_tasks.proof_url);

  UPDATE public.profiles
  SET cash_balance = cash_balance + v_reward, updated_at = NOW()
  WHERE id = v_uid
  RETURNING cash_balance INTO v_new_bal;

  INSERT INTO public.transactions (user_id, type, amount, title, description, status)
  VALUES (v_uid, 'reward', v_reward, 'Task Reward — ' || p_task_title, 'Task Reward — ' || p_task_title, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_uid, 'Task Reward Credited', '+₦' || v_reward || ' credited for ' || p_task_title, 'success');

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_bal, 'reward', v_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Credit User Balance (Protected: Requires Admin Privileges)
DROP FUNCTION IF EXISTS public.credit_user_balance(NUMERIC, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.credit_user_balance(NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.credit_user_balance(NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.credit_user_balance(NUMERIC);
CREATE OR REPLACE FUNCTION public.credit_user_balance(
  p_amount NUMERIC,
  p_reason TEXT DEFAULT 'Balance Credit',
  p_type TEXT DEFAULT 'reward',
  p_target_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_target UUID;
  v_new_bal NUMERIC;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required to directly credit user balances.';
  END IF;

  v_target := COALESCE(p_target_user_id, v_caller);

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount to credit.';
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  UPDATE public.profiles
  SET cash_balance = cash_balance + p_amount, updated_at = NOW()
  WHERE id = v_target
  RETURNING cash_balance INTO v_new_bal;

  INSERT INTO public.transactions (user_id, type, amount, title, description, status)
  VALUES (v_target, p_type, p_amount, p_reason, p_reason, 'completed');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_target, 'Balance Credited', '+₦' || p_amount || ' credited: ' || p_reason, 'success');

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_bal, 'amount_credited', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: subscribe_vaultx_package() has been RETIRED.
-- It let a signed-in user activate any tier straight out of their own cash
-- balance, with no admin check and no real payment behind it. Plans are now
-- paid for by bank transfer and activated by admin_confirm_deposit() alone,
-- so this entry point must not exist at all.
DROP FUNCTION IF EXISTS public.subscribe_vaultx_package(INT);

-- 19. RPC: Sync User Balance (Read-only authoritative fetch; prevents client tampering)
CREATE OR REPLACE FUNCTION public.sync_user_balance(p_cash_balance NUMERIC DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_curr NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT cash_balance INTO v_curr FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  -- The database is the single authoritative source of truth.
  RETURN jsonb_build_object('success', true, 'cash_balance', v_curr);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. REFERRAL SECURE RPCs (Guaranteed bypass of client RLS limits)
CREATE OR REPLACE FUNCTION public.get_user_referrals()
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'email', email,
    'invested_balance', invested_balance,
    'plan_level', plan_level,
    'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_res
  FROM public.profiles
  WHERE referred_by = v_uid;

  RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lookup_referral_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_prof RECORD;
BEGIN
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT id, full_name INTO v_prof
  FROM public.profiles
  WHERE UPPER(TRIM(referral_code)) = UPPER(TRIM(p_code))
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('valid', true, 'referrer_id', v_prof.id, 'referrer_name', v_prof.full_name);
  ELSE
    RETURN jsonb_build_object('valid', false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 21. APP SETTINGS & CONFIGURATION TABLE (Remote Sync for Tasks, Treasury, and Announcements)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- is_frozen is declared in section 2 alongside the other profile columns.

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read app_settings" ON public.app_settings;
CREATE POLICY "Allow public read app_settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Writes stay restricted to administrators ("App settings admin write" above).
-- A permissive USING (true) policy here would let any signed-in user rewrite
-- the published task rewards that claim_user_task_reward now trusts.
DROP POLICY IF EXISTS "Allow authenticated write app_settings" ON public.app_settings;

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- 22. ADMIN ACTIONS: ADJUST USER BALANCE
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT DEFAULT 'credit',
  p_note TEXT DEFAULT 'Admin manual balance adjustment'
)
RETURNS JSONB AS $$
DECLARE
  v_new_bal NUMERIC;
  v_safe_amt NUMERIC;
BEGIN
  -- Without this guard any signed-in user could call this RPC with an arbitrary
  -- p_user_id and mint themselves (or anyone) an arbitrary balance.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required.';
  END IF;

  v_safe_amt := ABS(COALESCE(p_amount, 0));
  IF v_safe_amt <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment amount must be greater than zero');
  END IF;

  IF LOWER(p_type) = 'debit' THEN
    UPDATE public.profiles
    SET cash_balance = GREATEST(0.00, cash_balance - v_safe_amt),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING cash_balance INTO v_new_bal;
  ELSE
    UPDATE public.profiles
    SET cash_balance = cash_balance + v_safe_amt,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING cash_balance INTO v_new_bal;
  END IF;

  -- Record audit transaction
  INSERT INTO public.transactions (
    id, user_id, title, type, category, amount, balance_after, status, reference, description, created_at
  ) VALUES (
    'adj_' || floor(extract(epoch from now())) || '_' || substr(md5(random()::text), 1, 6),
    p_user_id,
    'Admin Balance Adjustment',
    CASE WHEN LOWER(p_type) = 'debit' THEN 'Debit' ELSE 'Credit' END,
    'adjustment',
    v_safe_amt,
    COALESCE(v_new_bal, 0.00),
    'Completed',
    'ADJ-' || upper(substr(md5(random()::text), 1, 8)),
    COALESCE(p_note, 'Admin manual balance adjustment'),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_bal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 23. ADMIN ACTIONS: FREEZE / UNFREEZE USER ACCOUNT
CREATE OR REPLACE FUNCTION public.admin_toggle_user_freeze(
  p_user_id UUID,
  p_frozen BOOLEAN
)
RETURNS JSONB AS $$
BEGIN
  -- Admin-only. Without this guard any visitor could freeze any account.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required.';
  END IF;

  UPDATE public.profiles
  SET is_frozen = p_frozen,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'is_frozen', p_frozen);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. ADMIN ACTIONS: UPDATE USER KYC STATUS
CREATE OR REPLACE FUNCTION public.admin_update_kyc_status(
  p_user_id UUID,
  p_status TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- Admin-only. Without this guard any visitor could self-approve KYC.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required.';
  END IF;

  UPDATE public.profiles
  SET kyc_status = p_status,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'kyc_status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 25. INVESTMENT PLANS: THE SINGLE SOURCE OF TRUTH
--
-- One admin-editable list drives everything: the plans shown on the
-- Investments page, the picker in the dashboard, what a plan costs, the daily
-- claim payout, the one-off welcome bonus and the per-task reward.
-- ON CONFLICT DO UPDATE so re-running this script pushes the corrected welcome
-- and referral bonuses live. If you have since hand-edited prices from the admin
-- panel, publish them again from the Plan Editor afterwards (or skip the plan
-- seed) so this run does not revert your edits.
INSERT INTO public.app_settings (key, value)
VALUES (
  'investment_plans',
  '[
    {"level":1,"name":"Starter","price":5000,"welcomeBonus":1500,"referralBonus":1000,"dailyEarning":900},
    {"level":2,"name":"Bronze","price":15000,"welcomeBonus":5000,"referralBonus":3000,"dailyEarning":2700},
    {"level":3,"name":"Silver","price":30000,"welcomeBonus":10000,"referralBonus":6000,"dailyEarning":5400},
    {"level":4,"name":"Gold","price":50000,"welcomeBonus":17000,"referralBonus":10000,"dailyEarning":9000},
    {"level":5,"name":"Platinum","price":75000,"welcomeBonus":25000,"referralBonus":12500,"dailyEarning":13500},
    {"level":6,"name":"Emerald","price":100000,"welcomeBonus":35000,"referralBonus":15000,"dailyEarning":18000},
    {"level":7,"name":"Sapphire","price":200000,"welcomeBonus":70000,"referralBonus":30000,"dailyEarning":36000},
    {"level":8,"name":"Ruby","price":350000,"welcomeBonus":90000,"referralBonus":60000,"dailyEarning":63000},
    {"level":9,"name":"Diamond","price":500000,"welcomeBonus":150000,"referralBonus":100000,"dailyEarning":90000},
    {"level":10,"name":"Apex","price":1000000,"welcomeBonus":350000,"referralBonus":200000,"dailyEarning":180000}
  ]'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- The account investors pay into. Seeded once with DO NOTHING on purpose: this
-- is a value the admin is expected to change from the Treasury panel, so a
-- re-run must never revert it. Edit it at Admin -> Treasury -> Platform
-- Settings, or change the JSON below before the first run.
INSERT INTO public.app_settings (key, value)
VALUES (
  'platform_settings',
  '{
    "bankName": "Opay",
    "acctNum": "8110858553",
    "acctName": "Nwoba Victor Chidera",
    "bankNote": "Transfer to this account from any banking app. Funds appear within 2 minutes. Use your name as narration."
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- RPC: Submit a plan payment (bank transfer)
-- The caller names only the level and where the money was sent from. The
-- amount and the plan name are read from the published plan list, so a user
-- can never name their own price. The row lands as Pending — that is the
-- signal the admin desk reviews, and approving it runs
-- admin_confirm_deposit(), which credits the amount and activates the plan.
DROP FUNCTION IF EXISTS public.submit_plan_payment(INT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.submit_plan_payment(INT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.submit_plan_payment(
  p_level INT,
  p_bank_name TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_account_name TEXT DEFAULT NULL,
  p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_plan JSONB;
  v_plan_name TEXT;
  v_amount NUMERIC;
  v_dep_id TEXT;
  v_email TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  SELECT elem INTO v_plan
  FROM public.app_settings s
  CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
  WHERE s.key = 'investment_plans'
    AND jsonb_typeof(s.value) = 'array'
    AND (elem->>'level')::INT = p_level
  LIMIT 1;

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'That investment plan is not available.');
  END IF;

  v_amount := NULLIF(v_plan->>'price', '')::NUMERIC;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'That investment plan has no price configured.');
  END IF;

  IF NULLIF(TRIM(COALESCE(p_proof_url, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Attach the transfer receipt screenshot before submitting this payment.');
  END IF;

  v_plan_name := COALESCE(v_plan->>'name', 'Level ' || p_level);

  SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;

  v_dep_id := 'DEP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));

  INSERT INTO public.deposits (
    id, user_id, user_email, amount, method, reference, status,
    plan, plan_level, bank_name, account_number, account_name, proof_url
  ) VALUES (
    v_dep_id, v_uid, v_email, v_amount, 'Bank Transfer', v_plan_name, 'Pending',
    v_plan_name, p_level, p_bank_name, p_account_number, p_account_name, p_proof_url
  );

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_uid,
    'Plan Payment Submitted',
    'Your ' || v_plan_name || ' payment notice (₦' || TO_CHAR(v_amount, 'FM999,999,990') || ') has been received. An administrator will confirm it shortly.',
    'info'
  );

  RETURN jsonb_build_object(
    'success', true,
    'deposit_id', v_dep_id,
    'plan_name', v_plan_name,
    'plan_level', p_level,
    'amount', v_amount,
    'status', 'Pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Claim the plan's daily reward
-- Pays the plan's own daily earning, plus the one-off welcome bonus on the
-- very first claim. One claim per calendar day, enforced server-side against
-- profiles.plan_last_claim_date so the client cannot claim twice.
CREATE OR REPLACE FUNCTION public.claim_plan_daily_reward()
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof RECORD;
  v_plan JSONB;
  v_daily NUMERIC;
  v_welcome NUMERIC;
  v_pay NUMERIC;
  v_welcome_paid BOOLEAN := FALSE;
  v_new_bal NUMERIC;
  v_today_str TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
  v_task_total INT;
  v_task_done INT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Profile not found.');
  END IF;

  IF v_prof.plan_level IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'no_plan', true,
      'message', 'You do not have an active plan yet. Pick a plan and pay for it to start earning.'
    );
  END IF;

  SELECT elem INTO v_plan
  FROM public.app_settings s
  CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
  WHERE s.key = 'investment_plans'
    AND jsonb_typeof(s.value) = 'array'
    AND (elem->>'level')::INT = v_prof.plan_level
  LIMIT 1;

  v_daily := NULLIF(v_plan->>'dailyEarning', '')::NUMERIC;
  v_welcome := NULLIF(v_plan->>'welcomeBonus', '')::NUMERIC;

  IF v_daily IS NULL OR v_daily <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Your plan has no daily earning configured. Please contact support.');
  END IF;

  IF v_prof.plan_last_claim_date IS NOT NULL
     AND SUBSTRING(v_prof.plan_last_claim_date::text FROM 1 FOR 10) = v_today_str THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'message', 'Today''s reward has already been claimed. Come back tomorrow.',
      'daily_earning', v_daily,
      'current_balance', v_prof.cash_balance
    );
  END IF;

  -- The daily reward is EARNED by completing the day's tasks, so it is not paid
  -- until every published task has been completed today. The once-per-day guard
  -- above is keyed to the server calendar date, so the task window is the same
  -- calendar day the claim belongs to: yesterday's completions cannot be
  -- recycled for today, and today's completions cannot unlock tomorrow.
  SELECT COUNT(*) INTO v_task_total
  FROM public.app_settings s
  CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
  WHERE s.key = 'tasks_config'
    AND jsonb_typeof(s.value) = 'array'
    AND COALESCE((elem->>'active')::BOOLEAN, TRUE);

  IF COALESCE(v_task_total, 0) > 0 THEN
    SELECT COUNT(DISTINCT ut.task_id) INTO v_task_done
    FROM public.user_tasks ut
    WHERE ut.user_id = v_uid
      AND ut.completed IS TRUE
      AND ut.completed_at >= DATE_TRUNC('day', NOW())
      AND ut.task_id IN (
        SELECT elem->>'id'
        FROM public.app_settings s
        CROSS JOIN LATERAL jsonb_array_elements(s.value) elem
        WHERE s.key = 'tasks_config' AND jsonb_typeof(s.value) = 'array'
      );

    IF COALESCE(v_task_done, 0) < v_task_total THEN
      RETURN jsonb_build_object(
        'success', false,
        'tasks_incomplete', true,
        'tasks_done', COALESCE(v_task_done, 0),
        'tasks_total', v_task_total,
        'daily_earning', v_daily,
        'message', 'Complete all ' || v_task_total || ' daily tasks to unlock today''s reward. You are at ' ||
                   COALESCE(v_task_done, 0) || '/' || v_task_total || '.'
      );
    END IF;
  END IF;

  v_pay := v_daily;

  IF NOT COALESCE(v_prof.plan_welcome_paid, FALSE) THEN
    v_pay := v_pay + COALESCE(v_welcome, 0);
    v_welcome_paid := TRUE;
  END IF;

  PERFORM set_config('app.internal_balance_update', 'true', true);

  UPDATE public.profiles
  SET cash_balance = cash_balance + v_pay,
      welcome_bonus_balance = COALESCE(welcome_bonus_balance, 0) + CASE WHEN v_welcome_paid THEN COALESCE(v_welcome, 0) ELSE 0 END,
      plan_last_claim_date = v_today_str,
      plan_welcome_paid = TRUE,
      updated_at = NOW()
  WHERE id = v_uid
  RETURNING cash_balance INTO v_new_bal;

  INSERT INTO public.transactions (user_id, type, amount, title, description, status)
  VALUES (v_uid, 'reward', v_daily, 'Daily Plan Reward', 'Daily Plan Reward — Level ' || v_prof.plan_level, 'completed');

  IF v_welcome_paid AND COALESCE(v_welcome, 0) > 0 THEN
    INSERT INTO public.transactions (user_id, type, amount, title, description, status)
    VALUES (v_uid, 'reward', v_welcome, 'Welcome Bonus', 'One-time welcome bonus — Level ' || v_prof.plan_level, 'completed');
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_uid,
    'Daily Reward Claimed',
    CASE WHEN v_welcome_paid AND COALESCE(v_welcome, 0) > 0
      THEN '₦' || TO_CHAR(v_daily, 'FM999,999,990') || ' daily reward plus your one-time ₦' || TO_CHAR(v_welcome, 'FM999,999,990') || ' welcome bonus has been added to your balance.'
      ELSE '₦' || TO_CHAR(v_daily, 'FM999,999,990') || ' has been added to your balance.'
    END,
    'success'
  );

  RETURN jsonb_build_object(
    'success', true,
    'daily_earning', v_daily,
    'welcome_bonus', CASE WHEN v_welcome_paid THEN COALESCE(v_welcome, 0) ELSE 0 END,
    'welcome_paid', v_welcome_paid,
    'amount_credited', v_pay,
    'plan_level', v_prof.plan_level,
    'new_balance', v_new_bal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 26. GRANT EXECUTE ON ALL PUBLIC RPC FUNCTIONS TO AUTHENTICATED AND ANON
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_streak_reward() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_user_task_reward(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.credit_user_balance(NUMERIC, TEXT, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sync_user_balance(NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_referrals() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.lookup_referral_code(TEXT) TO authenticated, anon;
-- GRANT has no IF EXISTS form, so this signature must match the definition above
-- exactly. When the PIN argument was added the function became 5-arg; leaving
-- the old 4-arg signature here aborts the whole script with error 42883.
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
-- Both of these act on the caller's own row only and refuse an anonymous call,
-- so they are granted to signed-in members and nobody else.
GRANT EXECUTE ON FUNCTION public.set_withdrawal_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_security_settings() TO authenticated;
-- The plan funding loop is only ever driven by a signed-in user.
GRANT EXECUTE ON FUNCTION public.submit_plan_payment(INT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_plan_daily_reward() TO authenticated;

-- Admin RPCs are granted to signed-in users only. Each one now also asserts
-- public.is_admin() internally, so removing "anon" here is belt-and-braces.
GRANT EXECUTE ON FUNCTION public.admin_confirm_deposit(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_freeze(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_kyc_status(UUID, TEXT) TO authenticated;


-- ==============================================================================
-- VERIFY — run these after the script finishes. Nothing below writes; these are
-- read-only checks that the script landed. Copy them out and run them one at a
-- time, or select them and hit Run on the selection.
-- ==============================================================================
--
-- 1. The plan list: expect 10 rows with the corrected welcomeBonus values
--    (1,500 / 5,000 / 10,000 / 17,000 / 25,000 / 35,000 / 70,000 / 90,000 /
--    150,000 / 350,000) and their matching referralBonus values.
--
--   SELECT jsonb_array_elements(value) AS plan
--   FROM public.app_settings WHERE key = 'investment_plans';
--
-- 2. The treasury account: expect one row, Opay / 8110858553 / Nwoba Victor
--    Chidera.
--
--   SELECT value FROM public.app_settings WHERE key = 'platform_settings';
--
-- 3. Every object should exist. Expect 14 rows.
--
--   SELECT proname FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace
--     AND proname IN ('is_admin','admin_confirm_deposit','submit_plan_payment',
--       'claim_plan_daily_reward','claim_user_task_reward','request_withdrawal',
--       'admin_reject_withdrawal','admin_adjust_balance','admin_toggle_user_freeze',
--       'admin_update_kyc_status','lookup_referral_code','set_withdrawal_pin',
--       'get_my_security_settings','protect_profile_fields')
--   ORDER BY proname;
--
-- 4. The PIN and 2FA columns should exist on profiles. Expect 2 rows.
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'profiles'
--     AND column_name IN ('withdrawal_pin_hash','two_factor_enabled');
--
-- 5. WHO IS AN ADMIN. This should list only accounts you promoted by hand.
--    Run it after the script, and again any time you want to be sure. If a name
--    appears here that you did not put there, that is a problem worth knowing
--    about immediately. Set the flag yourself with the statement underneath.
--
--   SELECT id, email, created_at FROM public.profiles
--   WHERE is_admin = TRUE ORDER BY created_at;
--
--   UPDATE public.profiles SET is_admin = TRUE  WHERE email = 'you@example.com';
--   UPDATE public.profiles SET is_admin = FALSE WHERE email = 'someone@example.com';
--
--    Run as the owner (the SQL editor), those two statements now take effect.
--    Through the API they are refused: is_admin is pinned for every API caller,
--    including an existing admin, so nothing the app can reach can hand out
--    administrator rights. Only you, in SQL, can.
-- ==============================================================================
