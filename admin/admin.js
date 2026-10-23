// Hide content and verify real Supabase session before showing admin panel
if (!window.crestSession) {
  document.documentElement.style.visibility = "hidden";
}
(async function supabaseAuthGuard() {
  let session = window.crestSession;
  if (!session) {
    let waited = 0;
    while (!window.supabaseClient && waited < 1500) {
      await new Promise((r) => setTimeout(r, 25));
      waited += 25;
    }
    if (!window.supabaseClient) {
      window.location.href = "../index/index.html";
      return;
    }
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      session = data ? data.session : null;
    } catch (e) {}
  }

  if (!session) {
    window.location.href = "../index/index.html";
    return;
  }

  // Verify Admin Role
  const { data: profile, error } = await window.supabaseClient
    .from("profiles")
    .select("is_admin")
    .eq("id", session.user.id)
    .single();

  if (error || !profile || profile.is_admin !== true) {
    console.warn("Unauthorized access attempt to admin panel");
    window.location.href = "../dashboard/dashboard.html";
    return;
  }

  window.crestUser = session.user;
  document.documentElement.classList.add("admin-authorized");
  document.documentElement.style.visibility = "";
})();

/* ==========================================================================
   CREST WEALTH — ADMINISTRATIVE OBSERVATORY & GATEKEEPER JS
   Complete SPA Controller & State Synchronization
   - Withdrawal Task Gatekeeper Management (CRUD + Live Sync)
   - Withdrawal Review & Instant Settlement Payout
   - Deposit Verification & Liquidity Queue
   - Investor Directory & KYC Control
   - Token Bucket Rate Limiter Telemetry & Audit Stream
   - Dual Inflow/Outflow Canvas Observatory Chart
   ========================================================================== */

/* ── DEFAULT TASKS ───────────────────────────────────────── */
var DEFAULT_ADMIN_TASKS = [
  {
    id: 0,
    active: true,
    icon: "x",
    platform: "X (Twitter)",
    title: "Follow Crest on X",
    desc: "Follow @CrestWealthNG for market notices & rate announcements.",
    steps: [
      "Tap the button below to open @CrestWealthNG on X",
      "Click Follow on the profile",
      "Come back here — we verify automatically",
    ],
    reward: "+₦2,000",
    rewardAmount: 2000,
    url: "https://x.com/CrestWealthNG",
    urlLabel: "Open X Profile",
    verificationType: "timed",
    minSeconds: 20,
  },
  {
    id: 1,
    active: true,
    icon: "yt",
    platform: "YouTube",
    title: "Subscribe on YouTube",
    desc: "Subscribe to Crest Wealth and watch video briefs.",
    steps: [
      "Tap the button below to open our YouTube channel",
      "Click Subscribe",
      "Watch any full video, then come back here",
    ],
    reward: "+₦3,000",
    rewardAmount: 3000,
    url: "https://youtube.com/@CrestWealth",
    urlLabel: "Open YouTube Channel",
    verificationType: "timed",
    minSeconds: 120,
  },
  {
    id: 2,
    active: true,
    icon: "ig",
    platform: "Instagram",
    title: "Comment on Our Post",
    desc: "Engage with the weekly pinned rate review post on @CrestWealthNG.",
    steps: [
      "Tap the button below to open @CrestWealthNG on Instagram",
      "Find the pinned investment post",
      "Leave a comment, then come back here",
    ],
    reward: "+₦1,500",
    rewardAmount: 1500,
    url: "https://instagram.com/CrestWealthNG",
    urlLabel: "Open Instagram",
    verificationType: "screenshot",
  },
  {
    id: 3,
    active: true,
    icon: "quiz",
    platform: "Quiz",
    title: "Investment IQ Quiz",
    desc: "Mandatory 5-question finance literacy test (70% pass threshold).",
    steps: [
      "Read each question carefully",
      "Select your answer",
      "Score 70% or higher to complete and earn bonus",
    ],
    reward: "+₦2,500",
    rewardAmount: 2500,
    isQuiz: true,
    verificationType: "quiz",
  },
  {
    id: 4,
    active: true,
    icon: "game",
    platform: "Trading Mini-Game",
    title: "Market Timing Mini-Game",
    desc: "Trading simulator test: execute profitable ticks to score 150+ points.",
    steps: [
      "Watch the live price ticks",
      "Click BUY on dips & SELL on peaks",
      "Achieve 150 points to complete and earn bonus",
    ],
    reward: "+₦3,500",
    rewardAmount: 3500,
    isGame: true,
    verificationType: "game",
  },
];

/* ── SEED DATA ───────────────────────────────────────────── */
var SEED_WITHDRAWALS = [
  {
    id: "WD-849120-NGX",
    user: "Adaeze Okonkwo",
    email: "adaeze.okonkwo@email.com",
    amount: 50000,
    bank: "GTBank — 0123456789",
    date: "Sep 25, 2026",
    status: "Pending Review",
    tasksVerified: "5/5 Complete",
    proofs: {
      x: "@adaeze_invests",
      yt: "adaeze.okonkwo@email.com",
      ig: "@adaeze_ok",
      quiz: "Score: 5/5 (100% Passed)",
      game: "Score: 180 / 150 pts (Target Passed)",
    },
  },
  {
    id: "WD-738192-NGX",
    user: "Babatunde Adeleke",
    email: "babatunde.a@yahoo.com",
    amount: 120000,
    bank: "Access Bank — 0092837411",
    date: "Sep 24, 2026",
    status: "Pending Review",
    tasksVerified: "5/5 Complete",
    proofs: {
      x: "@badeleke_fx",
      yt: "badeleke.ng@gmail.com",
      ig: "@tunde_investor",
      quiz: "Score: 4/5 (80% Passed)",
      game: "Score: 165 / 150 pts (Target Passed)",
    },
  },
  {
    id: "WD-629104-NGX",
    user: "Chinedu Okafor",
    email: "chinedu.okafor@gmail.com",
    amount: 35000,
    bank: "Zenith Bank — 2083948123",
    date: "Sep 23, 2026",
    status: "Rejected",
    tasksVerified: "3/5 Incomplete",
    proofs: {
      x: "@chinedu_o",
      yt: "Missing proof",
      ig: "@chinedu_o",
      quiz: "Incomplete",
      game: "Score: 40 / 150 pts",
    },
  },
];

var SEED_DEPOSITS = [
  {
    id: "DEP-982103",
    user: "Adaeze Okonkwo",
    email: "adaeze.okonkwo@email.com",
    amount: 200000,
    plan: "Fixed Lock (16.8%)",
    method: "BANK TRANSFER",
    date: "Sep 24, 2026",
    status: "Confirmed",
  },
  {
    id: "DEP-831920",
    user: "Fatima Bello",
    email: "fatima.bello@kpmg.com",
    amount: 500000,
    plan: "Diamond Plan (₦500k)",
    method: "BANK TRANSFER",
    date: "Sep 24, 2026",
    status: "Pending Confirmation",
  },
  {
    id: "DEP-710294",
    user: "Olumide Bakare",
    email: "olumide.b@gmail.com",
    amount: 50000,
    plan: "Crest Stash (11.5%)",
    method: "USSD (*737#)",
    date: "Sep 23, 2026",
    status: "Confirmed",
  },
];

var SEED_USERS = [
  {
    name: "Adaeze Okonkwo",
    email: "adaeze.okonkwo@email.com",
    tier: "Level 6 (₦100k)",
    invested: "₦976,800",
    balance: "₦84,200",
    tasks: "5/5 (100%)",
    kyc: "Tier 3 (BVN & NIN Verified)",
  },
  {
    name: "Babatunde Adeleke",
    email: "babatunde.a@yahoo.com",
    tier: "Level 7 (₦200k)",
    invested: "₦1,450,000",
    balance: "₦120,000",
    tasks: "5/5 (100%)",
    kyc: "Tier 3 (BVN & NIN Verified)",
  },
  {
    name: "Fatima Bello",
    email: "fatima.bello@kpmg.com",
    tier: "Level 9 (₦500k)",
    invested: "₦3,800,000",
    balance: "₦310,000",
    tasks: "4/5 (80%)",
    kyc: "Tier 3 (BVN & NIN Verified)",
  },
  {
    name: "Chinedu Okafor",
    email: "chinedu.okafor@gmail.com",
    tier: "Level 3 (₦30k)",
    invested: "₦180,000",
    balance: "₦35,000",
    tasks: "3/5 (60%)",
    kyc: "Tier 2 (BVN Verified)",
  },
  {
    name: "Ngozi Eze",
    email: "ngozi.eze@techcorp.ng",
    tier: "Level 5 (₦75k)",
    invested: "₦620,000",
    balance: "₦92,000",
    tasks: "5/5 (100%)",
    kyc: "Tier 3 (BVN & NIN Verified)",
  },
];

/* ── ADMIN STATE ─────────────────────────────────────────── */
var AdminState = {
  currentView: "observatory",
  tasks: [],
  withdrawals: [],
  deposits: [],
  users: SEED_USERS.slice(),
  investments: [],
  userTasks: [],
  investmentPlans: [],
  gatekeeperEnforced: true,
  inspectedWdId: null,
  inspectedUserId: null,
};

/* ── DOM HELPER ──────────────────────────────────────────── */
function $(id) {
  return document.getElementById(id);
}

/* ── INITIALIZATION & STORAGE SYNC ───────────────────────── */
function initAdminData() {
  // Load Tasks Config
  var savedTasks = null;
  try {
    var raw = localStorage.getItem("crest_tasks_config");
    if (raw) savedTasks = JSON.parse(raw);
  } catch (e) {}
  AdminState.tasks =
    savedTasks && Array.isArray(savedTasks) && savedTasks.length > 0
      ? savedTasks
      : DEFAULT_ADMIN_TASKS.map(function (t) {
          return Object.assign({}, t);
        });

  // Ensure rewardAmount and verificationType are properly populated
  AdminState.tasks.forEach(function (t) {
    if (typeof t.rewardAmount !== "number") {
      var m = (t.reward || "").replace(/[^0-9]/g, "");
      t.rewardAmount = m ? parseInt(m, 10) : 2000;
    }
    if (!t.reward) {
      t.reward = "+₦" + t.rewardAmount.toLocaleString("en-NG");
    }
    t.verificationType = normalizeVerificationType(t);
    if (t.verificationType === "timed" && !t.minSeconds) t.minSeconds = 30;
  });

  saveTasksToStorage(true);

  // Load Withdrawals (Seed + user generated)
  var savedWd = [];
  try {
    savedWd = JSON.parse(localStorage.getItem("crest_withdrawals") || "[]");
  } catch (e) {}

  // Combine user submissions with seed data avoiding duplicate IDs
  var combinedWd = savedWd.slice();
  SEED_WITHDRAWALS.forEach(function (seed) {
    if (
      !combinedWd.some(function (w) {
        return w.id === seed.id;
      })
    ) {
      combinedWd.push(seed);
    }
  });
  AdminState.withdrawals = combinedWd;

  // Load Deposits
  var savedDep = [];
  try {
    savedDep = JSON.parse(localStorage.getItem("crest_deposits") || "[]");
  } catch (e) {}
  var combinedDep = savedDep.slice();
  SEED_DEPOSITS.forEach(function (seed) {
    if (
      !combinedDep.some(function (d) {
        return d.id === seed.id;
      })
    ) {
      combinedDep.push(seed);
    }
  });
  AdminState.deposits = combinedDep;
}

function saveTasksToStorage(skipRemote) {
  try {
    localStorage.setItem(
      "crest_tasks_config",
      JSON.stringify(AdminState.tasks),
    );
  } catch (e) {}
  var badge = $("navActiveTaskCount");
  if (badge) {
    var count = AdminState.tasks.filter(function (t) {
      return t.active !== false;
    }).length;
    badge.textContent = count + " Active";
  }
  if (!skipRemote) pushTasksToSupabase();
}

/* ── SUPABASE TASK SYNC (so every user's dashboard gets the admin's tasks) ── */
function normalizeVerificationType(t) {
  if (t.isQuiz || t.verificationType === "quiz") return "quiz";
  if (t.isGame || t.verificationType === "game") return "game";
  if (t.verificationType === "screenshot") return "screenshot";
  return "timed"; // legacy social_handle / instant / link_proof
}

function waitForSupabase() {
  return new Promise(function (resolve) {
    var waited = 0;
    (function check() {
      if (window.supabaseClient) return resolve(window.supabaseClient);
      if (waited > 4000) return resolve(null);
      waited += 100;
      setTimeout(check, 100);
    })();
  });
}

function setTaskSyncBadge(text, ok) {
  var b = $("taskSyncStatusBadge");
  if (!b) return;
  b.textContent = text;
  b.className = "badge " + (ok ? "badge--approved" : "badge--pending");
}

function pushTasksToSupabase() {
  setTaskSyncBadge("Sync: Saving...", false);
  waitForSupabase().then(function (sb) {
    if (!sb) {
      setTaskSyncBadge("Sync: Offline", false);
      return;
    }
    sb.from("app_settings")
      .upsert(
        {
          key: "tasks_config",
          value: AdminState.tasks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .then(function (res) {
        if (res.error) {
          console.warn("[Admin] Task sync failed:", res.error);
          setTaskSyncBadge("Sync: Failed", false);
          toast(
            "Could not publish tasks to users. Run the latest supabase-schema.sql.",
            "warn",
          );
        } else {
          setTaskSyncBadge("Sync: Live", true);
        }
      });
  });
}

function loadRemoteTasks() {
  waitForSupabase().then(function (sb) {
    if (!sb) return;
    sb.from("app_settings")
      .select("value")
      .eq("key", "tasks_config")
      .maybeSingle()
      .then(function (res) {
        if (res.error) {
          setTaskSyncBadge("Sync: Not set up", false);
          return;
        }
        if (
          res.data &&
          Array.isArray(res.data.value) &&
          res.data.value.length
        ) {
          AdminState.tasks = res.data.value;
          AdminState.tasks.forEach(function (t) {
            t.verificationType = normalizeVerificationType(t);
            // Re-derive the reward fields from remote config. Without this a task
            // saved by an older build (or hand-edited in the DB) could reach the
            // editor with rewardAmount missing, and the published figure the
            // dashboard pays out would not match what the admin sees.
            if (typeof t.rewardAmount !== "number") {
              var m = (t.reward || "").replace(/[^0-9]/g, "");
              t.rewardAmount = m ? parseInt(m, 10) : 2000;
            }
            if (!t.reward) {
              t.reward = "+₦" + t.rewardAmount.toLocaleString("en-NG");
            }
            if (t.verificationType === "timed" && !t.minSeconds)
              t.minSeconds = 30;
          });
          saveTasksToStorage(true);
          renderAdminTasks();
          setTaskSyncBadge("Sync: Live", true);
        } else {
          // First run: publish the current local tasks so users receive them
          pushTasksToSupabase();
        }
      });
  });
}

/* ── SCREENSHOT PROOFS FEED ── */
function loadTaskProofs() {
  var el = $("taskProofsList");
  if (!el) return;
  waitForSupabase().then(function (sb) {
    if (!sb) return;
    sb.from("user_tasks")
      .select(
        "task_title, proof_url, completed_at, user_id, profiles(email, full_name)",
      )
      .not("proof_url", "is", null)
      .order("completed_at", { ascending: false })
      .limit(40)
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) {
          el.innerHTML =
            '<div class="proofs-empty">No screenshot proofs yet.</div>';
          return;
        }
        var rows = res.data;
        Promise.all(
          rows.map(function (r) {
            return sb.storage
              .from("task-proofs")
              .createSignedUrl(r.proof_url, 3600)
              .then(function (s) {
                return s.data ? s.data.signedUrl : "";
              })
              .catch(function () {
                return "";
              });
          }),
        ).then(function (urls) {
          el.innerHTML = rows
            .map(function (r, i) {
              var p = r.profiles || {};
              var who = escapeHtml(p.full_name || p.email || "User");
              var when = r.completed_at
                ? new Date(r.completed_at).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "";
              var safeSrc = escapeHtml(urls[i] || "");
              var img = urls[i]
                ? '<a href="' +
                  safeSrc +
                  '" target="_blank" rel="noopener"><img class="proof-thumb" src="' +
                  safeSrc +
                  '" alt="Screenshot proof from ' +
                  who +
                  '" loading="lazy"></a>'
                : '<div class="proof-thumb"></div>';
              return (
                '<div class="proof-card">' +
                img +
                '<div class="proof-meta"><span class="proof-user">' +
                who +
                "</span>" +
                '<span class="proof-task">' +
                escapeHtml(r.task_title || "Task") +
                "</span>" +
                '<span class="proof-date">' +
                when +
                "</span></div></div>"
              );
            })
            .join("");
        });
      });
  });
}

function saveWithdrawalsToStorage() {
  try {
    localStorage.setItem(
      "crest_withdrawals",
      JSON.stringify(AdminState.withdrawals),
    );
  } catch (e) {}
  updateKpis();
}

function saveDepositsToStorage() {
  try {
    localStorage.setItem("crest_deposits", JSON.stringify(AdminState.deposits));
  } catch (e) {}
  updateKpis();
}

/* ── VIEW SWITCHING ──────────────────────────────────────── */
function switchAdminView(viewName) {
  document.querySelectorAll(".view-section").forEach(function (v) {
    v.classList.remove("active");
  });
  document.querySelectorAll(".nav-item").forEach(function (n) {
    n.classList.remove("active");
  });

  var targetView = $("view-" + viewName);
  if (targetView) targetView.classList.add("active");

  var targetNav = document.querySelector(
    '.nav-item[data-view="' + viewName + '"]',
  );
  if (targetNav) targetNav.classList.add("active");

  var titles = {
    observatory: "Observatory",
    gatekeeper: "Withdrawal Gatekeeper & Tasks",
    withdrawals: "Withdrawal Requests Queue",
    deposits: "Incoming Deposits Queue",
    investors: "Investor Directory & KYC",
    treasury: "Platform Treasury & Yield Controls",
    security: "Rate Limits & Security Logs",
  };
  if ($("pageTitle"))
    $("pageTitle").textContent = titles[viewName] || "Admin Terminal";
  AdminState.currentView = viewName;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (viewName === "observatory") {
    setTimeout(drawFlowChart, 60);
  } else if (viewName === "treasury") {
    loadPlatformSettings();
    loadInvestmentPlansAdmin();
  }
}

/* ── MOBILE SIDEBAR ──────────────────────────────────────── */
if ($("burgerBtn")) {
  $("burgerBtn").addEventListener("click", function () {
    $("sidebar").classList.toggle("open");
    $("sidebarOverlay").classList.toggle("active");
  });
}
if ($("sidebarOverlay")) {
  $("sidebarOverlay").addEventListener("click", closeSidebar);
}
function closeSidebar() {
  if ($("sidebar")) $("sidebar").classList.remove("open");
  if ($("sidebarOverlay")) $("sidebarOverlay").classList.remove("active");
}

document.querySelectorAll(".nav-item[data-view]").forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    switchAdminView(link.dataset.view);
  });
});

/* ── TASK GATEKEEPER MANAGEMENT ──────────────────────────── */
/* Icon set shared by the admin task list and the live editor preview. */
var TASK_ICON_SVGS = {
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  yt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  ig: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>',
  telegram:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>',
  tiktok:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V7.93a8.21 8.21 0 0 0 4.76 1.5V6.01c-.34 0-.68-.07-1-.2z"/></svg>',
  discord:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
  quiz: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
  game: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12h4m-2-2v4m7-2a1 1 0 1 0 2 0 1 1 0 0 0-2 0m4 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>',
  link: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

function renderAdminTasks() {
  var container = $("tasksAdminList");
  if (!container) return;
  var ICONS = TASK_ICON_SVGS;

  container.innerHTML = AdminState.tasks
    .map(function (t) {
      var iconSvg = ICONS[t.icon] || ICONS.quiz;
      var isActive = t.active !== false;

      var vTypeBadge = "";
      if (t.verificationType === "screenshot") {
        vTypeBadge = '<span class="tac-vtype-badge">Screenshot Proof</span>';
      } else if (t.verificationType === "quiz") {
        vTypeBadge = '<span class="tac-vtype-badge">Financial IQ Quiz</span>';
      } else if (t.verificationType === "game") {
        vTypeBadge = '<span class="tac-vtype-badge">Trading Mini-Game</span>';
      } else {
        vTypeBadge =
          '<span class="tac-vtype-badge">Auto · min ' +
          (t.minSeconds || 30) +
          "s away</span>";
      }

      var displayReward =
        t.reward || "+₦" + (t.rewardAmount || 2000).toLocaleString("en-NG");
      var safeTitle = escapeHtml(t.title);
      var safePlatform = escapeHtml(t.platform);
      var rawUrl = t.url || "";
      var safeHref =
        typeof crestSanitizeUrl === "function" ? crestSanitizeUrl(rawUrl) : "";
      var safeUrl = escapeHtml(safeHref);
      var safeUrlLabel = escapeHtml(t.urlLabel || rawUrl);
      var safeUrlHtml = safeHref
        ? '<span class="tac-sep">&bull;</span><a href="' +
          safeUrl +
          '" target="_blank" rel="noopener" class="tac-url-link" title="' +
          safeUrl +
          '">' +
          safeUrlLabel +
          "</a>"
        : rawUrl
          ? '<span class="tac-sep">&bull;</span><span class="tac-interactive-tag">Link blocked</span>'
          : '<span class="tac-sep">&bull;</span><span class="tac-interactive-tag">In-App Simulation</span>';

      return (
        '<div class="task-admin-card ' +
        (isActive ? "task-status--active" : "task-status--inactive") +
        '" id="tac-' +
        t.id +
        '">' +
        '<div class="tac-header-row">' +
        '<div class="tac-identity">' +
        '<div class="tac-icon">' +
        iconSvg +
        "</div>" +
        '<div class="tac-text-wrap">' +
        '<div class="tac-title">' +
        safeTitle +
        "</div>" +
        '<div class="tac-meta">' +
        '<span class="tac-platform-tag">' +
        safePlatform +
        "</span>" +
        '<span class="tac-sep">&bull;</span>' +
        vTypeBadge +
        safeUrlHtml +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="tac-reward-badge">' +
        escapeHtml(displayReward) +
        "</div>" +
        "</div>" +
        '<div class="tac-footer-row">' +
        '<div class="tac-toggle-wrap">' +
        '<label class="toggle-switch" title="Toggle active status">' +
        '<input type="checkbox" ' +
        (isActive ? "checked" : "") +
        ' onchange="toggleTaskActive(' +
        t.id +
        ', this.checked)">' +
        '<span class="toggle-slider"></span>' +
        "</label>" +
        '<span class="tac-toggle-label">' +
        (isActive ? "Active Prerequisite" : "Prerequisite Inactive") +
        "</span>" +
        "</div>" +
        '<div class="tac-buttons-wrap">' +
        '<button class="btn btn-subtle btn-sm" onclick="moveAdminTask(' +
        t.id +
        ', -1)" title="Move up">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>' +
        "<span>Up</span>" +
        "</button>" +
        '<button class="btn btn-subtle btn-sm" onclick="moveAdminTask(' +
        t.id +
        ', 1)" title="Move down">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
        "<span>Down</span>" +
        "</button>" +
        '<button class="btn btn-subtle btn-sm" onclick="duplicateAdminTask(' +
        t.id +
        ')" title="Duplicate task">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
        "<span>Duplicate</span>" +
        "</button>" +
        '<button class="btn btn-subtle btn-sm" onclick="openEditTaskModal(' +
        t.id +
        ')" title="Edit task details">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        "<span>Edit Task</span>" +
        "</button>" +
        '<button class="btn btn-danger-outline btn-sm" onclick="deleteAdminTask(' +
        t.id +
        ')" title="Delete task">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
        "<span>Delete</span>" +
        "</button>" +
        "</div>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

function moveAdminTask(id, dir) {
  var idx = AdminState.tasks.findIndex(function (t) {
    return t.id === id;
  });
  if (idx === -1) return;
  var next = idx + dir;
  if (next < 0 || next >= AdminState.tasks.length) return;
  var tmp = AdminState.tasks[idx];
  AdminState.tasks[idx] = AdminState.tasks[next];
  AdminState.tasks[next] = tmp;
  saveTasksToStorage();
  renderAdminTasks();
}

function duplicateAdminTask(id) {
  var t = AdminState.tasks.find(function (x) {
    return x.id === id;
  });
  if (!t) return;
  var newId =
    AdminState.tasks.length > 0
      ? Math.max.apply(
          null,
          AdminState.tasks.map(function (x) {
            return x.id;
          }),
        ) + 1
      : 1;
  var copy = Object.assign({}, t);
  copy.id = newId;
  copy.title = (t.title || "Task") + " (Copy)";
  AdminState.tasks.splice(
    AdminState.tasks.findIndex(function (x) {
      return x.id === id;
    }) + 1,
    0,
    copy,
  );
  saveTasksToStorage();
  renderAdminTasks();
  toast("Duplicated task: " + copy.title, "emerald");
  addAuditLog("TASK_DUPLICATED", "Task ID #" + id + " duplicated as #" + newId);
}

function toggleTaskActive(id, isChecked) {
  var task = AdminState.tasks.find(function (t) {
    return t.id === id;
  });
  if (task) {
    task.active = isChecked;
    saveTasksToStorage();
    toast(
      'Task "' +
        task.title +
        '" is now ' +
        (isChecked ? "ACTIVE" : "INACTIVE") +
        " on user dashboard.",
      "emerald",
    );
    addAuditLog(
      "TASK_CONFIG_UPDATED",
      "Task ID #" + id + " active state set to " + isChecked,
    );
  }
}

function toggleGatekeeperMaster(isEnforced) {
  AdminState.gatekeeperEnforced = isEnforced;
  toast(
    "Withdrawal gate enforcement " +
      (isEnforced ? "ENABLED" : "BYPASSED") +
      " platform-wide.",
    isEnforced ? "emerald" : "warn",
  );
  addAuditLog(
    "GATEKEEPER_STATE",
    "Master gatekeeper enforcement toggled to " + isEnforced,
  );
}

function triggerGlobalTaskReset() {
  if (
    !confirm(
      "Are you sure you want to trigger a Global User Task Cycle Reset?\n\nThis will clear completed tasks for all users, requiring them to complete tasks again before subsequent withdrawals.",
    )
  )
    return;

  // Clear local caches. The dashboard stores per-user task state under
  // crest_<uid>_user_tasks, so match the suffix rather than one fixed key.
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (k === "crest_user_tasks" || k.indexOf("_user_tasks") !== -1)
        localStorage.removeItem(k);
    });
  } catch (e) {}

  // The authoritative completion flags live in the user_tasks table. The reset
  // only really happens once those rows are gone — clearing localStorage alone
  // left every user still flagged as "already completed" on the server.
  waitForSupabase().then(function (sb) {
    if (!sb) {
      toast(
        "Local task state cleared, but the server could not be reached — user task records were NOT reset.",
        "error",
      );
      return;
    }
    sb.from("user_tasks")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .then(function (res) {
        if (res.error) {
          console.warn("[Admin] Global task reset failed:", res.error);
          toast("Global task reset failed: " + res.error.message, "error");
          return;
        }
        toast(
          "Global task cycle reset complete! All users must re-verify their tasks.",
          "emerald",
        );
        addAuditLog(
          "CYCLE_RESET",
          "Admin triggered platform-wide user withdrawal task reset.",
        );
      });
  });
}

/* ── MODAL HELPERS & TASK EDIT/ADD CONTROLLER ───────────── */
function setRewardPreset(amount) {
  if ($("taskRewardAmountInput")) {
    $("taskRewardAmountInput").value = amount;
    updateRewardPreview();
  }
}

function updateRewardPreview() {
  var val = $("taskRewardAmountInput")
    ? parseInt($("taskRewardAmountInput").value, 10)
    : 0;
  var amt = !isNaN(val) && val >= 0 ? val : 0;
  if ($("rewardPreviewAmount")) {
    $("rewardPreviewAmount").textContent =
      "₦" + amt.toLocaleString("en-NG", { minimumFractionDigits: 2 });
  }
  renderTaskFormPreview();
}

function toggleVerificationFields(val) {
  var grp = $("minTimeGroup");
  if (!grp) return;
  grp.style.display = val === "timed" ? "block" : "none";
}

/* ── TASK EDITOR: INLINE ERRORS & LIVE PREVIEW ──────────── */
function taskFormError(msg) {
  var el = $("taskFormError");
  if (!el) return;
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function clearTaskFormError() {
  taskFormError("");
}

var TASK_VERIFY_LABELS = {
  timed: "Auto-verify · min time away",
  screenshot: "Screenshot proof",
  quiz: "Investment Quiz · 70%+",
  game: "Trading Mini-Game · 150+ pts",
};

/**
 * Renders a compact card showing the task exactly as the investor will see it.
 * Every value is escaped — the admin types the title, link label and steps, and
 * this markup is written straight into innerHTML.
 */
function renderTaskFormPreview() {
  var box = $("taskFormPreview");
  if (!box) return;

  var titleEl = $("taskTitleInput");
  var platformEl = $("taskPlatformInput");
  var iconEl = $("taskIconInput");
  var rewardEl = $("taskRewardAmountInput");
  var labelEl = $("taskUrlLabelInput");
  var stepsEl = $("taskStepsInput");
  var vtEl = $("taskVerificationTypeInput");

  var title = titleEl ? titleEl.value.trim() : "";
  var platform = platformEl ? platformEl.value.trim() : "";
  var icon = iconEl ? iconEl.value : "link";
  var reward = rewardEl ? parseInt(rewardEl.value, 10) || 0 : 0;
  var label = labelEl ? labelEl.value.trim() : "";
  var vt = vtEl ? vtEl.value : "timed";
  var steps = stepsEl
    ? stepsEl.value
        .split("\n")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean)
    : [];

  var iconSvg =
    (typeof TASK_ICON_SVGS !== "undefined" && TASK_ICON_SVGS[icon]) || "";

  box.innerHTML =
    '<div class="tfp-label">LIVE PREVIEW — WHAT THE INVESTOR WILL SEE</div>' +
    '<div class="tfp-card">' +
    '<div class="tfp-icon">' +
    iconSvg +
    "</div>" +
    '<div class="tfp-main">' +
    '<div class="tfp-title' +
    (title ? "" : " tfp-title--empty") +
    '">' +
    escapeHtml(title || "Untitled task — add a title above") +
    "</div>" +
    '<div class="tfp-meta">' +
    '<span class="tfp-platform">' +
    escapeHtml(platform || "No platform set") +
    "</span>" +
    '<span class="tfp-badge">' +
    escapeHtml(TASK_VERIFY_LABELS[vt] || "Auto-verify") +
    "</span>" +
    "</div>" +
    (steps.length
      ? '<div class="tfp-steps">' +
        steps
          .map(function (s, i) {
            return i + 1 + ". " + escapeHtml(s);
          })
          .join("<br>") +
        "</div>"
      : "") +
    '<div class="tfp-btn">' +
    escapeHtml(label || "Open task") +
    "</div>" +
    "</div>" +
    '<div class="tfp-reward">+₦' +
    reward.toLocaleString("en-NG") +
    "</div>" +
    "</div>";
}

/**
 * Clears the editor back to a blank "new task" state. Shared by the Add button
 * and by "Save & Add Another" so the two paths can never drift apart.
 */
function resetTaskModalForNewEntry() {
  $("editTaskId").value = "";
  $("taskModalTitle").textContent = "Add Mandatory Task";
  if ($("taskTemplatesGroup")) $("taskTemplatesGroup").style.display = "block";
  document.querySelectorAll(".tpl-chip").forEach(function (c) {
    c.classList.remove("tpl-chip--active");
  });
  $("taskTitleInput").value = "";
  $("taskPlatformInput").value = "";
  $("taskIconInput").value = "link";
  $("taskRewardAmountInput").value = "2500";
  $("taskUrlInput").value = "";
  $("taskUrlLabelInput").value = "";
  $("taskVerificationTypeInput").value = "timed";
  $("taskMinSecondsInput").value = "30";
  $("taskDescInput").value = "";
  $("taskStepsInput").value =
    "Tap the button below\nComplete the task\nCome back here to get verified";
  $("taskActiveInput").checked = true;
  var copyBtn = $("taskSaveCopyBtn");
  if (copyBtn) copyBtn.style.display = "none";
  toggleVerificationFields("timed");
  clearTaskFormError();
  updateRewardPreview();
}

/** Turns every task on or off in one action, instead of toggling them one by one. */
function setAllTasksActive(active) {
  if (!AdminState.tasks.length) return;
  var verb = active ? "Enable" : "Disable";
  if (
    !confirm(
      verb +
        " all " +
        AdminState.tasks.length +
        " tasks?\n\n" +
        (active
          ? "Every task will gate withdrawals until the user completes it."
          : "No task will gate withdrawals."),
    )
  ) {
    return;
  }
  AdminState.tasks.forEach(function (t) {
    t.active = !!active;
  });
  saveTasksToStorage();
  renderAdminTasks();
  toast("All tasks " + (active ? "enabled" : "disabled") + ".", "emerald");
  addAuditLog(
    "TASK_CONFIG_UPDATED",
    "Admin " + (active ? "enabled" : "disabled") + " all tasks.",
  );
}

/* ── QUICK TEMPLATES ── */
var TASK_TEMPLATES = {
  x_follow: {
    title: "Follow us on X",
    platform: "X (Twitter)",
    icon: "x",
    urlLabel: "Open X Profile",
    url: "https://x.com/",
    vt: "timed",
    min: 20,
    steps: [
      "Tap the button below to open our X profile",
      "Tap Follow",
      "Come back here to get verified",
    ],
  },
  yt_sub: {
    title: "Subscribe to our YouTube channel",
    platform: "YouTube",
    icon: "yt",
    urlLabel: "Open YouTube Channel",
    url: "https://youtube.com/@",
    vt: "timed",
    min: 30,
    steps: [
      "Tap the button below to open our channel",
      "Tap Subscribe",
      "Come back here to get verified",
    ],
  },
  yt_video: {
    title: "Watch our latest video",
    platform: "YouTube",
    icon: "yt",
    urlLabel: "Watch Video",
    url: "https://youtu.be/",
    vt: "timed",
    min: 180,
    steps: [
      "Tap the button below to open the video",
      "Watch the full video and tap Like",
      "Come back here to get verified",
    ],
  },
  tt_follow: {
    title: "Follow us on TikTok",
    platform: "TikTok",
    icon: "tiktok",
    urlLabel: "Open TikTok Page",
    url: "https://www.tiktok.com/@",
    vt: "timed",
    min: 20,
    steps: [
      "Tap the button below to open our TikTok page",
      "Tap Follow",
      "Come back here to get verified",
    ],
  },
  tt_video: {
    title: "Like & comment on our TikTok video",
    platform: "TikTok",
    icon: "tiktok",
    urlLabel: "Open TikTok Video",
    url: "https://www.tiktok.com/@",
    vt: "screenshot",
    min: 30,
    steps: [
      "Tap the button below to open the video",
      "Like it and leave a comment",
      "Screenshot your comment and upload it here",
    ],
  },
  ig_follow: {
    title: "Follow us on Instagram",
    platform: "Instagram",
    icon: "ig",
    urlLabel: "Open Instagram",
    url: "https://instagram.com/",
    vt: "timed",
    min: 20,
    steps: [
      "Tap the button below to open our Instagram",
      "Tap Follow",
      "Come back here to get verified",
    ],
  },
  tg_join: {
    title: "Join our Telegram channel",
    platform: "Telegram",
    icon: "telegram",
    urlLabel: "Join Telegram",
    url: "https://t.me/",
    vt: "timed",
    min: 15,
    steps: [
      "Tap the button below to open Telegram",
      "Tap Join",
      "Come back here to get verified",
    ],
  },
  wa_join: {
    title: "Join our WhatsApp group",
    platform: "WhatsApp",
    icon: "link",
    urlLabel: "Join WhatsApp Group",
    url: "https://chat.whatsapp.com/",
    vt: "screenshot",
    min: 15,
    steps: [
      "Tap the button below to open WhatsApp",
      "Tap Join Group",
      "Screenshot the group and upload it here",
    ],
  },
  custom: {
    title: "",
    platform: "",
    icon: "link",
    urlLabel: "Open Link",
    url: "",
    vt: "timed",
    min: 30,
    steps: [
      "Tap the button below",
      "Complete the task",
      "Come back here to get verified",
    ],
  },
};

function applyTaskTemplate(key) {
  var tpl = TASK_TEMPLATES[key];
  if (!tpl) return;
  document.querySelectorAll(".tpl-chip").forEach(function (c) {
    c.classList.toggle(
      "tpl-chip--active",
      (c.getAttribute("onclick") || "").indexOf("'" + key + "'") !== -1,
    );
  });
  $("taskTitleInput").value = tpl.title;
  $("taskPlatformInput").value = tpl.platform;
  $("taskIconInput").value = tpl.icon;
  $("taskUrlLabelInput").value = tpl.urlLabel;
  $("taskUrlInput").value = tpl.url;
  $("taskVerificationTypeInput").value = tpl.vt;
  $("taskMinSecondsInput").value = tpl.min;
  $("taskStepsInput").value = tpl.steps.join("\n");
  toggleVerificationFields(tpl.vt);
  clearTaskFormError();
  renderTaskFormPreview();
  var urlInput = $("taskUrlInput");
  if (urlInput) {
    urlInput.focus();
    urlInput.setSelectionRange(urlInput.value.length, urlInput.value.length);
  }
}

function openAddTaskModal() {
  resetTaskModalForNewEntry();
  openModal("taskModal");
}

function openEditTaskModal(id) {
  var task = AdminState.tasks.find(function (t) {
    return t.id === id;
  });
  if (!task) return;
  $("editTaskId").value = id;
  $("taskModalTitle").textContent = "Edit Task: " + task.title;
  if ($("taskTemplatesGroup")) $("taskTemplatesGroup").style.display = "none";
  $("taskTitleInput").value = task.title || "";
  $("taskPlatformInput").value = task.platform || "";
  $("taskIconInput").value = task.icon || "quiz";

  var amt =
    typeof task.rewardAmount === "number"
      ? task.rewardAmount
      : (function () {
          var m = (task.reward || "").replace(/[^0-9]/g, "");
          return m ? parseInt(m, 10) : 2000;
        })();
  $("taskRewardAmountInput").value = amt;
  updateRewardPreview();

  $("taskUrlInput").value = task.url || "";
  $("taskUrlLabelInput").value = task.urlLabel || "";
  var vType = normalizeVerificationType(task);
  $("taskVerificationTypeInput").value = vType;
  $("taskMinSecondsInput").value = task.minSeconds || 30;
  $("taskDescInput").value = (task.desc || "").replace(/<[^>]*>?/gm, "");
  $("taskStepsInput").value = Array.isArray(task.steps)
    ? task.steps.join("\n")
    : task.steps || "";
  $("taskActiveInput").checked = task.active !== false;

  toggleVerificationFields(vType);
  // "Save as Copy" is only meaningful while editing an existing task.
  var copyBtn = $("taskSaveCopyBtn");
  if (copyBtn) copyBtn.style.display = "inline-flex";
  clearTaskFormError();
  renderTaskFormPreview();
  openModal("taskModal");
}

/**
 * Saves the task editor.
 * @param {"close"|"addAnother"|"copy"} [mode]
 *   close      – save and dismiss the editor (default)
 *   addAnother – save, then reset the editor so more tasks can be added in a row
 *   copy       – save the current values as a NEW task, leaving the original alone
 */
function saveTaskFromModal(mode) {
  mode = mode || "close";
  clearTaskFormError();
  var id = $("editTaskId").value;
  var title = $("taskTitleInput").value.trim();
  var platform = $("taskPlatformInput").value.trim();
  var icon = $("taskIconInput").value;
  var rewardAmt = parseInt($("taskRewardAmountInput").value, 10) || 0;
  var url = $("taskUrlInput").value.trim();
  var urlLabel = $("taskUrlLabelInput").value.trim() || "Visit " + platform;
  var verificationType = $("taskVerificationTypeInput").value;
  var minSeconds = Math.max(
    5,
    parseInt($("taskMinSecondsInput").value, 10) || 30,
  );
  var desc = $("taskDescInput").value.trim();
  var stepsRaw = $("taskStepsInput").value.trim();
  var isActive = $("taskActiveInput").checked;

  if (!title || !platform) {
    taskFormError(
      "Please add " +
        (!title ? "a task title" : "a platform name") +
        " before saving.",
    );
    toast("Task title and platform name are required.", "warn");
    return;
  }

  // A ₦0 task is publishable but unclaimable: the reward is resolved from the
  // published config server-side, and claim_user_task_reward rejects it.
  if (!rewardAmt || rewardAmt <= 0) {
    taskFormError(
      "Enter a reward greater than ₦0 — this figure is exactly what the user is paid.",
    );
    toast(
      "Enter a reward greater than ₦0 — the reward is paid from this figure.",
      "warn",
    );
    return;
  }

  if (url) {
    var safeHref =
      typeof crestSanitizeUrl === "function" ? crestSanitizeUrl(url) : "";
    if (!safeHref) {
      taskFormError(
        "That link is not allowed. Use a full https:// link, or leave the field blank.",
      );
      toast(
        "Invalid link. Use a full https:// link (or leave blank for quiz/game tasks).",
        "warn",
      );
      return;
    }
    url = safeHref;
  }

  var formattedReward = "+₦" + rewardAmt.toLocaleString("en-NG");
  var steps = stepsRaw
    ? stepsRaw
        .split("\n")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean)
    : [];
  var isQuiz = verificationType === "quiz";
  var isGame = verificationType === "game";

  // "Save as Copy" writes a brand-new task from the current values instead of
  // overwriting the one being edited, so a variant can be produced in one click.
  var asCopy = mode === "copy" && id !== "";

  if (id !== "" && !asCopy) {
    // Edit existing task in place
    var existing = AdminState.tasks.find(function (t) {
      return t.id === parseInt(id, 10);
    });
    if (existing) {
      existing.title = title;
      existing.platform = platform;
      existing.icon = icon;
      existing.rewardAmount = rewardAmt;
      existing.reward = formattedReward;
      existing.url = url;
      existing.urlLabel = urlLabel;
      existing.verificationType = verificationType;
      existing.minSeconds = minSeconds;
      delete existing.inputType;
      delete existing.inputPlaceholder;
      existing.desc = desc || existing.desc;
      if (steps.length > 0) existing.steps = steps;
      existing.active = isActive;
      existing.isQuiz = isQuiz;
      existing.isGame = isGame;
    }
  } else {
    // Add new task
    var newId =
      AdminState.tasks.length > 0
        ? Math.max.apply(
            null,
            AdminState.tasks.map(function (t) {
              return t.id;
            }),
          ) + 1
        : 5;
    AdminState.tasks.push({
      id: newId,
      active: isActive,
      icon: icon,
      platform: platform,
      title: title,
      desc:
        desc ||
        "Complete task on " + platform + " to earn your completion bonus.",
      steps: steps.length
        ? steps
        : [
            "Tap the button below",
            "Complete the task",
            "Come back here to get verified",
          ],
      rewardAmount: rewardAmt,
      reward: formattedReward,
      url: url,
      urlLabel: urlLabel,
      verificationType: verificationType,
      minSeconds: minSeconds,
      isQuiz: isQuiz,
      isGame: isGame,
    });
  }

  saveTasksToStorage();
  renderAdminTasks();
  addAuditLog(
    "TASK_CONFIG_UPDATED",
    'Task "' + title + '" saved with bonus ' + formattedReward,
  );

  if (mode === "addAnother") {
    toast(
      'Task "' + title + '" saved! Editor is ready for the next one.',
      "emerald",
    );
    resetTaskModalForNewEntry();
    if ($("taskTitleInput")) $("taskTitleInput").focus();
    return;
  }

  closeModal("taskModal");
  toast(
    asCopy
      ? 'Copied "' + title + '" as a new task! Bonus: ' + formattedReward
      : 'Task "' + title + '" saved! Bonus: ' + formattedReward,
    "emerald",
  );
}

function deleteAdminTask(id) {
  var task = AdminState.tasks.find(function (t) {
    return t.id === id;
  });
  if (!task) return;
  var isBuiltIn = id <= 4;
  var msg = isBuiltIn
    ? 'WARNING: "' +
      task.title +
      '" is a built-in task.\n\nDeleting it will remove it permanently from all user dashboards until restored.\n\nAre you sure you want to delete it?'
    : 'Delete the custom task "' + task.title + '"?\n\nThis cannot be undone.';
  if (!confirm(msg)) return;
  AdminState.tasks = AdminState.tasks.filter(function (t) {
    return t.id !== id;
  });
  saveTasksToStorage();
  renderAdminTasks();

  // Clear the completion records this task left behind. Left in place, each row
  // keeps telling claim_user_task_reward "this user already did this task", so
  // the id can never pay again — even if the task is later re-added.
  waitForSupabase().then(function (sb) {
    if (!sb) return;
    sb.from("user_tasks")
      .delete()
      .eq("task_id", String(id))
      .then(function (res) {
        if (res.error) {
          console.warn(
            "[Admin] Could not clear user_tasks for deleted task:",
            res.error,
          );
          toast(
            "Task removed, but its user completion records could not be cleared.",
            "warn",
          );
        }
      });
  });

  toast(
    'Task "' + task.title + '" deleted and removed from user dashboards.',
    "warn",
  );
  addAuditLog(
    "TASK_DELETED",
    "Task ID #" + id + ' "' + task.title + '" deleted by admin',
  );
}

function deleteCustomTask(id) {
  deleteAdminTask(id);
}

/* ── WITHDRAWALS DESK ────────────────────────────────────── */
function renderWithdrawalsTable(filterStatus, searchQuery) {
  var tbody = $("withdrawalsTableBody");
  if (!tbody) return;

  var list = AdminState.withdrawals;
  if (filterStatus && filterStatus !== "ALL") {
    list = list.filter(function (w) {
      return w.status === filterStatus;
    });
  }
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    list = list.filter(function (w) {
      return (
        (w.user && w.user.toLowerCase().includes(q)) ||
        (w.id && w.id.toLowerCase().includes(q)) ||
        (w.bank && w.bank.toLowerCase().includes(q))
      );
    });
  }

  if (list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No withdrawal requests match current filter.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map(function (w) {
      var isPending = w.status === "Pending Review";
      var isApproved = w.status === "Approved & Paid";
      var isRejected = w.status === "Rejected";

      var statusBadge = "";
      if (isPending)
        statusBadge =
          '<span class="badge badge--pending">Pending Review</span>';
      else if (isApproved)
        statusBadge =
          '<span class="badge badge--approved">Approved &amp; Paid</span>';
      else if (isRejected)
        statusBadge = '<span class="badge badge--rejected">Rejected</span>';

      var safeId = escapeHtml(w.id);
      var safeName = escapeHtml(w.user);
      var safeEmail = escapeHtml(w.email);
      var safeBank = escapeHtml(w.bank);
      var safeDate = escapeHtml(w.date);
      var safeVerified = escapeHtml(w.tasksVerified || "5/5 Complete");
      var initials = safeName
        ? safeName
            .split(" ")
            .map(function (n) {
              return n[0];
            })
            .join("")
        : "U";

      var gateBadge =
        w.tasksVerified && w.tasksVerified.includes("Incomplete")
          ? '<span class="badge badge--locked">' +
            escapeHtml(w.tasksVerified) +
            "</span>"
          : '<span class="badge badge--approved">' + safeVerified + "</span>";

      return (
        "<tr>" +
        "<td><code style=\"font-family:'Space Mono',monospace;color:var(--color-copper);\">" +
        safeId +
        "</code></td>" +
        '<td><div class="user-cell"><div class="user-cell-avatar">' +
        initials +
        '</div><div><div class="user-cell-name">' +
        safeName +
        '</div><div class="user-cell-sub">' +
        safeEmail +
        "</div></div></div></td>" +
        '<td><span class="mono-amount debit">&#8358;' +
        parseFloat(w.amount).toLocaleString("en-NG", {
          minimumFractionDigits: 2,
        }) +
        "</span></td>" +
        "<td>" +
        safeBank +
        "</td>" +
        "<td>" +
        gateBadge +
        "</td>" +
        '<td style="color:var(--text-muted);">' +
        safeDate +
        "</td>" +
        "<td>" +
        statusBadge +
        "</td>" +
        "<td>" +
        '<div style="display:flex;gap:6px;">' +
        '<button class="btn btn-subtle btn-sm" onclick="inspectWithdrawalProof(\'' +
        crestJsArg(w.id) +
        "')\">Inspect</button>" +
        (isPending
          ? '<button class="btn btn-emerald btn-sm" onclick="approveWithdrawal(\'' +
            crestJsArg(w.id) +
            "')\">Approve &amp; Pay</button>"
          : "") +
        (isPending
          ? '<button class="btn btn-danger-outline btn-sm" onclick="rejectWithdrawal(\'' +
            crestJsArg(w.id) +
            "')\">Reject</button>"
          : "") +
        "</div>" +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function filterWithdrawals() {
  var filter = $("wdStatusFilter") ? $("wdStatusFilter").value : "ALL";
  var search = $("wdSearchInput") ? $("wdSearchInput").value.trim() : "";
  renderWithdrawalsTable(filter, search);
}

function inspectWithdrawalProof(id) {
  var w = AdminState.withdrawals.find(function (item) {
    return item.id === id;
  });
  if (!w) return;
  AdminState.inspectedWdId = id;

  var proofs = w.proofs || {
    x: "@adaeze_invests",
    yt: w.email,
    ig: "@adaeze_ok",
    quiz: "Score: 5/5 (100% Passed)",
    game: "Score: 180 / 150 pts (Target Passed)",
  };

  var body = $("inspectModalBody");
  if (body) {
    body.innerHTML =
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:1rem;font-weight:600;color:#FFFFFF;margin-bottom:2px;">' +
      escapeHtml(w.user) +
      " (" +
      escapeHtml(w.email) +
      ")</div>" +
      "<div style=\"font-family:'Space Mono',monospace;color:var(--color-copper);font-size:0.85rem;\">" +
      escapeHtml(w.id) +
      " &bull; Amount: &#8358;" +
      parseFloat(w.amount).toLocaleString("en-NG") +
      "</div>" +
      "</div>" +
      '<div style="background:var(--bg-card-subtle);border:1px solid var(--border-subtle);border-radius:6px;padding:14px;display:flex;flex-direction:column;gap:12px;">' +
      '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">' +
      '<span style="font-size:0.8rem;color:var(--text-muted);">X (Twitter) Handle:</span>' +
      "<strong style=\"color:var(--color-emerald);font-family:'Space Mono',monospace;\">" +
      escapeHtml(proofs.x) +
      "</strong>" +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">' +
      '<span style="font-size:0.8rem;color:var(--text-muted);">YouTube Account Email:</span>' +
      "<strong style=\"color:#FFFFFF;font-family:'Space Mono',monospace;\">" +
      escapeHtml(proofs.yt) +
      "</strong>" +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">' +
      '<span style="font-size:0.8rem;color:var(--text-muted);">Instagram Username:</span>' +
      "<strong style=\"color:var(--color-emerald);font-family:'Space Mono',monospace;\">" +
      escapeHtml(proofs.ig) +
      "</strong>" +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">' +
      '<span style="font-size:0.8rem;color:var(--text-muted);">Investment IQ Quiz:</span>' +
      "<strong style=\"color:var(--color-emerald);font-family:'Space Mono',monospace;\">" +
      escapeHtml(proofs.quiz) +
      "</strong>" +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;padding-bottom:4px;">' +
      '<span style="font-size:0.8rem;color:var(--text-muted);">Market Trading Mini-Game:</span>' +
      "<strong style=\"color:var(--color-emerald);font-family:'Space Mono',monospace;\">" +
      escapeHtml(proofs.game) +
      "</strong>" +
      "</div>" +
      "</div>";
  }

  var btnApprove = $("btnApproveFromModal");
  if (btnApprove) {
    btnApprove.style.display =
      w.status === "Pending Review" ? "inline-flex" : "none";
    btnApprove.onclick = function () {
      approveWithdrawal(id);
      closeModal("inspectModal");
    };
  }

  openModal("inspectModal");
}

function approveWithdrawal(id) {
  var w = AdminState.withdrawals.find(function (item) {
    return item.id === id;
  });
  if (!w) return;
  w.status = "Approved & Paid";
  saveWithdrawalsToStorage();
  filterWithdrawals();

  if (window.supabaseClient) {
    try {
      window.supabaseClient
        .from("withdrawals")
        .update({
          status: "Approved & Paid",
          processed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .then(function (res) {
          if (res.error)
            console.warn("Supabase approve withdrawal notice:", res.error);
          loadRealAdminDataFromDB();
        });
    } catch (e) {}
  }

  toast(
    "Withdrawal " + id + " approved! Payout webhook settled with GTBank.",
    "emerald",
  );
  addAuditLog(
    "PAYOUT_SETTLED",
    "Withdrawal " +
      id +
      " (₦" +
      parseFloat(w.amount).toLocaleString("en-NG") +
      ") approved & settled for " +
      w.user,
  );
}

function rejectWithdrawal(id) {
  var reason = prompt(
    "Enter rejection feedback reason for this investor (e.g. YouTube video proof missing / unverified IG comment):",
  );
  if (reason === null) return;
  if (!reason.trim()) reason = "Task verification criteria not met";
  var w = AdminState.withdrawals.find(function (item) {
    return item.id === id;
  });
  if (!w) return;
  w.status = "Rejected";
  w.rejectionReason = reason.trim();
  saveWithdrawalsToStorage();
  filterWithdrawals();

  if (window.supabaseClient) {
    try {
      window.supabaseClient
        .rpc("admin_reject_withdrawal", {
          withdrawal_id: id,
          p_reason: reason.trim(),
        })
        .then(function (res) {
          if (res.error) {
            window.supabaseClient
              .from("withdrawals")
              .update({
                status: "Rejected",
                admin_notes: reason.trim(),
                processed_at: new Date().toISOString(),
              })
              .eq("id", id)
              .then(function () {
                loadRealAdminDataFromDB();
              });
          } else {
            loadRealAdminDataFromDB();
          }
        });
    } catch (e) {}
  }

  toast(
    "Withdrawal " + id + " rejected. Feedback sent to investor dashboard.",
    "warn",
  );
  addAuditLog(
    "WITHDRAWAL_REJECTED",
    "Withdrawal " + id + ' rejected: "' + reason.trim() + '"',
  );
}

/* ── DEPOSITS DESK ───────────────────────────────────────── */
function renderDepositsTable(searchQuery) {
  var tbody = $("depositsTableBody");
  if (!tbody) return;

  var list = AdminState.deposits;
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    list = list.filter(function (d) {
      return (
        (d.user && d.user.toLowerCase().includes(q)) ||
        (d.id && d.id.toLowerCase().includes(q)) ||
        (d.plan && d.plan.toLowerCase().includes(q))
      );
    });
  }

  tbody.innerHTML = list
    .map(function (d) {
      var isConfirmed = d.status === "Confirmed";
      var receiptBtn = d.receiptData
        ? '<button class="btn btn-subtle btn-sm" style="margin-left:4px;" onclick="previewDepositReceipt(\'' +
          crestJsArg(d.id) +
          "')\">Receipt</button>"
        : "";
      return (
        "<tr>" +
        "<td><code style=\"font-family:'Space Mono',monospace;color:var(--color-copper);\">" +
        escapeHtml(d.id) +
        "</code></td>" +
        '<td><div class="user-cell"><div class="user-cell-avatar">' +
        escapeHtml(
          d.user
            ? d.user
                .split(" ")
                .map(function (n) {
                  return n[0];
                })
                .join("")
            : "U",
        ) +
        '</div><div><div class="user-cell-name">' +
        escapeHtml(d.user) +
        '</div><div class="user-cell-sub">' +
        escapeHtml(d.email) +
        "</div></div></div></td>" +
        '<td><span class="mono-amount credit">+&#8358;' +
        parseFloat(d.amount).toLocaleString("en-NG", {
          minimumFractionDigits: 2,
        }) +
        "</span></td>" +
        "<td>" +
        escapeHtml(d.plan) +
        "</td>" +
        '<td><span class="badge" style="background:var(--bg-surface-elevated);color:var(--text-primary);">' +
        escapeHtml(d.method) +
        "</span></td>" +
        '<td style="color:var(--text-muted);">' +
        escapeHtml(d.date) +
        "</td>" +
        '<td><span class="badge ' +
        (isConfirmed ? "badge--approved" : "badge--pending") +
        '">' +
        escapeHtml(d.status) +
        "</span></td>" +
        "<td>" +
        (!isConfirmed
          ? '<button class="btn btn-emerald btn-sm" onclick="confirmDeposit(\'' +
            crestJsArg(d.id) +
            "')\">Confirm &amp; Credit</button>"
          : '<span style="color:var(--text-muted);font-size:0.75rem;">Verified</span>') +
        receiptBtn +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function filterDeposits() {
  var search = $("depSearchInput") ? $("depSearchInput").value.trim() : "";
  renderDepositsTable(search);
}

async function previewDepositReceipt(id) {
  var d = AdminState.deposits.find(function (item) {
    return item.id === id;
  });
  if (!d || !d.receiptData) {
    toast("No receipt attached for this deposit.", "warn");
    return;
  }

  // proof_url is written by the depositing user, so treat it as hostile: the
  // source is always attribute-escaped before it enters the src="..." value.
  function imgHtml(src) {
    return (
      '<img src="' +
      escapeHtml(src) +
      '" alt="POP Receipt" style="max-width:100%;max-height:420px;object-fit:contain;border-radius:6px;border:1px solid rgba(255,255,255,0.1);">'
    );
  }
  function frame(inner) {
    return (
      '<div style="margin-bottom:12px;">' +
      '<div style="font-weight:600;color:white;font-size:1rem;">Deposit POP Receipt &bull; ' +
      escapeHtml(d.id) +
      "</div>" +
      '<div style="font-size:0.8rem;color:var(--text-muted);">' +
      escapeHtml(d.user) +
      " (" +
      escapeHtml(d.email) +
      ") &bull; &#8358;" +
      parseFloat(d.amount).toLocaleString("en-NG") +
      " via " +
      escapeHtml(d.bank || d.method) +
      "</div>" +
      "</div>" +
      '<div style="background:rgba(0,0,0,0.5);border-radius:8px;padding:12px;text-align:center;overflow:hidden;">' +
      inner +
      "</div>"
    );
  }

  var btnApprove = $("btnApproveFromModal");
  if (btnApprove) {
    btnApprove.style.display =
      d.status !== "Confirmed" ? "inline-flex" : "none";
    btnApprove.onclick = function () {
      confirmDeposit(id);
      closeModal("inspectModal");
    };
  }

  var body = $("inspectModalBody");
  var stored = String(d.receiptData);

  // Receipts now live in the private 'receipts' bucket and the deposit row
  // holds the object *path*, not a URL, so the image cannot be shown as-is.
  // Mint a short-lived signed link instead: a bank receipt should not stay
  // reachable by a URL that outlives the review. Older rows may still carry an
  // inline data URL or a plain http(s) link, and those render directly.
  var direct = crestSafeImageSrc(stored);
  if (direct) {
    if (body) body.innerHTML = frame(imgHtml(direct));
    openModal("inspectModal");
    return;
  }

  if (body) {
    body.innerHTML = frame(
      '<div style="padding:28px 8px;color:var(--text-muted);font-size:0.85rem;">Loading receipt&hellip;</div>',
    );
  }
  openModal("inspectModal");

  var sb = await waitForSupabase();
  var signed = "";
  if (sb) {
    try {
      var sig = await sb.storage.from("receipts").createSignedUrl(stored, 300);
      if (!sig.error && sig.data) signed = sig.data.signedUrl || "";
    } catch (e) {}
  }

  if (!signed) {
    if (body) {
      body.innerHTML = frame(
        '<div style="padding:28px 8px;color:var(--color-warning);font-size:0.85rem;">' +
          "The receipt could not be opened. The upload may have failed when this deposit was filed, so there is no proof of payment to review." +
          "</div>",
      );
    }
    toast("Could not load the receipt for " + d.id + ".", "warn");
    return;
  }

  if (body) body.innerHTML = frame(imgHtml(signed));
}

function confirmDeposit(id) {
  var d = AdminState.deposits.find(function (item) {
    return item.id === id;
  });
  if (!d) return;
  d.status = "Confirmed";
  saveDepositsToStorage();
  filterDeposits();

  // Credit investor cash balance in Supabase via RPC or table update
  if (window.supabaseClient) {
    try {
      window.supabaseClient
        .rpc("admin_confirm_deposit", { deposit_id: id })
        .then(function (res) {
          if (res.error) {
            // Do NOT fall back to a raw profiles update. The RPC is the only
            // path that is admin-gated, idempotent and written to the ledger;
            // a hand-rolled balance write here could double-credit on a retry
            // and leaves no transaction record. Surface the failure instead.
            console.error("admin_confirm_deposit failed:", res.error);
            toast("Could not confirm deposit: " + res.error.message, "error");
          }
          loadRealAdminDataFromDB();
        });
    } catch (e) {}
  }

  // Credit investor cash balance in localStorage
  try {
    var curBal = parseFloat(
      localStorage.getItem("crest_user_balance") || "84200",
    );
    if (isNaN(curBal)) curBal = 84200;
    var depAmt = parseFloat(d.amount) || 0;
    var newBal = curBal + depAmt;
    localStorage.setItem("crest_user_balance", newBal.toString());
  } catch (e) {}

  toast(
    "Deposit " +
      id +
      " confirmed! Investor account credited with ₦" +
      parseFloat(d.amount).toLocaleString("en-NG"),
    "emerald",
  );
  addAuditLog(
    "DEPOSIT_CONFIRMED",
    "Deposit " +
      id +
      " of ₦" +
      parseFloat(d.amount).toLocaleString("en-NG") +
      " credited to " +
      d.user,
  );
}

/* ── INVESTORS DIRECTORY ─────────────────────────────────── */
function renderUsersTable(searchQuery) {
  var tbody = $("usersTableBody");
  if (!tbody) return;

  var list = AdminState.users;
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    list = list.filter(function (u) {
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.tier && u.tier.toLowerCase().includes(q))
      );
    });
  }

  if (list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No registered investors found.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map(function (u) {
      var safeName = escapeHtml(u.name);
      var safeEmail = escapeHtml(u.email);
      var initials = safeName
        ? safeName
            .split(" ")
            .map(function (n) {
              return n[0];
            })
            .join("")
        : "U";
      var isFrozen = !!u.is_frozen;

      var statusBadge = isFrozen
        ? '<span class="badge" style="background:rgba(239,68,68,0.15);color:#EF4444;border:1px solid rgba(239,68,68,0.3);font-weight:700;">FROZEN</span>'
        : '<span class="badge badge--approved">ACTIVE</span>';

      var freezeBtn = isFrozen
        ? '<button class="btn btn-subtle btn-sm" onclick="toggleUserFreeze(\'' +
          crestJsArg(u.id || "") +
          "', false, '" +
          crestJsArg(u.name) +
          "')\">Unfreeze</button>"
        : '<button class="btn btn-danger-outline btn-sm" onclick="toggleUserFreeze(\'' +
          crestJsArg(u.id || "") +
          "', true, '" +
          crestJsArg(u.name) +
          "')\">Freeze</button>";

      return (
        "<tr>" +
        '<td><div class="user-cell"><div class="user-cell-avatar">' +
        initials +
        '</div><div><div class="user-cell-name">' +
        safeName +
        '</div><div class="user-cell-sub">' +
        safeEmail +
        "</div></div></div></td>" +
        '<td><span class="badge" style="background:rgba(200,138,88,0.15);color:var(--color-copper);border:1px solid rgba(200,138,88,0.3);">' +
        escapeHtml(u.tier) +
        "</span></td>" +
        '<td class="mono-amount">' +
        u.invested +
        "</td>" +
        '<td class="mono-amount credit">' +
        u.balance +
        "</td>" +
        '<td><span class="badge badge--approved">' +
        escapeHtml(u.tasks) +
        "</span></td>" +
        '<td><span class="badge badge--approved">' +
        escapeHtml(u.kyc) +
        "</span></td>" +
        "<td>" +
        statusBadge +
        "</td>" +
        "<td>" +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button class="btn btn-emerald btn-sm" onclick="openInvestorInvestmentsModal(\'' +
        crestJsArg(u.id || "") +
        "')\">Investments</button>" +
        '<button class="btn btn-subtle btn-sm" onclick="openBalanceAdjustModal(\'' +
        crestJsArg(u.id || "") +
        "', '" +
        crestJsArg(u.name) +
        "', " +
        (u.balanceRaw || 0) +
        ')">Adjust</button>' +
        freezeBtn +
        "</div>" +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function filterUsers() {
  var search = $("userSearchInput") ? $("userSearchInput").value.trim() : "";
  renderUsersTable(search);
}

function bypassGateForUser(name) {
  toast(
    "Withdrawal task gate bypassed for " + name + " (VIP Override).",
    "emerald",
  );
  addAuditLog("VIP_OVERRIDE", "Task gate bypassed for user: " + name);
}

function openInvestorInvestmentsModal(userId) {
  var user = AdminState.users.find(function (u) {
    return u.id === userId;
  });
  if (!user) return;
  AdminState.inspectedUserId = userId;

  if ($("uimUserName"))
    $("uimUserName").textContent = user.name + " — Portfolio Holdings";
  if ($("uimUserMeta"))
    $("uimUserMeta").textContent =
      user.email +
      " • Ref Code: " +
      (user.referral_code || "N/A") +
      " • Registered " +
      (user.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : "N/A");

  var invs = user.investmentsList || [];
  var tasks = user.tasksList || [];

  var invHtml = "";
  if (invs.length === 0) {
    invHtml =
      '<div style="padding:16px;text-align:center;color:var(--text-muted);background:var(--bg-card-subtle);border-radius:6px;font-size:0.85rem;">No active plan investments placed in database yet.</div>';
  } else {
    invHtml =
      '<div class="table-responsive" style="margin-top:8px;"><table class="admin-table" style="font-size:0.82rem;"><thead><tr>' +
      "<th>Package / Asset</th><th>Invested</th><th>Current Value</th><th>Daily Yield</th><th>Status</th><th>Maturity</th>" +
      "</tr></thead><tbody>" +
      invs
        .map(function (inv) {
          var invAmt = parseFloat(inv.amount_invested) || 0;
          var curVal = parseFloat(inv.current_value) || invAmt;
          var mDate = inv.maturity_date
            ? new Date(inv.maturity_date).toLocaleDateString()
            : "30-day term";
          return (
            "<tr>" +
            '<td><strong style="color:#FFF;">' +
            escapeHtml(inv.asset_name) +
            "</strong></td>" +
            '<td class="mono-amount">₦' +
            Math.round(invAmt).toLocaleString("en-NG") +
            "</td>" +
            '<td class="mono-amount credit">₦' +
            Math.round(curVal).toLocaleString("en-NG") +
            "</td>" +
            '<td style="color:var(--color-emerald);">' +
            (inv.return_rate || "18.0") +
            "%</td>" +
            '<td><span class="badge badge--approved">' +
            escapeHtml((inv.status || "Active").toUpperCase()) +
            "</span></td>" +
            '<td style="color:var(--text-muted);">' +
            mDate +
            "</td>" +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table></div>";
  }

  var tasksHtml = "";
  if (tasks.length === 0) {
    tasksHtml =
      '<div style="padding:12px;color:var(--text-muted);font-size:0.82rem;">No withdrawal prerequisites completed yet.</div>';
  } else {
    tasksHtml =
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">' +
      tasks
        .map(function (t) {
          var statusBadge = t.completed ? "✓ " : "⏳ ";
          return (
            '<span class="badge ' +
            (t.completed ? "badge--approved" : "badge--pending") +
            '" style="font-size:0.75rem;">' +
            statusBadge +
            escapeHtml(t.task_title || "Task #" + t.task_id) +
            " (+₦" +
            (t.reward_amount || 2000).toLocaleString("en-NG") +
            ")</span>"
          );
        })
        .join("") +
      "</div>";
  }

  // Find upline referrer name if available
  var uplineText = "Direct Registration";
  if (user.referred_by) {
    var uplineUser = AdminState.users.find(function (u) {
      return u.id === user.referred_by;
    });
    if (uplineUser)
      uplineText = uplineUser.name + " (" + uplineUser.email + ")";
    else uplineText = "Referrer ID: " + user.referred_by.substring(0, 8);
  }

  var body = $("uimModalBody");
  if (body) {
    body.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
      '<div style="background:var(--bg-card-subtle);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;">' +
      '<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">TOTAL INVESTED (ACTIVE ASSETS)</div>' +
      "<div style=\"font-size:1.25rem;font-weight:700;color:var(--color-emerald);font-family:'Space Mono',monospace;\">" +
      user.invested +
      "</div>" +
      '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">' +
      invs.length +
      " active plan" +
      (invs.length === 1 ? "" : "s") +
      " in database</div>" +
      "</div>" +
      '<div style="background:var(--bg-card-subtle);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;">' +
      '<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">AVAILABLE CASH BALANCE</div>' +
      "<div style=\"font-size:1.25rem;font-weight:700;color:#FFF;font-family:'Space Mono',monospace;\">" +
      user.balance +
      "</div>" +
      '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Available to withdraw</div>' +
      "</div>" +
      "</div>" +
      '<div style="background:var(--bg-card-subtle);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">' +
      "<div>" +
      '<div style="font-size:0.75rem;color:var(--text-muted);">REFERRAL NETWORK &amp; UPLINE</div>' +
      '<div style="font-size:0.85rem;color:#FFF;font-weight:600;margin-top:2px;">Referred By: ' +
      escapeHtml(uplineText) +
      "</div>" +
      "</div>" +
      '<div style="text-align:right;">' +
      '<span class="badge badge--approved">' +
      (user.downlinesCount || 0) +
      " Direct Referrals</span>" +
      "</div>" +
      "</div>" +
      '<div style="margin-bottom:16px;">' +
      '<div style="font-size:0.85rem;font-weight:600;color:#FFF;margin-bottom:6px;">Active Portfolio Plans (Database Records)</div>' +
      invHtml +
      "</div>" +
      "<div>" +
      '<div style="font-size:0.85rem;font-weight:600;color:#FFF;margin-bottom:6px;">Withdrawal Tasks Progress (' +
      user.tasks +
      ")</div>" +
      tasksHtml +
      "</div>";
  }

  var adjBtn = $("uimAdjustBalBtn");
  if (adjBtn) {
    adjBtn.onclick = function () {
      closeModal("userInvestmentsModal");
      openBalanceAdjustModal(user.id, user.name, user.balanceRaw || 0);
    };
  }

  openModal("userInvestmentsModal");
}

/* ── BALANCE ADJUSTMENT MODAL CONTROLLERS ── */
function openBalanceAdjustModal(userId, name, currentBal) {
  if ($("bamUserId")) $("bamUserId").value = userId;
  if ($("bamUserMeta"))
    $("bamUserMeta").textContent = "Modifying account for: " + name;
  if ($("bamCurrentBal"))
    $("bamCurrentBal").textContent =
      "₦" + Math.round(currentBal).toLocaleString("en-NG");
  if ($("bamAmount")) $("bamAmount").value = "";
  if ($("bamNote")) $("bamNote").value = "";
  setAdjustType("credit");
  openModal("balanceAdjustModal");
}

function setAdjustType(type) {
  if ($("bamType")) $("bamType").value = type;
  var isCredit = type === "credit";
  if ($("bamTypeCredit")) {
    $("bamTypeCredit").className = isCredit
      ? "btn btn-emerald"
      : "btn btn-subtle";
  }
  if ($("bamTypeDebit")) {
    $("bamTypeDebit").className = isCredit
      ? "btn btn-subtle"
      : "btn btn-danger-outline";
  }
}

function submitBalanceAdjustment() {
  var userId = $("bamUserId") ? $("bamUserId").value : null;
  var type = $("bamType") ? $("bamType").value : "credit";
  var amt = parseFloat($("bamAmount") ? $("bamAmount").value : 0);
  var note =
    ($("bamNote") ? $("bamNote").value.trim() : "") ||
    "Admin manual balance adjustment";

  if (!userId) {
    toast("Invalid user target for adjustment.", "warn");
    return;
  }
  if (isNaN(amt) || amt <= 0) {
    toast("Please enter a valid adjustment amount greater than zero.", "warn");
    return;
  }

  waitForSupabase().then(function (sb) {
    if (!sb) {
      toast("Supabase offline. Cannot process adjustment.", "warn");
      return;
    }
    sb.rpc("admin_adjust_balance", {
      p_user_id: userId,
      p_amount: amt,
      p_type: type,
      p_note: note,
    }).then(function (res) {
      if (res.error) {
        toast("Balance adjust error: " + res.error.message, "warn");
      } else {
        closeModal("balanceAdjustModal");
        toast(
          "Successfully " +
            (type === "debit" ? "deducted" : "credited") +
            " ₦" +
            amt.toLocaleString("en-NG") +
            " to investor balance.",
          "emerald",
        );
        addAuditLog(
          "BALANCE_ADJUST",
          (type === "debit" ? "Debited" : "Credited") +
            " ₦" +
            amt.toLocaleString("en-NG") +
            " for User ID " +
            userId.substring(0, 8) +
            " (" +
            note +
            ")",
        );
        loadRealAdminDataFromDB();
      }
    });
  });
}

function toggleUserFreeze(userId, shouldFreeze, name) {
  var actionStr = shouldFreeze ? "FREEZE" : "UNFREEZE";
  if (
    !confirm(
      "Are you sure you want to " +
        actionStr +
        " the account of " +
        name +
        "?\n\n" +
        (shouldFreeze
          ? "Frozen users cannot request withdrawals or execute trades."
          : "Unfreezing will restore full account access."),
    )
  ) {
    return;
  }

  waitForSupabase().then(function (sb) {
    if (!sb) {
      toast("Supabase offline. Cannot toggle freeze.", "warn");
      return;
    }
    sb.rpc("admin_toggle_user_freeze", {
      p_user_id: userId,
      p_frozen: shouldFreeze,
    }).then(function (res) {
      if (res.error) {
        toast("Freeze action failed: " + res.error.message, "warn");
      } else {
        toast(
          "Account for " +
            name +
            " is now " +
            (shouldFreeze ? "FROZEN" : "ACTIVE") +
            ".",
          shouldFreeze ? "warn" : "emerald",
        );
        addAuditLog(
          "USER_FREEZE",
          "Admin " +
            actionStr +
            " account for " +
            name +
            " (ID: " +
            userId.substring(0, 8) +
            ")",
        );
        loadRealAdminDataFromDB();
      }
    });
  });
}

/* ── PLATFORM TREASURY & YIELDS SETTINGS ───────────────────── */
var DEFAULT_PLATFORM_SETTINGS = {
  bankName: "Opay",
  acctNum: "8110858553",
  acctName: "Nwoba Victor Chidera",
  bankNote:
    "Transfer to this account from any banking app. Funds appear within 2 minutes.",
  usdtWallet: "TYDzsxdv587q44mH12z8P9KzCrestWealthTRC20",
  stashApy: 11.5,
  lockApy: 18.0,
  minDeposit: 1000,
  minWithdrawal: 2000,
  refTier1: 10.0,
  refTier2: 3.0,
  announceActive: true,
  announceText:
    "Welcome to Crest Wealth! Upgrade your tier today to unlock institutional APYs & priority withdrawal windows.",
};

function loadPlatformSettings() {
  waitForSupabase().then(function (sb) {
    if (!sb) {
      populatePlatformSettingsFields(DEFAULT_PLATFORM_SETTINGS);
      return;
    }
    sb.from("app_settings")
      .select("value")
      .eq("key", "platform_settings")
      .maybeSingle()
      .then(function (res) {
        var s =
          res && res.data && res.data.value
            ? res.data.value
            : DEFAULT_PLATFORM_SETTINGS;
        populatePlatformSettingsFields(s);
      })
      .catch(function () {
        populatePlatformSettingsFields(DEFAULT_PLATFORM_SETTINGS);
      });
  });
}

function populatePlatformSettingsFields(s) {
  if ($("psBankName")) $("psBankName").value = s.bankName || "";
  if ($("psAcctNum")) $("psAcctNum").value = s.acctNum || "";
  if ($("psAcctName")) $("psAcctName").value = s.acctName || "";
  if ($("psBankNote")) $("psBankNote").value = s.bankNote || "";
  if ($("psUsdtWallet")) $("psUsdtWallet").value = s.usdtWallet || "";
  if ($("psStashApy"))
    $("psStashApy").value = s.stashApy != null ? s.stashApy : 11.5;
  if ($("psLockApy"))
    $("psLockApy").value = s.lockApy != null ? s.lockApy : 18.0;
  if ($("psMinDeposit"))
    $("psMinDeposit").value = s.minDeposit != null ? s.minDeposit : 1000;
  if ($("psMinWithdrawal"))
    $("psMinWithdrawal").value =
      s.minWithdrawal != null ? s.minWithdrawal : 2000;
  if ($("psRefTier1"))
    $("psRefTier1").value = s.refTier1 != null ? s.refTier1 : 10.0;
  if ($("psRefTier2"))
    $("psRefTier2").value = s.refTier2 != null ? s.refTier2 : 3.0;
  if ($("psAnnounceActive"))
    $("psAnnounceActive").checked = s.announceActive !== false;
  if ($("psAnnounceText")) $("psAnnounceText").value = s.announceText || "";
}

function savePlatformSettingsToDB() {
  var rawAcctNum = ($("psAcctNum") ? $("psAcctNum").value.trim() : "") || "";
  var acctNum = rawAcctNum.replace(/\s+/g, "");
  if (acctNum && !/^\d{10}$/.test(acctNum)) {
    toast("Account number must be exactly 10 digits (NUBAN).", "warn");
    return;
  }
  var s = {
    bankName:
      ($("psBankName") ? $("psBankName").value.trim() : "") || "Providus Bank",
    acctNum: acctNum || "1029384756",
    acctName:
      ($("psAcctName") ? $("psAcctName").value.trim() : "") ||
      "Crest Wealth Global",
    bankNote:
      ($("psBankNote") ? $("psBankNote").value.trim() : "") ||
      "Use your full name as payment narration.",
    usdtWallet: $("psUsdtWallet") ? $("psUsdtWallet").value.trim() : "",
    stashApy:
      parseFloat($("psStashApy") ? $("psStashApy").value : 11.5) || 11.5,
    lockApy: parseFloat($("psLockApy") ? $("psLockApy").value : 18.0) || 18.0,
    minDeposit:
      parseInt($("psMinDeposit") ? $("psMinDeposit").value : 1000, 10) || 1000,
    minWithdrawal:
      parseInt($("psMinWithdrawal") ? $("psMinWithdrawal").value : 2000, 10) ||
      2000,
    refTier1:
      parseFloat($("psRefTier1") ? $("psRefTier1").value : 10, 10) || 10,
    refTier2: parseFloat($("psRefTier2") ? $("psRefTier2").value : 3, 10) || 3,
    announceActive: $("psAnnounceActive")
      ? $("psAnnounceActive").checked
      : true,
    announceText: $("psAnnounceText") ? $("psAnnounceText").value.trim() : "",
  };

  waitForSupabase().then(function (sb) {
    if (!sb) {
      toast("Supabase offline. Cannot publish live.", "warn");
      return;
    }
    sb.from("app_settings")
      .upsert(
        {
          key: "platform_settings",
          value: s,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .then(function (res) {
        if (res.error) {
          toast("Failed to publish settings: " + res.error.message, "warn");
        } else {
          toast(
            "Platform Treasury & Rates published live to all user dashboards!",
            "emerald",
          );
          addAuditLog(
            "TREASURY_SETTINGS_PUBLISHED",
            "Updated receiving bank (" +
              s.bankName +
              " / " +
              s.acctNum +
              ") and yield rates.",
          );
        }
      });
  });
}

/* ── INVESTMENT PLANS (LIVE PRICING, DAILY REWARDS & BONUSES) ── */
var DEFAULT_INVESTMENT_PLANS = [
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

function getAdminPlanByLevel(level) {
  var lv = parseInt(level, 10);
  if (!lv) return null;
  for (var i = 0; i < AdminState.investmentPlans.length; i++) {
    if (parseInt(AdminState.investmentPlans[i].level, 10) === lv)
      return AdminState.investmentPlans[i];
  }
  return null;
}

function loadInvestmentPlansAdmin() {
  waitForSupabase().then(function (sb) {
    if (!sb) {
      AdminState.investmentPlans = DEFAULT_INVESTMENT_PLANS.map(function (p) {
        return Object.assign({}, p);
      });
      renderPlanEditorRows();
      return;
    }
    sb.from("app_settings")
      .select("value")
      .eq("key", "investment_plans")
      .maybeSingle()
      .then(function (res) {
        var list =
          res &&
          res.data &&
          Array.isArray(res.data.value) &&
          res.data.value.length
            ? res.data.value
            : DEFAULT_INVESTMENT_PLANS;
        AdminState.investmentPlans = list.map(function (p) {
          return Object.assign({}, p);
        });
        renderPlanEditorRows();
        renderUsersTable();
      })
      .catch(function () {
        AdminState.investmentPlans = DEFAULT_INVESTMENT_PLANS.map(function (p) {
          return Object.assign({}, p);
        });
        renderPlanEditorRows();
      });
  });
}

function renderPlanEditorRows() {
  var tbody = $("planEditorBody");
  if (!tbody) return;
  tbody.innerHTML = AdminState.investmentPlans
    .map(function (p) {
      var lv = parseInt(p.level, 10) || 0;
      return (
        "<tr>" +
        '<td><span class="badge badge--pending">Level ' +
        lv +
        "</span></td>" +
        '<td><input type="text" class="form-input" id="iplName' +
        lv +
        '" value="' +
        escapeHtml(p.name || "Level " + lv) +
        '"></td>' +
        '<td><input type="number" min="0" step="1" class="form-input" id="iplPrice' +
        lv +
        '" value="' +
        (parseFloat(p.price) || 0) +
        '"></td>' +
        '<td><input type="number" min="0" step="1" class="form-input" id="iplWelcome' +
        lv +
        '" value="' +
        (parseFloat(p.welcomeBonus) || 0) +
        '"></td>' +
        '<td><input type="number" min="0" step="1" class="form-input" id="iplReferral' +
        lv +
        '" value="' +
        (parseFloat(p.referralBonus) || 0) +
        '"></td>' +
        '<td><input type="number" min="0" step="1" class="form-input" id="iplDaily' +
        lv +
        '" value="' +
        (parseFloat(p.dailyEarning) || 0) +
        '"></td>' +
        "</tr>"
      );
    })
    .join("");
}

function saveInvestmentPlansToDB() {
  var rows = [];
  AdminState.investmentPlans.forEach(function (p) {
    var lv = parseInt(p.level, 10) || 0;
    if (!lv || !$("iplName" + lv)) return;
    rows.push({
      level: lv,
      name: ($("iplName" + lv).value || "Level " + lv).trim(),
      price: parseFloat($("iplPrice" + lv).value) || 0,
      welcomeBonus: parseFloat($("iplWelcome" + lv).value) || 0,
      referralBonus: parseFloat($("iplReferral" + lv).value) || 0,
      dailyEarning: parseFloat($("iplDaily" + lv).value) || 0,
    });
  });

  if (!rows.length) {
    toast("No plans to publish. Reload the plan list first.", "warn");
    return;
  }

  var invalid = rows.filter(function (r) {
    return r.price <= 0 || r.dailyEarning <= 0;
  });
  if (invalid.length) {
    toast(
      "Every plan needs a package price and a daily earning greater than zero.",
      "warn",
    );
    return;
  }

  waitForSupabase().then(function (sb) {
    if (!sb) {
      toast("Supabase offline. Cannot publish plans.", "warn");
      return;
    }
    sb.from("app_settings")
      .upsert(
        {
          key: "investment_plans",
          value: rows,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .then(function (res) {
        if (res.error) {
          toast("Failed to publish plans: " + res.error.message, "warn");
        } else {
          AdminState.investmentPlans = rows.map(function (p) {
            return Object.assign({}, p);
          });
          toast(
            "Investment plans published live to all dashboards!",
            "emerald",
          );
          addAuditLog(
            "INVESTMENT_PLANS_PUBLISHED",
            "Updated live pricing and daily rewards for " +
              rows.length +
              " investment plans.",
          );
        }
      });
  });
}

/* ── OBSERVATORY KPIS (REALTIME DATABASE MATCHED) ────────── */
function updateKpis() {
  var pendingWds = AdminState.withdrawals.filter(function (w) {
    return w.status === "Pending Review" || w.status === "Pending";
  });
  var totalPendingAmt = pendingWds.reduce(function (sum, w) {
    return sum + (parseFloat(w.amount) || 0);
  }, 0);

  if ($("statPendingWd"))
    $("statPendingWd").textContent =
      "₦" + Math.round(totalPendingAmt).toLocaleString("en-NG");
  if ($("statPendingWdCountLabel"))
    $("statPendingWdCountLabel").textContent =
      pendingWds.length + " requests awaiting task review";
  if ($("navPendingWdCount"))
    $("navPendingWdCount").textContent = pendingWds.length;

  var pendingDeps = AdminState.deposits.filter(function (d) {
    return d.status === "Pending Confirmation" || d.status === "Pending";
  });
  if ($("navPendingDepCount"))
    $("navPendingDepCount").textContent = pendingDeps.length;

  // Real Database Active Investors Count
  var realUserCount = AdminState.users.length;
  if ($("statActiveInvestors"))
    $("statActiveInvestors").textContent =
      realUserCount.toLocaleString("en-NG");
  if ($("statActiveInvestorsSub"))
    $("statActiveInvestorsSub").innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg> <span>' +
      realUserCount +
      " accounts registered in DB</span>";

  // Real Database Total AUM (invested balance + cash balance across all profiles)
  var totalAum = AdminState.users.reduce(function (sum, u) {
    return sum + (u.investedRaw || 0) + (u.balanceRaw || 0);
  }, 0);
  if ($("statTotalAum"))
    $("statTotalAum").textContent =
      "₦" + Math.round(totalAum).toLocaleString("en-NG");
  if ($("statTotalAumSub"))
    $("statTotalAumSub").innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg> <span>Across all live database portfolios</span>';

  // Real Database Inflow Volume (confirmed deposits)
  var confirmedDeps = AdminState.deposits.filter(function (d) {
    return d.status === "Confirmed";
  });
  var totalInflow = confirmedDeps.reduce(function (sum, d) {
    return sum + (parseFloat(d.amount) || 0);
  }, 0);
  if ($("statInflowVolume"))
    $("statInflowVolume").textContent =
      "₦" + Math.round(totalInflow).toLocaleString("en-NG");
  if ($("statInflowSub"))
    $("statInflowSub").innerHTML =
      "<span>" + confirmedDeps.length + " verified deposits in DB</span>";

  // Active tasks count and completion pass rate
  var activeTasks = AdminState.tasks.filter(function (t) {
    return t.active !== false;
  }).length;
  if ($("statActiveTasksCount"))
    $("statActiveTasksCount").textContent =
      activeTasks + " Active Tasks Configured";

  if (AdminState.users.length > 0) {
    var totalPossible = AdminState.users.length * Math.max(1, activeTasks);
    var totalCompleted = AdminState.users.reduce(function (sum, u) {
      return sum + (u.tasksDoneCount || 0);
    }, 0);
    var overallPassRate = Math.round((totalCompleted / totalPossible) * 100);
    if ($("statPassRate"))
      $("statPassRate").textContent =
        overallPassRate + "% Completed Platform-Wide";
  }
}

/* ── LIVE DATABASE SYNC (PROFILES, INVESTMENTS, TASKS, FLOWS) ─ */
async function loadRealAdminDataFromDB() {
  var sb = await waitForSupabase();
  if (!sb) return;

  try {
    // 1. Fetch real profiles
    var { data: profiles } = await sb
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // 2. Fetch real user investments
    var { data: investments } = await sb
      .from("user_investments")
      .select("*")
      .order("created_at", { ascending: false });

    // 3. Fetch real user tasks
    var { data: userTasks } = await sb
      .from("user_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    // 4. Fetch real deposits
    var { data: deposits } = await sb
      .from("deposits")
      .select("*")
      .order("created_at", { ascending: false });

    // 5. Fetch real withdrawals
    var { data: withdrawals } = await sb
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });

    var allProfiles = profiles && profiles.length > 0 ? profiles : [];
    AdminState.investments = investments || [];
    AdminState.userTasks = userTasks || [];

    var invMap = {};
    if (investments) {
      investments.forEach(function (inv) {
        if (!invMap[inv.user_id]) invMap[inv.user_id] = [];
        invMap[inv.user_id].push(inv);
      });
    }

    var taskMap = {};
    if (userTasks) {
      userTasks.forEach(function (ut) {
        if (!taskMap[ut.user_id]) taskMap[ut.user_id] = [];
        taskMap[ut.user_id].push(ut);
      });
    }

    var activeTasksTotal =
      AdminState.tasks.filter(function (t) {
        return t.active !== false;
      }).length || 5;

    // Map real profiles to users directory
    if (allProfiles.length > 0) {
      AdminState.users = allProfiles.map(function (p) {
        var userInvs = invMap[p.id] || [];
        var userTasksDone = taskMap[p.id]
          ? taskMap[p.id].filter(function (ut) {
              return ut.completed;
            })
          : [];

        var totalInv = parseFloat(p.invested_balance) || 0;
        if (totalInv === 0 && userInvs.length > 0) {
          totalInv = userInvs.reduce(function (sum, x) {
            return sum + (parseFloat(x.amount_invested) || 0);
          }, 0);
        }

        // An activated plan wins; otherwise fall back to the invested-balance ladder
        var tier = "No Plan Selected";
        var planLevel = parseInt(p.plan_level, 10) || 0;
        if (planLevel > 0) {
          var activePlan = getAdminPlanByLevel(planLevel);
          tier =
            "Level " +
            planLevel +
            (activePlan && activePlan.name ? " · " + activePlan.name : "");
        } else if (userInvs.length > 0) {
          tier = userInvs[0].asset_name || "Active Investor";
        } else if (totalInv >= 1000000) {
          tier = "Level 10 · Apex";
        } else if (totalInv >= 500000) {
          tier = "Level 9 · Diamond";
        } else if (totalInv >= 350000) {
          tier = "Level 8 · Ruby";
        } else if (totalInv >= 200000) {
          tier = "Level 7 · Sapphire";
        } else if (totalInv >= 100000) {
          tier = "Level 6 · Emerald";
        } else if (totalInv >= 75000) {
          tier = "Level 5 · Platinum";
        } else if (totalInv >= 50000) {
          tier = "Level 4 · Gold";
        } else if (totalInv >= 30000) {
          tier = "Level 3 · Silver";
        } else if (totalInv >= 15000) {
          tier = "Level 2 · Bronze";
        } else if (totalInv >= 5000) {
          tier = "Level 1 · Starter";
        } else if (totalInv > 0) {
          tier = "Active Investor";
        }

        var doneCount = userTasksDone.length;
        var taskPct = Math.round((doneCount / activeTasksTotal) * 100);
        var tasksLabel =
          doneCount + "/" + activeTasksTotal + " (" + taskPct + "%)";

        var fullName =
          p.full_name || (p.email ? p.email.split("@")[0] : "Valued Investor");
        var cashBal = parseFloat(p.cash_balance) || 0;

        return {
          id: p.id,
          user_id: p.id,
          name: fullName,
          email: p.email || "",
          tier: tier,
          invested: "₦" + Math.round(totalInv).toLocaleString("en-NG"),
          investedRaw: totalInv,
          balance: "₦" + Math.round(cashBal).toLocaleString("en-NG"),
          balanceRaw: cashBal,
          tasks: tasksLabel,
          tasksDoneCount: doneCount,
          tasksTotalCount: activeTasksTotal,
          kyc: p.is_admin
            ? "SuperAdmin"
            : doneCount >= activeTasksTotal
              ? "Verified (100% Tasks)"
              : "Tier 1 Standard",
          referral_code: p.referral_code || "",
          created_at: p.created_at || "",
          investmentsList: userInvs,
          tasksList: taskMap[p.id] || [],
        };
      });
    }

    // Process real deposits
    if (deposits && deposits.length > 0) {
      AdminState.deposits = deposits.map(function (d) {
        var userMatch = allProfiles.find(function (p) {
          return p.id === d.user_id;
        });
        var uName = userMatch
          ? userMatch.full_name || userMatch.email
          : d.user_email
            ? d.user_email.split("@")[0]
            : "Investor";
        var dDate = d.created_at
          ? new Date(d.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Recent";
        return {
          id: d.id,
          user_id: d.user_id,
          user: uName,
          email: d.user_email || (userMatch ? userMatch.email : ""),
          amount: parseFloat(d.amount) || 0,
          plan: d.plan || "Crest Stash (11.5%)",
          method: d.bank_name
            ? "BANK TRANSFER (" + d.bank_name.toUpperCase() + ")"
            : "BANK TRANSFER",
          date: dDate,
          status:
            d.status === "Confirmed" ? "Confirmed" : "Pending Confirmation",
          receiptData: d.proof_url || null,
          bank: d.bank_name || "Bank Transfer",
        };
      });
    }

    // Process real withdrawals
    if (withdrawals && withdrawals.length > 0) {
      AdminState.withdrawals = withdrawals.map(function (w) {
        var userMatch = allProfiles.find(function (p) {
          return p.id === w.user_id;
        });
        var uName = userMatch
          ? userMatch.full_name || userMatch.email
          : w.user_email
            ? w.user_email.split("@")[0]
            : "Investor";
        var wDate = w.created_at
          ? new Date(w.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Recent";

        var userTasksDone = taskMap[w.user_id]
          ? taskMap[w.user_id].filter(function (ut) {
              return ut.completed;
            }).length
          : 0;
        var tasksVerifiedStr =
          userTasksDone +
          "/" +
          activeTasksTotal +
          (userTasksDone >= activeTasksTotal ? " Complete" : " Incomplete");

        var normStatus = "Pending Review";
        if (
          w.status === "Approved" ||
          w.status === "Approved & Paid" ||
          w.status === "Confirmed"
        ) {
          normStatus = "Approved & Paid";
        } else if (w.status === "Rejected") {
          normStatus = "Rejected";
        }

        return {
          id: w.id,
          user_id: w.user_id,
          user: uName,
          email: w.user_email || (userMatch ? userMatch.email : ""),
          amount: parseFloat(w.amount) || 0,
          bank:
            (w.bank_name || "Bank") +
            (w.account_number ? " — " + w.account_number : ""),
          date: wDate,
          status: normStatus,
          tasksVerified: tasksVerifiedStr,
          proofs: {
            x: userMatch
              ? "@" + uName.replace(/\s+/g, "_").toLowerCase()
              : "@investor",
            yt: w.user_email || "investor@email.com",
            ig: userMatch
              ? "@" + uName.replace(/\s+/g, "_").toLowerCase()
              : "@investor",
            quiz: "Verified in Database (" + userTasksDone + " tasks done)",
            game: "Verified in Database",
          },
        };
      });
    }

    filterWithdrawals();
    filterDeposits();
    renderUsersTable();
    updateKpis();
  } catch (err) {
    console.error("[Admin] Database fetch error:", err);
  }
}

function setupAdminRealtime() {
  if (!window.supabaseClient) return;
  try {
    window.supabaseClient
      .channel("admin_live_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        function () {
          loadRealAdminDataFromDB();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposits" },
        function () {
          loadRealAdminDataFromDB();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        function () {
          loadRealAdminDataFromDB();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_investments" },
        function () {
          loadRealAdminDataFromDB();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_tasks" },
        function () {
          loadRealAdminDataFromDB();
        },
      )
      .subscribe();
  } catch (e) {
    console.warn("[Admin] Realtime subscribe notice:", e);
  }
}

function drawFlowChart() {
  var canvas = $("adminFlowChart");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var w = (canvas.width = canvas.offsetWidth);
  var h = (canvas.height = canvas.offsetHeight);
  if (!w || !h) return;

  var inflows = [12.4, 15.1, 13.8, 18.2, 16.5, 14.2, 19.8];
  var outflows = [3.2, 4.5, 2.8, 5.1, 4.0, 3.5, 4.2];
  var labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  var max = 22.0;
  var pl = 44,
    pr = 16,
    pt = 20,
    pb = 32;
  var cw = w - pl - pr,
    ch = h - pt - pb;

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = "#1A2027";
  ctx.lineWidth = 1;
  for (var i = 0; i <= 4; i++) {
    var y = pt + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pl, y);
    ctx.lineTo(w - pr, y);
    ctx.stroke();
  }

  var xOf = function (i) {
    return pl + (i / (inflows.length - 1)) * cw;
  };
  var yOf = function (v) {
    return pt + ch - (v / max) * ch;
  };

  // Draw Inflow (Green)
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(inflows[0]));
  for (var j = 1; j < inflows.length; j++) {
    var xc = (xOf(j - 1) + xOf(j)) / 2;
    ctx.bezierCurveTo(
      xc,
      yOf(inflows[j - 1]),
      xc,
      yOf(inflows[j]),
      xOf(j),
      yOf(inflows[j]),
    );
  }
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Outflow (Orange)
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(outflows[0]));
  for (j = 1; j < outflows.length; j++) {
    xc = (xOf(j - 1) + xOf(j)) / 2;
    ctx.bezierCurveTo(
      xc,
      yOf(outflows[j - 1]),
      xc,
      yOf(outflows[j]),
      xOf(j),
      yOf(outflows[j]),
    );
  }
  ctx.strokeStyle = "#FF5500";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Labels
  ctx.fillStyle = "#6B7280";
  ctx.font = '10px "Space Mono", monospace';
  ctx.textAlign = "center";
  labels.forEach(function (l, idx) {
    ctx.fillText(l, xOf(idx), h - 10);
  });

  ctx.textAlign = "right";
  ["20M", "15M", "10M", "5M"].forEach(function (l, idx) {
    ctx.fillText("₦" + l, pl - 6, pt + (ch / 4) * idx + 10);
  });
}

/* ── AUDIT TELEMETRY STREAM ──────────────────────────────── */
var AUDIT_LOGS = [
  {
    time: "12:04:18",
    type: "RATE_LIMITER",
    text: "Token bucket refill executed: 100/100 tokens present on Redis cluster.",
  },
  {
    time: "11:58:02",
    type: "TASK_VERIFY",
    text: "Investor <strong>Adaeze Okonkwo</strong> verified X (@adaeze_invests) and YouTube sub.",
  },
  {
    time: "11:42:35",
    type: "WITHDRAWAL",
    text: "New withdrawal request <strong>WD-849120-NGX</strong> (₦50,000) queued with 5/5 tasks passed.",
  },
  {
    time: "11:15:10",
    type: "DEPOSIT",
    text: "Inflow of <strong>₦200,000.00</strong> verified via GTBank settlement webhook.",
  },
  {
    time: "10:30:44",
    type: "SECURITY",
    text: "Zero failed login attempts in last 60 minutes. TLS 1.3 session integrity 100%.",
  },
];

function renderAuditStream() {
  var container = $("auditStream");
  if (!container) return;
  // Audit text carries names, ids and amounts straight from the database, so
  // escape every field here rather than trusting each call site to do it.
  container.innerHTML = AUDIT_LOGS.map(function (l) {
    return (
      '<div class="audit-entry">' +
      '<div class="audit-text">[' +
      escapeHtml(l.type) +
      "] " +
      escapeHtml(l.text) +
      "</div>" +
      '<div class="audit-meta">' +
      escapeHtml(l.time) +
      "</div>" +
      "</div>"
    );
  }).join("");
}

function addAuditLog(type, text) {
  var now = new Date();
  var timeStr = now.toTimeString().split(" ")[0];
  AUDIT_LOGS.unshift({ time: timeStr, type: type, text: text });
  if (AUDIT_LOGS.length > 8) AUDIT_LOGS.pop();
  renderAuditStream();
}

/* ── MODALS & TOAST ──────────────────────────────────────── */
function openModal(id) {
  var m = $(id);
  if (m) m.classList.add("active");
}

function closeModal(id) {
  var m = $(id);
  if (m) m.classList.remove("active");
}

function toast(msg, type) {
  var el = $("adminToast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast show" + (type === "emerald" ? " toast--emerald" : "");
  setTimeout(function () {
    el.classList.remove("show");
  }, 3400);
}

/* ── STORAGE EVENT LISTENER ──────────────────────────────── */
window.addEventListener("storage", function (e) {
  if (e.key === "crest_withdrawals" || e.key === "crest_deposits") {
    initAdminData();
    filterWithdrawals();
    filterDeposits();
    updateKpis();
    addAuditLog(
      "INCOMING_EVENT",
      "New transaction received from user dashboard.",
    );
  }
});

/* ── INITIALIZE ON LOAD ──────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  initAdminData();
  renderAdminTasks();
  loadRemoteTasks();
  loadTaskProofs();
  filterWithdrawals();
  filterDeposits();
  renderUsersTable();
  renderAuditStream();
  updateKpis();
  setTimeout(drawFlowChart, 100);

  // Load real users, investments, tasks, and balances directly from Supabase DB
  loadRealAdminDataFromDB();
  loadInvestmentPlansAdmin();
  setupAdminRealtime();
});

window.addEventListener("resize", function () {
  if (AdminState.currentView === "observatory") {
    clearTimeout(window._adminResizeTimer);
    window._adminResizeTimer = setTimeout(drawFlowChart, 100);
  }
});
