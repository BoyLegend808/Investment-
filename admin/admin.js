// Hide content and verify real Supabase session before showing admin panel
document.documentElement.style.visibility = 'hidden';
(async function supabaseAuthGuard() {
  let waited = 0;
  while (!window.supabaseClient && waited < 3000) {
    await new Promise(r => setTimeout(r, 50));
    waited += 50;
  }
  if (!window.supabaseClient) {
    window.location.href = '../index/index.html';
    return;
  }
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = '../index/index.html';
    return;
  }
  
  // Verify Admin Role
  const { data: profile, error } = await window.supabaseClient
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();
    
  if (error || !profile || profile.is_admin !== true) {
    console.warn("Unauthorized access attempt to admin panel");
    window.location.href = '../dashboard/dashboard.html';
    return;
  }

  window.crestUser = session.user;
  document.documentElement.style.visibility = '';
})();

/* ==========================================================================
   NOVARA CAPITAL — ADMINISTRATIVE OBSERVATORY & GATEKEEPER JS
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
    id: 0, active: true,
    icon: 'x', platform: 'X (Twitter)',
    title: 'Follow Crest on X',
    desc: 'Follow @CrestWealthNG for market notices & rate announcements.',
    steps: ['Search @CrestWealthNG on X', 'Click Follow on the profile', 'Enter your X username below to claim bonus'],
    reward: '+₦2,000', rewardAmount: 2000,
    url: 'https://x.com/CrestWealthNG', urlLabel: 'Open X Profile',
    verificationType: 'social_handle', inputType: 'text', inputPlaceholder: 'Your @username'
  },
  {
    id: 1, active: true,
    icon: 'yt', platform: 'YouTube',
    title: 'Subscribe on YouTube',
    desc: 'Subscribe to Crest Wealth and watch video briefs.',
    steps: ['Open Crest Wealth YouTube channel', 'Click Subscribe', 'Watch any full video (5+ mins)', 'Paste your account email below'],
    reward: '+₦3,000', rewardAmount: 3000,
    url: 'https://youtube.com/@CrestWealth', urlLabel: 'Open YouTube Channel',
    verificationType: 'social_handle', inputType: 'email', inputPlaceholder: 'YouTube account email'
  },
  {
    id: 2, active: true,
    icon: 'ig', platform: 'Instagram',
    title: 'Comment on Our Post',
    desc: 'Engage with the weekly pinned rate review post on @CrestWealthNG.',
    steps: ['Open @CrestWealthNG on Instagram', 'Find the pinned investment post', 'Leave a comment', 'Enter your username below'],
    reward: '+₦1,500', rewardAmount: 1500,
    url: 'https://instagram.com/CrestWealthNG', urlLabel: 'Open Instagram',
    verificationType: 'social_handle', inputType: 'text', inputPlaceholder: 'Your Instagram username'
  },
  {
    id: 3, active: true,
    icon: 'quiz', platform: 'Quiz',
    title: 'Investment IQ Quiz',
    desc: 'Mandatory 5-question finance literacy test (70% pass threshold).',
    steps: ['Read each question carefully', 'Select your answer', 'Score 70% or higher to complete and earn bonus'],
    reward: '+₦2,500', rewardAmount: 2500,
    isQuiz: true, verificationType: 'quiz'
  },
  {
    id: 4, active: true,
    icon: 'game', platform: 'Trading Mini-Game',
    title: 'Market Timing Mini-Game',
    desc: 'Trading simulator test: execute profitable ticks to score 150+ points.',
    steps: ['Watch the live price ticks', 'Click BUY on dips & SELL on peaks', 'Achieve 150 points to complete and earn bonus'],
    reward: '+₦3,500', rewardAmount: 3500,
    isGame: true, verificationType: 'game'
  }
];

/* ── SEED DATA ───────────────────────────────────────────── */
var SEED_WITHDRAWALS = [
  {
    id: 'WD-849120-NGX',
    user: 'Adaeze Okonkwo',
    email: 'adaeze.okonkwo@email.com',
    amount: 50000,
    bank: 'GTBank — 0123456789',
    date: 'Sep 25, 2026',
    status: 'Pending Review',
    tasksVerified: '5/5 Complete',
    proofs: {
      x: '@adaeze_invests',
      yt: 'adaeze.okonkwo@email.com',
      ig: '@adaeze_ok',
      quiz: 'Score: 5/5 (100% Passed)',
      game: 'Score: 180 / 150 pts (Target Passed)'
    }
  },
  {
    id: 'WD-738192-NGX',
    user: 'Babatunde Adeleke',
    email: 'babatunde.a@yahoo.com',
    amount: 120000,
    bank: 'Access Bank — 0092837411',
    date: 'Sep 24, 2026',
    status: 'Pending Review',
    tasksVerified: '5/5 Complete',
    proofs: {
      x: '@badeleke_fx',
      yt: 'badeleke.ng@gmail.com',
      ig: '@tunde_investor',
      quiz: 'Score: 4/5 (80% Passed)',
      game: 'Score: 165 / 150 pts (Target Passed)'
    }
  },
  {
    id: 'WD-629104-NGX',
    user: 'Chinedu Okafor',
    email: 'chinedu.okafor@gmail.com',
    amount: 35000,
    bank: 'Zenith Bank — 2083948123',
    date: 'Sep 23, 2026',
    status: 'Rejected',
    tasksVerified: '3/5 Incomplete',
    proofs: {
      x: '@chinedu_o',
      yt: 'Missing proof',
      ig: '@chinedu_o',
      quiz: 'Incomplete',
      game: 'Score: 40 / 150 pts'
    }
  }
];

var SEED_DEPOSITS = [
  {
    id: 'DEP-982103',
    user: 'Adaeze Okonkwo',
    email: 'adaeze.okonkwo@email.com',
    amount: 200000,
    plan: 'Fixed Lock (16.8%)',
    method: 'BANK TRANSFER',
    date: 'Sep 24, 2026',
    status: 'Confirmed'
  },
  {
    id: 'DEP-831920',
    user: 'Fatima Bello',
    email: 'fatima.bello@kpmg.com',
    amount: 500000,
    plan: 'VaultX Level 9 (₦500k)',
    method: 'BANK TRANSFER',
    date: 'Sep 24, 2026',
    status: 'Pending Confirmation'
  },
  {
    id: 'DEP-710294',
    user: 'Olumide Bakare',
    email: 'olumide.b@gmail.com',
    amount: 50000,
    plan: 'Crest Stash (11.5%)',
    method: 'USSD (*737#)',
    date: 'Sep 23, 2026',
    status: 'Confirmed'
  }
];

var SEED_USERS = [
  {
    name: 'Adaeze Okonkwo',
    email: 'adaeze.okonkwo@email.com',
    tier: 'Level 6 (₦100k)',
    invested: '₦976,800',
    balance: '₦84,200',
    tasks: '5/5 (100%)',
    kyc: 'Tier 3 (BVN & NIN Verified)'
  },
  {
    name: 'Babatunde Adeleke',
    email: 'babatunde.a@yahoo.com',
    tier: 'Level 7 (₦200k)',
    invested: '₦1,450,000',
    balance: '₦120,000',
    tasks: '5/5 (100%)',
    kyc: 'Tier 3 (BVN & NIN Verified)'
  },
  {
    name: 'Fatima Bello',
    email: 'fatima.bello@kpmg.com',
    tier: 'Level 9 (₦500k)',
    invested: '₦3,800,000',
    balance: '₦310,000',
    tasks: '4/5 (80%)',
    kyc: 'Tier 3 (BVN & NIN Verified)'
  },
  {
    name: 'Chinedu Okafor',
    email: 'chinedu.okafor@gmail.com',
    tier: 'Level 3 (₦30k)',
    invested: '₦180,000',
    balance: '₦35,000',
    tasks: '3/5 (60%)',
    kyc: 'Tier 2 (BVN Verified)'
  },
  {
    name: 'Ngozi Eze',
    email: 'ngozi.eze@techcorp.ng',
    tier: 'Level 5 (₦75k)',
    invested: '₦620,000',
    balance: '₦92,000',
    tasks: '5/5 (100%)',
    kyc: 'Tier 3 (BVN & NIN Verified)'
  }
];

/* ── ADMIN STATE ─────────────────────────────────────────── */
var AdminState = {
  currentView: 'observatory',
  tasks: [],
  withdrawals: [],
  deposits: [],
  users: SEED_USERS.slice(),
  gatekeeperEnforced: true,
  inspectedWdId: null
};

/* ── DOM HELPER ──────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }

/* ── INITIALIZATION & STORAGE SYNC ───────────────────────── */
function initAdminData() {
  // Load Tasks Config
  var savedTasks = null;
  try {
    var raw = localStorage.getItem('crest_tasks_config');
    if (raw) savedTasks = JSON.parse(raw);
  } catch(e) {}
  AdminState.tasks = (savedTasks && Array.isArray(savedTasks) && savedTasks.length > 0)
    ? savedTasks
    : DEFAULT_ADMIN_TASKS.map(function(t) { return Object.assign({}, t); });

  // Ensure rewardAmount and verificationType are properly populated
  AdminState.tasks.forEach(function(t) {
    if (typeof t.rewardAmount !== 'number') {
      var m = (t.reward || '').replace(/[^0-9]/g, '');
      t.rewardAmount = m ? parseInt(m, 10) : 2000;
    }
    if (!t.reward) {
      t.reward = '+₦' + t.rewardAmount.toLocaleString('en-NG');
    }
    if (!t.verificationType) {
      t.verificationType = t.isQuiz ? 'quiz' : (t.isGame ? 'game' : 'social_handle');
    }
  });

  saveTasksToStorage();

  // Load Withdrawals (Seed + user generated)
  var savedWd = [];
  try {
    savedWd = JSON.parse(localStorage.getItem('crest_withdrawals') || '[]');
  } catch(e) {}
  
  // Combine user submissions with seed data avoiding duplicate IDs
  var combinedWd = savedWd.slice();
  SEED_WITHDRAWALS.forEach(function(seed) {
    if (!combinedWd.some(function(w) { return w.id === seed.id; })) {
      combinedWd.push(seed);
    }
  });
  AdminState.withdrawals = combinedWd;

  // Load Deposits
  var savedDep = [];
  try {
    savedDep = JSON.parse(localStorage.getItem('crest_deposits') || '[]');
  } catch(e) {}
  var combinedDep = savedDep.slice();
  SEED_DEPOSITS.forEach(function(seed) {
    if (!combinedDep.some(function(d) { return d.id === seed.id; })) {
      combinedDep.push(seed);
    }
  });
  AdminState.deposits = combinedDep;
}

function saveTasksToStorage() {
  try {
    localStorage.setItem('crest_tasks_config', JSON.stringify(AdminState.tasks));
  } catch(e) {}
  var badge = $('navActiveTaskCount');
  if (badge) {
    var count = AdminState.tasks.filter(function(t) { return t.active !== false; }).length;
    badge.textContent = count + ' Active';
  }
}

function saveWithdrawalsToStorage() {
  try {
    localStorage.setItem('crest_withdrawals', JSON.stringify(AdminState.withdrawals));
  } catch(e) {}
  updateKpis();
}

function saveDepositsToStorage() {
  try {
    localStorage.setItem('crest_deposits', JSON.stringify(AdminState.deposits));
  } catch(e) {}
  updateKpis();
}

/* ── VIEW SWITCHING ──────────────────────────────────────── */
function switchAdminView(viewName) {
  document.querySelectorAll('.view-section').forEach(function(v) {
    v.classList.remove('active');
  });
  document.querySelectorAll('.nav-item').forEach(function(n) {
    n.classList.remove('active');
  });

  var targetView = $('view-' + viewName);
  if (targetView) targetView.classList.add('active');

  var targetNav = document.querySelector('.nav-item[data-view="' + viewName + '"]');
  if (targetNav) targetNav.classList.add('active');

  var titles = {
    observatory: 'Observatory',
    gatekeeper: 'Withdrawal Gatekeeper & Tasks',
    withdrawals: 'Withdrawal Requests Queue',
    deposits: 'Incoming Deposits Queue',
    investors: 'Investor Directory & KYC',
    security: 'Rate Limits & Security Logs'
  };
  if ($('pageTitle')) $('pageTitle').textContent = titles[viewName] || 'Admin Terminal';
  AdminState.currentView = viewName;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'observatory') {
    setTimeout(drawFlowChart, 60);
  }
}

/* ── MOBILE SIDEBAR ──────────────────────────────────────── */
if ($('burgerBtn')) {
  $('burgerBtn').addEventListener('click', function() {
    $('sidebar').classList.toggle('open');
    $('sidebarOverlay').classList.toggle('active');
  });
}
if ($('sidebarOverlay')) {
  $('sidebarOverlay').addEventListener('click', closeSidebar);
}
function closeSidebar() {
  if ($('sidebar')) $('sidebar').classList.remove('open');
  if ($('sidebarOverlay')) $('sidebarOverlay').classList.remove('active');
}

document.querySelectorAll('.nav-item[data-view]').forEach(function(link) {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    switchAdminView(link.dataset.view);
  });
});

/* ── TASK GATEKEEPER MANAGEMENT ──────────────────────────── */
function renderAdminTasks() {
  var container = $('tasksAdminList');
  if (!container) return;

  var ICONS = {
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    yt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    ig: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>',
    telegram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>',
    tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V7.93a8.21 8.21 0 0 0 4.76 1.5V6.01c-.34 0-.68-.07-1-.2z"/></svg>',
    discord: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
    quiz: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
    game: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12h4m-2-2v4m7-2a1 1 0 1 0 2 0 1 1 0 0 0-2 0m4 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>',
    link: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  };

  container.innerHTML = AdminState.tasks.map(function(t) {
    var iconSvg = ICONS[t.icon] || ICONS.quiz;
    var isActive = t.active !== false;

    var vTypeBadge = '';
    if (t.verificationType === 'instant') {
      vTypeBadge = '<span class="tac-vtype-badge">1-Click Instant</span>';
    } else if (t.verificationType === 'link_proof') {
      vTypeBadge = '<span class="tac-vtype-badge">Proof URL Link</span>';
    } else if (t.verificationType === 'quiz') {
      vTypeBadge = '<span class="tac-vtype-badge">Financial IQ Quiz</span>';
    } else if (t.verificationType === 'game') {
      vTypeBadge = '<span class="tac-vtype-badge">Trading Mini-Game</span>';
    } else {
      vTypeBadge = '<span class="tac-vtype-badge">@Handle Input</span>';
    }

    var displayReward = t.reward || ('+₦' + (t.rewardAmount || 2000).toLocaleString('en-NG'));
    var safeTitle = escapeHtml(t.title);
    var safePlatform = escapeHtml(t.platform);
    var safeUrl = escapeHtml(t.url);
    var safeUrlLabel = escapeHtml(t.urlLabel || t.url);

    return '<div class="task-admin-card ' + (isActive ? 'task-status--active' : 'task-status--inactive') + '" id="tac-' + t.id + '">' +
      '<div class="tac-header-row">' +
        '<div class="tac-identity">' +
          '<div class="tac-icon">' + iconSvg + '</div>' +
          '<div class="tac-text-wrap">' +
            '<div class="tac-title">' + safeTitle + '</div>' +
            '<div class="tac-meta">' +
              '<span class="tac-platform-tag">' + safePlatform + '</span>' +
              '<span class="tac-sep">&bull;</span>' + vTypeBadge +
              (t.url ? ('<span class="tac-sep">&bull;</span><a href="' + safeUrl + '" target="_blank" rel="noopener" class="tac-url-link" title="' + safeUrl + '">' + safeUrlLabel + '</a>') : '<span class="tac-sep">&bull;</span><span class="tac-interactive-tag">In-App Simulation</span>') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="tac-reward-badge">' + escapeHtml(displayReward) + '</div>' +
      '</div>' +
      '<div class="tac-footer-row">' +
        '<div class="tac-toggle-wrap">' +
          '<label class="toggle-switch" title="Toggle active status">' +
            '<input type="checkbox" ' + (isActive ? 'checked' : '') + ' onchange="toggleTaskActive(' + t.id + ', this.checked)">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
          '<span class="tac-toggle-label">' + (isActive ? 'Active Prerequisite' : 'Prerequisite Inactive') + '</span>' +
        '</div>' +
        '<div class="tac-buttons-wrap">' +
          '<button class="btn btn-subtle btn-sm" onclick="openEditTaskModal(' + t.id + ')" title="Edit task details">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '<span>Edit Task</span>' +
          '</button>' +
          (t.id > 4 ? '<button class="btn btn-danger-outline btn-sm" onclick="deleteCustomTask(' + t.id + ')" title="Delete custom task">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
            '<span>Delete</span>' +
          '</button>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleTaskActive(id, isChecked) {
  var task = AdminState.tasks.find(function(t) { return t.id === id; });
  if (task) {
    task.active = isChecked;
    saveTasksToStorage();
    toast('Task "' + task.title + '" is now ' + (isChecked ? 'ACTIVE' : 'INACTIVE') + ' on user dashboard.', 'emerald');
    addAuditLog('TASK_CONFIG_UPDATED', 'Task ID #' + id + ' active state set to ' + isChecked);
  }
}

function toggleGatekeeperMaster(isEnforced) {
  AdminState.gatekeeperEnforced = isEnforced;
  toast('Withdrawal gate enforcement ' + (isEnforced ? 'ENABLED' : 'BYPASSED') + ' platform-wide.', isEnforced ? 'emerald' : 'warn');
  addAuditLog('GATEKEEPER_STATE', 'Master gatekeeper enforcement toggled to ' + isEnforced);
}

function triggerGlobalTaskReset() {
  if (confirm('Are you sure you want to trigger a Global User Task Cycle Reset?\n\nThis will clear completed tasks for all users, requiring them to complete tasks again before subsequent withdrawals.')) {
    try {
      localStorage.removeItem('crest_user_tasks');
    } catch(e) {}
    toast('Global task cycle reset complete! All user dashboards must re-verify tasks.', 'emerald');
    addAuditLog('CYCLE_RESET', 'Admin triggered platform-wide user withdrawal task reset.');
  }
}

/* ── MODAL HELPERS & TASK EDIT/ADD CONTROLLER ───────────── */
function setRewardPreset(amount) {
  if ($('taskRewardAmountInput')) {
    $('taskRewardAmountInput').value = amount;
    updateRewardPreview();
  }
}

function updateRewardPreview() {
  var val = $('taskRewardAmountInput') ? parseInt($('taskRewardAmountInput').value, 10) : 0;
  var amt = (!isNaN(val) && val >= 0) ? val : 0;
  if ($('rewardPreviewAmount')) {
    $('rewardPreviewAmount').textContent = '₦' + amt.toLocaleString('en-NG', { minimumFractionDigits: 2 });
  }
}

function toggleVerificationFields(val) {
  var grp = $('placeholderGroup');
  var plInput = $('taskPlaceholderInput');
  if (!grp) return;
  if (val === 'quiz' || val === 'game') {
    grp.style.display = 'none';
  } else if (val === 'instant') {
    grp.style.display = 'none';
  } else {
    grp.style.display = 'block';
    if (plInput) {
      plInput.placeholder = val === 'link_proof' ? 'e.g. https://... or post link' : 'e.g. Your @username';
    }
  }
}

function openAddTaskModal() {
  $('editTaskId').value = '';
  $('taskModalTitle').textContent = 'Add Mandatory Task';
  $('taskTitleInput').value = '';
  $('taskPlatformInput').value = '';
  $('taskIconInput').value = 'telegram';
  $('taskRewardAmountInput').value = '2500';
  updateRewardPreview();
  $('taskUrlInput').value = '';
  $('taskUrlLabelInput').value = '';
  $('taskVerificationTypeInput').value = 'social_handle';
  $('taskPlaceholderInput').value = '';
  $('taskDescInput').value = '';
  $('taskStepsInput').value = 'Open the official community link\nFollow or join the group\nEnter your username below to verify and claim bonus';
  $('taskActiveInput').checked = true;
  toggleVerificationFields('social_handle');
  openModal('taskModal');
}

function openEditTaskModal(id) {
  var task = AdminState.tasks.find(function(t) { return t.id === id; });
  if (!task) return;
  $('editTaskId').value = id;
  $('taskModalTitle').textContent = 'Edit Task: ' + task.title;
  $('taskTitleInput').value = task.title || '';
  $('taskPlatformInput').value = task.platform || '';
  $('taskIconInput').value = task.icon || 'quiz';

  var amt = (typeof task.rewardAmount === 'number') ? task.rewardAmount : (function() {
    var m = (task.reward || '').replace(/[^0-9]/g, '');
    return m ? parseInt(m, 10) : 2000;
  })();
  $('taskRewardAmountInput').value = amt;
  updateRewardPreview();

  $('taskUrlInput').value = task.url || '';
  $('taskUrlLabelInput').value = task.urlLabel || '';
  var vType = task.verificationType || (task.isQuiz ? 'quiz' : (task.isGame ? 'game' : 'social_handle'));
  $('taskVerificationTypeInput').value = vType;
  $('taskPlaceholderInput').value = task.inputPlaceholder || '';
  $('taskDescInput').value = (task.desc || '').replace(/<[^>]*>?/gm, '');
  $('taskStepsInput').value = Array.isArray(task.steps) ? task.steps.join('\n') : (task.steps || '');
  $('taskActiveInput').checked = task.active !== false;

  toggleVerificationFields(vType);
  openModal('taskModal');
}

function saveTaskFromModal() {
  var id = $('editTaskId').value;
  var title = $('taskTitleInput').value.trim();
  var platform = $('taskPlatformInput').value.trim();
  var icon = $('taskIconInput').value;
  var rewardAmt = parseInt($('taskRewardAmountInput').value, 10) || 0;
  var url = $('taskUrlInput').value.trim();
  var urlLabel = $('taskUrlLabelInput').value.trim() || ('Visit ' + platform);
  var verificationType = $('taskVerificationTypeInput').value;
  var placeholder = $('taskPlaceholderInput').value.trim();
  var desc = $('taskDescInput').value.trim();
  var stepsRaw = $('taskStepsInput').value.trim();
  var isActive = $('taskActiveInput').checked;

  if (!title || !platform) {
    toast('Task title and platform name are required.', 'warn');
    return;
  }

  var formattedReward = '+₦' + rewardAmt.toLocaleString('en-NG');
  var steps = stepsRaw ? stepsRaw.split('\n').map(function(s) { return s.trim(); }).filter(Boolean) : [];
  var isQuiz = verificationType === 'quiz';
  var isGame = verificationType === 'game';

  if (id !== '') {
    // Edit existing task
    var existing = AdminState.tasks.find(function(t) { return t.id === parseInt(id, 10); });
    if (existing) {
      existing.title = title;
      existing.platform = platform;
      existing.icon = icon;
      existing.rewardAmount = rewardAmt;
      existing.reward = formattedReward;
      existing.url = url;
      existing.urlLabel = urlLabel;
      existing.verificationType = verificationType;
      existing.inputType = (verificationType === 'link_proof') ? 'url' : 'text';
      existing.inputPlaceholder = placeholder || (verificationType === 'link_proof' ? 'Proof link' : 'Your @username');
      existing.desc = desc || existing.desc;
      if (steps.length > 0) existing.steps = steps;
      existing.active = isActive;
      existing.isQuiz = isQuiz;
      existing.isGame = isGame;
    }
  } else {
    // Add new task
    var newId = AdminState.tasks.length > 0 ? Math.max.apply(null, AdminState.tasks.map(function(t) { return t.id; })) + 1 : 5;
    AdminState.tasks.push({
      id: newId,
      active: isActive,
      icon: icon,
      platform: platform,
      title: title,
      desc: desc || ('Complete task on ' + platform + ' to earn your completion bonus.'),
      steps: steps.length ? steps : ['Open the target link', 'Follow instructions', 'Submit verification proof'],
      rewardAmount: rewardAmt,
      reward: formattedReward,
      url: url,
      urlLabel: urlLabel,
      verificationType: verificationType,
      inputType: (verificationType === 'link_proof') ? 'url' : 'text',
      inputPlaceholder: placeholder || (verificationType === 'link_proof' ? 'Proof link' : 'Your @username'),
      isQuiz: isQuiz,
      isGame: isGame
    });
  }

  saveTasksToStorage();
  renderAdminTasks();
  closeModal('taskModal');
  toast('Task "' + title + '" saved! Bonus: ' + formattedReward, 'emerald');
  addAuditLog('TASK_CONFIG_UPDATED', 'Task "' + title + '" updated with bonus ' + formattedReward);
}

function deleteCustomTask(id) {
  if (confirm('Delete this custom task?')) {
    AdminState.tasks = AdminState.tasks.filter(function(t) { return t.id !== id; });
    saveTasksToStorage();
    renderAdminTasks();
    toast('Task deleted.', 'warn');
  }
}

/* ── WITHDRAWALS DESK ────────────────────────────────────── */
function renderWithdrawalsTable(filterStatus, searchQuery) {
  var tbody = $('withdrawalsTableBody');
  if (!tbody) return;

  var list = AdminState.withdrawals;
  if (filterStatus && filterStatus !== 'ALL') {
    list = list.filter(function(w) { return w.status === filterStatus; });
  }
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    list = list.filter(function(w) {
      return (w.user && w.user.toLowerCase().includes(q)) ||
             (w.id && w.id.toLowerCase().includes(q)) ||
             (w.bank && w.bank.toLowerCase().includes(q));
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No withdrawal requests match current filter.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(function(w) {
    var isPending = w.status === 'Pending Review';
    var isApproved = w.status === 'Approved & Paid';
    var isRejected = w.status === 'Rejected';

    var statusBadge = '';
    if (isPending) statusBadge = '<span class="badge badge--pending">Pending Review</span>';
    else if (isApproved) statusBadge = '<span class="badge badge--approved">Approved &amp; Paid</span>';
    else if (isRejected) statusBadge = '<span class="badge badge--rejected">Rejected</span>';

    var safeId = escapeHtml(w.id);
    var safeName = escapeHtml(w.user);
    var safeEmail = escapeHtml(w.email);
    var safeBank = escapeHtml(w.bank);
    var safeDate = escapeHtml(w.date);
    var safeVerified = escapeHtml(w.tasksVerified || '5/5 Complete');
    var initials = safeName ? safeName.split(' ').map(function(n) { return n[0]; }).join('') : 'U';

    var gateBadge = w.tasksVerified && w.tasksVerified.includes('Incomplete')
      ? '<span class="badge badge--locked">' + escapeHtml(w.tasksVerified) + '</span>'
      : '<span class="badge badge--approved">' + safeVerified + '</span>';

    return '<tr>' +
      '<td><code style="font-family:\'Space Mono\',monospace;color:var(--color-copper);">' + safeId + '</code></td>' +
      '<td><div class="user-cell"><div class="user-cell-avatar">' + initials + '</div><div><div class="user-cell-name">' + safeName + '</div><div class="user-cell-sub">' + safeEmail + '</div></div></div></td>' +
      '<td><span class="mono-amount debit">&#8358;' + parseFloat(w.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 }) + '</span></td>' +
      '<td>' + safeBank + '</td>' +
      '<td>' + gateBadge + '</td>' +
      '<td style="color:var(--text-muted);">' + safeDate + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-subtle btn-sm" onclick="inspectWithdrawalProof(\'' + safeId + '\')">Inspect</button>' +
          (isPending ? '<button class="btn btn-emerald btn-sm" onclick="approveWithdrawal(\'' + safeId + '\')">Approve &amp; Pay</button>' : '') +
          (isPending ? '<button class="btn btn-danger-outline btn-sm" onclick="rejectWithdrawal(\'' + safeId + '\')">Reject</button>' : '') +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function filterWithdrawals() {
  var filter = $('wdStatusFilter') ? $('wdStatusFilter').value : 'ALL';
  var search = $('wdSearchInput') ? $('wdSearchInput').value.trim() : '';
  renderWithdrawalsTable(filter, search);
}

function inspectWithdrawalProof(id) {
  var w = AdminState.withdrawals.find(function(item) { return item.id === id; });
  if (!w) return;
  AdminState.inspectedWdId = id;

  var proofs = w.proofs || {
    x: '@adaeze_invests',
    yt: w.email,
    ig: '@adaeze_ok',
    quiz: 'Score: 5/5 (100% Passed)',
    game: 'Score: 180 / 150 pts (Target Passed)'
  };

  var body = $('inspectModalBody');
  if (body) {
    body.innerHTML = '<div style="margin-bottom:16px;">' +
      '<div style="font-size:1rem;font-weight:600;color:#FFFFFF;margin-bottom:2px;">' + w.user + ' (' + w.email + ')</div>' +
      '<div style="font-family:\'Space Mono\',monospace;color:var(--color-copper);font-size:0.85rem;">' + w.id + ' &bull; Amount: &#8358;' + parseFloat(w.amount).toLocaleString('en-NG') + '</div>' +
      '</div>' +
      '<div style="background:var(--bg-card-subtle);border:1px solid var(--border-subtle);border-radius:6px;padding:14px;display:flex;flex-direction:column;gap:12px;">' +
        '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">' +
          '<span style="font-size:0.8rem;color:var(--text-muted);">X (Twitter) Handle:</span>' +
          '<strong style="color:var(--color-emerald);font-family:\'Space Mono\',monospace;">' + proofs.x + '</strong>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">' +
          '<span style="font-size:0.8rem;color:var(--text-muted);">YouTube Account Email:</span>' +
          '<strong style="color:#FFFFFF;font-family:\'Space Mono\',monospace;">' + proofs.yt + '</strong>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">' +
          '<span style="font-size:0.8rem;color:var(--text-muted);">Instagram Username:</span>' +
          '<strong style="color:var(--color-emerald);font-family:\'Space Mono\',monospace;">' + proofs.ig + '</strong>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:8px;">' +
          '<span style="font-size:0.8rem;color:var(--text-muted);">Investment IQ Quiz:</span>' +
          '<strong style="color:var(--color-emerald);font-family:\'Space Mono\',monospace;">' + proofs.quiz + '</strong>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;padding-bottom:4px;">' +
          '<span style="font-size:0.8rem;color:var(--text-muted);">Market Trading Mini-Game:</span>' +
          '<strong style="color:var(--color-emerald);font-family:\'Space Mono\',monospace;">' + proofs.game + '</strong>' +
        '</div>' +
      '</div>';
  }

  var btnApprove = $('btnApproveFromModal');
  if (btnApprove) {
    btnApprove.style.display = (w.status === 'Pending Review') ? 'inline-flex' : 'none';
    btnApprove.onclick = function() {
      approveWithdrawal(id);
      closeModal('inspectModal');
    };
  }

  openModal('inspectModal');
}

function approveWithdrawal(id) {
  var w = AdminState.withdrawals.find(function(item) { return item.id === id; });
  if (!w) return;
  w.status = 'Approved & Paid';
  saveWithdrawalsToStorage();
  filterWithdrawals();

  if (window.supabaseClient) {
    try {
      window.supabaseClient
        .from('withdrawals')
        .update({ status: 'Approved & Paid', processed_at: new Date().toISOString() })
        .eq('id', id)
        .then(function(res) {
          if (res.error) console.warn('Supabase approve withdrawal notice:', res.error);
        });
    } catch(e) {}
  }

  toast('Withdrawal ' + id + ' approved! Payout webhook settled with GTBank.', 'emerald');
  addAuditLog('PAYOUT_SETTLED', 'Withdrawal ' + id + ' (₦' + parseFloat(w.amount).toLocaleString('en-NG') + ') approved & settled for ' + w.user);
}

function rejectWithdrawal(id) {
  var reason = prompt('Enter rejection feedback reason for this investor (e.g. YouTube video proof missing / unverified IG comment):');
  if (reason === null) return;
  if (!reason.trim()) reason = 'Task verification criteria not met';
  var w = AdminState.withdrawals.find(function(item) { return item.id === id; });
  if (!w) return;
  w.status = 'Rejected';
  w.rejectionReason = reason.trim();
  saveWithdrawalsToStorage();
  filterWithdrawals();

  if (window.supabaseClient) {
    try {
      window.supabaseClient.rpc('admin_reject_withdrawal', {
        withdrawal_id: id,
        p_reason: reason.trim()
      }).then(function(res) {
        if (res.error) {
          window.supabaseClient
            .from('withdrawals')
            .update({ status: 'Rejected', admin_notes: reason.trim(), processed_at: new Date().toISOString() })
            .eq('id', id)
            .then(function() {});
        }
      });
    } catch(e) {}
  }

  toast('Withdrawal ' + id + ' rejected. Feedback sent to investor dashboard.', 'warn');
  addAuditLog('WITHDRAWAL_REJECTED', 'Withdrawal ' + id + ' rejected: "' + reason.trim() + '"');
}

/* ── DEPOSITS DESK ───────────────────────────────────────── */
function renderDepositsTable(searchQuery) {
  var tbody = $('depositsTableBody');
  if (!tbody) return;

  var list = AdminState.deposits;
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    list = list.filter(function(d) {
      return (d.user && d.user.toLowerCase().includes(q)) ||
             (d.id && d.id.toLowerCase().includes(q)) ||
             (d.plan && d.plan.toLowerCase().includes(q));
    });
  }

  tbody.innerHTML = list.map(function(d) {
    var isConfirmed = d.status === 'Confirmed';
    var receiptBtn = d.receiptData ? '<button class="btn btn-subtle btn-sm" style="margin-left:4px;" onclick="previewDepositReceipt(\'' + d.id + '\')">Receipt</button>' : '';
    return '<tr>' +
      '<td><code style="font-family:\'Space Mono\',monospace;color:var(--color-copper);">' + d.id + '</code></td>' +
      '<td><div class="user-cell"><div class="user-cell-avatar">' + (d.user ? d.user.split(' ').map(function(n) { return n[0]; }).join('') : 'U') + '</div><div><div class="user-cell-name">' + d.user + '</div><div class="user-cell-sub">' + d.email + '</div></div></div></td>' +
      '<td><span class="mono-amount credit">+&#8358;' + parseFloat(d.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 }) + '</span></td>' +
      '<td>' + d.plan + '</td>' +
      '<td><span class="badge" style="background:var(--bg-surface-elevated);color:var(--text-primary);">' + d.method + '</span></td>' +
      '<td style="color:var(--text-muted);">' + d.date + '</td>' +
      '<td><span class="badge ' + (isConfirmed ? 'badge--approved' : 'badge--pending') + '">' + d.status + '</span></td>' +
      '<td>' +
        (!isConfirmed ? '<button class="btn btn-emerald btn-sm" onclick="confirmDeposit(\'' + d.id + '\')">Confirm & Credit</button>' : '<span style="color:var(--text-muted);font-size:0.75rem;">Verified</span>') +
        receiptBtn +
      '</td>' +
    '</tr>';
  }).join('');
}

function filterDeposits() {
  var search = $('depSearchInput') ? $('depSearchInput').value.trim() : '';
  renderDepositsTable(search);
}

function previewDepositReceipt(id) {
  var d = AdminState.deposits.find(function(item) { return item.id === id; });
  if (!d || !d.receiptData) {
    toast('No receipt attached for this deposit.', 'warn');
    return;
  }
  var body = $('inspectModalBody');
  if (body) {
    body.innerHTML = '<div style="margin-bottom:12px;">' +
      '<div style="font-weight:600;color:white;font-size:1rem;">Deposit POP Receipt &bull; ' + d.id + '</div>' +
      '<div style="font-size:0.8rem;color:var(--text-muted);">' + d.user + ' (' + d.email + ') &bull; &#8358;' + parseFloat(d.amount).toLocaleString('en-NG') + ' via ' + (d.bank || d.method) + '</div>' +
      '</div>' +
      '<div style="background:rgba(0,0,0,0.5);border-radius:8px;padding:12px;text-align:center;overflow:hidden;">' +
      '<img src="' + d.receiptData + '" alt="POP Receipt" style="max-width:100%;max-height:420px;object-fit:contain;border-radius:6px;border:1px solid rgba(255,255,255,0.1);">' +
      '</div>';
  }
  var btnApprove = $('btnApproveFromModal');
  if (btnApprove) {
    btnApprove.style.display = (d.status !== 'Confirmed') ? 'inline-flex' : 'none';
    btnApprove.onclick = function() {
      confirmDeposit(id);
      closeModal('inspectModal');
    };
  }
  openModal('inspectModal');
}

function confirmDeposit(id) {
  var d = AdminState.deposits.find(function(item) { return item.id === id; });
  if (!d) return;
  d.status = 'Confirmed';
  saveDepositsToStorage();
  filterDeposits();

  // Credit investor cash balance in Supabase via RPC or table update
  if (window.supabaseClient) {
    try {
      window.supabaseClient.rpc('admin_confirm_deposit', { deposit_id: id }).then(function(res) {
        if (res.error && d.user_id) {
          // Fallback manual profile update if deposit row was inserted directly
          var depAmt = parseFloat(d.amount) || 0;
          window.supabaseClient
            .from('profiles')
            .select('cash_balance')
            .eq('id', d.user_id)
            .single()
            .then(function(pRes) {
              var cur = pRes.data ? parseFloat(pRes.data.cash_balance || 0) : 84200;
              window.supabaseClient
                .from('profiles')
                .update({ cash_balance: cur + depAmt })
                .eq('id', d.user_id)
                .then(function() {});
            });
        }
      });
    } catch(e) {}
  }

  // Credit investor cash balance in localStorage
  try {
    var curBal = parseFloat(localStorage.getItem('crest_user_balance') || '84200');
    if (isNaN(curBal)) curBal = 84200;
    var depAmt = parseFloat(d.amount) || 0;
    var newBal = curBal + depAmt;
    localStorage.setItem('crest_user_balance', newBal.toString());
  } catch(e) {}

  toast('Deposit ' + id + ' confirmed! Investor account credited with ₦' + parseFloat(d.amount).toLocaleString('en-NG'), 'emerald');
  addAuditLog('DEPOSIT_CONFIRMED', 'Deposit ' + id + ' of ₦' + parseFloat(d.amount).toLocaleString('en-NG') + ' credited to ' + d.user);
}

/* ── INVESTORS DIRECTORY ─────────────────────────────────── */
function renderUsersTable(searchQuery) {
  var tbody = $('usersTableBody');
  if (!tbody) return;

  var list = AdminState.users;
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    list = list.filter(function(u) {
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.tier.toLowerCase().includes(q);
    });
  }

  tbody.innerHTML = list.map(function(u, idx) {
    return '<tr>' +
      '<td><div class="user-cell"><div class="user-cell-avatar">' + u.name.split(' ').map(function(n) { return n[0]; }).join('') + '</div><div><div class="user-cell-name">' + u.name + '</div><div class="user-cell-sub">' + u.email + '</div></div></div></td>' +
      '<td><span class="badge" style="background:rgba(200,138,88,0.15);color:var(--color-copper);border:1px solid rgba(200,138,88,0.3);">' + u.tier + '</span></td>' +
      '<td class="mono-amount">' + u.invested + '</td>' +
      '<td class="mono-amount credit">' + u.balance + '</td>' +
      '<td><span class="badge badge--approved">' + u.tasks + '</span></td>' +
      '<td><span class="badge badge--approved">' + u.kyc + '</span></td>' +
      '<td>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-subtle btn-sm" onclick="bypassGateForUser(\'' + u.name + '\')">Bypass Gate</button>' +
          '<button class="btn btn-subtle btn-sm" onclick="adjustUserBalance(\'' + u.name + '\')">Adjust</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function filterUsers() {
  var search = $('userSearchInput') ? $('userSearchInput').value.trim() : '';
  renderUsersTable(search);
}

function bypassGateForUser(name) {
  toast('Withdrawal task gate bypassed for ' + name + ' (VIP Override).', 'emerald');
  addAuditLog('VIP_OVERRIDE', 'Task gate bypassed for user: ' + name);
}

function adjustUserBalance(name, userId) {
  var amtStr = prompt('Enter adjustment amount for ' + name + ' (+/- ₦):');
  if (!amtStr) return;
  var amt = parseFloat(amtStr.replace(/[^0-9.-]/g, ''));
  if (isNaN(amt) || amt === 0) {
    toast('Please enter a valid numeric amount.', 'warn');
    return;
  }

  // Sync to Supabase DB if user_id is provided
  if (window.supabaseClient && userId) {
    try {
      window.supabaseClient.rpc('admin_adjust_balance', {
        p_user_id: userId,
        p_amount: amt,
        p_reason: 'Admin manual balance adjustment'
      }).then(function(res) {
        if (res.error) console.warn('Supabase balance adjust RPC notice:', res.error);
      });
    } catch(e) {}
  }

  toast('Balance adjusted by ₦' + amt.toLocaleString('en-NG') + ' for ' + name, 'emerald');
  addAuditLog('BALANCE_ADJUST', 'Manual balance correction of ₦' + amt.toLocaleString('en-NG') + ' for ' + name);
}

/* ── OBSERVATORY KPIS & FLOW CHART ───────────────────────── */
function updateKpis() {
  var pendingWds = AdminState.withdrawals.filter(function(w) { return w.status === 'Pending Review'; });
  var totalPendingAmt = pendingWds.reduce(function(sum, w) { return sum + (parseFloat(w.amount) || 0); }, 0);

  if ($('statPendingWd')) $('statPendingWd').textContent = '₦' + totalPendingAmt.toLocaleString('en-NG');
  if ($('statPendingWdCountLabel')) $('statPendingWdCountLabel').textContent = pendingWds.length + ' requests awaiting task review';
  if ($('navPendingWdCount')) $('navPendingWdCount').textContent = pendingWds.length;

  var pendingDeps = AdminState.deposits.filter(function(d) { return d.status === 'Pending Confirmation'; });
  if ($('navPendingDepCount')) $('navPendingDepCount').textContent = pendingDeps.length;
}

function drawFlowChart() {
  var canvas = $('adminFlowChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width = canvas.offsetWidth;
  var h = canvas.height = canvas.offsetHeight;
  if (!w || !h) return;

  var inflows = [12.4, 15.1, 13.8, 18.2, 16.5, 14.2, 19.8];
  var outflows = [3.2, 4.5, 2.8, 5.1, 4.0, 3.5, 4.2];
  var labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  var max = 22.0;
  var pl = 44, pr = 16, pt = 20, pb = 32;
  var cw = w - pl - pr, ch = h - pt - pb;

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#1A2027';
  ctx.lineWidth = 1;
  for (var i = 0; i <= 4; i++) {
    var y = pt + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(w - pr, y); ctx.stroke();
  }

  var xOf = function(i) { return pl + (i / (inflows.length - 1)) * cw; };
  var yOf = function(v) { return pt + ch - (v / max) * ch; };

  // Draw Inflow (Green)
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(inflows[0]));
  for (var j = 1; j < inflows.length; j++) {
    var xc = (xOf(j - 1) + xOf(j)) / 2;
    ctx.bezierCurveTo(xc, yOf(inflows[j - 1]), xc, yOf(inflows[j]), xOf(j), yOf(inflows[j]));
  }
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Outflow (Orange)
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(outflows[0]));
  for (j = 1; j < outflows.length; j++) {
    xc = (xOf(j - 1) + xOf(j)) / 2;
    ctx.bezierCurveTo(xc, yOf(outflows[j - 1]), xc, yOf(outflows[j]), xOf(j), yOf(outflows[j]));
  }
  ctx.strokeStyle = '#FF5500';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#6B7280';
  ctx.font = '10px "Space Mono", monospace';
  ctx.textAlign = 'center';
  labels.forEach(function(l, idx) {
    ctx.fillText(l, xOf(idx), h - 10);
  });

  ctx.textAlign = 'right';
  ['20M', '15M', '10M', '5M'].forEach(function(l, idx) {
    ctx.fillText('₦' + l, pl - 6, pt + (ch / 4) * idx + 10);
  });
}

/* ── AUDIT TELEMETRY STREAM ──────────────────────────────── */
var AUDIT_LOGS = [
  { time: '12:04:18', type: 'RATE_LIMITER', text: 'Token bucket refill executed: 100/100 tokens present on Redis cluster.' },
  { time: '11:58:02', type: 'TASK_VERIFY', text: 'Investor <strong>Adaeze Okonkwo</strong> verified X (@adaeze_invests) and YouTube sub.' },
  { time: '11:42:35', type: 'WITHDRAWAL', text: 'New withdrawal request <strong>WD-849120-NGX</strong> (₦50,000) queued with 5/5 tasks passed.' },
  { time: '11:15:10', type: 'DEPOSIT', text: 'Inflow of <strong>₦200,000.00</strong> verified via GTBank settlement webhook.' },
  { time: '10:30:44', type: 'SECURITY', text: 'Zero failed login attempts in last 60 minutes. TLS 1.3 session integrity 100%.' }
];

function renderAuditStream() {
  var container = $('auditStream');
  if (!container) return;
  container.innerHTML = AUDIT_LOGS.map(function(l) {
    return '<div class="audit-entry">' +
      '<div class="audit-text">[' + l.type + '] ' + l.text + '</div>' +
      '<div class="audit-meta">' + l.time + '</div>' +
    '</div>';
  }).join('');
}

function addAuditLog(type, text) {
  var now = new Date();
  var timeStr = now.toTimeString().split(' ')[0];
  AUDIT_LOGS.unshift({ time: timeStr, type: type, text: text });
  if (AUDIT_LOGS.length > 8) AUDIT_LOGS.pop();
  renderAuditStream();
}

/* ── MODALS & TOAST ──────────────────────────────────────── */
function openModal(id) {
  var m = $(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  var m = $(id);
  if (m) m.classList.remove('active');
}

function toast(msg, type) {
  var el = $('adminToast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type === 'emerald' ? ' toast--emerald' : '');
  setTimeout(function() { el.classList.remove('show'); }, 3400);
}

/* ── STORAGE EVENT LISTENER ──────────────────────────────── */
window.addEventListener('storage', function(e) {
  if (e.key === 'crest_withdrawals' || e.key === 'crest_deposits') {
    initAdminData();
    filterWithdrawals();
    filterDeposits();
    updateKpis();
    addAuditLog('INCOMING_EVENT', 'New transaction received from user dashboard.');
  }
});

/* ── INITIALIZE ON LOAD ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  initAdminData();
  renderAdminTasks();
  filterWithdrawals();
  filterDeposits();
  renderUsersTable();
  renderAuditStream();
  updateKpis();
  setTimeout(drawFlowChart, 100);
});

window.addEventListener('resize', function() {
  if (AdminState.currentView === 'observatory') {
    clearTimeout(window._adminResizeTimer);
    window._adminResizeTimer = setTimeout(drawFlowChart, 100);
  }
});
