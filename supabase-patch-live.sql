-- ==============================================================================
-- Crest Wealth — LIVE PATCH (paste this into the Supabase SQL editor)
-- Project: https://supabase.com/dashboard/project/panxaqueawnqrebikwvb/sql
-- ==============================================================================
--
-- This is a one-time top-up for the database that is already running. It fixes
-- the four things that are out of date on the live project:
--
--   1. The published plan list still carries the OLD welcome bonuses
--      (₦250 … ₦50,000) and has no referralBonus field at all, so the site was
--      still displaying — and the referral logic was still deriving from — the
--      wrong numbers.
--   2. There is no 'platform_settings' row, so the account investors pay into
--      existed only as a hardcoded fallback in the page code.
--   3. admin_confirm_deposit() did not check the deposit amount against the
--      published plan price.
--   4. The deposits INSERT policy let a user attach a plan_level of their own
--      choosing to a deposit row.
--
-- Safe to run more than once: every statement is idempotent. Nothing here
-- drops a table or deletes data.
--
-- If you would rather rebuild from scratch, run supabase-schema.sql instead —
-- it contains all of this plus everything else.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1. INVESTMENT PLANS: the single source of truth
-- ------------------------------------------------------------------------------
-- One list drives the Investments page, the dashboard plan picker, what a plan
-- costs, the daily claim payout, the one-off welcome bonus and the referral
-- commission.
--
-- DO UPDATE (not DO NOTHING) on purpose: the seeded values below are the
-- corrected 1,500 / 5,000 / 10,000 / 17,000 / 25,000 / 35,000 / 70,000 /
-- 90,000 / 150,000 / 350,000 welcome bonuses and the level-matched referral
-- commissions, and they need to overwrite what is live now.
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


-- ------------------------------------------------------------------------------
-- 2. PLATFORM SETTINGS: the account investors pay into
-- ------------------------------------------------------------------------------
-- DO NOTHING on purpose: this is a value you are expected to change from
-- Admin -> Treasury -> Platform Settings, so re-running this script must never
-- revert it. The row does not exist yet, so this run creates it.
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


-- ------------------------------------------------------------------------------
-- 3. admin_confirm_deposit(): reject a deposit that does not match the plan price
-- ------------------------------------------------------------------------------
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


-- ------------------------------------------------------------------------------
-- 4. Deposits INSERT policy: a user may not tag their own plan level
-- ------------------------------------------------------------------------------
-- A user may file a deposit of their own, but only as Pending. Allowing them to
-- write status='Confirmed' would let them pre-confirm their own deposit row.
-- plan_level must stay NULL here: a row carrying a plan_level is a plan
-- purchase, and those are created only by submit_plan_payment(), which resolves
-- the price server-side. A user-set plan_level would let them tag a token
-- amount as Level 10 and have admin_confirm_deposit activate and bonus it.
DROP POLICY IF EXISTS "Deposits insert policy" ON public.deposits;
CREATE POLICY "Deposits insert policy" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'Pending' AND plan_level IS NULL);


-- ==============================================================================
-- Verification — run this after the above to confirm the patch landed.
-- ==============================================================================
-- Expect 10 rows with the corrected welcomeBonus / referralBonus values, and
-- one platform_settings row showing Opay / 8110858553 / Nwoba Victor Chidera.
--
--   SELECT jsonb_array_elements(value) AS plan
--   FROM public.app_settings WHERE key = 'investment_plans';
--
--   SELECT value FROM public.app_settings WHERE key = 'platform_settings';
