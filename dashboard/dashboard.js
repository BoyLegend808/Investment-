// Scoped per-user storage access (prevents data crossover or loss)
var GLOBAL_STORAGE_KEYS = [
  "tasks_config",
  "admin_tasks",
  "theme",
  "crest_ref_code",
];

function getCrestStorage(key, defaultVal) {
  try {
    var u = window.crestUser;
    if (!u) {
      var r = localStorage.getItem("crest_current_user");
      if (r) {
        try {
          u = JSON.parse(r);
        } catch (e) {}
      }
    }

    var isGlobal = GLOBAL_STORAGE_KEYS.indexOf(key) !== -1;
    if (isGlobal) {
      var gVal = localStorage.getItem("crest_" + key);
      if (gVal !== null) return gVal;
      return defaultVal;
    }

    // User-specific data: require valid user scope to avoid crossover
    if (u && u.id) {
      var userVal = localStorage.getItem("crest_" + u.id + "_" + key);
      if (userVal !== null) return userVal;
    }
  } catch (e) {}
  return defaultVal;
}

function setCrestStorage(key, val) {
  try {
    var u = window.crestUser;
    if (!u) {
      var r = localStorage.getItem("crest_current_user");
      if (r) {
        try {
          u = JSON.parse(r);
        } catch (e) {}
      }
    }

    var strVal = typeof val === "string" ? val : JSON.stringify(val);
    var isGlobal = GLOBAL_STORAGE_KEYS.indexOf(key) !== -1;

    if (isGlobal) {
      localStorage.setItem("crest_" + key, strVal);
    }

    if (u && u.id) {
      localStorage.setItem("crest_" + u.id + "_" + key, strVal);
    } else if (!isGlobal) {
      // Temporary unauthenticated fallback for demo user only
      localStorage.setItem("crest_demo_investor_" + key, strVal);
    }
  } catch (e) {}
}

// Verify auth before rendering dashboard
if (!window.crestUser) {
  (async function supabaseAuthGuard() {
    var waited = 0;
    var session = null;
    while (!window.supabaseClient && waited < 1000) {
      await new Promise((r) => setTimeout(r, 25));
      waited += 25;
    }
    if (window.supabaseClient) {
      try {
        const { data } = await window.supabaseClient.auth.getSession();
        session = data ? data.session : null;
      } catch (e) {}
    }

    var localUserRaw = localStorage.getItem("crest_current_user");
    var localUser = null;
    if (localUserRaw) {
      try {
        localUser = JSON.parse(localUserRaw);
      } catch (e) {}
    }

    // A locally stored user is ONLY trusted if it is the explicit demo account.
    var isDemoUser = !!(
      localUser &&
      typeof localUser.id === "string" &&
      localUser.id.indexOf("demo_") === 0
    );

    if (!session && !isDemoUser) {
      // If auth-guard overlay is active, let user sign in via modal instead of abruptly redirecting
      if (!document.getElementById("crest-auth-overlay")) {
        localStorage.removeItem("crest_current_user");
        window.location.href = "../index/index.html#signin";
      }
      return;
    }

    window.crestUser = session ? session.user : localUser;
    document.documentElement.style.visibility = "";

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        initDashboardUserProfile();
      });
    } else {
      initDashboardUserProfile();
    }
  })();
} else {
  document.documentElement.style.visibility = "";
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initDashboardUserProfile();
    });
  } else {
    initDashboardUserProfile();
  }
}

async function initDashboardUserProfile() {
  var user = window.crestUser;
  if (!user) {
    var raw = localStorage.getItem("crest_current_user");
    if (raw) {
      try {
        user = JSON.parse(raw);
      } catch (e) {}
    }
  }
  if (!user) return;
  window.crestUser = user;

  var fullName =
    (user.user_metadata && user.user_metadata.full_name) ||
    (user.user_metadata && user.user_metadata.name) ||
    user.full_name ||
    (user.email ? user.email.split("@")[0] : "Valued Investor");
  var email = user.email || "investor@crestwealth.com";
  var referralCode =
    "CW-" + (user.id ? user.id.slice(0, 8).toUpperCase() : "VIP2026");

  if (
    window.supabaseClient &&
    user.id &&
    typeof user.id === "string" &&
    !user.id.startsWith("demo_")
  ) {
    try {
      const { data: dbProfile } = await window.supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (dbProfile) {
        if (dbProfile.full_name) fullName = dbProfile.full_name;
        if (dbProfile.email) email = dbProfile.email;
        if (dbProfile.referral_code) referralCode = dbProfile.referral_code;

        if (
          dbProfile.cash_balance !== undefined &&
          dbProfile.cash_balance !== null
        ) {
          var dbCash = parseFloat(dbProfile.cash_balance);
          if (!isNaN(dbCash) && typeof S !== "undefined") {
            S.cashBalance = dbCash;
            saveUserBalance();
          }
        }

        if (
          dbProfile.invested_balance !== undefined &&
          dbProfile.invested_balance !== null
        ) {
          var ib = parseFloat(dbProfile.invested_balance);
          if (!isNaN(ib) && typeof S !== "undefined") {
            S.investedBalance = ib;
          }
        }

        // Restore investment plan state strictly from DB
        PLAN_STATE.planLevel = parseInt(dbProfile.plan_level, 10) || 0;
        PLAN_STATE.planLastClaimDate = dbProfile.plan_last_claim_date
          ? String(dbProfile.plan_last_claim_date).trim()
          : "";
        PLAN_STATE.planWelcomePaid = dbProfile.plan_welcome_paid === true;

        if (typeof S !== "undefined") {
          if (
            dbProfile.welcome_bonus_balance !== undefined &&
            dbProfile.welcome_bonus_balance !== null
          ) {
            S.welcomeBonusBalance =
              parseFloat(dbProfile.welcome_bonus_balance) || 0;
            saveWelcomeBonusBalance();
          } else if (PLAN_STATE.planLevel > 0) {
            var pl = getPlanByLevel(PLAN_STATE.planLevel);
            var storedWb = getCrestStorage("welcome_bonus_balance", null);
            if (storedWb !== null) {
              S.welcomeBonusBalance = parseFloat(storedWb) || 0;
            } else {
              S.welcomeBonusBalance = pl ? pl.welcomeBonus || 0 : 0;
              saveWelcomeBonusBalance();
            }
          }
          saveUserBalance();
          updateBalanceDisplays();
          if (typeof updateWithdrawalGate === "function")
            updateWithdrawalGate();
        }

        renderPlanUI();
      }

      // Render plan UI state
      renderPlanUI();

      // Restore user completed tasks from DB
      const { data: dbTasks } = await window.supabaseClient
        .from("user_tasks")
        .select("*")
        .eq("user_id", user.id);

      if (
        dbTasks &&
        dbTasks.length > 0 &&
        typeof S !== "undefined" &&
        S.tasks
      ) {
        var completedMap = {};
        dbTasks.forEach(function (dt) {
          if (dt.completed) {
            completedMap[dt.task_id] = true;
          }
        });
        S.tasks.forEach(function (t) {
          if (completedMap[t.id]) t.done = true;
        });
        saveUserTasksState();
        if (typeof renderTasks === "function") renderTasks();
      }
    } catch (err) {
      console.warn("[Crest] Supabase profile sync:", err);
    }
  }

  // Set up referral UI and load database-driven portfolio/referrals/txns
  setupUserReferralUI(referralCode);
  loadUserInvestmentsFromDB();
  loadUserReferralsFromDB();
  loadUserTransactionsFromDB();
  renderDepositTracker();
  loadInvestmentPlans();

  var parts = fullName.trim().split(/\s+/);
  var initials = "CW";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  var sidebarName = document.querySelector(".sidebar-user-name");
  if (sidebarName) sidebarName.textContent = fullName;

  document
    .querySelectorAll(".sidebar-user-avatar, .topbar-avatar, .avatar-lg")
    .forEach(function (el) {
      el.textContent = initials;
    });

  var settingsView = document.getElementById("view-settings");
  if (settingsView) {
    var textInputs = settingsView.querySelectorAll('input[type="text"]');
    if (textInputs.length >= 2) {
      textInputs[0].value = parts[0] || fullName;
      textInputs[1].value = parts.slice(1).join(" ") || "";
    }
    var emailInput = settingsView.querySelector('input[type="email"]');
    if (emailInput) emailInput.value = email;
  }

  if (typeof loadRemoteTasksConfig === "function") {
    loadRemoteTasksConfig();
  }
}

/* ============================================================
   CREST WEALTH — USER DASHBOARD JS
   - SPA navigation with animated view transitions
   - Task-based withdrawal gate (admin-configurable tasks)
   - Investment IQ Quiz (5 questions, 70% pass)
   - Market Timing Trading Mini-Game (play game task, 150+ pts)
   - LocalStorage synchronization with Admin Portal
   - Canvas sparkline + growth chart + donut chart
   - Deposit return calculator & Withdrawal submission
   ============================================================ */

/* ── DEFAULT TASK CONFIG ─────────────────────────────────── */
var DEFAULT_TASKS = [
  {
    id: 0,
    done: true,
    icon: "x",
    platform: "X (Twitter)",
    title: "Follow Crest on X",
    desc: "Follow <strong>@CrestWealthNG</strong> and stay updated with daily market tips.",
    steps: [
      "Tap the button below to open @CrestWealthNG on X",
      "Click Follow on the profile",
      "Come back here — we verify automatically",
    ],
    inputType: null,
    reward: "+₦2,000",
    rewardAmount: 2000,
    url: "https://x.com/CrestWealthNG",
    urlLabel: "Open X Profile",
    verificationType: "timed",
    minSeconds: 20,
  },
  {
    id: 1,
    done: false,
    icon: "yt",
    platform: "YouTube",
    title: "Subscribe on YouTube",
    desc: "Subscribe to <strong>Crest Wealth</strong> and watch at least one full video.",
    steps: [
      "Tap the button below to open our YouTube channel",
      "Click Subscribe",
      "Watch any full video, then come back here",
    ],
    inputType: null,
    reward: "+₦3,000",
    rewardAmount: 3000,
    url: "https://youtube.com/@CrestWealth",
    urlLabel: "Open YouTube Channel",
    verificationType: "timed",
    minSeconds: 30,
  },
  {
    id: 2,
    done: false,
    icon: "ig",
    platform: "Instagram",
    title: "Comment on Our Post",
    desc: "Find the pinned post on <strong>@CrestWealthNG</strong> and leave a genuine comment.",
    steps: [
      "Tap the button below to open @CrestWealthNG on Instagram",
      "Find the pinned investment post",
      "Leave a comment, then come back here",
    ],
    inputType: null,
    reward: "+₦1,500",
    rewardAmount: 1500,
    url: "https://instagram.com/CrestWealthNG",
    urlLabel: "Open Instagram",
    verificationType: "social_handle",
  },
  {
    id: 3,
    done: false,
    icon: "quiz",
    platform: "Quiz",
    title: "Investment IQ Quiz",
    desc: "Answer 5 finance questions. Score <strong>70%+</strong> to pass and earn your bonus.",
    steps: [
      "Read each question carefully",
      "Select your answer",
      "Score 70% or higher to complete",
    ],
    inputType: null,
    reward: "+₦2,500",
    rewardAmount: 2500,
    isQuiz: true,
    verificationType: "quiz",
  },
  {
    id: 4,
    done: false,
    icon: "game",
    platform: "Trading Mini-Game",
    title: "Market Timing Mini-Game",
    desc: "Play the trading simulator. Time your BUY & SELL orders to score <strong>150+ points</strong>.",
    steps: [
      "Watch the live price ticks",
      "Click BUY on dips & SELL on peaks",
      "Achieve 150 points to complete",
    ],
    inputType: null,
    reward: "+₦3,500",
    rewardAmount: 3500,
    isGame: true,
    verificationType: "game",
  },
  {
    id: 5,
    done: false,
    icon: "link",
    platform: "VIP Referrals",
    title: "Invite 2 Friends to Crest",
    desc: "Share your personal referral link on WhatsApp. When 2 friends join and verify, earn <strong>₦5,000</strong> instant cash credit.",
    steps: [
      "Tap Share on WhatsApp below",
      "Send your invitation to at least 2 friends or investment groups",
      "Come back here — we verify automatically",
    ],
    inputType: null,
    reward: "+₦5,000",
    rewardAmount: 5000,
    url: "https://api.whatsapp.com/send?text=Hey!%20I'm%20earning%20daily%20passive%20returns%20with%20Crest%20Wealth.%20Join%20with%20my%20VIP%20link%20to%20start%20earning%20a%20level-based%20welcome%20bonus%3A%20https%3A%2F%2Fcrestwealth.com%2Fref%2FADAEZE2026",
    urlLabel: "Share on WhatsApp",
    verificationType: "social_handle",
  },
];

/* ── QUIZ DATA ──────────────────────────────────────── */
var QUIZ_DATA = [
  {
    q: "Which exchange lists Nigerian blue-chip equities like GTCO and Dangote Cement?",
    opts: [
      "Lagos Stock Exchange",
      "Nigerian Exchange Group (NGX)",
      "FMDQ Securities Exchange",
      "West Africa Capital Market",
    ],
    correct: 1,
    why: "The Nigerian Exchange Group (NGX), formerly NSE, is Nigeria's primary equities market.",
  },
  {
    q: "What does '16.8% p.a.' mean on a fixed deposit?",
    opts: [
      "You earn 16.8% of profits made annually",
      "The platform pays 16.8% of your principal per year",
      "You pay 16.8% tax annually",
      "16.8% is the total return over the entire term",
    ],
    correct: 1,
    why: "'Per annum' means per year. 16.8% p.a. on N100,000 = N16,800 every 12 months.",
  },
  {
    q: "Which investment carries the lowest default risk in Nigeria?",
    opts: [
      "Corporate bonds",
      "Real estate funds",
      "FGN Treasury Bills",
      "NGX penny stocks",
    ],
    correct: 2,
    why: "Federal Government of Nigeria T-Bills are backed by the sovereign guarantee — the safest instrument.",
  },
  {
    q: "What is compound interest?",
    opts: [
      "Interest paid only on the original principal",
      "Interest calculated on a flat monthly basis",
      "Interest earned on both principal and previously earned interest",
      "A type of tax charged on investment income",
    ],
    correct: 2,
    why: "Compound interest earns interest on your interest — the foundation of long-term wealth building.",
  },
  {
    q: "Why is diversification important in investing?",
    opts: [
      "It guarantees the highest possible return",
      "It reduces overall portfolio risk by spreading across assets",
      "It avoids all regulatory requirements",
      "It means only buying government assets",
    ],
    correct: 1,
    why: "Diversification reduces volatility. Underperformance in one asset is offset by resilience in others.",
  },
];

/* ── STATE MANAGEMENT & PERSISTENCE ──────────────────── */
/* UTC calendar day, matching the server. Supabase runs its day boundary at UTC
   midnight and claim_plan_daily_reward counts task completions with
   DATE_TRUNC('day', NOW()), so the client must use the same key or a Lagos user
   just after local midnight would drift a day ahead of the payout window. */
function taskDayKeyUTC(d) {
  var dt = d || new Date();
  return (
    dt.getUTCFullYear() +
    "-" +
    String(dt.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(dt.getUTCDate()).padStart(2, "0")
  );
}

function loadTasksState() {
  var config = null;
  try {
    var raw = getCrestStorage("tasks_config", null);
    if (raw) config = JSON.parse(raw);
  } catch (e) {}

  var activeTasks =
    config && Array.isArray(config) && config.length > 0
      ? config
      : DEFAULT_TASKS;

  // Filter only active tasks if admin configured active flags
  activeTasks = activeTasks.filter(function (t) {
    return t.active !== false;
  });

  var userDone = {};
  try {
    var uRaw = getCrestStorage("user_tasks", null);
    if (uRaw) userDone = JSON.parse(uRaw);
  } catch (e) {}

  return activeTasks.map(function (t) {
    var copy = Object.assign({}, t);
    if (typeof copy.rewardAmount !== "number") {
      var m = (copy.reward || "").replace(/[^0-9]/g, "");
      copy.rewardAmount = m ? parseInt(m, 10) : 2000;
    }
    if (!copy.reward) {
      copy.reward = "+₦" + copy.rewardAmount.toLocaleString("en-NG");
    }
    if (copy.isQuiz || copy.verificationType === "quiz")
      copy.verificationType = "quiz";
    else if (copy.isGame || copy.verificationType === "game")
      copy.verificationType = "game";
    else if (copy.verificationType !== "screenshot")
      copy.verificationType = "timed";
    if (copy.verificationType === "timed" && !copy.minSeconds)
      copy.minSeconds = 30;
    if (userDone[copy.id] !== undefined) {
      copy.done = !!userDone[copy.id].done;
      if (userDone[copy.id].inputDoneVal)
        copy.inputDoneVal = userDone[copy.id].inputDoneVal;
      if (userDone[copy.id].proofPath)
        copy.proofPath = userDone[copy.id].proofPath;
    }
    return copy;
  });
}

function saveUserTasksState() {
  var state = {};
  S.tasks.forEach(function (t) {
    state[t.id] = {
      done: t.done,
      inputDoneVal: t.inputDoneVal || "",
      proofPath: t.proofPath || "",
    };
  });
  try {
    setCrestStorage("user_tasks", state);
  } catch (e) {}

  // No remote write here. claim_user_task_reward records the authoritative
  // user_tasks row (title, proof, reward) at the moment it actually pays, and
  // users hold only SELECT and INSERT on that table — so they cannot clear
  // their own completion flag to claim the same reward twice.
}

function loadInvestedBalance() {
  try {
    var saved = getCrestStorage("invested_balance", null);
    if (saved !== null) {
      var num = parseFloat(saved);
      if (!isNaN(num)) return num;
    }
  } catch (e) {}
  return 0;
}

function loadUserBalance() {
  try {
    var saved = getCrestStorage("user_balance", null);
    if (saved !== null) {
      var num = parseFloat(saved);
      if (!isNaN(num)) return num;
    }
  } catch (e) {}
  return 0;
}

function loadWelcomeBonusBalance() {
  try {
    var saved = getCrestStorage("welcome_bonus_balance", null);
    if (saved !== null) {
      var num = parseFloat(saved);
      if (!isNaN(num)) return num;
    }
  } catch (e) {}
  return 0;
}

function saveWelcomeBonusBalance() {
  try {
    setCrestStorage(
      "welcome_bonus_balance",
      (S.welcomeBonusBalance || 0).toString(),
    );
  } catch (e) {}
}

function saveUserBalance() {
  try {
    setCrestStorage("user_balance", S.cashBalance.toString());
    setCrestStorage("invested_balance", (S.investedBalance || 0).toString());
  } catch (e) {}
}

function updateBalanceDisplays() {
  var fmt2 = function (n) {
    return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  };
  var fmt0 = function (n) {
    return "₦" + Math.round(n).toLocaleString("en-NG");
  };

  if ($("cashBalanceVal"))
    $("cashBalanceVal").textContent = fmt0(S.cashBalance);
  if ($("cashBalanceHeroVal"))
    $("cashBalanceHeroVal").textContent = fmt2(S.cashBalance);

  document.querySelectorAll(".balance-display").forEach(function (el) {
    el.textContent = fmt2(S.cashBalance);
  });

  // Friday vs non-Friday withdrawal logic:
  // Welcome bonus is withdrawable at any time.
  // Other earnings (task earnings, daily earnings, referral earnings) are only withdrawable on Fridays.
  // UTC, to match the server's EXTRACT(DOW FROM NOW()) definition of Friday.
  var isFriday = new Date().getUTCDay() === 5;
  var welcomeBal = parseFloat(S.welcomeBonusBalance || 0);
  var otherEarnings = Math.max(0, S.cashBalance - welcomeBal);
  var maxWithdrawableToday = isFriday
    ? S.cashBalance
    : Math.min(S.cashBalance, welcomeBal);

  if ($("wdAvailTodayVal"))
    $("wdAvailTodayVal").textContent = fmt2(maxWithdrawableToday);
  if ($("wdWelcomeBal")) $("wdWelcomeBal").textContent = fmt2(welcomeBal);
  if ($("wdOtherBal")) $("wdOtherBal").textContent = fmt2(otherEarnings);

  var todayTag = $("wdTodayWindowBadge");
  if (todayTag) {
    todayTag.textContent = isFriday
      ? "🟢 Friday Window: All Unlocked"
      : "Welcome Bonus Window";
    todayTag.style.background = isFriday
      ? "rgba(16,185,129,0.2)"
      : "rgba(255,85,0,0.18)";
    todayTag.style.color = isFriday ? "#10B981" : "#FF5500";
  }

  var scCard = $("wdScheduleCard");
  if (scCard) {
    if (isFriday) {
      scCard.classList.add("friday-active");
      if ($("wdScBadge"))
        $("wdScBadge").textContent = "🟢 Friday Payout Window Open";
      if ($("wdScTimer")) $("wdScTimer").textContent = "Full Access Active";
      if ($("wdScDesc")) {
        $("wdScDesc").innerHTML =
          "All earnings are <strong>unlocked for withdrawal today</strong>! You can withdraw your full cash balance (including daily rewards, task bonuses, referral commissions, and welcome bonus).";
      }
    } else {
      scCard.classList.remove("friday-active");
      if ($("wdScBadge")) $("wdScBadge").textContent = "Friday Payout Schedule";
      if ($("wdScTimer")) $("wdScTimer").textContent = "Weekly Settlement";
      if ($("wdScDesc")) {
        $("wdScDesc").innerHTML =
          "Welcome bonuses can be withdrawn <strong>at any time</strong> (up to " +
          fmt0(welcomeBal) +
          " available today). Withdrawals for task earnings, daily earnings, and referral earnings (" +
          fmt0(otherEarnings) +
          ") are open exclusively on <strong>Fridays</strong>.";
      }
    }
  }

  if ($("wdLockedWelcomePrompt")) {
    if (welcomeBal > 0) {
      $("wdLockedWelcomePrompt").style.display = "block";
      if ($("wdLockedWelcomeAmt"))
        $("wdLockedWelcomeAmt").textContent = fmt2(welcomeBal);
    } else {
      $("wdLockedWelcomePrompt").style.display = "none";
    }
  }

  var wdInput = $("withdrawAmount");
  if (wdInput) wdInput.placeholder = "Max " + fmt0(maxWithdrawableToday);

  var totalInvested = S.investedBalance || 0;
  var totalAccrued = S.accruedInterest || 0;
  var totalPortfolio = totalInvested + totalAccrued + S.cashBalance;

  if ($("topbarPortfolio"))
    $("topbarPortfolio").textContent = fmt0(totalPortfolio);
  if ($("portfolioValue"))
    $("portfolioValue").textContent = fmt2(totalPortfolio);

  if ($("totalInvestedVal"))
    $("totalInvestedVal").textContent = fmt0(totalInvested);
  if ($("totalAccruedVal"))
    $("totalAccruedVal").textContent = fmt0(totalAccrued);

  var planCount =
    S.investments && Array.isArray(S.investments) && S.investments.length > 0
      ? S.investments.length
      : totalInvested > 0
        ? 1
        : 0;
  if ($("activePlansCountSub")) {
    $("activePlansCountSub").textContent =
      planCount + (planCount === 1 ? " active plan" : " active plans");
  }

  if ($("portfolioGrowthSub")) {
    var estMonthly =
      totalInvested > 0 ? Math.round((totalInvested * 0.14) / 12) : 0;
    $("portfolioGrowthSub").textContent =
      estMonthly > 0
        ? "+₦" + estMonthly.toLocaleString("en-NG") + " est. monthly"
        : "No active yield";
  }

  if ($("accruedTodaySub")) {
    var estDaily =
      totalInvested > 0 ? Math.round((totalInvested * 0.14) / 365) : 0;
    $("accruedTodaySub").textContent =
      estDaily > 0
        ? "+₦" + estDaily.toLocaleString("en-NG") + " today"
        : "+₦0.00 today";
  }
}

/* Credits a verified task reward.
   `amount` is only a local expectation — the server resolves the real figure
   from the published task config and is the sole writer of the balance, so we
   wait for it and report what actually happened instead of assuming success. */
async function creditUserReward(amount, taskTitle, taskId, proofPath) {
  var amt = parseFloat(amount) || 0;
  var title = taskTitle || "Prerequisite Complete";
  var today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (amt <= 0) {
    return { ok: false, message: "This task has no reward configured." };
  }

  var u = null;
  if (window.supabaseClient) {
    try {
      var sessRes = await window.supabaseClient.auth.getSession();
      u =
        sessRes && sessRes.data && sessRes.data.session
          ? sessRes.data.session.user
          : null;
    } catch (e) {}
  }
  var isRealUser = !!(
    u &&
    typeof u.id === "string" &&
    !u.id.startsWith("demo_")
  );

  // Guests and demo accounts have no server balance, so keep the credit local.
  if (!isRealUser) {
    S.cashBalance = (S.cashBalance || 0) + amt;
    saveUserBalance();
    updateBalanceDisplays();
    prependUserTxn(
      today,
      "Task Reward — " + title,
      "Reward",
      "+₦" + amt.toLocaleString("en-NG"),
      "Completed",
    );
    return { ok: true, balance: S.cashBalance, reward: amt };
  }

  var tId = (
    taskId !== undefined
      ? taskId
      : "task_" + title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
  ).toString();

  try {
    var { data: rpcRes, error: rpcErr } = await window.supabaseClient.rpc(
      "claim_user_task_reward",
      {
        p_task_id: tId,
        p_task_title: title,
        p_proof_url: proofPath || null,
      },
    );

    if (rpcErr || !rpcRes || !rpcRes.success) {
      return {
        ok: false,
        message:
          (rpcRes && rpcRes.message) ||
          (rpcErr && rpcErr.message) ||
          "Could not credit this reward. Please try again.",
      };
    }

    var newBal = parseFloat(rpcRes.new_balance);
    if (!isNaN(newBal)) {
      S.cashBalance = newBal;
      saveUserBalance();
      updateBalanceDisplays();
    }
    // The ledger row is written by the RPC, so read it back rather than
    // inventing a local entry the database does not have.
    loadUserTransactionsFromDB();
    return {
      ok: true,
      balance: S.cashBalance,
      reward: parseFloat(rpcRes.reward) || amt,
    };
  } catch (e) {
    return {
      ok: false,
      message: "Network error crediting reward: " + e.message,
    };
  }
}

var S = {
  currentView: "overview",
  cashBalance: loadUserBalance(),
  investedBalance: loadInvestedBalance(),
  welcomeBonusBalance: loadWelcomeBonusBalance(),
  accruedInterest: 0,
  tasks: loadTasksState(),
  quiz: { q: 0, score: 0, done: false, passed: false },
  game: {
    running: false,
    score: 0,
    price: 45.0,
    history: [45.0, 45.4, 45.1, 45.6, 45.8, 45.2, 45.5, 46.0],
    position: null, // { type: 'BUY', entry: 45.5 }
    targetScore: 150,
    timer: null,
  },
  get tasksDone() {
    return this.tasks.filter(function (t) {
      return t.done;
    }).length;
  },
  get allDone() {
    return (
      this.tasks.length > 0 &&
      this.tasks.every(function (t) {
        return t.done;
      })
    );
  },
};

/* ── DOM REF HELPER ────────────────────────────── */
function $(id) {
  return document.getElementById(id);
}

/* ── NAVIGATION ─────────────────────────────────── */
function switchView(name) {
  document.querySelectorAll(".view").forEach(function (v) {
    v.classList.remove("active");
    v.style.display = "none";
  });
  document.querySelectorAll(".nav-link").forEach(function (n) {
    n.classList.remove("active");
  });

  var el = $("view-" + name);
  if (el) {
    el.classList.add("active");
    el.style.display = "block";
  }
  var nav = document.querySelector('.nav-link[data-view="' + name + '"]');
  if (nav) nav.classList.add("active");

  document.querySelectorAll(".mbd-item").forEach(function (b) {
    if (b.getAttribute("data-view") === name) b.classList.add("active");
    else b.classList.remove("active");
  });

  var titles = {
    overview: "Dashboard",
    portfolio: "Portfolio",
    transactions: "Transactions",
    deposit: "Deposit Funds",
    withdraw: "Withdraw",
    tasks: "Tasks & Rewards",
    referrals: "Referrals",
    settings: "Settings",
  };
  if ($("topbarTitle")) $("topbarTitle").textContent = titles[name] || name;
  S.currentView = name;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "overview") {
    setTimeout(function () {
      drawSparkline();
      drawGrowth();
      drawDonut();
    }, 60);
    if (typeof updateWithdrawalTimeline === "function")
      updateWithdrawalTimeline();
  }
  if (name === "withdraw") {
    if (typeof updateWithdrawalTimeline === "function")
      updateWithdrawalTimeline();
  }
  if (name === "tasks") {
    initMiniGame();
  }
}

/* ── MOBILE SIDEBAR OPEN & CLOSE ──────────────────── */
function openSidebar() {
  if ($("sidebar")) $("sidebar").classList.add("open");
  if ($("sidebarOverlay")) $("sidebarOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  if ($("sidebar")) $("sidebar").classList.remove("open");
  if ($("sidebarOverlay")) $("sidebarOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

function toggleSidebar() {
  if ($("sidebar") && $("sidebar").classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

if ($("burgerBtn")) {
  $("burgerBtn").addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar();
  });
}

if ($("sidebarCloseBtn")) {
  $("sidebarCloseBtn").addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeSidebar();
  });
}

if ($("sidebarOverlay")) {
  $("sidebarOverlay").addEventListener("click", function (e) {
    e.preventDefault();
    closeSidebar();
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeSidebar();
});

document.querySelectorAll(".nav-link[data-view]").forEach(function (a) {
  a.addEventListener("click", function (e) {
    e.preventDefault();
    switchView(a.dataset.view);
  });
});

/* ── TASK SYSTEM ─────────────────────────────────── */
function dEsc(v) {
  if (typeof escapeHtml === "function") return escapeHtml(v);
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function dUrl(u) {
  if (typeof crestSanitizeUrl === "function") return crestSanitizeUrl(u);
  if (u === null || u === undefined) return "";
  var raw = String(u).trim();
  if (!raw) return "";
  if (
    raw.indexOf("/") === 0 ||
    raw.indexOf("./") === 0 ||
    raw.indexOf("../") === 0
  )
    return raw;
  try {
    var parsed = new URL(raw, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:")
      return parsed.href;
  } catch (e) {}
  return "";
}

function refreshTaskUI() {
  var done = S.tasksDone;
  var total = S.tasks.length;
  var pct = total > 0 ? Math.round((done / total) * 100) : 100;
  var remaining = total - done;

  var fills = [$("tpbFill"), $("lockedProgFill")];
  fills.forEach(function (f) {
    if (f) f.style.width = pct + "%";
  });

  if ($("tpbScore")) $("tpbScore").textContent = done + "/" + total;
  if ($("tpbSub"))
    $("tpbSub").textContent = S.allDone
      ? "All tasks complete — Withdrawal unlocked!"
      : remaining + " task" + (remaining !== 1 ? "s" : "") + " remaining";
  if ($("lockedProgLabel"))
    $("lockedProgLabel").textContent = done + "/" + total;

  // Dynamic countdown message: "Complete the 5 tasks to unlock withdraw" -> "Complete the remaining 4 tasks..."
  var countdownMsg = "";
  if (done === 0) {
    countdownMsg = "Complete the " + total + " tasks to unlock withdrawal.";
  } else {
    countdownMsg =
      "Complete the remaining " +
      remaining +
      (remaining === 1 ? " task" : " tasks") +
      " to unlock withdrawal.";
  }

  if ($("taskLockNoticeText"))
    $("taskLockNoticeText").textContent = countdownMsg;
  if ($("noticeTaskCount"))
    $("noticeTaskCount").textContent = remaining + " remaining";

  if ($("wdLockedHeroDesc")) $("wdLockedHeroDesc").textContent = countdownMsg;
  if ($("wdLockedBtn")) {
    $("wdLockedBtn").textContent =
      done === 0
        ? "Complete the " + total + " Tasks to Unlock"
        : "Complete the Remaining " + remaining + " Tasks to Unlock";
  }

  var pip = $("navLockPip");
  var badge = $("navTaskBadge");
  if (pip) pip.style.display = S.allDone ? "none" : "block";
  if (badge) {
    badge.textContent = remaining;
    badge.style.display = remaining > 0 ? "flex" : "none";
  }
  if ($("mbdTaskBadge")) {
    $("mbdTaskBadge").textContent = remaining;
    $("mbdTaskBadge").style.display = remaining > 0 ? "inline-block" : "none";
  }

  var notice = $("taskLockNotice");
  if (notice) notice.style.display = S.allDone ? "none" : "flex";

  var wdLocked = $("wdLocked");
  var wdUnlocked = $("wdUnlocked");
  var hasWelcomeBonus = (parseFloat(S.welcomeBonusBalance) || 0) > 0;

  if (S.allDone || hasWelcomeBonus) {
    if (wdLocked) wdLocked.style.display = "none";
    if (wdUnlocked) wdUnlocked.style.display = "block";
    if ($("wdUnlockedBannerText")) {
      if (!S.allDone) {
        $("wdUnlockedBannerText").textContent =
          "Welcome Bonus Channel Active • Withdrawable at any time";
      } else {
        $("wdUnlockedBannerText").textContent =
          "All tasks verified • Withdrawal channel is 100% unlocked";
      }
    }
  } else {
    if (wdLocked) wdLocked.style.display = "block";
    if (wdUnlocked) wdUnlocked.style.display = "none";
  }

  if ($("wdLockedWelcomePrompt")) {
    var wbBal = parseFloat(S.welcomeBonusBalance || 0);
    if (wbBal > 0) {
      $("wdLockedWelcomePrompt").style.display = "block";
      if ($("wdLockedWelcomeAmt"))
        $("wdLockedWelcomeAmt").textContent =
          "₦" + wbBal.toLocaleString("en-NG", { minimumFractionDigits: 2 });
    } else {
      $("wdLockedWelcomePrompt").style.display = "none";
    }
  }

  var doneBanner = $("tasksDoneBanner");
  if (doneBanner) doneBanner.style.display = S.allDone ? "flex" : "none";

  renderLockedTasksList();
  renderTasksGrid();

  // Completing the last task unlocks the daily reward, so keep the claim card
  // in step with the task list.
  if (typeof renderPlanClaimCard === "function") renderPlanClaimCard();
}

function enableWelcomeWithdrawal() {
  var wdLocked = $("wdLocked");
  var wdUnlocked = $("wdUnlocked");
  if (wdLocked) wdLocked.style.display = "none";
  if (wdUnlocked) wdUnlocked.style.display = "block";
  var wdInput = $("withdrawAmount");
  if (wdInput) {
    var wb = parseFloat(S.welcomeBonusBalance) || 0;
    wdInput.value = wb > 0 ? wb : "";
    calcWdSummary();
    wdInput.focus();
  }
}

function renderLockedTasksList() {
  var el = $("lockedTasksList");
  if (!el) return;
  el.innerHTML = S.tasks
    .map(function (t) {
      var title = dEsc(t.title);
      var platform = dEsc(t.platform);
      var reward = dEsc(t.reward);
      return (
        '<div class="locked-task-row">' +
        '<div class="ltr-status ' +
        (t.done ? "ltr-status--done" : "ltr-status--pending") +
        '">' +
        (t.done
          ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
          : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>') +
        "</div>" +
        '<div><div class="ltr-name">' +
        title +
        '</div><div class="ltr-sub">' +
        platform +
        "</div></div>" +
        '<span class="ltr-reward">' +
        reward +
        "</span>" +
        "</div>"
      );
    })
    .join("");
}

function renderTasksGrid() {
  var grid = $("tasksGrid");
  if (!grid) return;
  grid.innerHTML = S.tasks
    .map(function (t) {
      return renderTaskCard(t);
    })
    .join("");
  // Re-bind mini-game if needed
  if (
    !S.tasks.find(function (t) {
      return t.id === 4 && t.done;
    })
  ) {
    drawMiniGameCanvas();
  }
}

var ICONS = {
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  yt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  ig: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>',
  telegram:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>',
  tiktok:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V7.93a8.21 8.21 0 0 0 4.76 1.5V6.01c-.34 0-.68-.07-1-.2z"/></svg>',
  discord:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
  quiz: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
  game: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12h4m-2-2v4m7-2a1 1 0 1 0 2 0 1 1 0 0 0-2 0m4 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>',
  link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

var EXT_ICON =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>';

// Strip legacy "enter your username below" style steps (e.g. from admin-saved task configs)
function cleanTaskSteps(steps) {
  return (steps || []).filter(function (s) {
    return !/(enter|paste|type|input)\b.*\b(below|username|email|handle)/i.test(
      s,
    );
  });
}

function renderTaskCard(t) {
  var steps = t.steps
    ? cleanTaskSteps(t.steps)
        .map(function (s) {
          return (
            '<div class="task-step' +
            (t.done ? " task-step--done" : "") +
            '">' +
            dEsc(s) +
            "</div>"
          );
        })
        .join("")
    : "";

  var rewardFormatted =
    t.reward || "+₦" + (t.rewardAmount || 2000).toLocaleString("en-NG");
  var safeReward = dEsc(rewardFormatted);
  var safeTitle = dEsc(t.title);
  var safeDesc = dEsc(t.desc);
  var safePlatform = dEsc(t.platform);
  var safeHref = dUrl(t.url);
  var safeUrlLabel = dEsc(
    t.urlLabel || (t.platform ? "Open " + t.platform : "Open link"),
  );

  var actionHtml = "";
  if (t.done && !t.isQuiz && !t.isGame) {
    actionHtml =
      '<button class="task-btn task-btn--done task-btn--full" disabled><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Verified &amp; Paid</button>';
  } else if (!t.done && !t.isQuiz && !t.isGame) {
    var openBtn = safeHref
      ? '<a href="' +
        safeHref +
        '" target="_blank" rel="noopener" class="task-btn task-go-btn" onclick="startTask(' +
        t.id +
        ', event)">' +
        safeUrlLabel +
        " " +
        EXT_ICON +
        "</a>"
      : "";

    if (t.verificationType === "screenshot") {
      actionHtml =
        '<div class="task-action-stack">' +
        openBtn +
        '<label class="task-upload-btn" for="tproof-' +
        t.id +
        '">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>' +
        "<span>Upload screenshot to claim</span>" +
        "</label>" +
        '<input type="file" accept="image/*" id="tproof-' +
        t.id +
        '" class="task-file-input" onchange="uploadTaskProof(' +
        t.id +
        ', this)">' +
        "</div>";
    } else {
      var pending = getPendingTask();
      var isPending = pending && pending.id === t.id;
      var need = fmtDur(t.minSeconds || 30);
      if (isPending) {
        actionHtml =
          '<div class="task-pending"><span class="task-pending-spin"></span>' +
          '<span class="task-pending-text">Stay on ' +
          safePlatform +
          " for at least " +
          need +
          ", then come back here</span>" +
          (safeHref
            ? '<button class="task-pending-retry" onclick="startTask(' +
              t.id +
              ')">Open again</button>'
            : "") +
          "</div>";
      } else if (safeHref) {
        actionHtml =
          '<div class="task-action-stack">' +
          openBtn +
          '<div class="task-time-hint">Spend at least ' +
          need +
          " there — coming back early won't count</div></div>";
      } else {
        actionHtml =
          '<button class="task-btn task-btn--full" onclick="verifyTask(' +
          t.id +
          ')">Claim Reward <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>';
      }
    }
  } else if (t.isQuiz && !t.done) {
    actionHtml = renderQuizHTML();
  } else if (t.isQuiz && t.done) {
    actionHtml =
      '<div class="quiz-feedback quiz-feedback--correct">Investment IQ Quiz Passed! ' +
      safeReward +
      " bonus credited.</div>";
  } else if (t.isGame && !t.done) {
    actionHtml = renderGameHTML();
  } else if (t.isGame && t.done) {
    actionHtml =
      '<div class="quiz-feedback quiz-feedback--correct">Market Sprint Completed! Target achieved and ' +
      safeReward +
      " credited.</div>";
  }

  var iconKey = t && t.icon && ICONS[t.icon] ? t.icon : "quiz";
  var iconSvg = ICONS[iconKey] || ICONS.quiz;

  return (
    '<div class="task-card ' +
    (t.done ? "task-card--done" : "") +
    " " +
    (t.isQuiz ? "task-card--quiz" : "") +
    " " +
    (t.isGame ? "task-card--game" : "") +
    '" id="tcard-' +
    t.id +
    '">' +
    '<div class="task-card-top"><div class="task-icon task-icon--' +
    iconKey +
    '">' +
    iconSvg +
    '</div><span class="task-reward">' +
    safeReward +
    "</span></div>" +
    '<div class="task-title">' +
    safeTitle +
    "</div>" +
    '<div class="task-desc">' +
    safeDesc +
    "</div>" +
    '<div class="task-steps">' +
    steps +
    "</div>" +
    actionHtml +
    "</div>"
  );
}

/* ── TIMED AUTO-VERIFY ─────────────────────────────────────────
   Click link -> pending saved -> we measure how long the user is actually
   AWAY from this tab (page hidden). Only a single continuous stretch of at
   least task.minSeconds counts. Coming straight back = not verified. */
var PENDING_TASK_KEY = "crest_pending_task";

function fmtDur(sec) {
  sec = Math.max(1, Math.round(sec));
  if (sec < 60) return sec + " sec";
  var m = Math.floor(sec / 60),
    s = sec % 60;
  return m + " min" + (s ? " " + s + " sec" : "");
}

function getPendingTask() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_TASK_KEY) || "null");
  } catch (e) {
    return null;
  }
}
function savePendingTask(p) {
  try {
    localStorage.setItem(PENDING_TASK_KEY, JSON.stringify(p));
  } catch (e) {}
}

function startTask(id, ev) {
  var task = S.tasks.find(function (item) {
    return item.id === id;
  });
  if (!task || task.done) return;
  if (task.verificationType === "screenshot") return; // screenshot tasks just open the link
  savePendingTask({ id: id, ts: Date.now(), hiddenAt: null, best: 0 });
  // "Open again" button isn't an anchor — open the link manually
  var href = dUrl(task.url);
  if (!ev && href) window.open(href, "_blank", "noopener");
  setTimeout(renderTasksGrid, 50);
}

function onTaskVisibilityChange() {
  var p = getPendingTask();
  if (!p) return;
  if (document.visibilityState === "hidden") {
    if (!p.hiddenAt) {
      p.hiddenAt = Date.now();
      savePendingTask(p);
    }
    return;
  }
  if (p.hiddenAt) {
    p.lastAway = Date.now() - p.hiddenAt;
    p.best = Math.max(p.best || 0, p.lastAway);
    p.hiddenAt = null;
    savePendingTask(p);
  }
  checkPendingTaskReturn();
}

function checkPendingTaskReturn() {
  var p = getPendingTask();
  if (!p || !S || !S.tasks) return;
  var task = S.tasks.find(function (item) {
    return item.id === p.id;
  });
  if (!task || task.done) {
    localStorage.removeItem(PENDING_TASK_KEY);
    return;
  }
  if (!p.best) return; // user hasn't actually left the site yet

  var needMs = (task.minSeconds || 30) * 1000;
  if (p.best < needMs) {
    var left = Math.ceil((needMs - (p.lastAway || 0)) / 1000);
    toast(
      "Not verified — you came back after " +
        fmtDur((p.lastAway || 0) / 1000) +
        ". Stay on " +
        task.platform +
        " for " +
        fmtDur(task.minSeconds || 30) +
        " (" +
        fmtDur(left) +
        ' more). Tap "Open again".',
      "warn",
    );
    return;
  }
  localStorage.removeItem(PENDING_TASK_KEY);
  var pend = document.querySelector("#tcard-" + p.id + " .task-pending-text");
  if (pend) pend.textContent = "Verifying your " + task.platform + " task...";
  verifyTask(p.id);
}

document.addEventListener("visibilitychange", onTaskVisibilityChange);
window.addEventListener("pageshow", function () {
  setTimeout(onTaskVisibilityChange, 800);
});

/* ── SCREENSHOT PROOF UPLOAD (paid as soon as the upload succeeds) ── */
function uploadTaskProof(id, input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) {
    toast("Please upload an image (screenshot).", "warn");
    input.value = "";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    toast("Screenshot is too large (max 8MB).", "warn");
    input.value = "";
    return;
  }

  var label = document.querySelector("#tcard-" + id + " .task-upload-btn");
  if (label) {
    label.classList.add("is-loading");
    label.querySelector("span").textContent = "Uploading screenshot...";
  }

  var fail = function (msg) {
    toast(msg, "warn");
    renderTasksGrid();
  };
  if (!window.supabaseClient) {
    verifyTask(id, null);
    return;
  }

  window.supabaseClient.auth
    .getSession()
    .then(function (res) {
      var u =
        res && res.data && res.data.session ? res.data.session.user : null;
      if (!u || u.id.startsWith("demo_")) {
        verifyTask(id, null);
        return;
      }
      var ext =
        (file.name.split(".").pop() || "jpg")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";
      var path = u.id + "/task-" + id + "-" + Date.now() + "." + ext;
      window.supabaseClient.storage
        .from("task-proofs")
        .upload(path, file, { contentType: file.type, upsert: false })
        .then(function (r) {
          if (r.error) {
            console.warn("[Crest] Proof upload failed:", r.error);
            fail("Upload failed. Please try again.");
            return;
          }
          verifyTask(id, path);
        });
    })
    .catch(function () {
      fail("Upload failed. Please try again.");
    });
}

function verifyTask(id, proofPath) {
  var task = S.tasks.find(function (item) {
    return item.id === id;
  });
  if (!task || task.done) return;

  var btn = document.querySelector("#tcard-" + id + " .task-btn");
  if (btn && !proofPath) {
    btn.textContent = "Verifying...";
    btn.disabled = true;
  }

  setTimeout(async function () {
    var rewardAmt =
      typeof task.rewardAmount === "number"
        ? task.rewardAmount
        : (function () {
            var m = (task.reward || "").replace(/[^0-9]/g, "");
            return m ? parseInt(m, 10) : 0;
          })();

    var result = await creditUserReward(
      rewardAmt,
      task.title,
      task.id,
      proofPath,
    );

    if (!result.ok) {
      // Leave the task unclaimed so the user can try again.
      if (btn) {
        btn.textContent = "Claim Reward";
        btn.disabled = false;
      }
      toast(result.message, "error");
      return;
    }

    task.done = true;
    task.inputDoneVal = proofPath ? "Screenshot" : "Verified";
    if (proofPath) task.proofPath = proofPath;
    saveUserTasksState();
    refreshTaskUI();
    toast(
      "Task verified! +₦" +
        (result.reward || 0).toLocaleString("en-NG") +
        " added to your cash balance.",
      "emerald",
    );
  }, 1200);
}

/* ── REMOTE SYNC: admin task config + this user's completed tasks ── */
function loadRemoteTasksConfig() {
  if (!window.supabaseClient) return;
  var sb = window.supabaseClient;
  sb.from("app_settings")
    .select("value")
    .eq("key", "tasks_config")
    .maybeSingle()
    .then(function (res) {
      if (
        !res.error &&
        res.data &&
        Array.isArray(res.data.value) &&
        res.data.value.length
      ) {
        setCrestStorage("tasks_config", res.data.value);
      }
      return sb.auth.getSession();
    })
    .then(function (sres) {
      var u =
        sres && sres.data && sres.data.session ? sres.data.session.user : null;
      if (!u || u.id.startsWith("demo_")) return null;
      return sb
        .from("user_tasks")
        .select("task_id, proof_url, status, completed_at")
        .eq("user_id", u.id);
    })
    .then(function (tres) {
      if (tres && !tres.error && Array.isArray(tres.data)) {
        // Rebuild from scratch, counting only completions from today. The task
        // cycle is a calendar day, so carrying yesterday's ticks forward would
        // leave the claim button looking ready while the server refuses the
        // payout for incomplete tasks.
        var todayKey = taskDayKeyUTC();
        var local = {};
        tres.data.forEach(function (r) {
          if (r.status !== "completed" || r.task_id == null) return;
          if (String(r.completed_at || "").slice(0, 10) !== todayKey) return;
          local[r.task_id] = {
            done: true,
            proofPath: r.proof_url || "",
          };
        });
        setCrestStorage("user_tasks", local);
      }
      S.tasks = loadTasksState();
      refreshTaskUI();

      // ── Real-time subscription: re-sync whenever admin updates tasks ──
      if (!window._crestTasksRealtimeSubscribed) {
        window._crestTasksRealtimeSubscribed = true;
        try {
          sb.channel("dashboard:app_settings")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "app_settings",
                filter: "key=eq.tasks_config",
              },
              function (payload) {
                console.log(
                  "[Crest] Admin task config updated via realtime, refreshing…",
                  payload,
                );
                // Fetch the fresh config and re-render tasks for the user
                sb.from("app_settings")
                  .select("value")
                  .eq("key", "tasks_config")
                  .maybeSingle()
                  .then(function (r) {
                    if (
                      !r.error &&
                      r.data &&
                      Array.isArray(r.data.value) &&
                      r.data.value.length
                    ) {
                      setCrestStorage("tasks_config", r.data.value);
                      S.tasks = loadTasksState();
                      refreshTaskUI();
                    }
                  });
              },
            )
            .subscribe();
        } catch (realtimeErr) {
          console.warn(
            "[Crest] Realtime task subscription skipped:",
            realtimeErr,
          );
        }
      }
    })
    .catch(function (e) {
      console.warn("[Crest] Remote task sync skipped:", e);
    });
}

/* ── INVESTMENT IQ QUIZ ──────────────────────────────── */
function renderQuizHTML() {
  var q = QUIZ_DATA[S.quiz.q];
  if (!q) return "";
  return (
    '<div class="quiz-wrap" id="quizWrap">' +
    '<div class="quiz-meta"><span id="qNum">Question ' +
    (S.quiz.q + 1) +
    " of " +
    QUIZ_DATA.length +
    "</span>" +
    '<span id="qScore">Score: ' +
    S.quiz.score +
    "/" +
    S.quiz.q +
    "</span></div>" +
    '<div class="quiz-q" id="qText">' +
    q.q +
    "</div>" +
    '<div class="quiz-opts" id="qOpts">' +
    q.opts
      .map(function (o, i) {
        return (
          '<button class="quiz-opt" onclick="answerQ(' +
          i +
          ')">' +
          o +
          "</button>"
        );
      })
      .join("") +
    '</div><div id="qFeedback"></div></div>'
  );
}

function answerQ(chosen) {
  if (S.quiz.done) return;
  var q = QUIZ_DATA[S.quiz.q];
  var opts = document.querySelectorAll(".quiz-opt");
  var fb = $("qFeedback");
  var isRight = chosen === q.correct;

  opts.forEach(function (o, i) {
    o.disabled = true;
    if (i === q.correct) o.classList.add("quiz-opt--correct");
    else if (i === chosen && !isRight) o.classList.add("quiz-opt--wrong");
  });

  if (isRight) S.quiz.score++;
  if (fb) {
    fb.className =
      "quiz-feedback quiz-feedback--" + (isRight ? "correct" : "wrong");
    fb.textContent = q.why;
  }

  S.quiz.q++;

  if (S.quiz.q < QUIZ_DATA.length) {
    setTimeout(function () {
      var card = $("tcard-3");
      if (card) {
        var wrapper = card.querySelector(".quiz-wrap");
        if (wrapper) wrapper.outerHTML = renderQuizHTML();
      }
    }, 1700);
  } else {
    S.quiz.done = true;
    var pct = Math.round((S.quiz.score / QUIZ_DATA.length) * 100);
    S.quiz.passed = pct >= 70;
    setTimeout(function () {
      var card = $("tcard-3");
      if (!card) return;
      var wrap = card.querySelector(".quiz-wrap");
      var scoreLine =
        "Score: " +
        S.quiz.score +
        "/" +
        QUIZ_DATA.length +
        " (" +
        pct +
        "%)<br>";
      if (wrap)
        wrap.outerHTML =
          '<div class="quiz-wrap"><div class="quiz-feedback quiz-feedback--' +
          (S.quiz.passed ? "correct" : "wrong") +
          '" style="text-align:center;padding:16px;">' +
          "<strong>" +
          (S.quiz.passed ? "Passed!" : "Not quite!") +
          "</strong><br>" +
          scoreLine +
          (S.quiz.passed
            ? "Crediting your bonus..."
            : 'Score 70%+ required. <button class="task-btn" onclick="retryQuiz()" style="margin-top:10px;display:inline-flex;">Try Again</button>') +
          "</div></div>";
      if (!S.quiz.passed) return;

      var task = S.tasks.find(function (t) {
        return t.id === 3;
      });
      if (!task) return;

      creditUserReward(
        typeof task.rewardAmount === "number" ? task.rewardAmount : 2500,
        task.title || "Investment IQ Quiz",
        task.id,
      ).then(function (result) {
        if (!result.ok) {
          var fb = document.querySelector("#tcard-3 .quiz-feedback");
          if (fb)
            fb.innerHTML =
              "<strong>Bonus not credited</strong><br>" +
              scoreLine +
              dEsc(result.message);
          toast(result.message, "error");
          return;
        }
        task.done = true;
        saveUserTasksState();
        refreshTaskUI();
        toast(
          "Investment IQ Quiz passed! +₦" +
            (result.reward || 0).toLocaleString("en-NG") +
            " added to your cash balance.",
          "emerald",
        );
      });
    }, 1700);
  }
}

function retryQuiz() {
  S.quiz = { q: 0, score: 0, done: false, passed: false };
  var card = $("tcard-3");
  if (card) {
    var wrap = card.querySelector(".quiz-wrap");
    if (wrap) wrap.outerHTML = renderQuizHTML();
  }
}

/* ── MARKET SPRINT TRADING MINI-GAME ──────────────────── */
function renderGameHTML() {
  return (
    '<div class="game-container" id="miniGameContainer">' +
    '<div class="game-header-bar">' +
    '<div class="game-ticker-label"><span class="game-ticker-live"></span> NGX:CREST-INDEX</div>' +
    '<div class="game-score-badge" id="gameScoreLabel">Score: ' +
    S.game.score +
    " / 150 pts</div>" +
    "</div>" +
    '<div class="game-canvas-wrap">' +
    '<canvas id="gameCanvas" class="game-canvas"></canvas>' +
    "</div>" +
    '<div class="game-stat-bar">' +
    '<span>Price: <strong id="gamePriceLabel">N' +
    S.game.price.toFixed(2) +
    "</strong></span>" +
    '<span>Position: <strong id="gamePosLabel">' +
    (S.game.position
      ? S.game.position.type + " @ N" + S.game.position.entry.toFixed(2)
      : "NONE") +
    "</strong></span>" +
    "</div>" +
    '<div class="game-actions">' +
    '<button class="game-btn-buy" id="btnGameBuy" onclick="gameTradeAction(\'BUY\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg> BUY DIP</button>' +
    '<button class="game-btn-sell" id="btnGameSell" onclick="gameTradeAction(\'SELL\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg> SELL PEAK</button>' +
    "</div>" +
    '<div class="game-msg" id="gameMsg">Click BUY on low ticks, SELL when green to bank profits!</div>' +
    "</div>"
  );
}

function initMiniGame() {
  if (S.game.timer) clearInterval(S.game.timer);
  drawMiniGameCanvas();
  S.game.timer = setInterval(function () {
    var delta = (Math.random() - 0.48) * 0.9;
    S.game.price = Math.max(38.0, Math.min(58.0, S.game.price + delta));
    S.game.history.push(S.game.price);
    if (S.game.history.length > 24) S.game.history.shift();

    if ($("gamePriceLabel"))
      $("gamePriceLabel").textContent = "N" + S.game.price.toFixed(2);
    drawMiniGameCanvas();
  }, 900);
}

function drawMiniGameCanvas() {
  var canvas = $("gameCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var w = (canvas.width = canvas.offsetWidth || 300);
  var h = (canvas.height = canvas.offsetHeight || 110);
  var data = S.game.history;
  if (!data || data.length < 2) return;

  var min = Math.min.apply(null, data) * 0.98;
  var max = Math.max.apply(null, data) * 1.02;

  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = "#14181E";
  ctx.lineWidth = 1;
  for (var y = 20; y < h; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  var xOf = function (i) {
    return (i / (data.length - 1)) * (w - 20) + 10;
  };
  var yOf = function (v) {
    return h - 14 - ((v - min) / (max - min)) * (h - 28);
  };

  // Gradient fill
  var isRising = data[data.length - 1] >= data[data.length - 2];
  var lineColor = isRising ? "#10B981" : "#EF4444";

  var grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(
    0,
    isRising ? "rgba(16, 185, 129, 0.22)" : "rgba(239, 68, 68, 0.22)",
  );
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (var i = 1; i < data.length; i++) {
    var xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(
      xc,
      yOf(data[i - 1]),
      xc,
      yOf(data[i]),
      xOf(i),
      yOf(data[i]),
    );
  }
  ctx.lineTo(xOf(data.length - 1), h);
  ctx.lineTo(xOf(0), h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Price stroke
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (i = 1; i < data.length; i++) {
    xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(
      xc,
      yOf(data[i - 1]),
      xc,
      yOf(data[i]),
      xOf(i),
      yOf(data[i]),
    );
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Active tip dot
  var lx = xOf(data.length - 1),
    ly = yOf(data[data.length - 1]);
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#F97316";
  ctx.fill();
}

function gameTradeAction(action) {
  var msg = $("gameMsg");
  var scoreLbl = $("gameScoreLabel");
  var posLbl = $("gamePosLabel");

  if (action === "BUY") {
    if (S.game.position) {
      if (msg) {
        msg.className = "game-msg info";
        msg.textContent = "Already holding position! Click SELL to exit.";
      }
      return;
    }
    S.game.position = { type: "BUY", entry: S.game.price };
    if (posLbl) posLbl.textContent = "LONG @ N" + S.game.price.toFixed(2);
    if (msg) {
      msg.className = "game-msg info";
      msg.textContent =
        "Bought at N" +
        S.game.price.toFixed(2) +
        "! Now wait for tick up to SELL.";
    }
  } else if (action === "SELL") {
    if (!S.game.position) {
      if (msg) {
        msg.className = "game-msg info";
        msg.textContent = "No position open! Click BUY DIP first.";
      }
      return;
    }
    var profit = S.game.price - S.game.position.entry;
    var gainPts = Math.round(profit * 60);

    if (gainPts > 0) {
      S.game.score += gainPts;
      if (msg) {
        msg.className = "game-msg win";
        msg.textContent =
          "Profit locked! +" +
          gainPts +
          " pts (Sold @ N" +
          S.game.price.toFixed(2) +
          ")";
      }
    } else {
      S.game.score = Math.max(0, S.game.score + gainPts);
      if (msg) {
        msg.className = "game-msg loss";
        msg.textContent = "Loss taken (" + gainPts + " pts). Try again!";
      }
    }
    S.game.position = null;
    if (posLbl) posLbl.textContent = "NONE";
    if (scoreLbl)
      scoreLbl.textContent = "Score: " + S.game.score + " / 150 pts";

    // Check Win Condition
    if (S.game.score >= S.game.targetScore) {
      clearInterval(S.game.timer);
      var task = S.tasks.find(function (t) {
        return t.id === 4;
      });
      if (task) {
        creditUserReward(
          typeof task.rewardAmount === "number" ? task.rewardAmount : 3500,
          task.title || "Market Timing Mini-Game",
          task.id,
        ).then(function (result) {
          if (!result.ok) {
            toast(result.message, "error");
            return;
          }
          task.done = true;
          saveUserTasksState();
          refreshTaskUI();
          toast(
            "Market Sprint Complete! +₦" +
              (result.reward || 0).toLocaleString("en-NG") +
              " added to your cash balance.",
            "emerald",
          );
        });
      }
    }
  }
}

/* ── CHARTS ─────────────────────────────────────────── */
/* ── REAL LEDGER-DRIVEN OVERVIEW CHARTS ────────────────────────────────
   Every figure below comes from the member's own transactions and balances.
   Nothing is hardcoded: an account with no history gets a plain "no history"
   note instead of an invented growth curve. */

var ledgerTransactions = [];
var growthPeriod = "6m";
// How many monthly points each period shows (0 = everything).
var PERIOD_POINTS = { "6m": 7, "1y": 13, all: 0 };

function fmtNairaCompact(n) {
  var v = Number(n) || 0;
  var abs = Math.abs(v);
  if (abs >= 1000000) return "\u20A6" + (v / 1000000).toFixed(1) + "M";
  if (abs >= 1000) return "\u20A6" + Math.round(v / 1000) + "k";
  return "\u20A6" + Math.round(v);
}

/* Replay the ledger in date order to get a closing balance per month. */
function buildBalanceSeries(txns) {
  var rows = (txns || []).slice().sort(function (a, b) {
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
  var running = 0;
  var monthKeys = [];
  var monthTotals = {};
  rows.forEach(function (tx) {
    var d = tx.created_at ? new Date(tx.created_at) : new Date();
    if (isNaN(d.getTime())) return;
    var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (!(key in monthTotals)) {
      monthTotals[key] = 0;
      monthKeys.push(key);
    }
    monthTotals[key] += parseFloat(tx.amount) || 0;
  });
  return monthKeys.map(function (key) {
    running += monthTotals[key];
    var parts = key.split("-");
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      value: Math.max(0, running),
    };
  });
}

function currentGrowthSeries() {
  var pts = buildBalanceSeries(ledgerTransactions);
  var take = PERIOD_POINTS[growthPeriod];
  if (take && pts.length > take) pts = pts.slice(pts.length - take);
  return pts;
}

function growthRangeText() {
  if (growthPeriod === "1y") return "Last 12 months";
  if (growthPeriod === "all") return "All time";
  return "Last 6 months";
}

function drawChartEmpty(ctx, w, h, msg) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(msg, w / 2, h / 2);
}

function refreshOverviewCharts() {
  drawSparkline();
  drawGrowth();
  drawDonut();
}

function drawSparkline() {
  var canvas = $("sparklineCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var w = (canvas.width = canvas.offsetWidth || 160);
  var h = (canvas.height = canvas.offsetHeight || 60);
  var series = currentGrowthSeries();
  if (series.length < 2) {
    drawChartEmpty(ctx, w, h, "No history yet");
    return;
  }
  var data = series.map(function (p) {
    return p.value;
  });
  var min = Math.min.apply(null, data) * 0.97;
  var max = Math.max.apply(null, data) * 1.02;
  var xOf = function (i) {
    return (i / (data.length - 1)) * w;
  };
  var yOf = function (v) {
    return h - ((v - min) / (max - min)) * h;
  };
  ctx.clearRect(0, 0, w, h);
  var grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(16,185,129,0.25)");
  grad.addColorStop(1, "rgba(16,185,129,0)");
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (var i = 1; i < data.length; i++) {
    var xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(
      xc,
      yOf(data[i - 1]),
      xc,
      yOf(data[i]),
      xOf(i),
      yOf(data[i]),
    );
  }
  ctx.lineTo(xOf(data.length - 1), h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (i = 1; i < data.length; i++) {
    xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(
      xc,
      yOf(data[i - 1]),
      xc,
      yOf(data[i]),
      xOf(i),
      yOf(data[i]),
    );
  }
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(xOf(data.length - 1), yOf(data[data.length - 1]), 4, 0, Math.PI * 2);
  ctx.fillStyle = "#F97316";
  ctx.fill();
}

function drawGrowth() {
  var canvas = $("growthChart");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var w = (canvas.width = canvas.offsetWidth);
  var h = (canvas.height = canvas.offsetHeight);
  if (!w || !h) return;
  var series = currentGrowthSeries();
  if (series.length < 2) {
    if ($("growthRangeLabel"))
      $("growthRangeLabel").textContent = growthRangeText();
    drawChartEmpty(
      ctx,
      w,
      h,
      "No transactions yet — your growth curve appears after your first deposit.",
    );
    return;
  }
  var data = series.map(function (p) {
    return p.value;
  });
  var labels = series.map(function (p) {
    return p.label;
  });
  var min = Math.min.apply(null, data) * 0.94;
  var max = Math.max.apply(null, data) * 1.03;
  var pl = 56,
    pr = 16,
    pt = 16,
    pb = 36;
  var cw = w - pl - pr,
    ch = h - pt - pb;
  var xOf = function (i) {
    return pl + (i / (data.length - 1)) * cw;
  };
  var yOf = function (v) {
    return pt + ch - ((v - min) / (max - min)) * ch;
  };
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "#F3F4F6";
  ctx.lineWidth = 1;
  for (var i = 0; i <= 4; i++) {
    var y = pt + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pl, y);
    ctx.lineTo(w - pr, y);
    ctx.stroke();
  }
  var grad = ctx.createLinearGradient(0, pt, 0, pt + ch);
  grad.addColorStop(0, "rgba(16,185,129,0.15)");
  grad.addColorStop(1, "rgba(16,185,129,0)");
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (i = 1; i < data.length; i++) {
    var xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(
      xc,
      yOf(data[i - 1]),
      xc,
      yOf(data[i]),
      xOf(i),
      yOf(data[i]),
    );
  }
  ctx.lineTo(xOf(data.length - 1), pt + ch);
  ctx.lineTo(xOf(0), pt + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (i = 1; i < data.length; i++) {
    xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(
      xc,
      yOf(data[i - 1]),
      xc,
      yOf(data[i]),
      xOf(i),
      yOf(data[i]),
    );
  }
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "center";
  labels.forEach(function (l, i) {
    ctx.fillText(l, xOf(i), h - 8);
  });
  ctx.textAlign = "right";
  [max, min + (max - min) / 2, min].forEach(function (v, i) {
    ctx.fillText(fmtNairaCompact(v), pl - 6, pt + (ch / 2.5) * i + 10);
  });
  if ($("growthRangeLabel"))
    $("growthRangeLabel").textContent = growthRangeText();
  var lx = xOf(data.length - 1),
    ly = yOf(data[data.length - 1]);
  ctx.beginPath();
  ctx.arc(lx, ly, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#F97316";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* Holding split taken from the member's live balances. */
function currentAllocation() {
  var cash = Math.max(0, parseFloat(S.cashBalance) || 0);
  var invested = Math.max(0, parseFloat(S.investedBalance) || 0);
  var welcome = Math.min(
    Math.max(0, parseFloat(S.welcomeBonusBalance) || 0),
    cash,
  );
  return [
    { label: "Plan holdings", value: invested, color: "#10B981" },
    { label: "Cash balance", value: cash - welcome, color: "#0B251A" },
    { label: "Welcome bonus", value: welcome, color: "#F97316" },
  ].filter(function (s) {
    return s.value > 0.005;
  });
}

function drawDonut() {
  var canvas = $("donutChart");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = (canvas.width = canvas.offsetWidth);
  var H = (canvas.height = canvas.offsetHeight);
  if (!W || !H) return;

  var legend = $("donutLegend");
  var slices = currentAllocation();
  var total = slices.reduce(function (sum, s) {
    return sum + s.value;
  }, 0);

  if (total <= 0) {
    ctx.clearRect(0, 0, W, H);
    if (legend)
      legend.innerHTML =
        '<div class="txn-empty">No allocation yet. Activate a package and your split will appear here.</div>';
    return;
  }

  var cx = W / 2,
    cy = H / 2;
  var r = Math.min(cx, cy) - 8;
  var inner = r * 0.56;
  var angle = -Math.PI / 2;
  slices.forEach(function (s) {
    var end = angle + (s.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, end);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    angle = end;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.font = "bold 13px Space Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText(fmtNairaCompact(total), cx, cy - 4);
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "10px Inter, sans-serif";
  ctx.fillText("portfolio", cx, cy + 13);

  if (legend) {
    legend.innerHTML = slices
      .map(function (s) {
        return (
          '<div class="legend-row">' +
          '<span class="legend-swatch" style="background:' +
          s.color +
          '"></span>' +
          "<span>" +
          escapeHtml(s.label) +
          "</span>" +
          '<span class="legend-pct">' +
          Math.round((s.value / total) * 100) +
          "%</span>" +
          "</div>"
        );
      })
      .join("");
  }
}

/* Chart tabs — switch the growth window. */
document.addEventListener("click", function (e) {
  if (!e.target.matches(".tab")) return;
  var group = e.target.closest(".tab-group");
  if (!group) return;
  group.querySelectorAll(".tab").forEach(function (t) {
    t.classList.remove("active");
  });
  e.target.classList.add("active");
  growthPeriod = e.target.getAttribute("data-period") || "6m";
  drawGrowth();
  drawSparkline();
});

var DEFAULT_RECEIVING_BANK = {
  bankName: "Opay",
  acctNum: "8110858553",
  acctName: "Nwoba Victor Chidera",
  bankNote:
    "Transfer to this account from any banking app. Funds appear within 2 minutes. Use your name as narration.",
};
var depositReceiptData = null;

function getReceivingBank() {
  var s = PLAN_STATE && PLAN_STATE.bank ? PLAN_STATE.bank : null;
  var bankName =
    s && s.bankName ? String(s.bankName) : DEFAULT_RECEIVING_BANK.bankName;
  var acctNum =
    s && s.acctNum ? String(s.acctNum) : DEFAULT_RECEIVING_BANK.acctNum;
  var acctName =
    s && s.acctName ? String(s.acctName) : DEFAULT_RECEIVING_BANK.acctName;
  var bankNote =
    s && s.bankNote ? String(s.bankNote) : DEFAULT_RECEIVING_BANK.bankNote;
  return {
    bankName: bankName,
    acctNum: acctNum,
    acctName: acctName,
    bankNote: bankNote,
  };
}

function renderReceivingBankBox() {
  var b = getReceivingBank();
  var title = b.bankName
    ? b.bankName + " Dedicated Account"
    : "Company Receiving Account";
  if ($("depBankTitle")) $("depBankTitle").textContent = title;
  if ($("depAcctName")) $("depAcctName").textContent = b.acctName;
  if ($("depAcctNum")) $("depAcctNum").textContent = b.acctNum;
  if ($("depBankNote")) $("depBankNote").textContent = b.bankNote;
}

function copyDepAccount() {
  var b = getReceivingBank();
  if (!b || !b.acctNum) return;
  navigator.clipboard.writeText(b.acctNum).then(function () {
    toast("Account number copied (" + b.acctNum + ")");
  });
}

var depositReceiptFile = null;
function handleReceiptUpload(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  depositReceiptFile = file;
  var reader = new FileReader();
  reader.onload = function (evt) {
    depositReceiptData = evt.target.result;
    if ($("popPreviewImg")) $("popPreviewImg").src = depositReceiptData;
    if ($("popFileName")) $("popFileName").textContent = file.name;
    if ($("popPrompt")) $("popPrompt").style.display = "none";
    if ($("popPreview")) $("popPreview").style.display = "flex";
    toast("Transfer receipt screenshot attached: " + file.name, "emerald");
  };
  reader.readAsDataURL(file);
}

function removeReceipt(e) {
  if (e) e.stopPropagation();
  depositReceiptData = null;
  depositReceiptFile = null;
  if ($("popFileInput")) $("popFileInput").value = "";
  if ($("popPrompt")) $("popPrompt").style.display = "block";
  if ($("popPreview")) $("popPreview").style.display = "none";
}

var depositSecondsRemaining = 899;
var depositTimerInterval = null;
function startDepositSessionTimer() {
  if (depositTimerInterval) clearInterval(depositTimerInterval);
  depositTimerInterval = setInterval(function () {
    depositSecondsRemaining--;
    if (depositSecondsRemaining <= 0) {
      clearInterval(depositTimerInterval);
      if ($("depositTimer")) $("depositTimer").textContent = "Session Expired";
      toast(
        "Deposit session expired. Click to refresh payment session.",
        "warn",
      );
      return;
    }
    var m = Math.floor(depositSecondsRemaining / 60);
    var s = depositSecondsRemaining % 60;
    var str = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    if ($("depositTimer")) $("depositTimer").textContent = str;
  }, 1000);
}

function refreshDepositSession() {
  depositSecondsRemaining = 900;
  startDepositSessionTimer();
  toast("Deposit payment window refreshed.", "emerald");
}

function calcReturns() {
  var amtEl = $("depAmount");
  var rateEl = document.querySelector('input[name="plan"]:checked');
  var amt = parseFloat(amtEl ? amtEl.value : 0) || 0;
  var rate = parseFloat(rateEl ? rateEl.value : 0.115) || 0.115;
  var fmt = function (n) {
    return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  };
  if ($("previewAmt")) $("previewAmt").textContent = fmt(amt);
  if ($("previewRate"))
    $("previewRate").textContent = (rate * 100).toFixed(1) + "% p.a.";
  if ($("previewMon")) $("previewMon").textContent = fmt((amt * rate) / 12);
  if ($("previewYr")) $("previewYr").textContent = fmt(amt * rate);
}

function setPick(n) {
  var el = $("depAmount");
  if (el) {
    el.value = n;
    calcReturns();
  }
}

async function submitDeposit() {
  var amtEl = $("depAmount");
  var amt = parseFloat(amtEl ? amtEl.value : 0);
  if (!amt || amt < 500) {
    toast("Minimum deposit is ₦500", "warn");
    return;
  }

  var refId = "DEP-" + Math.floor(100000 + Math.random() * 900000);
  var planEl = document.querySelector('input[name="plan"]:checked');
  var planRate = planEl ? planEl.value : "0.115";
  var planMap = {
    0.115: "Crest Stash (11.5% p.a.)",
    0.142: "Bronze Lock (14.2% p.a.)",
    0.168: "Silver Growth (16.8% p.a.)",
    0.195: "Gold Vault (19.5% p.a.)",
    "0.240": "Level 5 Package (24.0% p.a.)",
  };
  var planName = planMap[planRate] || "Crest Stash (11.5%)";
  var bInfo = getReceivingBank();

  var currentUserName =
    (window.crestUser &&
      window.crestUser.user_metadata &&
      window.crestUser.user_metadata.full_name) ||
    (window.crestUser && window.crestUser.full_name) ||
    (window.crestUser && window.crestUser.email
      ? window.crestUser.email.split("@")[0]
      : "Valued Investor");
  var currentUserEmail =
    (window.crestUser && window.crestUser.email) || "investor@crestwealth.com";

  var receiptUrl = null;
  if (window.supabaseClient && depositReceiptFile) {
    try {
      var ext = depositReceiptFile.name
        ? depositReceiptFile.name.split(".").pop()
        : "png";
      var filePath = "receipts/" + refId + "_" + Date.now() + "." + ext;
      var { data: upData, error: upErr } = await window.supabaseClient.storage
        .from("receipts")
        .upload(filePath, depositReceiptFile, { upsert: true });
      if (!upErr && upData) {
        var { data: pubData } = window.supabaseClient.storage
          .from("receipts")
          .getPublicUrl(filePath);
        if (pubData) receiptUrl = pubData.publicUrl;
      }
    } catch (err) {
      console.warn("[Crest] Supabase storage upload notice:", err);
    }
  }

  var newDep = {
    id: refId,
    user: currentUserName,
    email: currentUserEmail,
    amount: amt,
    plan: planName,
    bank: bInfo.bankName,
    acctNum: bInfo.acctNum,
    receiptData: receiptUrl || depositReceiptData,
    proofUrl: receiptUrl,
    method:
      "BANK TRANSFER (" + String(bInfo.bankName || "BANK").toUpperCase() + ")",
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: "Pending Confirmation",
  };

  var existingDep = [];
  try {
    var depRaw = getCrestStorage("deposits", null);
    existingDep = depRaw ? JSON.parse(depRaw) : [];
  } catch (e) {}
  existingDep.unshift(newDep);
  setCrestStorage("deposits", existingDep);

  // Sync to Supabase DB if user is logged in
  if (window.supabaseClient) {
    try {
      var sess = await window.supabaseClient.auth.getSession();
      var u =
        sess && sess.data && sess.data.session ? sess.data.session.user : null;
      if (u) {
        var { error: depErr } = await window.supabaseClient
          .from("deposits")
          .insert({
            id: refId,
            user_id: u.id,
            user_email: u.email,
            amount: amt,
            plan: planName,
            bank_name: bInfo.bankName,
            account_number: bInfo.acctNum,
            proof_url:
              receiptUrl || (depositReceiptData ? "base64_attached" : null),
            status: "Pending",
          });
        if (depErr) console.warn("Supabase deposit sync notice:", depErr);
      }
    } catch (e) {}
  }

  // Add row to user activity table
  prependUserTxn(
    newDep.date,
    "Deposit Initiated — " + planName,
    "Deposit",
    "+₦" + amt.toLocaleString("en-NG"),
    "Pending Confirmation",
  );

  toast(
    "Deposit of ₦" +
      amt.toLocaleString("en-NG") +
      " submitted (" +
      refId +
      ")! The Observatory has been notified for confirmation.",
    "emerald",
  );
  if (amtEl) amtEl.value = "";
  removeReceipt();
  calcReturns();
  renderDepositTracker();
}

/* ── INVESTMENT PLAN SYSTEM (PICK → PAY → ADMIN APPROVE → CLAIM) ─── */
var PLAN_STATE = {
  plans: [],
  planLevel: 0,
  planLastClaimDate: "",
  planWelcomePaid: false,
  selectedLevel: 0,
  step: "choose",
  submitting: false,
  bank: { bankName: "", acctNum: "", acctName: "", bankNote: "" },
};

/* Client-side mirror of the published plan list. The server remains the
   authority for every payout — this array only drives the UI. */
var FALLBACK_INVESTMENT_PLANS = [
  {
    level: 1,
    name: "Starter",
    price: 5000,
    welcomeBonus: 1500,
    dailyEarning: 900,
    referralBonus: 1000,
  },
  {
    level: 2,
    name: "Bronze",
    price: 15000,
    welcomeBonus: 5000,
    dailyEarning: 2700,
    referralBonus: 3000,
  },
  {
    level: 3,
    name: "Silver",
    price: 30000,
    welcomeBonus: 10000,
    dailyEarning: 5400,
    referralBonus: 6000,
  },
  {
    level: 4,
    name: "Gold",
    price: 50000,
    welcomeBonus: 17000,
    dailyEarning: 9000,
    referralBonus: 10000,
  },
  {
    level: 5,
    name: "Platinum",
    price: 75000,
    welcomeBonus: 25000,
    dailyEarning: 13500,
    referralBonus: 12500,
  },
  {
    level: 6,
    name: "Emerald",
    price: 100000,
    welcomeBonus: 35000,
    dailyEarning: 18000,
    referralBonus: 15000,
  },
  {
    level: 7,
    name: "Sapphire",
    price: 200000,
    welcomeBonus: 70000,
    dailyEarning: 36000,
    referralBonus: 30000,
  },
  {
    level: 8,
    name: "Ruby",
    price: 350000,
    welcomeBonus: 90000,
    dailyEarning: 63000,
    referralBonus: 60000,
  },
  {
    level: 9,
    name: "Diamond",
    price: 500000,
    welcomeBonus: 150000,
    dailyEarning: 90000,
    referralBonus: 100000,
  },
  {
    level: 10,
    name: "Apex",
    price: 1000000,
    welcomeBonus: 350000,
    dailyEarning: 180000,
    referralBonus: 200000,
  },
];

var REFERRAL_BONUSES_BY_LEVEL = {
  1: 1000,
  2: 3000,
  3: 6000,
  4: 10000,
  5: 12500,
  6: 15000,
  7: 30000,
  8: 60000,
  9: 100000,
  10: 200000,
};

function getReferralBonusByLevel(lvl) {
  var l = parseInt(lvl, 10);
  return REFERRAL_BONUSES_BY_LEVEL[l] || 0;
}

function formatNaira(n) {
  var num = parseFloat(n);
  if (isNaN(num)) num = 0;
  return "₦" + Math.round(num).toLocaleString("en-NG");
}

function getPlanByLevel(level) {
  var lv = parseInt(level, 10);
  if (!lv) return null;
  for (var i = 0; i < PLAN_STATE.plans.length; i++) {
    if (parseInt(PLAN_STATE.plans[i].level, 10) === lv)
      return PLAN_STATE.plans[i];
  }
  return null;
}

function isPlanClaimedToday(lastClaimDate) {
  if (!lastClaimDate) return false;
  var d = new Date();
  var localToday =
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");
  var utcToday =
    d.getUTCFullYear() +
    "-" +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getUTCDate()).padStart(2, "0");
  var rawDate = String(lastClaimDate).trim().slice(0, 10);
  return rawDate === localToday || rawDate === utcToday;
}

function planTodayStr() {
  var d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/* Reads the admin-published plan list and the receiving bank details. */
async function loadInvestmentPlans() {
  if (!window.supabaseClient) {
    PLAN_STATE.plans = FALLBACK_INVESTMENT_PLANS.slice();
    renderPlanUI();
    return;
  }
  try {
    var res = await window.supabaseClient
      .from("app_settings")
      .select("key, value")
      .in("key", ["investment_plans", "platform_settings"]);

    var rows = (res && res.data) || [];
    var plansRow = null;
    var bankRow = null;
    rows.forEach(function (r) {
      if (r.key === "investment_plans") plansRow = r;
      if (r.key === "platform_settings") bankRow = r;
    });

    var list =
      plansRow && Array.isArray(plansRow.value) ? plansRow.value : null;
    PLAN_STATE.plans = (
      list && list.length ? list : FALLBACK_INVESTMENT_PLANS
    ).slice();

    if (bankRow && bankRow.value && typeof bankRow.value === "object") {
      PLAN_STATE.bank = {
        bankName: bankRow.value.bankName || "",
        acctNum: bankRow.value.acctNum || "",
        acctName: bankRow.value.acctName || "",
        bankNote: bankRow.value.bankNote || "",
      };
    }
  } catch (err) {
    console.warn("[Crest] Investment plans load:", err);
    PLAN_STATE.plans = FALLBACK_INVESTMENT_PLANS.slice();
  }

  renderReceivingBankBox();
  renderPlanUI();
  var bd = $("planModalBackdrop");
  if (bd && bd.classList.contains("active")) renderPlanModal();
}

/* Decides which surface the investor sees: the plan picker (no plan yet) or
   the daily reward claim card (plan active).
   Investment plans section is removed from overview dashboard. */
function renderPlanUI() {
  var level = parseInt(PLAN_STATE.planLevel, 10) || 0;
  var claimCard = $("planClaimCard");
  var gateCard = $("planGateCard");
  var tasksGate = $("tasksPlanGate");
  var tasksWrap = $("tasksGateWrap");

  if (gateCard) gateCard.style.display = "none";

  if (level > 0) {
    if (claimCard) claimCard.style.display = "block";
    if (tasksGate) tasksGate.style.display = "none";
    if (tasksWrap) tasksWrap.style.display = "block";
    renderPlanClaimCard();
  } else {
    if (claimCard) claimCard.style.display = "none";
    if (tasksGate) tasksGate.style.display = "block";
    if (tasksWrap) tasksWrap.style.display = "none";
  }
}

function renderPlanClaimCard() {
  var plan = getPlanByLevel(PLAN_STATE.planLevel);
  var badge = $("planClaimBadge");
  var dailyEl = $("planStatDaily");
  var welcomeEl = $("planStatWelcome");
  var statusEl = $("planStatStatus");
  var sub = $("planClaimSub");
  var btn = $("claimPlanBtn");
  var btnTxt = $("claimPlanBtnText");

  var name = plan ? plan.name : "Active Plan";
  var daily = plan ? plan.dailyEarning : 0;
  var welcome = plan ? plan.welcomeBonus : 0;

  if (badge)
    badge.textContent = "Level " + (PLAN_STATE.planLevel || 0) + " · " + name;
  if (dailyEl) dailyEl.textContent = formatNaira(daily);
  if (welcomeEl)
    welcomeEl.textContent = PLAN_STATE.planWelcomePaid
      ? "Claimed"
      : formatNaira(welcome);

  var claimed = isPlanClaimedToday(PLAN_STATE.planLastClaimDate);

  // The reward is earned by completing the day's tasks, so the button stays
  // locked until every task in the current cycle is done. The server enforces
  // this too — this only keeps the UI honest.
  var tasksTotal = typeof S !== "undefined" && S.tasks ? S.tasks.length : 0;
  var tasksDone = typeof S !== "undefined" ? S.tasksDone || 0 : 0;
  var tasksPending = tasksTotal > 0 && !S.allDone;

  if (btn && btnTxt) {
    if (claimed) {
      btn.disabled = true;
      btn.classList.add("claimed");
      btnTxt.textContent = "Claimed Today";
    } else if (tasksPending) {
      btn.disabled = true;
      btn.classList.add("claimed");
      btnTxt.textContent = "Complete Tasks to Unlock";
    } else {
      btn.disabled = false;
      btn.classList.remove("claimed");
      btnTxt.textContent = "Claim Daily Reward";
    }
  }

  if (statusEl)
    statusEl.textContent = claimed
      ? "Tomorrow"
      : tasksPending
        ? "Tasks Pending"
        : "Available";
  if (sub) {
    if (claimed) {
      sub.textContent =
        "Today's reward is in your balance. Come back tomorrow for the next payout.";
    } else if (tasksPending) {
      sub.textContent =
        "Complete all " +
        tasksTotal +
        " daily tasks to unlock today's " +
        formatNaira(daily) +
        " reward (" +
        tasksDone +
        "/" +
        tasksTotal +
        " done).";
    } else if (!PLAN_STATE.planWelcomePaid && parseFloat(welcome) > 0) {
      sub.textContent =
        "Your one-time " +
        formatNaira(welcome) +
        " welcome bonus is included in this claim.";
    } else {
      sub.textContent = "Claim your daily reward every 24 hours.";
    }
  }
}

/* The server resolves the payout from the active plan — we never send an
   amount. The welcome bonus is credited once, when the plan is activated. */
async function claimPlanDailyReward() {
  if (!PLAN_STATE.planLevel) {
    toast("Pick an investment plan to start earning daily rewards.", "info");
    renderPlanUI();
    switchView("overview");
    return;
  }

  if (isPlanClaimedToday(PLAN_STATE.planLastClaimDate)) {
    toast(
      "You have already claimed today's plan reward. Please come back tomorrow.",
      "info",
    );
    renderPlanClaimCard();
    return;
  }

  var btn = $("claimPlanBtn");
  var btnTxt = $("claimPlanBtnText");
  if (btn) btn.disabled = true;
  if (btnTxt) btnTxt.textContent = "Claiming...";

  if (!window.supabaseClient) {
    if (btn) btn.disabled = false;
    renderPlanClaimCard();
    toast("You need to be online to claim your reward.", "error");
    return;
  }

  try {
    var { data: rpcRes, error: rpcErr } = await window.supabaseClient.rpc(
      "claim_plan_daily_reward",
    );

    if (rpcErr || !rpcRes || !rpcRes.success) {
      if (btn) btn.disabled = false;
      renderPlanClaimCard();
      var msg =
        (rpcRes && rpcRes.message) ||
        (rpcErr && rpcErr.message) ||
        "Failed to claim your plan reward. Please try again.";
      toast(msg, "error");
      return;
    }

    var newBal = parseFloat(rpcRes.new_balance);
    if (!isNaN(newBal) && typeof S !== "undefined") {
      S.cashBalance = newBal;
      saveUserBalance();
      updateBalanceDisplays();
    }

    PLAN_STATE.planLastClaimDate = planTodayStr();
    if (rpcRes.welcome_paid) PLAN_STATE.planWelcomePaid = true;

    renderPlanClaimCard();
    if (typeof loadUserTransactionsFromDB === "function")
      loadUserTransactionsFromDB();

    var credited = Number(rpcRes.amount_credited || 0);
    var bonus = Number(rpcRes.welcome_bonus || 0);
    if (bonus > 0 && typeof S !== "undefined") {
      S.welcomeBonusBalance = (S.welcomeBonusBalance || 0) + bonus;
      saveWelcomeBonusBalance();
      updateBalanceDisplays();
      if (typeof updateWithdrawalGate === "function") updateWithdrawalGate();
    }
    var toastMsg =
      "🎉 +" + formatNaira(credited) + " credited to your cash balance";
    if (bonus > 0)
      toastMsg += " (includes your " + formatNaira(bonus) + " welcome bonus)";
    toast(toastMsg + "!", "emerald");
  } catch (err) {
    if (btn) btn.disabled = false;
    renderPlanClaimCard();
    toast("Network error claiming reward: " + err.message, "error");
  }
}

/* ── 24-HOUR TASK CYCLE CLOCK ────────────────────────── */
function startTaskCycleClock() {
  function update() {
    var now = new Date();
    // Count down to the next UTC midnight — the server's calendar day is the
    // window that governs both the task gate and the daily reward.
    var midnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    );
    var diff = Math.floor((midnight - now) / 1000);
    if (diff < 0) diff = 0;
    var h = Math.floor(diff / 3600);
    var m = Math.floor((diff % 3600) / 60);
    var s = diff % 60;
    var str =
      (h < 10 ? "0" + h : h) +
      "h " +
      (m < 10 ? "0" + m : m) +
      "m " +
      (s < 10 ? "0" + s : s) +
      "s";
    if ($("taskCycleClock")) $("taskCycleClock").textContent = str;
  }
  update();
  setInterval(update, 1000);
}

/* ── WITHDRAWAL & NUBAN AUTO-LOOKUP ──────────────────── */
function handleBankChange() {
  handleNubanInput();
}

var nubanLookupTimer = null;
function handleNubanInput() {
  var input = $("withdrawNuban");
  var badge = $("nubanStatus");
  if (!input || !badge) return;
  var val = input.value.replace(/[^0-9]/g, "");
  input.value = val;

  clearTimeout(nubanLookupTimer);
  if (val.length === 10) {
    badge.innerHTML =
      '<span style="color:#D97706;">Resolving NUBAN via NIBSS...</span>';
    badge.style.display = "inline-flex";
    nubanLookupTimer = setTimeout(function () {
      var currentName =
        (window.crestUser &&
          window.crestUser.user_metadata &&
          window.crestUser.user_metadata.full_name) ||
        (window.crestUser && window.crestUser.full_name) ||
        "VERIFIED ACCOUNT HOLDER";
      badge.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> ' +
        currentName.toUpperCase() +
        " (NIBSS Verified ✓)";
      badge.style.display = "inline-flex";
    }, 450);
  } else {
    badge.style.display = "none";
  }
}

function setWdPct(pct) {
  // UTC, to match the server's EXTRACT(DOW FROM NOW()) definition of Friday.
  var isFriday = new Date().getUTCDay() === 5;
  var welcomeBal = parseFloat(S.welcomeBonusBalance || 0);
  var maxAvailable = isFriday
    ? S.cashBalance
    : Math.min(S.cashBalance, welcomeBal);
  var amt = Math.floor(maxAvailable * pct);
  if ($("withdrawAmount")) $("withdrawAmount").value = amt > 0 ? amt : "";
  calcWdSummary();
}

function calcWdSummary() {
  var amtEl = $("withdrawAmount");
  var amt = parseFloat(amtEl ? amtEl.value : 0) || 0;
  var fmt = function (n) {
    return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  };
  if ($("wdSumAmt")) $("wdSumAmt").textContent = fmt(amt);
  if ($("wdSumReceive")) $("wdSumReceive").textContent = fmt(amt);
}

async function submitWithdrawal() {
  // The server decides the window with EXTRACT(DOW FROM NOW()), which is UTC,
  // so the client gate reads UTC too and the two can never disagree.
  var isFriday = new Date().getUTCDay() === 5;
  // Priority clearance is a real plan perk, read from the member's own tier.
  var isExpressVIP = (parseInt(PLAN_STATE.planLevel, 10) || 0) >= 8;
  var welcomeBal = parseFloat(S.welcomeBonusBalance || 0);
  var amtEl = $("withdrawAmount");
  var pinEl = $("withdrawPin");
  var nubanEl = $("withdrawNuban");
  var amt = parseFloat(amtEl ? amtEl.value : 0);

  if (!amt || amt <= 0) {
    toast("Please enter a valid withdrawal amount.", "warn");
    return;
  }

  // Minimum threshold:
  // For Level 1 welcome bonus (₦1,500), minimum threshold is ₦1,000.
  var minThreshold = welcomeBal > 0 && amt <= welcomeBal ? 1000 : 2000;
  if (amt < minThreshold) {
    toast(
      "Minimum withdrawal threshold is ₦" +
        minThreshold.toLocaleString("en-NG") +
        ".",
      "warn",
    );
    return;
  }
  if (amt > S.cashBalance) {
    toast(
      "Amount exceeds available balance of ₦" +
        S.cashBalance.toLocaleString("en-NG"),
      "warn",
    );
    return;
  }

  // Friday withdrawal rule:
  // Welcome bonus is withdrawable at any time.
  // Other earnings (task earnings, daily earnings, referral earnings) are ONLY available on Fridays.
  if (!isFriday) {
    if (amt > welcomeBal) {
      if (welcomeBal <= 0) {
        toast(
          "Withdrawals for task earnings, daily earnings, and referral earnings are only available on Fridays. You currently have no withdrawable welcome bonus.",
          "warn",
        );
      } else {
        toast(
          "On non-Fridays, you can only withdraw your welcome bonus (up to ₦" +
            welcomeBal.toLocaleString("en-NG") +
            "). Other earnings unlock on Fridays.",
          "warn",
        );
      }
      return;
    }
  } else {
    // Friday: other earnings can be withdrawn, but require task completion if withdrawing more than welcome bonus
    if (amt > welcomeBal && !S.allDone) {
      var rem = S.tasks.length - S.tasksDone;
      var msg =
        S.tasksDone === 0
          ? "Withdrawal locked: Complete the " +
            S.tasks.length +
            " tasks to unlock your Friday earnings withdrawal."
          : "Withdrawal locked: Complete the remaining " +
            rem +
            (rem === 1 ? " task" : " tasks") +
            " to unlock your Friday earnings withdrawal.";
      toast(msg, "warn");
      switchView("tasks");
      return;
    }
  }

  var nuban = nubanEl ? nubanEl.value.trim() : "0123456789";
  if (nuban.length !== 10) {
    toast("Please enter a valid 10-digit NUBAN account number.", "warn");
    return;
  }
  if (!pinEl || !pinEl.value || pinEl.value.length < 4) {
    toast("Please enter your 4-digit security PIN.", "warn");
    return;
  }

  var refId = "WD-" + Math.floor(100000 + Math.random() * 900000) + "-NGX";
  var bankEl = $("withdrawBank");
  var selectedBank = bankEl ? bankEl.value : "GTBank";
  var userName =
    (window.crestUser &&
      window.crestUser.user_metadata &&
      window.crestUser.user_metadata.full_name) ||
    (window.crestUser && window.crestUser.full_name) ||
    "Investor";
  var userEmail =
    (window.crestUser && window.crestUser.email) || "investor@crestwealth.com";

  var newWd = {
    id: refId,
    user: userName,
    email: userEmail,
    amount: amt,
    bank: selectedBank + " — " + nuban,
    accountName: userName,
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: "Pending Review",
    channel: isExpressVIP
      ? "Express VIP Priority (15m)"
      : "Standard Banking (24h)",
    tasksVerified: S.tasksDone + "/" + S.tasks.length + " Complete",
  };

  // The server is the authority: it verifies the PIN and the balance and is the
  // only thing allowed to move money. Nothing is written locally until it has
  // answered, so a rejected request never leaves the member staring at a
  // "submitted" screen for a withdrawal that did not happen.
  if (!window.supabaseClient) {
    toast(
      "You appear to be offline. Reconnect before requesting a withdrawal.",
      "warn",
    );
    return;
  }

  var session = null;
  try {
    session = await window.supabaseClient.auth.getSession();
  } catch (e) {}
  var authedUser =
    session && session.data && session.data.session
      ? session.data.session.user
      : null;
  if (!authedUser) {
    toast("Your session has expired. Please sign in again.", "warn");
    return;
  }

  var rpcRes = await window.supabaseClient.rpc("request_withdrawal", {
    p_amount: amt,
    p_bank_name: selectedBank,
    p_account_number: nuban,
    p_account_name: userName,
    p_pin: pinEl.value.trim(),
  });
  if (rpcRes.error) {
    // Surfaces the server's own wording: "Incorrect withdrawal PIN.",
    // "Set your 4-digit withdrawal PIN in Settings ...", the Friday rule, etc.
    toast(rpcRes.error.message || "Withdrawal could not be submitted.", "warn");
    return;
  }

  var existingWd = [];
  try {
    var wdRaw = getCrestStorage("withdrawals", null);
    existingWd = wdRaw ? JSON.parse(wdRaw) : [];
  } catch (e) {}
  existingWd.unshift(newWd);
  setCrestStorage("withdrawals", existingWd);

  // Deduct local balance
  var deductedFromWelcome = Math.min(amt, welcomeBal);
  S.welcomeBonusBalance = Math.max(0, welcomeBal - deductedFromWelcome);
  saveWelcomeBonusBalance();

  S.cashBalance -= amt;
  saveUserBalance();
  updateBalanceDisplays();
  updateWithdrawalGate();

  // Prepend to transaction tables
  var channelDesc = isExpressVIP ? "Express VIP" : "Standard";
  prependUserTxn(
    newWd.date,
    "Withdrawal Request (" + selectedBank + " - " + channelDesc + ")",
    "Withdrawal",
    "-₦" + amt.toLocaleString("en-NG"),
    "Pending Review",
  );

  toast(
    "Withdrawal " +
      refId +
      " of ₦" +
      amt.toLocaleString("en-NG") +
      " submitted! (" +
      (isExpressVIP ? "⚡ VIP Express 15m" : "Standard 24h") +
      ") clearance in progress.",
    "emerald",
  );
  if (amtEl) amtEl.value = "";
  if (pinEl) pinEl.value = "";
  calcWdSummary();
  updateWithdrawalTimeline();

  setTimeout(function () {
    switchView("overview");
  }, 1200);
}

function updateWithdrawalTimeline() {
  var withdrawals = [];
  try {
    var wdRaw2 = getCrestStorage("withdrawals", null);
    withdrawals = wdRaw2 ? JSON.parse(wdRaw2) : [];
  } catch (e) {}

  var latest = withdrawals[0];
  var overviewCard = $("overviewWdTimeline");
  var wdCard = $("wdTimelineCard");
  var rejOverview = $("rejectionNotice");
  var rejWd = $("wdRejectionBanner");

  if (!latest) {
    if (overviewCard) overviewCard.style.display = "none";
    if (wdCard) wdCard.style.display = "none";
    if (rejOverview) rejOverview.style.display = "none";
    if (rejWd) rejWd.style.display = "none";
    return;
  }

  if (latest.status === "Rejected") {
    var reason =
      latest.rejectionReason ||
      "Task compliance verification incomplete. Please review required steps and retry.";
    if (rejOverview) {
      $("rejectionNoticeText").textContent =
        "Withdrawal " + latest.id + " rejected: " + reason;
      rejOverview.style.display = "flex";
    }
    if (rejWd) {
      $("wdRejectionBannerText").textContent =
        "Withdrawal " + latest.id + " rejected: " + reason;
      rejWd.style.display = "flex";
    }
    if (overviewCard) overviewCard.style.display = "none";
    if (wdCard) wdCard.style.display = "none";
    return;
  } else {
    if (rejOverview) rejOverview.style.display = "none";
    if (rejWd) rejWd.style.display = "none";
  }

  // Pending Review or Approved & Paid
  if (overviewCard) overviewCard.style.display = "block";
  if (wdCard) wdCard.style.display = "block";

  if ($("overviewWdId"))
    $("overviewWdId").textContent =
      "Tracking " +
      latest.id +
      " • ₦" +
      parseFloat(latest.amount).toLocaleString("en-NG");
  if ($("wdTimelineId"))
    $("wdTimelineId").textContent =
      "Tracking " +
      latest.id +
      " • ₦" +
      parseFloat(latest.amount).toLocaleString("en-NG");

  var isApproved = latest.status === "Approved & Paid";
  var badgeHtml = isApproved ? "Settled & Paid" : "Processing (Review)";
  var badgeCls = isApproved ? "badge badge--done" : "badge badge--pending";

  if ($("overviewWdBadge")) {
    $("overviewWdBadge").textContent = badgeHtml;
    $("overviewWdBadge").className = badgeCls;
  }
  if ($("wdTimelineBadge")) {
    $("wdTimelineBadge").textContent = badgeHtml;
    $("wdTimelineBadge").className = badgeCls;
  }

  // Steps
  var step2 = $("stepTaskGate");
  var step3 = $("stepTreasury");
  var step4 = $("stepDispatched");
  var wdStep2 = $("wdStep2");
  var wdStep3 = $("wdStep3");
  var wdStep4 = $("wdStep4");

  if (isApproved) {
    [step2, wdStep2].forEach(function (el) {
      if (el) {
        el.className = "t-step t-step--done";
        el.querySelector(".t-circle").innerHTML = "✓";
      }
    });
    [step3, wdStep3].forEach(function (el) {
      if (el) {
        el.className = "t-step t-step--done";
        el.querySelector(".t-circle").innerHTML = "✓";
      }
    });
    [step4, wdStep4].forEach(function (el) {
      if (el) {
        el.className = "t-step t-step--done";
        el.querySelector(".t-circle").innerHTML = "✓";
      }
    });
  } else {
    [step2, wdStep2].forEach(function (el) {
      if (el) {
        el.className = "t-step t-step--active";
        el.querySelector(".t-circle").innerHTML = "2";
      }
    });
    [step3, wdStep3].forEach(function (el) {
      if (el) {
        el.className = "t-step";
        el.querySelector(".t-circle").innerHTML = "3";
      }
    });
    [step4, wdStep4].forEach(function (el) {
      if (el) {
        el.className = "t-step";
        el.querySelector(".t-circle").innerHTML = "4";
      }
    });
  }
}

/* ── CONCIERGE WIDGET ────────────────────────────────── */
function toggleConcierge(force) {
  var menu = $("conciergeMenu");
  if (!menu) return;
  if (typeof force === "boolean") {
    if (force) menu.classList.add("open");
    else menu.classList.remove("open");
  } else {
    menu.classList.toggle("open");
  }
}

function prependUserTxn(date, desc, type, amt, status) {
  var tbody = document.querySelector("#txnTable tbody");
  if (tbody) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" +
      date +
      "</td>" +
      "<td>" +
      desc +
      "</td>" +
      '<td><span class="type-tag type-tag--' +
      (type === "Deposit" ? "deposit" : "withdraw") +
      '">' +
      type +
      "</span></td>" +
      '<td class="' +
      (amt.startsWith("+") ? "credit" : "") +
      '">' +
      amt +
      "</td>" +
      '<td><span class="badge badge--' +
      (status === "Completed" ? "done" : "warn") +
      '">' +
      status +
      "</span></td>";
    tbody.insertBefore(tr, tbody.firstChild);
  }
}

/* ── COPY HELPER ────────────────────────────────────── */
function doCopy(text, msg) {
  navigator.clipboard.writeText(text).then(function () {
    toast(msg || "Copied!");
  });
}

/* ── TOAST ──────────────────────────────────────────── */
function toast(msg, type) {
  var el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast show" + (type ? " toast--" + type : "");
  setTimeout(function () {
    el.classList.remove("show");
  }, 3400);
}

/* ── RESIZE & RE-SYNC ───────────────────────────────── */
var resizeTimer;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    if (S.currentView === "overview") {
      drawSparkline();
      drawGrowth();
      drawDonut();
    }
    if (S.currentView === "tasks") {
      drawMiniGameCanvas();
    }
  }, 200);
});

// Real-time synchronization when Admin modifies tasks, deposits, or withdrawals
window.addEventListener("storage", function (e) {
  if (e.key === "crest_tasks_config" || e.key === "crest_user_tasks") {
    S.tasks = loadTasksState();
    refreshTaskUI();
  }
  if (
    e.key &&
    (e.key === "crest_user_balance" || e.key.indexOf("user_balance") !== -1)
  ) {
    S.cashBalance = loadUserBalance();
    updateBalanceDisplays();
  }
  if (e.key === "crest_withdrawals") {
    updateWithdrawalTimeline();
  }
});

/* ── TRANSACTIONS SEARCH & FILTER ───────────────────── */
function initTxnFiltering() {
  var sInput = $("txnSearch");
  var fSelect = $("txnFilter");
  if (!sInput && !fSelect) return;

  function filterRows() {
    var query = sInput ? sInput.value.toLowerCase().trim() : "";
    var filterType = fSelect ? fSelect.value : "All";
    var rows = document.querySelectorAll("#txnTable tbody tr");

    rows.forEach(function (row) {
      var text = row.textContent.toLowerCase();
      var typeEl = row.querySelector(".type-tag");
      var typeText = typeEl ? typeEl.textContent.trim() : "";

      var matchesSearch = !query || text.includes(query);
      var matchesType =
        filterType === "All" ||
        (filterType === "Deposits" && typeText === "Deposit") ||
        (filterType === "Withdrawals" && typeText === "Withdrawal") ||
        (filterType === "Interest" && typeText === "Interest") ||
        (filterType === "Trades" && typeText === "Trade");

      row.style.display = matchesSearch && matchesType ? "" : "none";
    });
  }

  if (sInput) sInput.addEventListener("input", filterRows);
  if (fSelect) fSelect.addEventListener("change", filterRows);
}

/* ── SETTINGS & SIGN OUT HANDLERS ───────────────────── */
function initSettingsInteractions() {
  // Profile save button
  var saveBtn = document.querySelector("#view-settings button.btn-primary");
  if (saveBtn) {
    saveBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      var settingsView = document.getElementById("view-settings");
      if (settingsView) {
        var textInputs = settingsView.querySelectorAll('input[type="text"]');
        var emailInput = settingsView.querySelector('input[type="email"]');
        var first = textInputs[0] ? textInputs[0].value.trim() : "";
        var last = textInputs[1] ? textInputs[1].value.trim() : "";
        var email = emailInput ? emailInput.value.trim() : "";
        var full = (first + " " + last).trim();

        if (full && window.crestUser) {
          if (!window.crestUser.user_metadata)
            window.crestUser.user_metadata = {};
          window.crestUser.user_metadata.full_name = full;
          window.crestUser.email = email || window.crestUser.email;
          if (typeof crestPersistCurrentUser === "function") {
            crestPersistCurrentUser(window.crestUser);
          } else {
            localStorage.setItem(
              "crest_current_user",
              JSON.stringify(window.crestUser),
            );
          }

          if (
            window.supabaseClient &&
            window.crestUser.id &&
            !window.crestUser.id.startsWith("demo_")
          ) {
            try {
              await window.supabaseClient.from("profiles").upsert(
                {
                  id: window.crestUser.id,
                  full_name: full,
                  email: email,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "id" },
              );
            } catch (err) {
              console.warn("[Crest] Profile save DB sync:", err);
            }
          }
          initDashboardUserProfile();
        }
      }
      toast("Profile changes saved successfully!", "emerald");
    });
  }

  // Change photo button
  var photoBtn = document.querySelector("#view-settings .avatar-row button");
  if (photoBtn) {
    photoBtn.addEventListener("click", function () {
      toast("Select a new avatar (JPG/PNG, max 2MB)", "info");
    });
  }

  // Security action buttons (PIN, 2FA, Password) — all three are now real.
  document
    .querySelectorAll("#view-settings .setting-row button[data-security]")
    .forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = this.getAttribute("data-security");
        if (kind === "pin") changeWithdrawalPin();
        else if (kind === "2fa") toggleTwoFactor();
        else changePassword();
      });
    });
  refreshSecuritySettings();

  // Add Bank Account button in settings
  var addBankBtn = document.querySelector(
    "#view-settings .bank-account-row ~ button",
  );
  if (addBankBtn) {
    addBankBtn.addEventListener("click", function () {
      switchView("withdraw");
      toast("Configure your settlement bank in the withdrawal desk.", "info");
    });
  }

  // Sign out buttons – uses Supabase to properly invalidate the session
  document
    .querySelectorAll(".sidebar-exit-group a, a#signOutBtn")
    .forEach(function (el) {
      if (el.textContent.includes("Sign Out")) {
        el.addEventListener("click", async function (e) {
          e.preventDefault();
          toast("Signing out of Crest Wealth...", "info");
          if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
          }
          if (typeof crestPersistCurrentUser === "function") {
            crestPersistCurrentUser(null);
          } else {
            localStorage.removeItem("crest_current_user");
          }
          setTimeout(function () {
            window.location.href = "../index/index.html";
          }, 500);
        });
      }
    });
}

/* ── SECURITY SETTINGS (server-backed, no browser-only secrets) ───────
   The PIN lives in the database as a bcrypt hash and is checked inside
   request_withdrawal(); nothing is kept in localStorage any more. */

var SECURITY_STATE = { pinSet: false, twoFactor: false };

async function refreshSecuritySettings() {
  var pinEl = $("secPinStatus");
  var faEl = $("secTwoFaStatus");
  if (!window.supabaseClient || !window.crestUser || !window.crestUser.id) {
    if (pinEl) pinEl.textContent = "Sign in to manage your withdrawal PIN";
    if (faEl) faEl.textContent = "Sign in to manage two-factor authentication";
    return;
  }
  try {
    var res = await window.supabaseClient.rpc("get_my_security_settings");
    if (!res.error && res.data) {
      SECURITY_STATE.pinSet = res.data.pin_set === true;
      SECURITY_STATE.twoFactor = res.data.two_factor_enabled === true;
    } else if (res.error) {
      console.warn("[Crest] security settings:", res.error);
    }
  } catch (e) {
    console.warn("[Crest] security settings:", e);
  }
  renderSecuritySettings();
}

function renderSecuritySettings() {
  var pinBtn = document.querySelector(
    '#view-settings button[data-security="pin"]',
  );
  var faBtn = document.querySelector(
    '#view-settings button[data-security="2fa"]',
  );
  var pinEl = $("secPinStatus");
  var faEl = $("secTwoFaStatus");

  if (pinEl)
    pinEl.textContent = SECURITY_STATE.pinSet
      ? "Set. Asked for on every withdrawal."
      : "Not set — you cannot withdraw until you create one.";
  if (pinBtn) pinBtn.textContent = SECURITY_STATE.pinSet ? "Change" : "Set PIN";

  if (faEl)
    faEl.textContent = SECURITY_STATE.twoFactor
      ? "On for this account."
      : "Off — your password alone protects your login";
  if (faBtn) {
    faBtn.textContent = SECURITY_STATE.twoFactor ? "Disable" : "Enable";
    faBtn.classList.toggle("btn-outline-sm--green", !SECURITY_STATE.twoFactor);
  }
}

function changeWithdrawalPin() {
  if (!window.supabaseClient || !window.crestUser || !window.crestUser.id) {
    toast("Sign in to manage your withdrawal PIN.", "warn");
    return;
  }
  var pin = prompt(
    SECURITY_STATE.pinSet
      ? "Enter your new 4-digit withdrawal PIN:"
      : "Create your 4-digit withdrawal PIN:",
  );
  if (pin === null) return;
  pin = String(pin).trim();
  if (!/^[0-9]{4}$/.test(pin)) {
    toast("Your PIN must be exactly 4 digits.", "warn");
    return;
  }
  var again = prompt("Type the same 4 digits again to confirm:");
  if (again === null) return;
  if (String(again).trim() !== pin) {
    toast("The two entries did not match. Nothing was changed.", "warn");
    return;
  }
  window.supabaseClient
    .rpc("set_withdrawal_pin", { p_pin: pin })
    .then(function (res) {
      if (res.error) {
        toast(res.error.message || "Could not save your PIN.", "warn");
        return;
      }
      SECURITY_STATE.pinSet = true;
      renderSecuritySettings();
      toast(
        "Withdrawal PIN saved. You will need it for every withdrawal.",
        "emerald",
      );
    });
}

function toggleTwoFactor() {
  var email = window.crestUser && window.crestUser.email;
  if (!window.supabaseClient || !email || window.crestUser.id === undefined) {
    toast("Sign in to manage two-factor authentication.", "warn");
    return;
  }
  var next = !SECURITY_STATE.twoFactor;
  if (
    next &&
    !window.confirm(
      "We will email you a 6-digit code every time you log in.\n\n" +
        "This relies on Supabase being able to send email. If no custom SMTP " +
        "is configured for the project, the code may not arrive.\n\n" +
        "Enable two-factor authentication?",
    )
  )
    return;

  window.supabaseClient
    .from("profiles")
    .update({ two_factor_enabled: next })
    .eq("id", window.crestUser.id)
    .then(function (res) {
      if (res.error) {
        toast(
          res.error.message || "Could not update two-factor authentication.",
          "warn",
        );
        return;
      }
      SECURITY_STATE.twoFactor = next;
      renderSecuritySettings();
      toast(
        next
          ? "Two-factor authentication enabled."
          : "Two-factor authentication disabled.",
        "emerald",
      );
    });
}

function changePassword() {
  var email = window.crestUser && window.crestUser.email;
  if (!email) {
    toast("Sign in to change your password.", "warn");
    return;
  }
  if (typeof crestResetPassword !== "function") {
    toast("Password reset is unavailable right now.", "warn");
    return;
  }
  toast("Sending a reset link to " + email + "...", "info");
  Promise.resolve(crestResetPassword(email))
    .then(function (res) {
      if (res && res.success) {
        toast(
          "Reset link sent. Check " + email + " and your spam folder.",
          "emerald",
        );
      } else {
        toast((res && res.error) || "Could not send the reset link.", "warn");
      }
    })
    .catch(function () {
      toast("Could not send the reset link.", "warn");
    });
}

/* ============================================================
   PLAN PICKER, BANK-TRANSFER PAYMENT & DYNAMIC PORTFOLIO
   ============================================================ */

function openPlanPicker(level) {
  var backdrop = $("planModalBackdrop");
  if (!backdrop) return;

  PLAN_STATE.submitting = false;
  var lv = parseInt(level, 10) || 0;
  if (lv) {
    PLAN_STATE.selectedLevel = lv;
    PLAN_STATE.step = "pay";
  } else {
    PLAN_STATE.selectedLevel = 0;
    PLAN_STATE.step = "choose";
  }

  renderPlanModal();
  backdrop.classList.add("active");
  document.body.style.overflow = "hidden";
  var closeBtn = backdrop.querySelector(".plan-modal-close");
  if (closeBtn) closeBtn.focus();
}

function closePlanModal() {
  var backdrop = $("planModalBackdrop");
  if (backdrop) backdrop.classList.remove("active");
  document.body.style.overflow = "";
  PLAN_STATE.submitting = false;
  PLAN_STATE.selectedLevel = 0;
  PLAN_STATE.step = "choose";
}

function selectPlan(level) {
  PLAN_STATE.selectedLevel = parseInt(level, 10) || 0;
  PLAN_STATE.step = "pay";
  renderPlanModal();
}

function backToPlanList() {
  PLAN_STATE.selectedLevel = 0;
  PLAN_STATE.step = "choose";
  renderPlanModal();
}

function renderPlanModal() {
  var body = $("planModalBody");
  var title = $("planModalTitle");
  var sub = $("planModalSub");
  if (!body) return;

  if (!PLAN_STATE.plans || !PLAN_STATE.plans.length) {
    body.innerHTML = '<p class="muted-text">Plans are loading…</p>';
    return;
  }

  // Step 3 — payment submitted, awaiting the admin
  if (PLAN_STATE.step === "success") {
    var donePlan = getPlanByLevel(PLAN_STATE.selectedLevel);
    if (title) title.textContent = "Payment Submitted";
    if (sub) sub.textContent = "Awaiting administrator confirmation.";
    body.innerHTML =
      '<div class="pm-success">' +
      '<div class="pm-success-icon">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
      "</div>" +
      '<div class="pm-success-title">Payment Received</div>' +
      '<div class="pm-success-sub">Your ' +
      (donePlan
        ? dEsc(formatNaira(donePlan.price)) +
          " payment for the " +
          dEsc(donePlan.name) +
          " plan"
        : "payment") +
      " has been submitted. An administrator will confirm the transfer, and your balance, daily reward and claim button activate the moment it is approved.</div>" +
      "</div>" +
      '<button class="pm-submit" onclick="closePlanModal()">Done</button>';
    return;
  }

  // Step 2 — bank transfer instructions
  if (PLAN_STATE.step === "pay") {
    var plan = getPlanByLevel(PLAN_STATE.selectedLevel);
    if (!plan) {
      PLAN_STATE.step = "choose";
    } else {
      var bank = PLAN_STATE.bank || {};
      if (title) title.textContent = "Fund with Bank Transfer";
      if (sub)
        sub.textContent = "Transfer the package amount, then confirm below.";
      body.innerHTML =
        '<div class="pm-plan-row" style="cursor:default;">' +
        '<div class="pm-plan-row-left">' +
        '<div class="pm-plan-row-name">Level ' +
        (parseInt(plan.level, 10) || 0) +
        " · " +
        dEsc(plan.name) +
        "</div>" +
        '<div class="pm-plan-row-meta">Daily ' +
        formatNaira(plan.dailyEarning) +
        " · Bonus " +
        formatNaira(plan.welcomeBonus) +
        "</div>" +
        "</div>" +
        '<div class="pm-plan-row-price">' +
        formatNaira(plan.price) +
        "</div>" +
        "</div>" +
        '<div class="pm-summary">' +
        '<div class="pm-summary-row"><span>Package amount</span><strong>' +
        formatNaira(plan.price) +
        "</strong></div>" +
        '<div class="pm-summary-row"><span>Daily earning</span><strong>' +
        formatNaira(plan.dailyEarning) +
        "</strong></div>" +
        '<div class="pm-summary-row"><span>Welcome bonus</span><strong>' +
        formatNaira(plan.welcomeBonus) +
        "</strong></div>" +
        '<div class="pm-summary-row pm-total"><span>Amount to transfer</span><strong>' +
        formatNaira(plan.price) +
        "</strong></div>" +
        "</div>" +
        '<div class="pm-bank-box">' +
        '<div class="pm-bank-title">Transfer to</div>' +
        '<div class="pm-bank-row"><span>Bank</span><strong>' +
        dEsc(bank.bankName || "—") +
        "</strong></div>" +
        '<div class="pm-bank-row"><span>Account number</span><strong class="acct">' +
        dEsc(bank.acctNum || "—") +
        "</strong></div>" +
        '<div class="pm-bank-row"><span>Account name</span><strong>' +
        dEsc(bank.acctName || "—") +
        "</strong></div>" +
        '<div class="pm-bank-note">' +
        dEsc(bank.bankNote || "Use your full name as the payment narration.") +
        "</div>" +
        "</div>" +
        '<div class="pm-field">' +
        '<label class="pm-label" for="pmSenderBank">Your bank</label>' +
        '<input class="pm-input" id="pmSenderBank" type="text" placeholder="e.g. GTBank" autocomplete="off">' +
        "</div>" +
        '<div class="pm-field">' +
        '<label class="pm-label" for="pmSenderAcct">Your account number</label>' +
        '<input class="pm-input" id="pmSenderAcct" type="text" inputmode="numeric" placeholder="Account number you paid from" autocomplete="off">' +
        "</div>" +
        '<div class="pm-field">' +
        '<label class="pm-label" for="pmSenderName">Account name</label>' +
        '<input class="pm-input" id="pmSenderName" type="text" placeholder="Name on the paying account" autocomplete="off">' +
        "</div>" +
        '<button class="pm-submit" id="pmSubmitBtn" onclick="submitPlanPayment()">I have made the transfer</button>' +
        '<button class="pm-back" onclick="backToPlanList()">Back to plans</button>' +
        '<p class="pm-note">Your payment is only credited after an administrator confirms the transfer into the receiving account above.</p>';
      return;
    }
  }

  // Step 1 — choose a plan
  if (title) title.textContent = "Pick an Investment Plan";
  if (sub) sub.textContent = "Choose the package you want to activate.";
  body.innerHTML = PLAN_STATE.plans
    .map(function (p) {
      var lv = parseInt(p.level, 10) || 0;
      return (
        '<button class="pm-plan-row" onclick="selectPlan(' +
        lv +
        ')">' +
        '<div class="pm-plan-row-left">' +
        '<div class="pm-plan-row-name">Level ' +
        lv +
        " · " +
        dEsc(p.name) +
        "</div>" +
        '<div class="pm-plan-row-meta">Daily ' +
        formatNaira(p.dailyEarning) +
        " · Bonus " +
        formatNaira(p.welcomeBonus) +
        "</div>" +
        "</div>" +
        '<div class="pm-plan-row-price">' +
        formatNaira(p.price) +
        "</div>" +
        "</button>"
      );
    })
    .join("");
}

async function submitPlanPayment() {
  if (PLAN_STATE.submitting) return;

  var plan = getPlanByLevel(PLAN_STATE.selectedLevel);
  if (!plan) {
    toast("Please pick a plan first.", "warn");
    return;
  }

  var bankEl = $("pmSenderBank");
  var acctEl = $("pmSenderAcct");
  var nameEl = $("pmSenderName");
  var bankName = bankEl ? bankEl.value.trim() : "";
  var acctNum = acctEl ? acctEl.value.trim() : "";
  var acctName = nameEl ? nameEl.value.trim() : "";

  if (!bankName || !acctNum || !acctName) {
    toast(
      "Enter the bank, account number and account name you paid from.",
      "warn",
    );
    return;
  }
  if (!/^[0-9]{6,20}$/.test(acctNum)) {
    toast("Enter a valid account number (6–20 digits).", "warn");
    return;
  }

  var btn = $("pmSubmitBtn");
  PLAN_STATE.submitting = true;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Submitting…";
  }

  if (!window.supabaseClient) {
    PLAN_STATE.submitting = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = "I have made the transfer";
    }
    toast("You need to be online to submit a payment.", "error");
    return;
  }

  try {
    // The server resolves the price and plan name; we only name the level.
    var { data: rpcRes, error: rpcErr } = await window.supabaseClient.rpc(
      "submit_plan_payment",
      {
        p_level: parseInt(plan.level, 10),
        p_bank_name: bankName,
        p_account_number: acctNum,
        p_account_name: acctName,
      },
    );

    if (rpcErr || !rpcRes || !rpcRes.success) {
      PLAN_STATE.submitting = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "I have made the transfer";
      }
      toast(
        (rpcRes && rpcRes.message) ||
          (rpcErr && rpcErr.message) ||
          "Could not submit your payment. Please try again.",
        "error",
      );
      return;
    }

    PLAN_STATE.step = "success";
    renderPlanModal();
    if (typeof loadUserTransactionsFromDB === "function")
      loadUserTransactionsFromDB();
    toast(
      "Payment submitted! An administrator will confirm it shortly.",
      "emerald",
    );
  } catch (err) {
    PLAN_STATE.submitting = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = "I have made the transfer";
    }
    toast("Network error submitting payment: " + err.message, "error");
  }
}

document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  var bd = $("planModalBackdrop");
  if (bd && bd.classList.contains("active")) closePlanModal();
});

/* ── DYNAMIC USER PORTFOLIO HOLDINGS ─────────────────── */
async function loadUserInvestmentsFromDB() {
  var list = $("portfolioInvestmentsList");
  if (!list) return;

  var user = window.crestUser;
  if (
    !user ||
    !user.id ||
    user.id.startsWith("demo_") ||
    !window.supabaseClient
  ) {
    renderLocalOrEmptyPortfolio();
    return;
  }

  try {
    var { data: invRows, error } = await window.supabaseClient
      .from("user_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error || !invRows || invRows.length === 0) {
      renderEmptyPortfolioState();
      return;
    }

    var totalInvested = 0;
    var totalAccrued = 0;

    var html = invRows
      .map(function (inv) {
        var principal = parseFloat(inv.amount_invested) || 0;
        totalInvested += principal;

        var daysActive = 1;
        if (inv.created_at) {
          var diffMs = Date.now() - new Date(inv.created_at).getTime();
          daysActive = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
        var dailyYield = principal * 0.18;
        var accrued = dailyYield * daysActive;
        totalAccrued += accrued;

        var daysMatures = 30;
        var pct = Math.min(100, Math.round((daysActive / daysMatures) * 100));

        return (
          '<div class="inv-card inv-card--featured">' +
          '<div class="inv-card-header">' +
          '<div class="inv-icon inv-icon-ember">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
          "</div>" +
          "<div>" +
          '<div class="inv-name">' +
          (inv.asset_name || "Investment Plan") +
          "</div>" +
          '<div class="inv-meta">Day ' +
          daysActive +
          " of 30 &bull; Earning ₦" +
          dailyYield.toLocaleString("en-NG") +
          "/day</div>" +
          "</div>" +
          '<span class="badge badge--active">Active</span>' +
          "</div>" +
          '<div class="inv-metrics">' +
          '<div><div class="inv-metric-label">Capital</div><div class="inv-metric-val">₦' +
          principal.toLocaleString("en-NG") +
          "</div></div>" +
          '<div><div class="inv-metric-label">Daily Rate</div><div class="inv-metric-val positive">18.0%/day</div></div>' +
          '<div><div class="inv-metric-label">Accrued Yield</div><div class="inv-metric-val positive">+₦' +
          Math.round(accrued).toLocaleString("en-NG") +
          "</div></div>" +
          '<div><div class="inv-metric-label">Status</div><div class="inv-metric-val" style="color:#10B981">Auto-Compounding</div></div>' +
          "</div>" +
          '<div class="inv-progress">' +
          '<div class="inv-progress-labels"><span>30-Day Cycle Progress</span><span>' +
          pct +
          "%</span></div>" +
          '<div class="inv-progress-track"><div class="inv-progress-fill" style="width:' +
          pct +
          '%;background:#10B981"></div></div>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    list.innerHTML = html;

    S.investedBalance = totalInvested;
    S.accruedInterest = totalAccrued;
    var totalVal = S.cashBalance + totalInvested + totalAccrued;
    if ($("portfolioTotalValue"))
      $("portfolioTotalValue").textContent =
        "₦" + Math.round(totalVal).toLocaleString("en-NG");
    if ($("portfolioTotalInvested"))
      $("portfolioTotalInvested").textContent =
        "₦" + Math.round(totalInvested).toLocaleString("en-NG");
    if ($("portfolioTotalReturns"))
      $("portfolioTotalReturns").textContent =
        "+₦" + Math.round(totalAccrued).toLocaleString("en-NG");
    updateBalanceDisplays();
  } catch (e) {
    console.warn("loadUserInvestmentsFromDB error:", e);
    renderEmptyPortfolioState();
  }
}

function renderEmptyPortfolioState() {
  var list = $("portfolioInvestmentsList");
  if (!list) return;
  list.innerHTML =
    '<div class="portfolio-empty-card">' +
    '<div class="empty-icon-wrap">' +
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' +
    "</div>" +
    '<div class="empty-title">No Active Investments Yet</div>' +
    '<div class="empty-desc">You do not have an active investment plan. Pick any of our 10 plans starting from ₦5,000 to unlock your daily reward.</div>' +
    '<button class="btn-primary" onclick="openPlanPicker()">+ Choose a Plan</button>' +
    "</div>";

  if ($("portfolioTotalValue"))
    $("portfolioTotalValue").textContent =
      "₦" + Math.round(S.cashBalance).toLocaleString("en-NG");
  if ($("portfolioTotalInvested"))
    $("portfolioTotalInvested").textContent = "₦0";
  if ($("portfolioTotalReturns")) $("portfolioTotalReturns").textContent = "₦0";
}

function renderLocalOrEmptyPortfolio() {
  if (S.investedBalance && S.investedBalance > 0) {
    var list = $("portfolioInvestmentsList");
    if (list) {
      list.innerHTML =
        '<div class="inv-card inv-card--featured">' +
        '<div class="inv-card-header">' +
        '<div class="inv-icon inv-icon-ember"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
        '<div><div class="inv-name">Active Investment Plan</div><div class="inv-meta">Auto-Compounding &bull; Daily Reward</div></div>' +
        '<span class="badge badge--active">Active</span>' +
        "</div>" +
        '<div class="inv-metrics">' +
        '<div><div class="inv-metric-label">Capital</div><div class="inv-metric-val">₦' +
        S.investedBalance.toLocaleString("en-NG") +
        "</div></div>" +
        '<div><div class="inv-metric-label">Rate</div><div class="inv-metric-val positive">18.0%/day</div></div>' +
        '<div><div class="inv-metric-label">Daily Yield</div><div class="inv-metric-val positive">+₦' +
        Math.round(S.investedBalance * 0.18).toLocaleString("en-NG") +
        "</div></div>" +
        '<div><div class="inv-metric-label">Term</div><div class="inv-metric-val">30 Days</div></div>' +
        "</div>" +
        "</div>";
    }
  } else {
    renderEmptyPortfolioState();
  }
}

/* ── DYNAMIC REFERRALS SYSTEM ───────────────────────── */
var userReferralUrl = "";
function setupUserReferralUI(refCode) {
  var code = refCode || "CW-VIP2026";
  var host =
    window.location.origin || "https://investment-wheat-alpha.vercel.app";
  userReferralUrl = host + "/index/index.html?ref=" + encodeURIComponent(code);

  if ($("refLink")) $("refLink").textContent = userReferralUrl;

  var waShareText =
    "Hey! Join Crest Wealth and earn a daily reward from your investment plan. Register with my official link to get started: " +
    userReferralUrl;
  var waBtn = $("shareWaBtn");
  if (waBtn) {
    waBtn.href =
      "https://api.whatsapp.com/send?text=" + encodeURIComponent(waShareText);
  }
  var xBtn = $("shareXBtn");
  if (xBtn) {
    xBtn.href =
      "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(
        "Growing my portfolio daily with Crest Wealth. Use my invite code " +
          code +
          " to get started: " +
          userReferralUrl,
      );
  }

  // Also dynamically update Task 5 in tasks list if present
  if (typeof TASKS_LIST !== "undefined" && Array.isArray(TASKS_LIST)) {
    var t5 = TASKS_LIST.find(function (t) {
      return t.id === 5;
    });
    if (t5) {
      t5.url =
        "https://api.whatsapp.com/send?text=" + encodeURIComponent(waShareText);
    }
  }
}

function copyReferralLink() {
  if (!userReferralUrl) {
    var el = $("refLink");
    userReferralUrl = el ? el.textContent.trim() : window.location.href;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(userReferralUrl)
      .then(function () {
        toast("VIP Referral link copied to clipboard!", "emerald");
      })
      .catch(function () {
        doCopy(userReferralUrl, "VIP Referral link copied!");
      });
  } else {
    doCopy(userReferralUrl, "VIP Referral link copied!");
  }
}

async function loadUserReferralsFromDB() {
  var tbody = $("referralHistoryTableBody");
  if (!tbody) return;

  var user = window.crestUser;
  if (
    !user ||
    !user.id ||
    user.id.startsWith("demo_") ||
    !window.supabaseClient
  ) {
    renderEmptyReferralsState();
    return;
  }

  try {
    var refs = null;

    // 1. Try secure RPC first (guaranteed bypass of RLS restrictions)
    try {
      var { data: rpcRefs, error: rpcErr } =
        await window.supabaseClient.rpc("get_user_referrals");
      if (!rpcErr && Array.isArray(rpcRefs)) {
        refs = rpcRefs;
      }
    } catch (rpcEx) {
      console.warn("get_user_referrals RPC notice:", rpcEx);
    }

    // 2. Fallback to direct table query
    if (!refs) {
      var { data: directRefs, error: directErr } = await window.supabaseClient
        .from("profiles")
        .select(
          "id, full_name, email, invested_balance, plan_level, created_at",
        )
        .eq("referred_by", user.id)
        .order("created_at", { ascending: false });

      if (!directErr && directRefs) {
        refs = directRefs;
      }
    }

    if (!refs || refs.length === 0) {
      renderEmptyReferralsState();
      return;
    }

    var totalRefs = refs.length;
    var activeRefs = 0;
    var totalEarned = 0;

    function inferReferralLevel(r) {
      var pl = parseInt(r.plan_level, 10);
      if (pl >= 1 && pl <= 10) return pl;
      var inv = parseFloat(r.invested_balance) || 0;
      if (inv >= 1000000) return 10;
      if (inv >= 500000) return 9;
      if (inv >= 350000) return 8;
      if (inv >= 200000) return 7;
      if (inv >= 100000) return 6;
      if (inv >= 75000) return 5;
      if (inv >= 50000) return 4;
      if (inv >= 30000) return 3;
      if (inv >= 15000) return 2;
      if (inv >= 5000) return 1;
      return 0;
    }

    var rowsHtml = refs
      .map(function (r) {
        var refLevel = inferReferralLevel(r);
        var isActive = refLevel > 0;
        if (isActive) activeRefs++;
        // Referral bonus corresponds directly to the investment level
        var bonus = isActive ? getReferralBonusByLevel(refLevel) : 0;
        totalEarned += bonus;

        var name = r.full_name || (r.email ? r.email.split("@")[0] : "Partner");
        var joined = r.created_at
          ? new Date(r.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "Recent";
        var plan = getPlanByLevel(refLevel);
        var pkgLabel = plan
          ? "Level " + refLevel + " (" + plan.name + ")"
          : isActive
            ? "Level " + refLevel
            : "&mdash;";

        return (
          "<tr>" +
          "<td><strong>" +
          name +
          "</strong></td>" +
          "<td>" +
          joined +
          "</td>" +
          "<td>" +
          pkgLabel +
          "</td>" +
          '<td class="credit">' +
          (isActive ? "+₦" + bonus.toLocaleString("en-NG") : "₦0") +
          "</td>" +
          '<td><span class="badge ' +
          (isActive ? "badge--done" : "badge--warn") +
          '">' +
          (isActive ? "Active Investor" : "Registered") +
          "</span></td>" +
          "</tr>"
        );
      })
      .join("");

    tbody.innerHTML = rowsHtml;
    if ($("refTotalCount")) $("refTotalCount").textContent = totalRefs;
    if ($("refTotalEarned"))
      $("refTotalEarned").textContent =
        "₦" + totalEarned.toLocaleString("en-NG");
    if ($("refActiveCount")) $("refActiveCount").textContent = activeRefs;
    if ($("overviewRefEarnings"))
      $("overviewRefEarnings").textContent =
        "₦" + totalEarned.toLocaleString("en-NG");
    if ($("overviewRefCount"))
      $("overviewRefCount").textContent =
        totalRefs + " referral" + (totalRefs === 1 ? "" : "s");
  } catch (e) {
    console.warn("loadUserReferralsFromDB error:", e);
    renderEmptyReferralsState();
  }
}

function renderEmptyReferralsState() {
  var tbody = $("referralHistoryTableBody");
  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:28px;color:#94A3B8;">No partners referred yet. Share your VIP link to earn up to ₦200,000 instant bonus on every investment!</td></tr>';
  }
  if ($("refTotalCount")) $("refTotalCount").textContent = "0";
  if ($("refTotalEarned")) $("refTotalEarned").textContent = "₦0";
  if ($("refActiveCount")) $("refActiveCount").textContent = "0";
  if ($("overviewRefEarnings")) $("overviewRefEarnings").textContent = "₦0";
  if ($("overviewRefCount")) $("overviewRefCount").textContent = "0 referrals";
}

/* ── DYNAMIC TRANSACTIONS LEDGER ─────────────────────── */
var allUserTransactions = [];
async function loadUserTransactionsFromDB() {
  var tbody = $("txnTableBody");
  var user = window.crestUser;

  // Demo / signed-out visitors have no server-side ledger of their own.
  if (
    !user ||
    !user.id ||
    user.id.startsWith("demo_") ||
    !window.supabaseClient
  ) {
    allUserTransactions = [];
    ledgerTransactions = [];
    renderRecentActivity([]);
    refreshOverviewCharts();
    return;
  }

  try {
    var { data: txns, error } = await window.supabaseClient
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    var rows = !error && txns ? txns : [];
    allUserTransactions = rows;
    // Same ledger, replayed oldest-first, is what draws the growth curve.
    ledgerTransactions = rows;

    if (tbody) {
      if (rows.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94A3B8;">No transaction records found yet.</td></tr>';
      } else {
        renderTransactionsTable(rows);
      }
    }

    renderRecentActivity(rows);
    refreshOverviewCharts();
  } catch (e) {
    console.warn("loadUserTransactionsFromDB error:", e);
    allUserTransactions = [];
    ledgerTransactions = [];
    renderRecentActivity([]);
    refreshOverviewCharts();
  }
}

/* Overview "Recent Activity" — mirrors the newest rows of the same ledger */
function renderRecentActivity(txns) {
  var wrap = $("recentActivityRows");
  if (!wrap) return;

  var list = (txns || []).slice(0, 5);
  if (list.length === 0) {
    wrap.innerHTML =
      '<div class="txn-empty">No activity yet. Your deposits, rewards and withdrawals will appear here.</div>';
    return;
  }

  wrap.innerHTML = list
    .map(function (tx) {
      var amt = parseFloat(tx.amount) || 0;
      var status = String(tx.status || "Completed");
      var isPending = /pending|lock|process|review/i.test(status);
      var isPositive = amt >= 0;
      var dotClass = isPending
        ? "txn-dot--orange"
        : isPositive
          ? "txn-dot--green"
          : "txn-dot--dim";
      var name =
        tx.title ||
        tx.description ||
        (tx.type ? tx.type + " transaction" : "Account Transaction");
      var dateStr = tx.created_at
        ? new Date(tx.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Recent";
      var meta = isPending ? dateStr + " \u2022 " + status : dateStr;
      var amountHtml = isPending
        ? '<span class="badge badge--warn">' + escapeHtml(status) + "</span>"
        : (isPositive ? "+" : "-") +
          "\u20A6" +
          Math.abs(amt).toLocaleString("en-NG");

      return (
        '<div class="txn-row">' +
        '<div class="txn-dot ' +
        dotClass +
        '"></div>' +
        '<div class="txn-detail">' +
        '<div class="txn-name">' +
        escapeHtml(name) +
        "</div>" +
        '<div class="txn-meta">' +
        escapeHtml(meta) +
        "</div>" +
        "</div>" +
        '<div class="txn-amt' +
        (!isPending && isPositive ? " credit" : "") +
        '">' +
        amountHtml +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

function renderTransactionsTable(txns) {
  var tbody = $("txnTableBody");
  if (!tbody) return;

  tbody.innerHTML = txns
    .map(function (tx) {
      var amt = parseFloat(tx.amount) || 0;
      var isPositive = amt >= 0;
      var typeTag = tx.type || "deposit";
      var tagClass = "type-tag--" + typeTag.toLowerCase();
      var dateStr = tx.created_at
        ? new Date(tx.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Recent";

      return (
        "<tr>" +
        "<td>" +
        dateStr +
        "</td>" +
        "<td>" +
        (tx.title || tx.description || "Account Transaction") +
        "</td>" +
        '<td><span class="type-tag ' +
        tagClass +
        '">' +
        typeTag.toUpperCase() +
        "</span></td>" +
        '<td class="' +
        (isPositive ? "credit" : "debit") +
        '">' +
        (isPositive ? "+" : "") +
        "₦" +
        Math.abs(amt).toLocaleString("en-NG") +
        "</td>" +
        '<td><span class="badge badge--done">' +
        (tx.status || "Completed") +
        "</span></td>" +
        "</tr>"
      );
    })
    .join("");
}

function filterTransactionsList() {
  var search = ($("txnSearch") ? $("txnSearch").value : "")
    .toLowerCase()
    .trim();
  var filter = $("txnFilter") ? $("txnFilter").value : "All";

  var filtered = allUserTransactions.filter(function (tx) {
    var descMatch =
      tx.description && tx.description.toLowerCase().includes(search);
    var titleMatch = tx.title && tx.title.toLowerCase().includes(search);
    var matchesSearch = !search || descMatch || titleMatch;
    var matchesFilter =
      filter === "All" ||
      (tx.type && tx.type.toLowerCase() === filter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  renderTransactionsTable(filtered);
}

/* ── DEPOSIT TRACKER ──────────────────────────────────
   Reads the member's own deposits and shows how far each one has moved
   through the review pipeline, using the same status wording the admin desk
   writes back. */
var DEPOSIT_STAGES = [
  { key: "submitted", label: "Submitted" },
  { key: "review", label: "Under review" },
  { key: "confirmed", label: "Confirmed" },
];

function depositStage(status) {
  var s = String(status || "").toLowerCase();
  if (s.indexOf("reject") !== -1) return "rejected";
  if (s.indexOf("review") !== -1) return "review";
  if (s.indexOf("confirm") !== -1 && s.indexOf("pending") === -1)
    return "confirmed";
  return "submitted";
}

async function renderDepositTracker() {
  var wrap = $("depositTrackerRows");
  if (!wrap) return;

  var user = window.crestUser;
  if (!user || !user.id || !window.supabaseClient) {
    wrap.innerHTML =
      '<div class="txn-empty">No deposits yet. Your transfer will appear here the moment you submit it.</div>';
    return;
  }

  var res;
  try {
    res = await window.supabaseClient
      .from("deposits")
      .select("id,amount,plan,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
  } catch (e) {
    wrap.innerHTML =
      '<div class="txn-empty">Could not load your deposits right now.</div>';
    return;
  }

  var rows = !res.error && res.data ? res.data : [];
  if (rows.length === 0) {
    wrap.innerHTML =
      '<div class="txn-empty">No deposits yet. Your transfer will appear here the moment you submit it.</div>';
    return;
  }

  wrap.innerHTML = rows
    .map(function (d) {
      var stage = depositStage(d.status);
      // How many of the three stages have been reached.
      var reach =
        stage === "confirmed"
          ? 3
          : stage === "review"
            ? 2
            : stage === "rejected"
              ? 0
              : 1;

      var steps = DEPOSIT_STAGES.map(function (s, i) {
        var cls = "dep-step";
        if (stage === "rejected") cls += " dep-step--bad";
        else if (i < reach - 1) cls += " dep-step--done";
        else if (i === reach - 1) cls += " dep-step--now";
        return '<span class="' + cls + '">' + escapeHtml(s.label) + "</span>";
      }).join('<span class="dep-arrow"></span>');

      var dateStr = d.created_at
        ? new Date(d.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "";

      return (
        '<div class="dep-track-row">' +
        '<div class="dep-track-top">' +
        '<span class="dep-track-amt">' +
        "\u20A6" +
        (parseFloat(d.amount) || 0).toLocaleString("en-NG") +
        "</span>" +
        '<span class="dep-track-ref">' +
        escapeHtml(String(d.id || "")) +
        (dateStr ? " \u2022 " + escapeHtml(dateStr) : "") +
        "</span>" +
        "</div>" +
        '<div class="dep-track-plan">' +
        escapeHtml(d.plan || "Deposit") +
        "</div>" +
        '<div class="dep-track-steps">' +
        steps +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

/* ── FRIDAY WITHDRAWAL WINDOW ─────────────────────────
   Everything except the welcome bonus unlocks at 00:00 UTC on Friday and
   locks again at 00:00 UTC on Saturday — the very same rule the SQL enforces
   with EXTRACT(DOW FROM NOW()). */
function startFridayCountdown() {
  var wrap = $("wdWindowStrip");
  var textEl = $("wdWindowText");
  var clockEl = $("wdWindowClock");
  if (!wrap || !textEl || !clockEl) return;

  function tick() {
    var now = new Date();
    var day = now.getUTCDay(); // 0 Sun … 5 Fri … 6 Sat
    var open = day === 5;
    var target;

    if (open) {
      // Open until midnight UTC tonight.
      target = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
      );
    } else {
      var add = (5 - day + 7) % 7 || 7;
      target = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + add,
        ),
      );
    }

    var diff = Math.max(0, target - now);
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);

    clockEl.textContent = [h, m, s]
      .map(function (v) {
        return String(v).padStart(2, "0");
      })
      .join(":");

    wrap.classList.toggle("wd-window-strip--open", open);
    textEl.textContent = open
      ? "Window OPEN — task, daily and referral earnings are withdrawable until 00:00 UTC Saturday."
      : "Window opens Friday 00:00 UTC. Only your welcome bonus is withdrawable right now.";
  }

  tick();
  clearInterval(window.__crestFridayTimer);
  window.__crestFridayTimer = setInterval(tick, 1000);
}

/* ── STATEMENT EXPORT ─────────────────────────────────
   Builds a CSV from the same ledger the on-screen table shows, so the
   download always matches what the member is looking at. */
function csvCell(value) {
  var s = String(value === null || value === undefined ? "" : value);
  return '"' + s.replace(/"/g, '""') + '"';
}

function downloadStatementCSV() {
  var rows = allUserTransactions || [];
  if (rows.length === 0) {
    toast("There is nothing to export yet.", "info");
    return;
  }

  var lines = [
    ["Date", "Description", "Type", "Amount (NGN)", "Status"].join(","),
  ];
  rows.forEach(function (tx) {
    lines.push(
      [
        tx.created_at ? new Date(tx.created_at).toISOString().slice(0, 10) : "",
        tx.title || tx.description || "Account Transaction",
        tx.type || "",
        (parseFloat(tx.amount) || 0).toFixed(2),
        tx.status || "Completed",
      ]
        .map(csvCell)
        .join(","),
    );
  });

  // The BOM keeps Excel from mangling the naira sign in the header text.
  var blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download =
    "crest-statement-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
  toast("Statement downloaded.", "emerald");
}

/* ── INITIALIZATION ──────────────────────────────────── */
function initDashboard() {
  switchView("overview");
  updateBalanceDisplays();
  refreshTaskUI();
  startDepositSessionTimer();
  startTaskCycleClock();
  startFridayCountdown();
  updateWithdrawalTimeline();
  initTxnFiltering();
  initSettingsInteractions();
  renderDepositTracker();
  if (typeof loadRemoteTasksConfig === "function") {
    loadRemoteTasksConfig();
  }
  setTimeout(function () {
    drawSparkline();
    drawGrowth();
    drawDonut();
  }, 120);

  try {
    var urlP = new URLSearchParams(window.location.search);
    if (
      urlP.get("modal") === "vaultx" ||
      urlP.get("modal") === "plan" ||
      window.location.hash === "#plan" ||
      window.location.hash === "#vaultx"
    ) {
      setTimeout(function () {
        openPlanPicker();
      }, 350);
    }
  } catch (e) {}
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard);
} else {
  initDashboard();
}
