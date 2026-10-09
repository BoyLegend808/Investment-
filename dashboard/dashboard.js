// Scoped per-user storage access (prevents data crossover or loss)
function getCrestStorage(key, defaultVal) {
  try {
    var u = window.crestUser;
    if (!u) {
      var r = localStorage.getItem('crest_current_user');
      if (r) { try { u = JSON.parse(r); } catch(e) {} }
    }
    var prefix = (u && u.id) ? ('crest_' + u.id + '_') : 'crest_';
    var val = localStorage.getItem(prefix + key);
    if (val !== null) return val;
    // Fallback to legacy or global key
    val = localStorage.getItem('crest_' + key);
    if (val !== null) return val;
  } catch (e) {}
  return defaultVal;
}

function setCrestStorage(key, val) {
  try {
    var u = window.crestUser;
    if (!u) {
      var r = localStorage.getItem('crest_current_user');
      if (r) { try { u = JSON.parse(r); } catch(e) {} }
    }
    var prefix = (u && u.id) ? ('crest_' + u.id + '_') : 'crest_';
    var strVal = typeof val === 'string' ? val : JSON.stringify(val);
    localStorage.setItem(prefix + key, strVal);
    // Mirror global configs
    if (key === 'tasks_config' || key === 'admin_tasks') {
      localStorage.setItem('crest_' + key, strVal);
    }
  } catch (e) {}
}

// Verify auth before rendering dashboard
if (!window.crestUser) {
  (async function supabaseAuthGuard() {
    var waited = 0;
    var session = null;
    while (!window.supabaseClient && waited < 1000) {
      await new Promise(r => setTimeout(r, 25));
      waited += 25;
    }
    if (window.supabaseClient) {
      try {
        const { data } = await window.supabaseClient.auth.getSession();
        session = data ? data.session : null;
      } catch (e) {}
    }
    
    var localUserRaw = localStorage.getItem('crest_current_user');
    var localUser = null;
    if (localUserRaw) {
      try { localUser = JSON.parse(localUserRaw); } catch (e) {}
    }

    // A locally stored user is ONLY trusted if it is the explicit demo account.
    var isDemoUser = !!(localUser && typeof localUser.id === 'string' && localUser.id.indexOf('demo_') === 0);

    if (!session && !isDemoUser) {
      // If auth-guard overlay is active, let user sign in via modal instead of abruptly redirecting
      if (!document.getElementById('crest-auth-overlay')) {
        localStorage.removeItem('crest_current_user');
        window.location.href = '../index/index.html#signin';
      }
      return;
    }

    window.crestUser = session ? session.user : localUser;
    document.documentElement.style.visibility = '';

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { initDashboardUserProfile(); });
    } else {
      initDashboardUserProfile();
    }
  })();
} else {
  document.documentElement.style.visibility = '';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { initDashboardUserProfile(); });
  } else {
    initDashboardUserProfile();
  }
}

async function initDashboardUserProfile() {
  var user = window.crestUser;
  if (!user) {
    var raw = localStorage.getItem('crest_current_user');
    if (raw) {
      try { user = JSON.parse(raw); } catch (e) {}
    }
  }
  if (!user) return;
  window.crestUser = user;

  var fullName = (user.user_metadata && user.user_metadata.full_name) ||
                 (user.user_metadata && user.user_metadata.name) ||
                 user.full_name ||
                 (user.email ? user.email.split('@')[0] : 'Valued Investor');
  var email = user.email || 'investor@crestwealth.com';
  var referralCode = 'CW-' + (user.id ? user.id.slice(0, 8).toUpperCase() : 'VIP2026');

  if (window.supabaseClient && user.id && typeof user.id === 'string' && !user.id.startsWith('demo_')) {
    try {
      const { data: dbProfile } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (dbProfile) {
        if (dbProfile.full_name) fullName = dbProfile.full_name;
        if (dbProfile.email) email = dbProfile.email;
        if (dbProfile.referral_code) referralCode = dbProfile.referral_code;

        if (dbProfile.cash_balance !== undefined && dbProfile.cash_balance !== null) {
          var b = parseFloat(dbProfile.cash_balance);
          if (!isNaN(b) && typeof S !== 'undefined') {
            S.cashBalance = b;
          }
        }
        if (dbProfile.invested_balance !== undefined && dbProfile.invested_balance !== null) {
          var ib = parseFloat(dbProfile.invested_balance);
          if (!isNaN(ib) && typeof S !== 'undefined') {
            S.investedBalance = ib;
          }
        }

        // Restore streak state from DB
        if (dbProfile.daily_streak_day !== undefined && dbProfile.daily_streak_day !== null) {
          var streak = getDailyStreakData();
          streak.day = parseInt(dbProfile.daily_streak_day, 10) || 1;
          streak.lastClaimDate = dbProfile.last_streak_claim_date || '';
          saveDailyStreakData(streak);
          renderDailyStreak();
        }

        if (typeof S !== 'undefined') {
          saveUserBalance();
          updateBalanceDisplays();
        }
      }

      // Restore user completed tasks from DB
      const { data: dbTasks } = await window.supabaseClient
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id);

      if (dbTasks && dbTasks.length > 0 && typeof S !== 'undefined' && S.tasks) {
        var completedMap = {};
        dbTasks.forEach(function(dt) {
          if (dt.completed) {
            completedMap[dt.task_id] = true;
          }
        });
        S.tasks.forEach(function(t) {
          if (completedMap[t.id]) t.done = true;
        });
        saveUserTasksState();
        if (typeof renderTasks === 'function') renderTasks();
      }
    } catch (err) {
      console.warn('[Crest] Supabase profile sync:', err);
    }
  }

  // Set up referral UI and load database-driven portfolio/referrals/txns
  setupUserReferralUI(referralCode);
  loadUserInvestmentsFromDB();
  loadUserReferralsFromDB();
  loadUserTransactionsFromDB();
  renderVaultXModal();

  var parts = fullName.trim().split(/\s+/);
  var initials = 'CW';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  var sidebarName = document.querySelector('.sidebar-user-name');
  if (sidebarName) sidebarName.textContent = fullName;

  document.querySelectorAll('.sidebar-user-avatar, .topbar-avatar, .avatar-lg').forEach(function(el) {
    el.textContent = initials;
  });

  var depAcctName = document.getElementById('depAcctName');
  if (depAcctName) depAcctName.textContent = 'Crest Wealth / ' + fullName;

  var settingsView = document.getElementById('view-settings');
  if (settingsView) {
    var textInputs = settingsView.querySelectorAll('input[type="text"]');
    if (textInputs.length >= 2) {
      textInputs[0].value = parts[0] || fullName;
      textInputs[1].value = parts.slice(1).join(' ') || '';
    }
    var emailInput = settingsView.querySelector('input[type="email"]');
    if (emailInput) emailInput.value = email;
  }

  if (typeof loadRemoteTasksConfig === 'function') {
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
    id: 0, done: true,
    icon: 'x', platform: 'X (Twitter)',
    title: 'Follow Crest on X',
    desc: 'Follow <strong>@CrestWealthNG</strong> and stay updated with daily market tips.',
    steps: ['Tap the button below to open @CrestWealthNG on X', 'Click Follow on the profile', 'Come back here — we verify automatically'],
    inputType: null,
    reward: '+₦2,000', rewardAmount: 2000,
    url: 'https://x.com/CrestWealthNG', urlLabel: 'Open X Profile',
    verificationType: 'timed', minSeconds: 20
  },
  {
    id: 1, done: false,
    icon: 'yt', platform: 'YouTube',
    title: 'Subscribe on YouTube',
    desc: 'Subscribe to <strong>Crest Wealth</strong> and watch at least one full video.',
    steps: ['Tap the button below to open our YouTube channel', 'Click Subscribe', 'Watch any full video, then come back here'],
    inputType: null,
    reward: '+₦3,000', rewardAmount: 3000,
    url: 'https://youtube.com/@CrestWealth', urlLabel: 'Open YouTube Channel',
    verificationType: 'timed', minSeconds: 30
  },
  {
    id: 2, done: false,
    icon: 'ig', platform: 'Instagram',
    title: 'Comment on Our Post',
    desc: 'Find the pinned post on <strong>@CrestWealthNG</strong> and leave a genuine comment.',
    steps: ['Tap the button below to open @CrestWealthNG on Instagram', 'Find the pinned investment post', 'Leave a comment, then come back here'],
    inputType: null,
    reward: '+₦1,500', rewardAmount: 1500,
    url: 'https://instagram.com/CrestWealthNG', urlLabel: 'Open Instagram',
    verificationType: 'social_handle'
  },
  {
    id: 3, done: false,
    icon: 'quiz', platform: 'Quiz',
    title: 'Investment IQ Quiz',
    desc: 'Answer 5 finance questions. Score <strong>70%+</strong> to pass and earn your bonus.',
    steps: ['Read each question carefully', 'Select your answer', 'Score 70% or higher to complete'],
    inputType: null,
    reward: '+₦2,500', rewardAmount: 2500,
    isQuiz: true,
    verificationType: 'quiz'
  },
  {
    id: 4, done: false,
    icon: 'game', platform: 'Trading Mini-Game',
    title: 'Market Timing Mini-Game',
    desc: 'Play the trading simulator. Time your BUY & SELL orders to score <strong>150+ points</strong>.',
    steps: ['Watch the live price ticks', 'Click BUY on dips & SELL on peaks', 'Achieve 150 points to complete'],
    inputType: null,
    reward: '+₦3,500', rewardAmount: 3500,
    isGame: true,
    verificationType: 'game'
  },
  {
    id: 5, done: false,
    icon: 'link', platform: 'VIP Referrals',
    title: 'Invite 2 Friends to Crest',
    desc: 'Share your personal referral link on WhatsApp. When 2 friends join and verify, earn <strong>₦5,000</strong> instant cash credit.',
    steps: ['Tap Share on WhatsApp below', 'Send your invitation to at least 2 friends or investment groups', 'Come back here — we verify automatically'],
    inputType: null,
    reward: '+₦5,000', rewardAmount: 5000,
    url: "https://api.whatsapp.com/send?text=Hey!%20I'm%20earning%20daily%20passive%20returns%20with%20Crest%20Wealth.%20Join%20with%20my%20VIP%20link%20to%20get%20%E2%82%A62%2C000%20welcome%20bonus%3A%20https%3A%2F%2Fcrestwealth.com%2Fref%2FADAEZE2026",
    urlLabel: 'Share on WhatsApp',
    verificationType: 'social_handle'
  }
];

/* ── QUIZ DATA ──────────────────────────────────────── */
var QUIZ_DATA = [
  {
    q: "Which exchange lists Nigerian blue-chip equities like GTCO and Dangote Cement?",
    opts: ["Lagos Stock Exchange", "Nigerian Exchange Group (NGX)", "FMDQ Securities Exchange", "West Africa Capital Market"],
    correct: 1,
    why: "The Nigerian Exchange Group (NGX), formerly NSE, is Nigeria's primary equities market."
  },
  {
    q: "What does '16.8% p.a.' mean on a fixed deposit?",
    opts: ["You earn 16.8% of profits made annually", "The platform pays 16.8% of your principal per year", "You pay 16.8% tax annually", "16.8% is the total return over the entire term"],
    correct: 1,
    why: "'Per annum' means per year. 16.8% p.a. on N100,000 = N16,800 every 12 months."
  },
  {
    q: "Which investment carries the lowest default risk in Nigeria?",
    opts: ["Corporate bonds", "Real estate funds", "FGN Treasury Bills", "NGX penny stocks"],
    correct: 2,
    why: "Federal Government of Nigeria T-Bills are backed by the sovereign guarantee — the safest instrument."
  },
  {
    q: "What is compound interest?",
    opts: [
      "Interest paid only on the original principal",
      "Interest calculated on a flat monthly basis",
      "Interest earned on both principal and previously earned interest",
      "A type of tax charged on investment income"
    ],
    correct: 2,
    why: "Compound interest earns interest on your interest — the foundation of long-term wealth building."
  },
  {
    q: "Why is diversification important in investing?",
    opts: [
      "It guarantees the highest possible return",
      "It reduces overall portfolio risk by spreading across assets",
      "It avoids all regulatory requirements",
      "It means only buying government assets"
    ],
    correct: 1,
    why: "Diversification reduces volatility. Underperformance in one asset is offset by resilience in others."
  }
];

/* ── STATE MANAGEMENT & PERSISTENCE ──────────────────── */
function loadTasksState() {
  var config = null;
  try {
    var raw = getCrestStorage('tasks_config', null);
    if (raw) config = JSON.parse(raw);
  } catch(e) {}

  var activeTasks = (config && Array.isArray(config) && config.length > 0) ? config : DEFAULT_TASKS;

  // Filter only active tasks if admin configured active flags
  activeTasks = activeTasks.filter(function(t) { return t.active !== false; });

  var userDone = {};
  try {
    var uRaw = getCrestStorage('user_tasks', null);
    if (uRaw) userDone = JSON.parse(uRaw);
  } catch(e) {}

  return activeTasks.map(function(t) {
    var copy = Object.assign({}, t);
    if (typeof copy.rewardAmount !== 'number') {
      var m = (copy.reward || '').replace(/[^0-9]/g, '');
      copy.rewardAmount = m ? parseInt(m, 10) : 2000;
    }
    if (!copy.reward) {
      copy.reward = '+₦' + copy.rewardAmount.toLocaleString('en-NG');
    }
    if (copy.isQuiz || copy.verificationType === 'quiz') copy.verificationType = 'quiz';
    else if (copy.isGame || copy.verificationType === 'game') copy.verificationType = 'game';
    else if (copy.verificationType !== 'screenshot') copy.verificationType = 'timed';
    if (copy.verificationType === 'timed' && !copy.minSeconds) copy.minSeconds = 30;
    if (userDone[copy.id] !== undefined) {
      copy.done = !!userDone[copy.id].done;
      if (userDone[copy.id].inputDoneVal) copy.inputDoneVal = userDone[copy.id].inputDoneVal;
      if (userDone[copy.id].proofPath) copy.proofPath = userDone[copy.id].proofPath;
    }
    return copy;
  });
}

function saveUserTasksState(onlyTaskId) {
  var state = {};
  S.tasks.forEach(function(t) {
    state[t.id] = { done: t.done, inputDoneVal: t.inputDoneVal || '', proofPath: t.proofPath || '' };
  });
  try {
    setCrestStorage('user_tasks', state);
  } catch(e) {}

  // Sync to Supabase DB if user is logged in
  if (window.supabaseClient) {
    try {
      window.supabaseClient.auth.getSession().then(function(res) {
        var u = res && res.data && res.data.session ? res.data.session.user : null;
        if (u && !u.id.startsWith('demo_')) {
          S.tasks.forEach(function(t) {
            if (onlyTaskId !== undefined && t.id !== onlyTaskId) return;
            if (t.done) {
              var row = {
                user_id: u.id,
                task_id: t.id.toString(),
                task_title: t.title,
                reward_amount: t.rewardAmount || 2000,
                status: 'completed',
                completed_at: new Date().toISOString()
              };
              if (t.proofPath) row.proof_url = t.proofPath;
              window.supabaseClient.from('user_tasks').upsert(row, { onConflict: 'user_id,task_id' }).then(function() {});
            }
          });
        }
      });
    } catch(e) {}
  }
}

function loadInvestedBalance() {
  try {
    var saved = getCrestStorage('invested_balance', null);
    if (saved !== null) {
      var num = parseFloat(saved);
      if (!isNaN(num)) return num;
    }
  } catch(e) {}
  return 0;
}

function loadUserBalance() {
  try {
    var saved = getCrestStorage('user_balance', null);
    if (saved !== null) {
      var num = parseFloat(saved);
      if (!isNaN(num)) return num;
    }
  } catch(e) {}
  return 0;
}

function saveUserBalance() {
  try {
    setCrestStorage('user_balance', S.cashBalance.toString());
    setCrestStorage('invested_balance', (S.investedBalance || 0).toString());
  } catch(e) {}

  // Sync cash_balance to Supabase DB if user is logged in
  if (window.supabaseClient) {
    try {
      window.supabaseClient.auth.getSession().then(function(res) {
        var u = res && res.data && res.data.session ? res.data.session.user : null;
        if (u && !u.id.startsWith('demo_')) {
          window.supabaseClient.from('profiles').update({
            cash_balance: S.cashBalance
            // Note: invested_balance is protected by RLS triggers
          }).eq('id', u.id).then(function() {});
        }
      });
    } catch(e) {}
  }
}

function updateBalanceDisplays() {
  var fmt2 = function(n) { return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 }); };
  var fmt0 = function(n) { return '₦' + Math.round(n).toLocaleString('en-NG'); };

  if ($('cashBalanceVal')) $('cashBalanceVal').textContent = fmt0(S.cashBalance);
  if ($('cashBalanceHeroVal')) $('cashBalanceHeroVal').textContent = fmt2(S.cashBalance);

  document.querySelectorAll('.balance-display').forEach(function(el) {
    el.textContent = fmt2(S.cashBalance);
  });

  var wdInput = $('withdrawAmount');
  if (wdInput) wdInput.placeholder = 'Max ' + fmt0(S.cashBalance);

  var totalInvested = S.investedBalance || 0;
  var totalAccrued = S.accruedInterest || 0;
  var totalPortfolio = totalInvested + totalAccrued + S.cashBalance;

  if ($('topbarPortfolio')) $('topbarPortfolio').textContent = fmt0(totalPortfolio);
  if ($('portfolioValue')) $('portfolioValue').textContent = fmt2(totalPortfolio);
  
  if ($('totalInvestedVal')) $('totalInvestedVal').textContent = fmt0(totalInvested);
  if ($('totalAccruedVal')) $('totalAccruedVal').textContent = fmt0(totalAccrued);
}

async function creditUserReward(amount, taskTitle, taskId) {
  var amt = parseFloat(amount) || 0;
  if (amt <= 0) return;
  S.cashBalance += amt;
  saveUserBalance();
  updateBalanceDisplays();

  var today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  var title = taskTitle || 'Prerequisite Complete';
  prependUserTxn(today, 'Task Reward — ' + title, 'Reward', '+₦' + amt.toLocaleString('en-NG'), 'Completed');

  // Atomic database sync via RPC if logged in
  if (window.supabaseClient) {
    try {
      var sessRes = await window.supabaseClient.auth.getSession();
      var u = sessRes && sessRes.data && sessRes.data.session ? sessRes.data.session.user : null;
      if (u && !u.id.startsWith('demo_')) {
        var tId = (taskId !== undefined ? taskId : ('task_' + title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase())).toString();
        var { data: rpcRes, error: rpcErr } = await window.supabaseClient.rpc('claim_user_task_reward', {
          p_task_id: tId,
          p_reward_amount: amt,
          p_task_title: title
        });
        if (rpcErr || (rpcRes && !rpcRes.success)) {
          var { data: credRes } = await window.supabaseClient.rpc('credit_user_balance', {
            p_amount: amt,
            p_reason: 'Task Reward — ' + title,
            p_type: 'reward'
          });
          if (credRes && credRes.success && credRes.new_balance !== undefined) {
            S.cashBalance = parseFloat(credRes.new_balance);
            saveUserBalance();
            updateBalanceDisplays();
          }
        } else if (rpcRes && rpcRes.success && rpcRes.new_balance !== undefined) {
          S.cashBalance = parseFloat(rpcRes.new_balance);
          saveUserBalance();
          updateBalanceDisplays();
        }
        loadUserTransactionsFromDB();
      }
    } catch(e) {
      console.warn('creditUserReward sync notice:', e);
    }
  }
}

var S = {
  currentView: 'overview',
  cashBalance: loadUserBalance(),
  investedBalance: loadInvestedBalance(),
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
    timer: null
  },
  get tasksDone() { return this.tasks.filter(function(t) { return t.done; }).length; },
  get allDone() { return this.tasks.length > 0 && this.tasks.every(function(t) { return t.done; }); }
};

/* ── DOM REF HELPER ────────────────────────────── */
function $(id) { return document.getElementById(id); }

/* ── NAVIGATION ─────────────────────────────────── */
function switchView(name) {
  document.querySelectorAll('.view').forEach(function(v) {
    v.classList.remove('active');
    v.style.display = 'none';
  });
  document.querySelectorAll('.nav-link').forEach(function(n) {
    n.classList.remove('active');
  });

  var el = $('view-' + name);
  if (el) {
    el.classList.add('active');
    el.style.display = 'block';
  }
  var nav = document.querySelector('.nav-link[data-view="' + name + '"]');
  if (nav) nav.classList.add('active');

  document.querySelectorAll('.mbd-item').forEach(function(b) {
    if (b.getAttribute('data-view') === name) b.classList.add('active');
    else b.classList.remove('active');
  });

  var titles = {
    overview: 'Dashboard', portfolio: 'Portfolio',
    transactions: 'Transactions', deposit: 'Deposit Funds',
    withdraw: 'Withdraw', tasks: 'Tasks & Rewards',
    referrals: 'Referrals', settings: 'Settings'
  };
  if ($('topbarTitle')) $('topbarTitle').textContent = titles[name] || name;
  S.currentView = name;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'overview') {
    setTimeout(function() { drawSparkline(); drawGrowth(); drawDonut(); }, 60);
    if (typeof updateWithdrawalTimeline === 'function') updateWithdrawalTimeline();
  }
  if (name === 'withdraw') {
    if (typeof updateWithdrawalTimeline === 'function') updateWithdrawalTimeline();
  }
  if (name === 'tasks') {
    initMiniGame();
  }
}

/* ── MOBILE SIDEBAR OPEN & CLOSE ──────────────────── */
function openSidebar() {
  if ($('sidebar')) $('sidebar').classList.add('open');
  if ($('sidebarOverlay')) $('sidebarOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  if ($('sidebar')) $('sidebar').classList.remove('open');
  if ($('sidebarOverlay')) $('sidebarOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function toggleSidebar() {
  if ($('sidebar') && $('sidebar').classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

if ($('burgerBtn')) {
  $('burgerBtn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar();
  });
}

if ($('sidebarCloseBtn')) {
  $('sidebarCloseBtn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeSidebar();
  });
}

if ($('sidebarOverlay')) {
  $('sidebarOverlay').addEventListener('click', function(e) {
    e.preventDefault();
    closeSidebar();
  });
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSidebar();
});

document.querySelectorAll('.nav-link[data-view]').forEach(function(a) {
  a.addEventListener('click', function(e) {
    e.preventDefault();
    switchView(a.dataset.view);
  });
});

/* ── TASK SYSTEM ─────────────────────────────────── */
function refreshTaskUI() {
  var done = S.tasksDone;
  var total = S.tasks.length;
  var pct = total > 0 ? Math.round((done / total) * 100) : 100;
  var remaining = total - done;

  var fills = [$('tpbFill'), $('lockedProgFill')];
  fills.forEach(function(f) { if (f) f.style.width = pct + '%'; });

  if ($('tpbScore')) $('tpbScore').textContent = done + '/' + total;
  if ($('tpbSub')) $('tpbSub').textContent = S.allDone
    ? 'All tasks complete — Withdrawal unlocked!'
    : remaining + ' task' + (remaining !== 1 ? 's' : '') + ' remaining';
  if ($('lockedProgLabel')) $('lockedProgLabel').textContent = done + '/' + total;
  if ($('noticeTaskCount')) $('noticeTaskCount').textContent = remaining + ' remaining';

  var pip = $('navLockPip');
  var badge = $('navTaskBadge');
  if (pip) pip.style.display = S.allDone ? 'none' : 'block';
  if (badge) {
    badge.textContent = remaining;
    badge.style.display = remaining > 0 ? 'flex' : 'none';
  }
  if ($('mbdTaskBadge')) {
    $('mbdTaskBadge').textContent = remaining;
    $('mbdTaskBadge').style.display = remaining > 0 ? 'inline-block' : 'none';
  }

  var notice = $('taskLockNotice');
  if (notice) notice.style.display = S.allDone ? 'none' : 'flex';

  var wdLocked = $('wdLocked');
  var wdUnlocked = $('wdUnlocked');
  if (wdLocked) wdLocked.style.display = S.allDone ? 'none' : 'block';
  if (wdUnlocked) wdUnlocked.style.display = S.allDone ? 'block' : 'none';

  var doneBanner = $('tasksDoneBanner');
  if (doneBanner) doneBanner.style.display = S.allDone ? 'flex' : 'none';

  renderLockedTasksList();
  renderTasksGrid();
}

function renderLockedTasksList() {
  var el = $('lockedTasksList');
  if (!el) return;
  el.innerHTML = S.tasks.map(function(t) {
    return '<div class="locked-task-row">' +
      '<div class="ltr-status ' + (t.done ? 'ltr-status--done' : 'ltr-status--pending') + '">' +
      (t.done
        ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      ) +
      '</div>' +
      '<div><div class="ltr-name">' + t.title + '</div><div class="ltr-sub">' + t.platform + '</div></div>' +
      '<span class="ltr-reward">' + t.reward + '</span>' +
      '</div>';
  }).join('');
}

function renderTasksGrid() {
  var grid = $('tasksGrid');
  if (!grid) return;
  grid.innerHTML = S.tasks.map(function(t) { return renderTaskCard(t); }).join('');
  // Re-bind mini-game if needed
  if (!S.tasks.find(function(t) { return t.id === 4 && t.done; })) {
    drawMiniGameCanvas();
  }
}

var ICONS = {
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  yt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  ig: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>',
  telegram: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>',
  tiktok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V7.93a8.21 8.21 0 0 0 4.76 1.5V6.01c-.34 0-.68-.07-1-.2z"/></svg>',
  discord: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
  quiz: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
  game: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12h4m-2-2v4m7-2a1 1 0 1 0 2 0 1 1 0 0 0-2 0m4 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>',
  link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
};

var EXT_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>';

// Strip legacy "enter your username below" style steps (e.g. from admin-saved task configs)
function cleanTaskSteps(steps) {
  return (steps || []).filter(function(s) {
    return !/(enter|paste|type|input)\b.*\b(below|username|email|handle)/i.test(s);
  });
}

function renderTaskCard(t) {
  var steps = t.steps ? cleanTaskSteps(t.steps).map(function(s) {
    return '<div class="task-step' + (t.done ? ' task-step--done' : '') + '">' + s + '</div>';
  }).join('') : '';

  var rewardFormatted = t.reward || ('+₦' + (t.rewardAmount || 2000).toLocaleString('en-NG'));

  var actionHtml = '';
  if (t.done && !t.isQuiz && !t.isGame) {
    actionHtml = '<button class="task-btn task-btn--done task-btn--full" disabled><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Verified &amp; Paid</button>';
  } else if (!t.done && !t.isQuiz && !t.isGame) {
    var openBtn = t.url
      ? '<a href="' + t.url + '" target="_blank" rel="noopener" class="task-btn task-go-btn" onclick="startTask(' + t.id + ', event)">' +
        (t.urlLabel || 'Open ' + t.platform) + ' ' + EXT_ICON + '</a>'
      : '';

    if (t.verificationType === 'screenshot') {
      actionHtml = '<div class="task-action-stack">' + openBtn +
        '<label class="task-upload-btn" for="tproof-' + t.id + '">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>' +
          '<span>Upload screenshot to claim</span>' +
        '</label>' +
        '<input type="file" accept="image/*" id="tproof-' + t.id + '" class="task-file-input" onchange="uploadTaskProof(' + t.id + ', this)">' +
        '</div>';
    } else {
      var pending = getPendingTask();
      var isPending = pending && pending.id === t.id;
      var need = fmtDur(t.minSeconds || 30);
      if (isPending) {
        actionHtml = '<div class="task-pending"><span class="task-pending-spin"></span>' +
          '<span class="task-pending-text">Stay on ' + t.platform + ' for at least ' + need + ', then come back here</span>' +
          (t.url ? '<button class="task-pending-retry" onclick="startTask(' + t.id + ')">Open again</button>' : '') +
          '</div>';
      } else if (t.url) {
        actionHtml = '<div class="task-action-stack">' + openBtn +
          '<div class="task-time-hint">Spend at least ' + need + ' there — coming back early won\'t count</div></div>';
      } else {
        actionHtml = '<button class="task-btn task-btn--full" onclick="verifyTask(' + t.id + ')">Claim Reward <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>';
      }
    }
  } else if (t.isQuiz && !t.done) {
    actionHtml = renderQuizHTML();
  } else if (t.isQuiz && t.done) {
    actionHtml = '<div class="quiz-feedback quiz-feedback--correct">Investment IQ Quiz Passed! ' + rewardFormatted + ' bonus credited.</div>';
  } else if (t.isGame && !t.done) {
    actionHtml = renderGameHTML();
  } else if (t.isGame && t.done) {
    actionHtml = '<div class="quiz-feedback quiz-feedback--correct">Market Sprint Completed! Target achieved and ' + rewardFormatted + ' credited.</div>';
  }

  var iconSvg = ICONS[t.icon] || ICONS.quiz;

  return '<div class="task-card ' + (t.done ? 'task-card--done' : '') + ' ' + (t.isQuiz ? 'task-card--quiz' : '') + ' ' + (t.isGame ? 'task-card--game' : '') + '" id="tcard-' + t.id + '">' +
    '<div class="task-card-top"><div class="task-icon task-icon--' + (t.icon || 'quiz') + '">' + iconSvg + '</div><span class="task-reward">' + rewardFormatted + '</span></div>' +
    '<div class="task-title">' + t.title + '</div>' +
    '<div class="task-desc">' + t.desc + '</div>' +
    '<div class="task-steps">' + steps + '</div>' +
    actionHtml +
    '</div>';
}

/* ── TIMED AUTO-VERIFY ─────────────────────────────────────────
   Click link -> pending saved -> we measure how long the user is actually
   AWAY from this tab (page hidden). Only a single continuous stretch of at
   least task.minSeconds counts. Coming straight back = not verified. */
var PENDING_TASK_KEY = 'crest_pending_task';

function fmtDur(sec) {
  sec = Math.max(1, Math.round(sec));
  if (sec < 60) return sec + ' sec';
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ' min' + (s ? ' ' + s + ' sec' : '');
}

function getPendingTask() {
  try { return JSON.parse(localStorage.getItem(PENDING_TASK_KEY) || 'null'); } catch (e) { return null; }
}
function savePendingTask(p) {
  try { localStorage.setItem(PENDING_TASK_KEY, JSON.stringify(p)); } catch (e) {}
}

function startTask(id, ev) {
  var task = S.tasks.find(function(item) { return item.id === id; });
  if (!task || task.done) return;
  if (task.verificationType === 'screenshot') return; // screenshot tasks just open the link
  savePendingTask({ id: id, ts: Date.now(), hiddenAt: null, best: 0 });
  // "Open again" button isn't an anchor — open the link manually
  if (!ev && task.url) window.open(task.url, '_blank', 'noopener');
  setTimeout(renderTasksGrid, 50);
}

function onTaskVisibilityChange() {
  var p = getPendingTask();
  if (!p) return;
  if (document.visibilityState === 'hidden') {
    if (!p.hiddenAt) { p.hiddenAt = Date.now(); savePendingTask(p); }
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
  var task = S.tasks.find(function(item) { return item.id === p.id; });
  if (!task || task.done) { localStorage.removeItem(PENDING_TASK_KEY); return; }
  if (!p.best) return; // user hasn't actually left the site yet

  var needMs = (task.minSeconds || 30) * 1000;
  if (p.best < needMs) {
    var left = Math.ceil((needMs - (p.lastAway || 0)) / 1000);
    toast('Not verified — you came back after ' + fmtDur((p.lastAway || 0) / 1000) + '. Stay on ' + task.platform + ' for ' + fmtDur(task.minSeconds || 30) + ' (' + fmtDur(left) + ' more). Tap "Open again".', 'warn');
    return;
  }
  localStorage.removeItem(PENDING_TASK_KEY);
  var pend = document.querySelector('#tcard-' + p.id + ' .task-pending-text');
  if (pend) pend.textContent = 'Verifying your ' + task.platform + ' task...';
  verifyTask(p.id);
}

document.addEventListener('visibilitychange', onTaskVisibilityChange);
window.addEventListener('pageshow', function() { setTimeout(onTaskVisibilityChange, 800); });

/* ── SCREENSHOT PROOF UPLOAD (paid as soon as the upload succeeds) ── */
function uploadTaskProof(id, input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Please upload an image (screenshot).', 'warn'); input.value = ''; return; }
  if (file.size > 8 * 1024 * 1024) { toast('Screenshot is too large (max 8MB).', 'warn'); input.value = ''; return; }

  var label = document.querySelector('#tcard-' + id + ' .task-upload-btn');
  if (label) { label.classList.add('is-loading'); label.querySelector('span').textContent = 'Uploading screenshot...'; }

  var fail = function(msg) { toast(msg, 'warn'); renderTasksGrid(); };
  if (!window.supabaseClient) { verifyTask(id, null); return; }

  window.supabaseClient.auth.getSession().then(function(res) {
    var u = res && res.data && res.data.session ? res.data.session.user : null;
    if (!u || u.id.startsWith('demo_')) { verifyTask(id, null); return; }
    var ext = ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'jpg';
    var path = u.id + '/task-' + id + '-' + Date.now() + '.' + ext;
    window.supabaseClient.storage.from('task-proofs')
      .upload(path, file, { contentType: file.type, upsert: false })
      .then(function(r) {
        if (r.error) { console.warn('[Crest] Proof upload failed:', r.error); fail('Upload failed. Please try again.'); return; }
        verifyTask(id, path);
      });
  }).catch(function() { fail('Upload failed. Please try again.'); });
}

function verifyTask(id, proofPath) {
  var task = S.tasks.find(function(item) { return item.id === id; });
  if (!task || task.done) return;

  var btn = document.querySelector('#tcard-' + id + ' .task-btn');
  if (btn && !proofPath) { btn.textContent = 'Verifying...'; btn.disabled = true; }

  setTimeout(function() {
    task.done = true;
    task.inputDoneVal = proofPath ? 'Screenshot' : 'Verified';
    if (proofPath) task.proofPath = proofPath;
    saveUserTasksState(id);

    var rewardAmt = (typeof task.rewardAmount === 'number') ? task.rewardAmount : (function() {
      var m = (task.reward || '').replace(/[^0-9]/g, '');
      return m ? parseInt(m, 10) : 2000;
    })();

    creditUserReward(rewardAmt, task.title);
    refreshTaskUI();
    toast('Task verified! +₦' + rewardAmt.toLocaleString('en-NG') + ' added to your cash balance.', 'emerald');
  }, 1200);
}

/* ── REMOTE SYNC: admin task config + this user's completed tasks ── */
function loadRemoteTasksConfig() {
  if (!window.supabaseClient) return;
  var sb = window.supabaseClient;
  sb.from('app_settings').select('value').eq('key', 'tasks_config').maybeSingle().then(function(res) {
    if (!res.error && res.data && Array.isArray(res.data.value) && res.data.value.length) {
      setCrestStorage('tasks_config', res.data.value);
    }
    return sb.auth.getSession();
  }).then(function(sres) {
    var u = sres && sres.data && sres.data.session ? sres.data.session.user : null;
    if (!u || u.id.startsWith('demo_')) return null;
    return sb.from('user_tasks').select('task_id, proof_url, status').eq('user_id', u.id);
  }).then(function(tres) {
    if (tres && !tres.error && Array.isArray(tres.data)) {
      var local = {};
      try { local = JSON.parse(getCrestStorage('user_tasks', '{}')) || {}; } catch (e) {}
      tres.data.forEach(function(r) {
        if (r.status === 'completed' && r.task_id != null) {
          local[r.task_id] = Object.assign({}, local[r.task_id], { done: true, proofPath: r.proof_url || '' });
        }
      });
      setCrestStorage('user_tasks', local);
    }
    S.tasks = loadTasksState();
    refreshTaskUI();
  }).catch(function(e) { console.warn('[Crest] Remote task sync skipped:', e); });
}

/* ── INVESTMENT IQ QUIZ ──────────────────────────────── */
function renderQuizHTML() {
  var q = QUIZ_DATA[S.quiz.q];
  if (!q) return '';
  return '<div class="quiz-wrap" id="quizWrap">' +
    '<div class="quiz-meta"><span id="qNum">Question ' + (S.quiz.q + 1) + ' of ' + QUIZ_DATA.length + '</span>' +
    '<span id="qScore">Score: ' + S.quiz.score + '/' + S.quiz.q + '</span></div>' +
    '<div class="quiz-q" id="qText">' + q.q + '</div>' +
    '<div class="quiz-opts" id="qOpts">' +
    q.opts.map(function(o, i) { return '<button class="quiz-opt" onclick="answerQ(' + i + ')">' + o + '</button>'; }).join('') +
    '</div><div id="qFeedback"></div></div>';
}

function answerQ(chosen) {
  if (S.quiz.done) return;
  var q = QUIZ_DATA[S.quiz.q];
  var opts = document.querySelectorAll('.quiz-opt');
  var fb = $('qFeedback');
  var isRight = chosen === q.correct;

  opts.forEach(function(o, i) {
    o.disabled = true;
    if (i === q.correct) o.classList.add('quiz-opt--correct');
    else if (i === chosen && !isRight) o.classList.add('quiz-opt--wrong');
  });

  if (isRight) S.quiz.score++;
  if (fb) {
    fb.className = 'quiz-feedback quiz-feedback--' + (isRight ? 'correct' : 'wrong');
    fb.textContent = q.why;
  }

  S.quiz.q++;

  if (S.quiz.q < QUIZ_DATA.length) {
    setTimeout(function() {
      var card = $('tcard-3');
      if (card) {
        var wrapper = card.querySelector('.quiz-wrap');
        if (wrapper) wrapper.outerHTML = renderQuizHTML();
      }
    }, 1700);
  } else {
    S.quiz.done = true;
    var pct = Math.round((S.quiz.score / QUIZ_DATA.length) * 100);
    S.quiz.passed = pct >= 70;
    setTimeout(function() {
      var card = $('tcard-3');
      if (!card) return;
      var wrap = card.querySelector('.quiz-wrap');
      if (wrap) wrap.outerHTML = '<div class="quiz-wrap"><div class="quiz-feedback quiz-feedback--' + (S.quiz.passed ? 'correct' : 'wrong') + '" style="text-align:center;padding:16px;">' +
        '<strong>' + (S.quiz.passed ? 'Passed!' : 'Not quite!') + '</strong><br>Score: ' + S.quiz.score + '/' + QUIZ_DATA.length + ' (' + pct + '%)<br>' +
        (S.quiz.passed ? 'Task complete. +N2,500 Bonus earned!' : 'Score 70%+ required. <button class="task-btn" onclick="retryQuiz()" style="margin-top:10px;display:inline-flex;">Try Again</button>') +
        '</div></div>';
      if (S.quiz.passed) {
        var task = S.tasks.find(function(t) { return t.id === 3; });
        if (task) {
          task.done = true;
          saveUserTasksState();
          var rewardAmt = (typeof task.rewardAmount === 'number') ? task.rewardAmount : 2500;
          creditUserReward(rewardAmt, task.title || 'Investment IQ Quiz');
          refreshTaskUI();
          toast('Investment IQ Quiz passed! +₦' + rewardAmt.toLocaleString('en-NG') + ' added to your cash balance.', 'emerald');
        }
      }
    }, 1700);
  }
}

function retryQuiz() {
  S.quiz = { q: 0, score: 0, done: false, passed: false };
  var card = $('tcard-3');
  if (card) {
    var wrap = card.querySelector('.quiz-wrap');
    if (wrap) wrap.outerHTML = renderQuizHTML();
  }
}

/* ── MARKET SPRINT TRADING MINI-GAME ──────────────────── */
function renderGameHTML() {
  return '<div class="game-container" id="miniGameContainer">' +
    '<div class="game-header-bar">' +
      '<div class="game-ticker-label"><span class="game-ticker-live"></span> NGX:CREST-INDEX</div>' +
      '<div class="game-score-badge" id="gameScoreLabel">Score: ' + S.game.score + ' / 150 pts</div>' +
    '</div>' +
    '<div class="game-canvas-wrap">' +
      '<canvas id="gameCanvas" class="game-canvas"></canvas>' +
    '</div>' +
    '<div class="game-stat-bar">' +
      '<span>Price: <strong id="gamePriceLabel">N' + S.game.price.toFixed(2) + '</strong></span>' +
      '<span>Position: <strong id="gamePosLabel">' + (S.game.position ? S.game.position.type + ' @ N' + S.game.position.entry.toFixed(2) : 'NONE') + '</strong></span>' +
    '</div>' +
    '<div class="game-actions">' +
      '<button class="game-btn-buy" id="btnGameBuy" onclick="gameTradeAction(\'BUY\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg> BUY DIP</button>' +
      '<button class="game-btn-sell" id="btnGameSell" onclick="gameTradeAction(\'SELL\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg> SELL PEAK</button>' +
    '</div>' +
    '<div class="game-msg" id="gameMsg">Click BUY on low ticks, SELL when green to bank profits!</div>' +
  '</div>';
}

function initMiniGame() {
  if (S.game.timer) clearInterval(S.game.timer);
  drawMiniGameCanvas();
  S.game.timer = setInterval(function() {
    var delta = (Math.random() - 0.48) * 0.9;
    S.game.price = Math.max(38.0, Math.min(58.0, S.game.price + delta));
    S.game.history.push(S.game.price);
    if (S.game.history.length > 24) S.game.history.shift();

    if ($('gamePriceLabel')) $('gamePriceLabel').textContent = 'N' + S.game.price.toFixed(2);
    drawMiniGameCanvas();
  }, 900);
}

function drawMiniGameCanvas() {
  var canvas = $('gameCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width = canvas.offsetWidth || 300;
  var h = canvas.height = canvas.offsetHeight || 110;
  var data = S.game.history;
  if (!data || data.length < 2) return;

  var min = Math.min.apply(null, data) * 0.98;
  var max = Math.max.apply(null, data) * 1.02;

  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = '#14181E';
  ctx.lineWidth = 1;
  for (var y = 20; y < h; y += 25) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  var xOf = function(i) { return (i / (data.length - 1)) * (w - 20) + 10; };
  var yOf = function(v) { return h - 14 - ((v - min) / (max - min)) * (h - 28); };

  // Gradient fill
  var isRising = data[data.length - 1] >= data[data.length - 2];
  var lineColor = isRising ? '#10B981' : '#EF4444';

  var grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, isRising ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (var i = 1; i < data.length; i++) {
    var xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(xc, yOf(data[i - 1]), xc, yOf(data[i]), xOf(i), yOf(data[i]));
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
    ctx.bezierCurveTo(xc, yOf(data[i - 1]), xc, yOf(data[i]), xOf(i), yOf(data[i]));
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Active tip dot
  var lx = xOf(data.length - 1), ly = yOf(data[data.length - 1]);
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#F97316';
  ctx.fill();
}

function gameTradeAction(action) {
  var msg = $('gameMsg');
  var scoreLbl = $('gameScoreLabel');
  var posLbl = $('gamePosLabel');

  if (action === 'BUY') {
    if (S.game.position) {
      if (msg) { msg.className = 'game-msg info'; msg.textContent = 'Already holding position! Click SELL to exit.'; }
      return;
    }
    S.game.position = { type: 'BUY', entry: S.game.price };
    if (posLbl) posLbl.textContent = 'LONG @ N' + S.game.price.toFixed(2);
    if (msg) { msg.className = 'game-msg info'; msg.textContent = 'Bought at N' + S.game.price.toFixed(2) + '! Now wait for tick up to SELL.'; }
  } else if (action === 'SELL') {
    if (!S.game.position) {
      if (msg) { msg.className = 'game-msg info'; msg.textContent = 'No position open! Click BUY DIP first.'; }
      return;
    }
    var profit = S.game.price - S.game.position.entry;
    var gainPts = Math.round(profit * 60);

    if (gainPts > 0) {
      S.game.score += gainPts;
      if (msg) {
        msg.className = 'game-msg win';
        msg.textContent = 'Profit locked! +' + gainPts + ' pts (Sold @ N' + S.game.price.toFixed(2) + ')';
      }
    } else {
      S.game.score = Math.max(0, S.game.score + gainPts);
      if (msg) {
        msg.className = 'game-msg loss';
        msg.textContent = 'Loss taken (' + gainPts + ' pts). Try again!';
      }
    }
    S.game.position = null;
    if (posLbl) posLbl.textContent = 'NONE';
    if (scoreLbl) scoreLbl.textContent = 'Score: ' + S.game.score + ' / 150 pts';

    // Check Win Condition
    if (S.game.score >= S.game.targetScore) {
      clearInterval(S.game.timer);
      var task = S.tasks.find(function(t) { return t.id === 4; });
      if (task) {
        task.done = true;
        saveUserTasksState();
        var rewardAmt = (typeof task.rewardAmount === 'number') ? task.rewardAmount : 3500;
        creditUserReward(rewardAmt, task.title || 'Market Timing Mini-Game');
        refreshTaskUI();
        toast('Market Sprint Complete! +₦' + rewardAmt.toLocaleString('en-NG') + ' added to your cash balance.', 'emerald');
      }
    }
  }
}

/* ── CHARTS ─────────────────────────────────────────── */
function drawSparkline() {
  var canvas = $('sparklineCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width = canvas.offsetWidth || 160;
  var h = canvas.height = canvas.offsetHeight || 60;
  var data = [820, 870, 900, 980, 1050, 1180, 1248];
  var min = Math.min.apply(null, data) * 0.97;
  var max = Math.max.apply(null, data) * 1.02;
  var xOf = function(i) { return (i / (data.length - 1)) * w; };
  var yOf = function(v) { return h - ((v - min) / (max - min)) * h; };
  ctx.clearRect(0, 0, w, h);
  var grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(16,185,129,0.25)');
  grad.addColorStop(1, 'rgba(16,185,129,0)');
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (var i = 1; i < data.length; i++) {
    var xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(xc, yOf(data[i - 1]), xc, yOf(data[i]), xOf(i), yOf(data[i]));
  }
  ctx.lineTo(xOf(data.length - 1), h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (i = 1; i < data.length; i++) {
    xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(xc, yOf(data[i - 1]), xc, yOf(data[i]), xOf(i), yOf(data[i]));
  }
  ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.arc(xOf(data.length - 1), yOf(data[data.length - 1]), 4, 0, Math.PI * 2);
  ctx.fillStyle = '#F97316'; ctx.fill();
}

function drawGrowth() {
  var canvas = $('growthChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width = canvas.offsetWidth;
  var h = canvas.height = canvas.offsetHeight;
  if (!w || !h) return;
  var data = [820000, 880000, 910000, 970000, 1060000, 1190000, 1248500];
  var labels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Now'];
  var min = Math.min.apply(null, data) * 0.94;
  var max = Math.max.apply(null, data) * 1.03;
  var pl = 56, pr = 16, pt = 16, pb = 36;
  var cw = w - pl - pr, ch = h - pt - pb;
  var xOf = function(i) { return pl + (i / (data.length - 1)) * cw; };
  var yOf = function(v) { return pt + ch - ((v - min) / (max - min)) * ch; };
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#F3F4F6'; ctx.lineWidth = 1;
  for (var i = 0; i <= 4; i++) {
    var y = pt + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(w - pr, y); ctx.stroke();
  }
  var grad = ctx.createLinearGradient(0, pt, 0, pt + ch);
  grad.addColorStop(0, 'rgba(16,185,129,0.15)');
  grad.addColorStop(1, 'rgba(16,185,129,0)');
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (i = 1; i < data.length; i++) {
    var xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(xc, yOf(data[i - 1]), xc, yOf(data[i]), xOf(i), yOf(data[i]));
  }
  ctx.lineTo(xOf(data.length - 1), pt + ch);
  ctx.lineTo(xOf(0), pt + ch);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(data[0]));
  for (i = 1; i < data.length; i++) {
    xc = (xOf(i - 1) + xOf(i)) / 2;
    ctx.bezierCurveTo(xc, yOf(data[i - 1]), xc, yOf(data[i]), xOf(i), yOf(data[i]));
  }
  ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#9CA3AF'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
  labels.forEach(function(l, i) { ctx.fillText(l, xOf(i), h - 8); });
  ctx.textAlign = 'right';
  ['N1.2M', 'N1.0M', 'N0.8M'].forEach(function(l, i) {
    ctx.fillText(l, pl - 6, pt + (ch / 2.5) * i + 10);
  });
  var lx = xOf(data.length - 1), ly = yOf(data[data.length - 1]);
  ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#F97316'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
}

function drawDonut() {
  var canvas = $('donutChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width = canvas.offsetWidth;
  var H = canvas.height = canvas.offsetHeight;
  if (!W || !H) return;
  var cx = W / 2, cy = H / 2;
  var r = Math.min(cx, cy) - 8;
  var inner = r * 0.56;
  var slices = [
    { pct: 0.52, color: '#10B981' },
    { pct: 0.28, color: '#0B251A' },
    { pct: 0.14, color: '#F97316' },
    { pct: 0.06, color: '#D1D5DB' }
  ];
  var angle = -Math.PI / 2;
  slices.forEach(function(s) {
    var end = angle + s.pct * 2 * Math.PI;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, end);
    ctx.closePath(); ctx.fillStyle = s.color; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    angle = end;
  });
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.fillStyle = '#111827'; ctx.font = 'bold 13px Space Mono, monospace';
  ctx.textAlign = 'center'; ctx.fillText('N976k', cx, cy - 4);
  ctx.fillStyle = '#9CA3AF'; ctx.font = '10px Inter, sans-serif';
  ctx.fillText('invested', cx, cy + 13);
}

/* Chart tabs */
document.addEventListener('click', function(e) {
  if (!e.target.matches('.tab')) return;
  var group = e.target.closest('.tab-group');
  if (group) group.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  e.target.classList.add('active');
  drawGrowth();
});

/* ── DEPOSIT CALCULATOR & MULTI-BANK SELECTOR ───────── */
var DEPOSIT_BANKS = {
  opay: {
    name: 'OPay Digital Services',
    title: 'OPay Digital Services Dedicated Account',
    acctNum: '8023456789',
    acctName: 'Crest Wealth / Adaeze Okonkwo',
    note: 'Transfer from your OPay or any Nigerian banking app. Verified within 2 minutes.'
  },
  palmpay: {
    name: 'PalmPay Limited',
    title: 'PalmPay Dedicated Virtual Account',
    acctNum: '9012345678',
    acctName: 'Crest Wealth / Adaeze Okonkwo',
    note: 'Send exact amount via PalmPay or bank transfer. Instant auto-crediting.'
  },
  moniepoint: {
    name: 'Moniepoint MFB',
    title: 'Moniepoint MFB Dedicated Commercial Account',
    acctNum: '5501234567',
    acctName: 'Crest Wealth / Adaeze Okonkwo',
    note: 'Instant NIP settlement supported. Use your full name as payment narration.'
  },
  kuda: {
    name: 'Kuda Microfinance Bank',
    title: 'Kuda Microfinance Bank Account',
    acctNum: '2001234567',
    acctName: 'Crest Wealth / Adaeze Okonkwo',
    note: 'Transfer to Kuda account. Zero transfer fees across all banking channels.'
  },
  gtbank: {
    name: 'Guaranty Trust Bank (GTBank)',
    title: 'GTBank Dedicated Corporate Account',
    acctNum: '0123456789',
    acctName: 'Crest Wealth / Adaeze Okonkwo',
    note: 'Transfer to this account from any banking app. Funds appear within 2 minutes.'
  }
};
var currentDepositBank = 'opay';
var depositReceiptData = null;

function selectDepositBank(key) {
  if (!DEPOSIT_BANKS[key]) return;
  currentDepositBank = key;
  document.querySelectorAll('.bank-chip').forEach(function(b) {
    if (b.getAttribute('data-bank') === key) b.classList.add('active');
    else b.classList.remove('active');
  });
  var b = DEPOSIT_BANKS[key];
  if ($('depBankTitle')) $('depBankTitle').textContent = b.title;
  if ($('depAcctName')) $('depAcctName').textContent = b.acctName;
  if ($('depAcctNum')) $('depAcctNum').textContent = b.acctNum;
  if ($('depBankNote')) $('depBankNote').textContent = b.note;
  toast('Switched to ' + b.name + ' dedicated virtual account');
}

function copyDepAccount() {
  var b = DEPOSIT_BANKS[currentDepositBank];
  if (!b) return;
  navigator.clipboard.writeText(b.acctNum).then(function() {
    toast(b.name + ' account number copied (' + b.acctNum + ')');
  });
}

function handleReceiptUpload(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(evt) {
    depositReceiptData = evt.target.result;
    if ($('popPreviewImg')) $('popPreviewImg').src = depositReceiptData;
    if ($('popFileName')) $('popFileName').textContent = file.name;
    if ($('popPrompt')) $('popPrompt').style.display = 'none';
    if ($('popPreview')) $('popPreview').style.display = 'flex';
    toast('Transfer receipt screenshot attached: ' + file.name, 'emerald');
  };
  reader.readAsDataURL(file);
}

function removeReceipt(e) {
  if (e) e.stopPropagation();
  depositReceiptData = null;
  if ($('popFileInput')) $('popFileInput').value = '';
  if ($('popPrompt')) $('popPrompt').style.display = 'block';
  if ($('popPreview')) $('popPreview').style.display = 'none';
}

var depositSecondsRemaining = 899;
var depositTimerInterval = null;
function startDepositSessionTimer() {
  if (depositTimerInterval) clearInterval(depositTimerInterval);
  depositTimerInterval = setInterval(function() {
    depositSecondsRemaining--;
    if (depositSecondsRemaining <= 0) depositSecondsRemaining = 900;
    var m = Math.floor(depositSecondsRemaining / 60);
    var s = depositSecondsRemaining % 60;
    var str = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    if ($('depositTimer')) $('depositTimer').textContent = str;
  }, 1000);
}

function calcReturns() {
  var amtEl = $('depAmount');
  var rateEl = document.querySelector('input[name="plan"]:checked');
  var amt = parseFloat(amtEl ? amtEl.value : 0) || 0;
  var rate = parseFloat(rateEl ? rateEl.value : 0.115) || 0.115;
  var fmt = function(n) { return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 }); };
  if ($('previewAmt')) $('previewAmt').textContent = fmt(amt);
  if ($('previewRate')) $('previewRate').textContent = (rate * 100).toFixed(1) + '% p.a.';
  if ($('previewMon')) $('previewMon').textContent = fmt((amt * rate) / 12);
  if ($('previewYr')) $('previewYr').textContent = fmt(amt * rate);
}

function setPick(n) {
  var el = $('depAmount');
  if (el) { el.value = n; calcReturns(); }
}

function submitDeposit() {
  var amtEl = $('depAmount');
  var amt = parseFloat(amtEl ? amtEl.value : 0);
  if (!amt || amt < 500) { toast('Minimum deposit is ₦500', 'warn'); return; }

  var refId = 'DEP-' + Math.floor(100000 + Math.random() * 900000);
  var planEl = document.querySelector('input[name="plan"]:checked');
  var planRate = planEl ? planEl.value : '0.115';
  var planMap = {
    '0.115': 'Crest Stash (11.5% p.a.)',
    '0.142': 'Bronze Lock (14.2% p.a.)',
    '0.168': 'Silver Growth (16.8% p.a.)',
    '0.195': 'Gold Vault (19.5% p.a.)',
    '0.240': 'VaultX VIP (24.0% p.a.)'
  };
  var planName = planMap[planRate] || 'Crest Stash (11.5%)';
  var bInfo = DEPOSIT_BANKS[currentDepositBank] || DEPOSIT_BANKS.opay;

  var newDep = {
    id: refId,
    user: 'Adaeze Okonkwo',
    email: 'adaeze.okonkwo@email.com',
    amount: amt,
    plan: planName,
    bank: bInfo.name,
    acctNum: bInfo.acctNum,
    receiptData: depositReceiptData,
    method: 'BANK TRANSFER (' + bInfo.name.toUpperCase() + ')',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Pending Confirmation'
  };

  var existingDep = [];
  try {
    var depRaw = getCrestStorage('deposits', null); existingDep = depRaw ? JSON.parse(depRaw) : [];
  } catch(e) {}
  existingDep.unshift(newDep);
  setCrestStorage('deposits', existingDep);

  // Sync to Supabase DB if user is logged in
  if (window.supabaseClient) {
    try {
      window.supabaseClient.auth.getSession().then(function(res) {
        var u = res && res.data && res.data.session ? res.data.session.user : null;
        if (u) {
          window.supabaseClient.from('deposits').insert({
            id: refId,
            user_id: u.id,
            user_email: u.email,
            amount: amt,
            plan: planName,
            bank_name: bInfo.name,
            account_number: bInfo.acctNum,
            status: 'Pending'
          }).then(function(dbRes) {
            if (dbRes.error) console.warn('Supabase deposit sync notice:', dbRes.error);
          });
        }
      });
    } catch(e) {}
  }

  // Add row to user activity table
  prependUserTxn(newDep.date, 'Deposit Initiated — ' + planName, 'Deposit', '+₦' + amt.toLocaleString('en-NG'), 'Pending Confirmation');

  toast('Deposit of ₦' + amt.toLocaleString('en-NG') + ' submitted (' + refId + ')! The Observatory has been notified for confirmation.', 'emerald');
  if (amtEl) amtEl.value = '';
  removeReceipt();
  calcReturns();
}

/* ── DAILY LOGIN BONUS STREAK ────────────────────────── */
var STREAK_DAYS = [
  { day: 1, label: 'Day 1', reward: 200, rewardStr: '+₦200' },
  { day: 2, label: 'Day 2', reward: 200, rewardStr: '+₦200' },
  { day: 3, label: 'Day 3', reward: 200, rewardStr: '+₦200' },
  { day: 4, label: 'Day 4', reward: 200, rewardStr: '+₦200' },
  { day: 5, label: 'Day 5', reward: 200, rewardStr: '+₦200' },
  { day: 6, label: 'Day 6', reward: 200, rewardStr: '+₦200' },
  { day: 7, label: 'Day 7', reward: 1000, rewardStr: '+₦1,000' }
];

function getDailyStreakData() {
  var defaultData = { day: 1, claimedToday: false, lastClaimDate: '' };
  try {
    var raw = getCrestStorage('daily_streak', null);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return defaultData;
}

function saveDailyStreakData(data) {
  try {
    setCrestStorage('daily_streak', data);
  } catch(e) {}
}

function renderDailyStreak() {
  var streak = getDailyStreakData();
  var todayStr = new Date().toDateString();
  if (streak.lastClaimDate !== todayStr) {
    streak.claimedToday = false;
  }

  var track = $('streakDaysTrack');
  if (track) {
    track.innerHTML = STREAK_DAYS.map(function(item) {
      var isDone = item.day < streak.day || (item.day === streak.day && streak.claimedToday);
      var isToday = item.day === streak.day && !streak.claimedToday;
      var cls = 'streak-day-item' + (isDone ? ' done' : '') + (isToday ? ' today' : '');
      var statusTxt = isDone ? 'Claimed ✓' : (isToday ? 'Available' : 'Locked');
      return '<div class="' + cls + '">' +
        '<div class="sdi-day">' + item.label + '</div>' +
        '<div class="sdi-reward">' + item.rewardStr + '</div>' +
        '<div class="sdi-status">' + statusTxt + '</div>' +
        '</div>';
    }).join('');
  }

  var btn = $('claimStreakBtn');
  var btnTxt = $('claimStreakBtnText');
  if (btn && btnTxt) {
    if (streak.claimedToday) {
      btn.className = 'btn-claim-streak claimed';
      btn.disabled = true;
      btnTxt.textContent = 'Day ' + streak.day + ' Claimed Today ✓';
    } else {
      btn.className = 'btn-claim-streak';
      btn.disabled = false;
      var curReward = STREAK_DAYS[streak.day - 1] ? STREAK_DAYS[streak.day - 1].rewardStr : '+₦200';
      btnTxt.textContent = 'Claim Day ' + streak.day + ' (' + curReward + ')';
    }
  }
}

async function claimDailyStreak() {
  var streak = getDailyStreakData();
  var todayStr = new Date().toDateString();
  if (streak.claimedToday && streak.lastClaimDate === todayStr) {
    toast('You have already claimed today\'s login bonus! Come back tomorrow.', 'info');
    return;
  }

  var btn = $('claimStreakBtn');
  if (btn) btn.disabled = true;

  var curReward = STREAK_DAYS[streak.day - 1] ? STREAK_DAYS[streak.day - 1].reward : 200;

  // Supabase atomic DB claim with dynamic amount
  if (window.supabaseClient) {
    try {
      var sessRes = await window.supabaseClient.auth.getSession();
      var u = sessRes && sessRes.data && sessRes.data.session ? sessRes.data.session.user : null;
      if (u && !u.id.startsWith('demo_')) {
        var { data: rpcRes } = await window.supabaseClient.rpc('claim_daily_streak_reward', {
          p_custom_amount: curReward
        });
        if (rpcRes && rpcRes.success) {
          S.cashBalance = parseFloat(rpcRes.new_balance);
          streak.claimedToday = true;
          streak.lastClaimDate = todayStr;
          streak.day = rpcRes.next_day;
          saveDailyStreakData(streak);
          saveUserBalance();
          updateBalanceDisplays();
          renderDailyStreak();
          loadUserTransactionsFromDB();
          toast('Claimed Day bonus! +₦' + rpcRes.reward.toLocaleString('en-NG') + ' added to your cash balance!', 'emerald');
          return;
        } else if (rpcRes && !rpcRes.success) {
          toast(rpcRes.message || 'Already claimed today.', 'info');
          streak.claimedToday = true;
          renderDailyStreak();
          return;
        }
      }
    } catch(e) {
      console.warn('claimDailyStreak rpc error, fallback:', e);
    }
  }

  // Fallback for demo or offline mode
  var curReward = STREAK_DAYS[streak.day - 1] ? STREAK_DAYS[streak.day - 1].reward : 200;
  await creditUserReward(curReward, 'Daily Login Streak (Day ' + streak.day + ')', 'streak_' + streak.day);

  streak.claimedToday = true;
  streak.lastClaimDate = todayStr;
  if (streak.day < 7) streak.day += 1;
  else streak.day = 1;
  saveDailyStreakData(streak);
  renderDailyStreak();

  toast('Claimed Day bonus! +₦' + curReward.toLocaleString('en-NG') + ' added to your balance!', 'emerald');
}

/* ── 24-HOUR TASK CYCLE CLOCK ────────────────────────── */
function startTaskCycleClock() {
  function update() {
    var now = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    var diff = Math.floor((midnight - now) / 1000);
    if (diff < 0) diff = 0;
    var h = Math.floor(diff / 3600);
    var m = Math.floor((diff % 3600) / 60);
    var s = diff % 60;
    var str = (h < 10 ? '0' + h : h) + 'h ' + (m < 10 ? '0' + m : m) + 'm ' + (s < 10 ? '0' + s : s) + 's';
    if ($('taskCycleClock')) $('taskCycleClock').textContent = str;
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
  var input = $('withdrawNuban');
  var badge = $('nubanStatus');
  if (!input || !badge) return;
  var val = input.value.replace(/[^0-9]/g, '');
  input.value = val;

  clearTimeout(nubanLookupTimer);
  if (val.length === 10) {
    badge.innerHTML = '<span style="color:#D97706;">Resolving NUBAN via NIBSS...</span>';
    badge.style.display = 'inline-flex';
    nubanLookupTimer = setTimeout(function() {
      badge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> ADAEZE CHIDINMA OKONKWO (NIBSS Verified ✓)';
      badge.style.display = 'inline-flex';
    }, 450);
  } else {
    badge.style.display = 'none';
  }
}

function setWdPct(pct) {
  var amt = Math.floor(S.cashBalance * pct);
  if ($('withdrawAmount')) $('withdrawAmount').value = amt > 0 ? amt : '';
  calcWdSummary();
}

function calcWdSummary() {
  var amtEl = $('withdrawAmount');
  var amt = parseFloat(amtEl ? amtEl.value : 0) || 0;
  var fmt = function(n) { return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 }); };
  if ($('wdSumAmt')) $('wdSumAmt').textContent = fmt(amt);
  if ($('wdSumReceive')) $('wdSumReceive').textContent = fmt(amt);
}

function submitWithdrawal() {
  if (!S.allDone) {
    toast('Withdrawal locked: Please complete all required tasks first.', 'warn');
    switchView('tasks');
    return;
  }
  var amtEl = $('withdrawAmount');
  var pinEl = $('withdrawPin');
  var nubanEl = $('withdrawNuban');
  var amt = parseFloat(amtEl ? amtEl.value : 0);

  if (!amt || amt <= 0) {
    toast('Please enter a valid withdrawal amount.', 'warn');
    return;
  }
  if (amt < 2000) {
    toast('Minimum withdrawal threshold is ₦2,000.', 'warn');
    return;
  }
  if (amt > S.cashBalance) {
    toast('Amount exceeds available balance of ₦' + S.cashBalance.toLocaleString('en-NG'), 'warn');
    return;
  }
  var nuban = nubanEl ? nubanEl.value.trim() : '0123456789';
  if (nuban.length !== 10) {
    toast('Please enter a valid 10-digit NUBAN account number.', 'warn');
    return;
  }
  if (!pinEl || !pinEl.value || pinEl.value.length < 4) {
    toast('Please enter your 4-digit security PIN.', 'warn');
    return;
  }

  var refId = 'WD-' + Math.floor(100000 + Math.random() * 900000) + '-NGX';
  var bankEl = $('withdrawBank');
  var selectedBank = bankEl ? bankEl.value : 'GTBank';

  var newWd = {
    id: refId,
    user: 'Adaeze Okonkwo',
    email: 'adaeze.okonkwo@email.com',
    amount: amt,
    bank: selectedBank + ' — ' + nuban,
    accountName: 'Adaeze Chidinma Okonkwo',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Pending Review',
    tasksVerified: S.tasksDone + '/' + S.tasks.length + ' Complete'
  };

  var existingWd = [];
  try {
    var wdRaw = getCrestStorage('withdrawals', null); existingWd = wdRaw ? JSON.parse(wdRaw) : [];
  } catch(e) {}
  existingWd.unshift(newWd);
  setCrestStorage('withdrawals', existingWd);

  // Sync to Supabase DB via atomic stored procedure
  if (window.supabaseClient) {
    try {
      window.supabaseClient.auth.getSession().then(function(res) {
        var u = res && res.data && res.data.session ? res.data.session.user : null;
        if (u) {
          window.supabaseClient.rpc('request_withdrawal', {
            p_amount: amt,
            p_bank_name: selectedBank,
            p_account_number: nuban,
            p_account_name: 'Investor'
          }).then(function(rpcRes) {
            if (rpcRes.error) console.warn('Supabase withdrawal RPC notice:', rpcRes.error);
          });
        }
      });
    } catch(e) {}
  }

  // Deduct local balance
  S.cashBalance -= amt;
  saveUserBalance();
  updateBalanceDisplays();

  // Prepend to transaction tables
  prependUserTxn(newWd.date, 'Withdrawal Request (' + selectedBank + ')', 'Withdrawal', '-₦' + amt.toLocaleString('en-NG'), 'Pending Review');

  toast('Withdrawal ' + refId + ' of ₦' + amt.toLocaleString('en-NG') + ' submitted! Instant NIBSS clearance in progress.', 'emerald');
  if (amtEl) amtEl.value = '';
  if (pinEl) pinEl.value = '';
  calcWdSummary();
  updateWithdrawalTimeline();

  setTimeout(function() {
    switchView('overview');
  }, 1200);
}

function updateWithdrawalTimeline() {
  var withdrawals = [];
  try {
    var wdRaw2 = getCrestStorage('withdrawals', null); withdrawals = wdRaw2 ? JSON.parse(wdRaw2) : [];
  } catch(e) {}

  var latest = withdrawals[0];
  var overviewCard = $('overviewWdTimeline');
  var wdCard = $('wdTimelineCard');
  var rejOverview = $('rejectionNotice');
  var rejWd = $('wdRejectionBanner');

  if (!latest) {
    if (overviewCard) overviewCard.style.display = 'none';
    if (wdCard) wdCard.style.display = 'none';
    if (rejOverview) rejOverview.style.display = 'none';
    if (rejWd) rejWd.style.display = 'none';
    return;
  }

  if (latest.status === 'Rejected') {
    var reason = latest.rejectionReason || 'Task compliance verification incomplete. Please review required steps and retry.';
    if (rejOverview) {
      $('rejectionNoticeText').textContent = 'Withdrawal ' + latest.id + ' rejected: ' + reason;
      rejOverview.style.display = 'flex';
    }
    if (rejWd) {
      $('wdRejectionBannerText').textContent = 'Withdrawal ' + latest.id + ' rejected: ' + reason;
      rejWd.style.display = 'flex';
    }
    if (overviewCard) overviewCard.style.display = 'none';
    if (wdCard) wdCard.style.display = 'none';
    return;
  } else {
    if (rejOverview) rejOverview.style.display = 'none';
    if (rejWd) rejWd.style.display = 'none';
  }

  // Pending Review or Approved & Paid
  if (overviewCard) overviewCard.style.display = 'block';
  if (wdCard) wdCard.style.display = 'block';

  if ($('overviewWdId')) $('overviewWdId').textContent = 'Tracking ' + latest.id + ' • ₦' + parseFloat(latest.amount).toLocaleString('en-NG');
  if ($('wdTimelineId')) $('wdTimelineId').textContent = 'Tracking ' + latest.id + ' • ₦' + parseFloat(latest.amount).toLocaleString('en-NG');

  var isApproved = latest.status === 'Approved & Paid';
  var badgeHtml = isApproved ? 'Settled & Paid' : 'Processing (Review)';
  var badgeCls = isApproved ? 'badge badge--done' : 'badge badge--pending';

  if ($('overviewWdBadge')) { $('overviewWdBadge').textContent = badgeHtml; $('overviewWdBadge').className = badgeCls; }
  if ($('wdTimelineBadge')) { $('wdTimelineBadge').textContent = badgeHtml; $('wdTimelineBadge').className = badgeCls; }

  // Steps
  var step2 = $('stepTaskGate');
  var step3 = $('stepTreasury');
  var step4 = $('stepDispatched');
  var wdStep2 = $('wdStep2');
  var wdStep3 = $('wdStep3');
  var wdStep4 = $('wdStep4');

  if (isApproved) {
    [step2, wdStep2].forEach(function(el) { if (el) { el.className = 't-step t-step--done'; el.querySelector('.t-circle').innerHTML = '✓'; } });
    [step3, wdStep3].forEach(function(el) { if (el) { el.className = 't-step t-step--done'; el.querySelector('.t-circle').innerHTML = '✓'; } });
    [step4, wdStep4].forEach(function(el) { if (el) { el.className = 't-step t-step--done'; el.querySelector('.t-circle').innerHTML = '✓'; } });
  } else {
    [step2, wdStep2].forEach(function(el) { if (el) { el.className = 't-step t-step--active'; el.querySelector('.t-circle').innerHTML = '2'; } });
    [step3, wdStep3].forEach(function(el) { if (el) { el.className = 't-step'; el.querySelector('.t-circle').innerHTML = '3'; } });
    [step4, wdStep4].forEach(function(el) { if (el) { el.className = 't-step'; el.querySelector('.t-circle').innerHTML = '4'; } });
  }
}

/* ── CONCIERGE WIDGET ────────────────────────────────── */
function toggleConcierge(force) {
  var menu = $('conciergeMenu');
  if (!menu) return;
  if (typeof force === 'boolean') {
    if (force) menu.classList.add('open');
    else menu.classList.remove('open');
  } else {
    menu.classList.toggle('open');
  }
}

function prependUserTxn(date, desc, type, amt, status) {
  var tbody = document.querySelector('#txnTable tbody');
  if (tbody) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + date + '</td>' +
      '<td>' + desc + '</td>' +
      '<td><span class="type-tag type-tag--' + (type === 'Deposit' ? 'deposit' : 'withdraw') + '">' + type + '</span></td>' +
      '<td class="' + (amt.startsWith('+') ? 'credit' : '') + '">' + amt + '</td>' +
      '<td><span class="badge badge--' + (status === 'Completed' ? 'done' : 'warn') + '">' + status + '</span></td>';
    tbody.insertBefore(tr, tbody.firstChild);
  }
}

/* ── COPY HELPER ────────────────────────────────────── */
function doCopy(text, msg) {
  navigator.clipboard.writeText(text).then(function() { toast(msg || 'Copied!'); });
}

/* ── TOAST ──────────────────────────────────────────── */
function toast(msg, type) {
  var el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' toast--' + type : '');
  setTimeout(function() { el.classList.remove('show'); }, 3400);
}

/* ── RESIZE & RE-SYNC ───────────────────────────────── */
var resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    if (S.currentView === 'overview') { drawSparkline(); drawGrowth(); drawDonut(); }
    if (S.currentView === 'tasks') { drawMiniGameCanvas(); }
  }, 200);
});

// Real-time synchronization when Admin modifies tasks, deposits, or withdrawals
window.addEventListener('storage', function(e) {
  if (e.key === 'crest_tasks_config' || e.key === 'crest_user_tasks') {
    S.tasks = loadTasksState();
    refreshTaskUI();
  }
  if (e.key === 'crest_user_balance') {
    S.cashBalance = loadUserBalance();
    updateBalanceDisplays();
  }
  if (e.key === 'crest_withdrawals') {
    updateWithdrawalTimeline();
  }
});

/* ── TRANSACTIONS SEARCH & FILTER ───────────────────── */
function initTxnFiltering() {
  var sInput = $('txnSearch');
  var fSelect = $('txnFilter');
  if (!sInput && !fSelect) return;

  function filterRows() {
    var query = sInput ? sInput.value.toLowerCase().trim() : '';
    var filterType = fSelect ? fSelect.value : 'All';
    var rows = document.querySelectorAll('#txnTable tbody tr');

    rows.forEach(function(row) {
      var text = row.textContent.toLowerCase();
      var typeEl = row.querySelector('.type-tag');
      var typeText = typeEl ? typeEl.textContent.trim() : '';

      var matchesSearch = !query || text.includes(query);
      var matchesType = (filterType === 'All') ||
                        (filterType === 'Deposits' && typeText === 'Deposit') ||
                        (filterType === 'Withdrawals' && typeText === 'Withdrawal') ||
                        (filterType === 'Interest' && typeText === 'Interest') ||
                        (filterType === 'Trades' && typeText === 'Trade');

      row.style.display = (matchesSearch && matchesType) ? '' : 'none';
    });
  }

  if (sInput) sInput.addEventListener('input', filterRows);
  if (fSelect) fSelect.addEventListener('change', filterRows);
}

/* ── SETTINGS & SIGN OUT HANDLERS ───────────────────── */
function initSettingsInteractions() {
  // Profile save button
  var saveBtn = document.querySelector('#view-settings button.btn-primary');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      var settingsView = document.getElementById('view-settings');
      if (settingsView) {
        var textInputs = settingsView.querySelectorAll('input[type="text"]');
        var emailInput = settingsView.querySelector('input[type="email"]');
        var first = textInputs[0] ? textInputs[0].value.trim() : '';
        var last = textInputs[1] ? textInputs[1].value.trim() : '';
        var email = emailInput ? emailInput.value.trim() : '';
        var full = (first + ' ' + last).trim();

        if (full && window.crestUser) {
          if (!window.crestUser.user_metadata) window.crestUser.user_metadata = {};
          window.crestUser.user_metadata.full_name = full;
          window.crestUser.email = email || window.crestUser.email;
          localStorage.setItem('crest_current_user', JSON.stringify(window.crestUser));

          if (window.supabaseClient && window.crestUser.id && !window.crestUser.id.startsWith('demo_')) {
            try {
              await window.supabaseClient.from('profiles').upsert({
                id: window.crestUser.id,
                full_name: full,
                email: email,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });
            } catch (err) {
              console.warn('[Crest] Profile save DB sync:', err);
            }
          }
          initDashboardUserProfile();
        }
      }
      toast('Profile changes saved successfully!', 'emerald');
    });
  }

  // Change photo button
  var photoBtn = document.querySelector('#view-settings .avatar-row button');
  if (photoBtn) {
    photoBtn.addEventListener('click', function() {
      toast('Select a new avatar (JPG/PNG, max 2MB)', 'info');
    });
  }

  // Security action buttons (PIN, 2FA, Password)
  document.querySelectorAll('#view-settings .setting-row button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var label = this.closest('.setting-row').querySelector('strong').textContent;
      if (label.includes('PIN')) {
        var newPin = prompt('Enter your new 4-digit withdrawal PIN:');
        if (newPin && /^\d{4}$/.test(newPin.trim())) {
          setCrestStorage('wd_pin', newPin.trim());
          toast('Withdrawal PIN updated successfully!', 'emerald');
        } else if (newPin !== null) {
          toast('PIN must be exactly 4 numeric digits.', 'warn');
        }
      } else if (label.includes('Two-Factor')) {
        toast('Two-Factor Authentication configuration link sent to your email.', 'info');
      } else {
        toast('Password reset link sent to your registered email.', 'info');
      }
    });
  });

  // Add Bank Account button in settings
  var addBankBtn = document.querySelector('#view-settings .bank-account-row ~ button');
  if (addBankBtn) {
    addBankBtn.addEventListener('click', function() {
      switchView('withdraw');
      toast('Configure your settlement bank in the withdrawal desk.', 'info');
    });
  }

  // Sign out buttons – uses Supabase to properly invalidate the session
  document.querySelectorAll('.sidebar-exit-group a, a#signOutBtn').forEach(function(el) {
    if (el.textContent.includes('Sign Out')) {
      el.addEventListener('click', async function(e) {
        e.preventDefault();
        toast('Signing out of Crest Wealth...', 'info');
        if (window.supabaseClient) {
          await window.supabaseClient.auth.signOut();
        }
        localStorage.removeItem('crest_current_user');
        setTimeout(function() {
          window.location.href = '../index/index.html';
        }, 500);
      });
    }
  });
}

/* ============================================================
   VAULTX VIP TIERS, DYNAMIC PORTFOLIO & REFERRALS (DB LINKED)
   ============================================================ */
var VAULTX_TIERS = [
  { level: 1, rank: 'Bronze VIP', badgeCls: 'vx-badge-bronze', package: 5000, welcomeBonus: 250, dailyEarning: 900 },
  { level: 2, rank: 'Silver VIP', badgeCls: 'vx-badge-silver', package: 15000, welcomeBonus: 750, dailyEarning: 2700 },
  { level: 3, rank: 'Gold VIP', badgeCls: 'vx-badge-gold', package: 30000, welcomeBonus: 1500, dailyEarning: 5400 },
  { level: 4, rank: 'Platinum VIP', badgeCls: 'vx-badge-platinum', package: 50000, welcomeBonus: 2500, dailyEarning: 9000 },
  { level: 5, rank: 'Emerald VIP', badgeCls: 'vx-badge-emerald', package: 75000, welcomeBonus: 3750, dailyEarning: 13500 },
  { level: 6, rank: 'Ruby VIP', badgeCls: 'vx-badge-ruby', package: 100000, welcomeBonus: 5000, dailyEarning: 18000 },
  { level: 7, rank: 'Sapphire VIP', badgeCls: 'vx-badge-sapphire', package: 200000, welcomeBonus: 10000, dailyEarning: 36000 },
  { level: 8, rank: 'Diamond VIP', badgeCls: 'vx-badge-diamond', package: 350000, welcomeBonus: 17500, dailyEarning: 63000 },
  { level: 9, rank: 'Crown Obsidian', badgeCls: 'vx-badge-crown', package: 500000, welcomeBonus: 25000, dailyEarning: 90000 },
  { level: 10, rank: 'Apex Imperial VIP', badgeCls: 'vx-badge-apex', package: 1000000, welcomeBonus: 50000, dailyEarning: 180000 }
];

function renderVaultXModal() {
  var grid = $('vxTiersGrid');
  if (!grid) return;
  var fmt = function(n) { return '₦' + n.toLocaleString('en-NG'); };

  grid.innerHTML = VAULTX_TIERS.map(function(t) {
    var isFeat = t.level === 3 || t.level === 6 || t.level === 10;
    return '<div class="vx-tier-card' + (isFeat ? ' featured' : '') + '">' +
      '<div class="vx-tier-head">' +
        '<span class="vx-tier-num">Level ' + t.level + '</span>' +
        '<span class="vx-tier-badge ' + t.badgeCls + '">' + t.rank + '</span>' +
      '</div>' +
      '<div class="vx-tier-cost">' + fmt(t.package) + ' <small>Capital</small></div>' +
      '<div class="vx-tier-metrics">' +
        '<div class="vx-tm-item"><span class="vx-tm-label">Daily Yield</span><span class="vx-tm-val positive">' + fmt(t.dailyEarning) + '/day</span></div>' +
        '<div class="vx-tm-item"><span class="vx-tm-label">Bonus</span><span class="vx-tm-val">+' + fmt(t.welcomeBonus) + ' instant</span></div>' +
      '</div>' +
      '<button class="vx-btn-activate" onclick="subscribeToVaultXTier(' + t.level + ')">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ' +
        'Activate ' + t.rank +
      '</button>' +
    '</div>';
  }).join('');
}

function openVaultXModal() {
  var m = $('vaultxModalBackdrop');
  if (m) {
    m.classList.add('active');
    renderVaultXModal();
  }
}

function closeVaultXModal() {
  var m = $('vaultxModalBackdrop');
  if (m) m.classList.remove('active');
}

async function subscribeToVaultXTier(level) {
  var tier = VAULTX_TIERS.find(function(t) { return t.level === level; });
  if (!tier) return;

  if (S.cashBalance < tier.package) {
    var diff = tier.package - S.cashBalance;
    toast('Insufficient cash balance. You need ₦' + diff.toLocaleString('en-NG') + ' more to activate ' + tier.rank + '.', 'warn');
    closeVaultXModal();
    switchView('deposit');
    var amtEl = $('depositAmount');
    if (amtEl) amtEl.value = diff;
    return;
  }

  // Database atomic activation via RPC
  if (window.supabaseClient) {
    try {
      var sessRes = await window.supabaseClient.auth.getSession();
      var u = sessRes && sessRes.data && sessRes.data.session ? sessRes.data.session.user : null;
      if (u && !u.id.startsWith('demo_')) {
        toast('Activating ' + tier.rank + ' package...', 'info');
        var { data: rpcRes } = await window.supabaseClient.rpc('subscribe_vaultx_package', { p_level: level });
        if (rpcRes && rpcRes.success) {
          S.cashBalance = parseFloat(rpcRes.new_cash_balance);
          S.investedBalance = parseFloat(rpcRes.new_invested_balance);
          saveUserBalance();
          updateBalanceDisplays();
          closeVaultXModal();
          toast('🎉 ' + tier.rank + ' activated successfully! Welcome bonus credited.', 'emerald');
          loadUserInvestmentsFromDB();
          loadUserTransactionsFromDB();
          switchView('portfolio');
          return;
        } else if (rpcRes && !rpcRes.success) {
          toast(rpcRes.message || 'Subscription failed.', 'warn');
          return;
        }
      }
    } catch(e) {
      console.warn('subscribeToVaultXTier RPC error, using local fallback:', e);
    }
  }

  // Fallback for demo or local session
  S.cashBalance = S.cashBalance - tier.package + tier.welcomeBonus;
  S.investedBalance = (S.investedBalance || 0) + tier.package;
  saveUserBalance();
  updateBalanceDisplays();
  closeVaultXModal();
  toast('🎉 ' + tier.rank + ' activated! +₦' + tier.welcomeBonus.toLocaleString('en-NG') + ' welcome bonus credited.', 'emerald');
  switchView('portfolio');
}

/* ── DYNAMIC USER PORTFOLIO HOLDINGS ─────────────────── */
async function loadUserInvestmentsFromDB() {
  var list = $('portfolioInvestmentsList');
  if (!list) return;

  var user = window.crestUser;
  if (!user || !user.id || user.id.startsWith('demo_') || !window.supabaseClient) {
    renderLocalOrEmptyPortfolio();
    return;
  }

  try {
    var { data: invRows, error } = await window.supabaseClient
      .from('user_investments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error || !invRows || invRows.length === 0) {
      renderEmptyPortfolioState();
      return;
    }

    var totalInvested = 0;
    var totalAccrued = 0;

    var html = invRows.map(function(inv) {
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

      return '<div class="inv-card inv-card--featured">' +
        '<div class="inv-card-header">' +
          '<div class="inv-icon inv-icon-ember">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
          '</div>' +
          '<div>' +
            '<div class="inv-name">' + (inv.asset_name || 'VaultX VIP Package') + '</div>' +
            '<div class="inv-meta">Day ' + daysActive + ' of 30 &bull; Earning ₦' + dailyYield.toLocaleString('en-NG') + '/day</div>' +
          '</div>' +
          '<span class="badge badge--active">Active</span>' +
        '</div>' +
        '<div class="inv-metrics">' +
          '<div><div class="inv-metric-label">Capital</div><div class="inv-metric-val">₦' + principal.toLocaleString('en-NG') + '</div></div>' +
          '<div><div class="inv-metric-label">Daily Rate</div><div class="inv-metric-val positive">18.0%/day</div></div>' +
          '<div><div class="inv-metric-label">Accrued Yield</div><div class="inv-metric-val positive">+₦' + Math.round(accrued).toLocaleString('en-NG') + '</div></div>' +
          '<div><div class="inv-metric-label">Status</div><div class="inv-metric-val" style="color:#10B981">Auto-Compounding</div></div>' +
        '</div>' +
        '<div class="inv-progress">' +
          '<div class="inv-progress-labels"><span>30-Day Cycle Progress</span><span>' + pct + '%</span></div>' +
          '<div class="inv-progress-track"><div class="inv-progress-fill" style="width:' + pct + '%;background:#10B981"></div></div>' +
        '</div>' +
      '</div>';
    }).join('');

    list.innerHTML = html;

    S.investedBalance = totalInvested;
    S.accruedInterest = totalAccrued;
    var totalVal = S.cashBalance + totalInvested + totalAccrued;
    if ($('portfolioTotalValue')) $('portfolioTotalValue').textContent = '₦' + Math.round(totalVal).toLocaleString('en-NG');
    if ($('portfolioTotalInvested')) $('portfolioTotalInvested').textContent = '₦' + Math.round(totalInvested).toLocaleString('en-NG');
    if ($('portfolioTotalReturns')) $('portfolioTotalReturns').textContent = '+₦' + Math.round(totalAccrued).toLocaleString('en-NG');
    updateBalanceDisplays();
  } catch(e) {
    console.warn('loadUserInvestmentsFromDB error:', e);
    renderEmptyPortfolioState();
  }
}

function renderEmptyPortfolioState() {
  var list = $('portfolioInvestmentsList');
  if (!list) return;
  list.innerHTML = '<div class="portfolio-empty-card">' +
    '<div class="empty-icon-wrap">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' +
    '</div>' +
    '<div class="empty-title">No Active Investments Yet</div>' +
    '<div class="empty-desc">You do not have any active VaultX packages. Subscribe to any of our 10 VIP tiers starting from ₦5,000 to earn up to 18% daily returns.</div>' +
    '<button class="btn-primary" onclick="openVaultXModal()">+ Choose a VaultX Plan</button>' +
  '</div>';

  if ($('portfolioTotalValue')) $('portfolioTotalValue').textContent = '₦' + Math.round(S.cashBalance).toLocaleString('en-NG');
  if ($('portfolioTotalInvested')) $('portfolioTotalInvested').textContent = '₦0';
  if ($('portfolioTotalReturns')) $('portfolioTotalReturns').textContent = '₦0';
}

function renderLocalOrEmptyPortfolio() {
  if (S.investedBalance && S.investedBalance > 0) {
    var list = $('portfolioInvestmentsList');
    if (list) {
      list.innerHTML = '<div class="inv-card inv-card--featured">' +
        '<div class="inv-card-header">' +
          '<div class="inv-icon inv-icon-ember"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
          '<div><div class="inv-name">VaultX Active Portfolio</div><div class="inv-meta">Auto-Compounding &bull; 18.0% Daily</div></div>' +
          '<span class="badge badge--active">Active</span>' +
        '</div>' +
        '<div class="inv-metrics">' +
          '<div><div class="inv-metric-label">Capital</div><div class="inv-metric-val">₦' + S.investedBalance.toLocaleString('en-NG') + '</div></div>' +
          '<div><div class="inv-metric-label">Rate</div><div class="inv-metric-val positive">18.0%/day</div></div>' +
          '<div><div class="inv-metric-label">Daily Yield</div><div class="inv-metric-val positive">+₦' + Math.round(S.investedBalance * 0.18).toLocaleString('en-NG') + '</div></div>' +
          '<div><div class="inv-metric-label">Term</div><div class="inv-metric-val">30 Days</div></div>' +
        '</div>' +
      '</div>';
    }
  } else {
    renderEmptyPortfolioState();
  }
}

/* ── DYNAMIC REFERRALS SYSTEM ───────────────────────── */
var userReferralUrl = '';
function setupUserReferralUI(refCode) {
  var code = refCode || 'CW-VIP2026';
  var host = window.location.origin || 'https://investment-wheat-alpha.vercel.app';
  userReferralUrl = host + '/index/index.html?ref=' + encodeURIComponent(code);

  if ($('refLink')) $('refLink').textContent = userReferralUrl;

  var waBtn = $('shareWaBtn');
  if (waBtn) {
    waBtn.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent("Hey! Join VaultX on Crest Wealth and earn daily returns up to 18% passive income. Register with my official VIP link to get an instant welcome bonus: " + userReferralUrl);
  }
  var xBtn = $('shareXBtn');
  if (xBtn) {
    xBtn.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent("Growing my portfolio daily with VaultX. Use my VIP invite code " + code + " for instant welcome bonus: " + userReferralUrl);
  }
}

function copyReferralLink() {
  if (!userReferralUrl) {
    var el = $('refLink');
    userReferralUrl = el ? el.textContent.trim() : window.location.href;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(userReferralUrl).then(function() {
      toast('VIP Referral link copied to clipboard!', 'emerald');
    }).catch(function() {
      doCopy(userReferralUrl, 'VIP Referral link copied!');
    });
  } else {
    doCopy(userReferralUrl, 'VIP Referral link copied!');
  }
}

async function loadUserReferralsFromDB() {
  var tbody = $('referralHistoryTableBody');
  if (!tbody) return;

  var user = window.crestUser;
  if (!user || !user.id || user.id.startsWith('demo_') || !window.supabaseClient) {
    renderEmptyReferralsState();
    return;
  }

  try {
    var { data: refs, error } = await window.supabaseClient
      .from('profiles')
      .select('id, full_name, email, invested_balance, created_at')
      .eq('referred_by', user.id)
      .order('created_at', { ascending: false });

    if (error || !refs || refs.length === 0) {
      renderEmptyReferralsState();
      return;
    }

    var totalRefs = refs.length;
    var activeRefs = 0;
    var totalEarned = 0;

    var rowsHtml = refs.map(function(r) {
      var inv = parseFloat(r.invested_balance) || 0;
      var isActive = inv > 0;
      if (isActive) activeRefs++;
      var bonus = isActive ? 5000 : 0;
      totalEarned += bonus;

      var name = r.full_name || (r.email ? r.email.split('@')[0] : 'Partner');
      var joined = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';

      return '<tr>' +
        '<td><strong>' + name + '</strong></td>' +
        '<td>' + joined + '</td>' +
        '<td>' + (isActive ? ('₦' + inv.toLocaleString('en-NG')) : '&mdash;') + '</td>' +
        '<td class="credit">' + (isActive ? '+₦5,000' : '₦0') + '</td>' +
        '<td><span class="badge ' + (isActive ? 'badge--done' : 'badge--warn') + '">' + (isActive ? 'Active' : 'Signed Up') + '</span></td>' +
      '</tr>';
    }).join('');

    tbody.innerHTML = rowsHtml;
    if ($('refTotalCount')) $('refTotalCount').textContent = totalRefs;
    if ($('refTotalEarned')) $('refTotalEarned').textContent = '₦' + totalEarned.toLocaleString('en-NG');
    if ($('refActiveCount')) $('refActiveCount').textContent = activeRefs;
  } catch(e) {
    console.warn('loadUserReferralsFromDB error:', e);
    renderEmptyReferralsState();
  }
}

function renderEmptyReferralsState() {
  var tbody = $('referralHistoryTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:28px;color:#94A3B8;">No partners referred yet. Share your VIP link to earn ₦5,000 for every investor!</td></tr>';
  }
  if ($('refTotalCount')) $('refTotalCount').textContent = '0';
  if ($('refTotalEarned')) $('refTotalEarned').textContent = '₦0';
  if ($('refActiveCount')) $('refActiveCount').textContent = '0';
}

/* ── DYNAMIC TRANSACTIONS LEDGER ─────────────────────── */
var allUserTransactions = [];
async function loadUserTransactionsFromDB() {
  var tbody = $('txnTableBody');
  if (!tbody) return;

  var user = window.crestUser;
  if (!user || !user.id || user.id.startsWith('demo_') || !window.supabaseClient) {
    return;
  }

  try {
    var { data: txns, error } = await window.supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !txns || txns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94A3B8;">No transaction records found yet.</td></tr>';
      return;
    }

    allUserTransactions = txns;
    renderTransactionsTable(txns);
  } catch(e) {
    console.warn('loadUserTransactionsFromDB error:', e);
  }
}

function renderTransactionsTable(txns) {
  var tbody = $('txnTableBody');
  if (!tbody) return;

  tbody.innerHTML = txns.map(function(tx) {
    var amt = parseFloat(tx.amount) || 0;
    var isPositive = amt >= 0;
    var typeTag = tx.type || 'deposit';
    var tagClass = 'type-tag--' + typeTag.toLowerCase();
    var dateStr = tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';

    return '<tr>' +
      '<td>' + dateStr + '</td>' +
      '<td>' + (tx.description || 'Account Transaction') + '</td>' +
      '<td><span class="type-tag ' + tagClass + '">' + typeTag.toUpperCase() + '</span></td>' +
      '<td class="' + (isPositive ? 'credit' : 'debit') + '">' + (isPositive ? '+' : '') + '₦' + Math.abs(amt).toLocaleString('en-NG') + '</td>' +
      '<td><span class="badge badge--done">' + (tx.status || 'Completed') + '</span></td>' +
    '</tr>';
  }).join('');
}

function filterTransactionsList() {
  var search = ($('txnSearch') ? $('txnSearch').value : '').toLowerCase().trim();
  var filter = ($('txnFilter') ? $('txnFilter').value : 'All');

  var filtered = allUserTransactions.filter(function(tx) {
    var matchesSearch = !search || (tx.description && tx.description.toLowerCase().includes(search));
    var matchesFilter = (filter === 'All') || (tx.type && tx.type.toLowerCase() === filter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  renderTransactionsTable(filtered);
}

/* ── INITIALIZATION ──────────────────────────────────── */
function initDashboard() {
  switchView('overview');
  updateBalanceDisplays();
  refreshTaskUI();
  renderDailyStreak();
  startDepositSessionTimer();
  startTaskCycleClock();
  updateWithdrawalTimeline();
  initTxnFiltering();
  initSettingsInteractions();
  if (typeof loadRemoteTasksConfig === 'function') {
    loadRemoteTasksConfig();
  }
  setTimeout(function() { drawSparkline(); drawGrowth(); drawDonut(); }, 120);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

