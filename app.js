/* ════════════════════════════════════════════════════════════
   Fitness Tracker — App Logic (Redesigned)
   ════════════════════════════════════════════════════════════ */
const _supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
window._supabase = _supabase;

const MUSCLES = ['Biceps', 'Triceps', 'Back', 'Chest', 'Shoulders', 'Legs', 'Core'];
const MUSCLE_COLORS = { Biceps: '#86C8A3', Triceps: '#72B691', Back: '#5EA07D', Chest: '#4A8E6B', Shoulders: '#9DD6B5', Legs: '#B4E2C8', Core: '#3D7A5A' };

const EXERCISE_DB = {
  cardio: ['Run', 'Jog', 'Sprint', 'Walk', 'Cycling', 'Rowing', 'Elliptical', 'Swimming', 'Jump Rope', 'HIIT', 'Stair Climber', 'Treadmill'],
  strength: [
    { name: 'Bench Press', muscle: 'Chest' }, { name: 'Incline Press', muscle: 'Chest' }, { name: 'Chest Fly', muscle: 'Chest' }, { name: 'Push Up', muscle: 'Chest' }, { name: 'Cable Crossover', muscle: 'Chest' },
    { name: 'Squat', muscle: 'Legs' }, { name: 'Leg Press', muscle: 'Legs' }, { name: 'Leg Curl', muscle: 'Legs' }, { name: 'Leg Extension', muscle: 'Legs' }, { name: 'Calf Raise', muscle: 'Legs' }, { name: 'Lunge', muscle: 'Legs' },
    { name: 'Deadlift', muscle: 'Back' }, { name: 'Barbell Row', muscle: 'Back' }, { name: 'Lat Pulldown', muscle: 'Back' }, { name: 'Seated Row', muscle: 'Back' }, { name: 'Pull Up', muscle: 'Back' }, { name: 'T-Bar Row', muscle: 'Back' },
    { name: 'Bicep Curl', muscle: 'Biceps' }, { name: 'Hammer Curl', muscle: 'Biceps' }, { name: 'Preacher Curl', muscle: 'Biceps' }, { name: 'Concentration Curl', muscle: 'Biceps' },
    { name: 'Tricep Pushdown', muscle: 'Triceps' }, { name: 'Tricep Dip', muscle: 'Triceps' }, { name: 'Overhead Extension', muscle: 'Triceps' }, { name: 'Skull Crusher', muscle: 'Triceps' },
    { name: 'Shoulder Press', muscle: 'Shoulders' }, { name: 'Lateral Raise', muscle: 'Shoulders' }, { name: 'Front Raise', muscle: 'Shoulders' }, { name: 'Face Pull', muscle: 'Shoulders' }, { name: 'Reverse Fly', muscle: 'Shoulders' },
    { name: 'Crunch', muscle: 'Core' }, { name: 'Russian Twist', muscle: 'Core' }, { name: 'Hanging Leg Raise', muscle: 'Core' }, { name: 'Cable Crunch', muscle: 'Core' }, { name: 'Ab Roller', muscle: 'Core' },
  ],
  hold: ['Plank', 'Side Plank', 'Wall Sit', 'Dead Hang', 'L-Sit', 'Hollow Hold', 'Superman'],
};

const state = { sessions: [], user: null, editingId: null, entryCounter: 0, charts: {}, activeRunChart: 'run-distance', statsPeriod: 'all', profile: { displayName: 'Athlete', color: 'sage' } };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, u = '') => Number.isFinite(n) ? `${n.toFixed(1)}${u}` : '-';
const fmtInt = (n, u = '') => Number.isFinite(n) ? `${Math.round(n)}${u}` : '-';
const dateFmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateFmtShort = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const today = new Date().toISOString().slice(0, 10);
const dayMs = 86400000;
const capitalise = s => s.charAt(0).toUpperCase() + s.slice(1);

function profileKey() { return state.user ? `fitness_profile_${state.user.id}` : ''; }

function loadProfile() {
  if (!state.user) return false;
  const raw = localStorage.getItem(profileKey());
  if (raw) {
    try {
      state.profile = { ...state.profile, ...JSON.parse(raw) };
      applyThemeColor(state.profile.color || 'sage');
      const name = state.profile.displayName || 'Athlete';
      $('#welcome-title').textContent = `Hi, ${name}!`;
      const el = $('#avatar-circle');
      if (el) el.textContent = name[0].toUpperCase();
      return true;
    } catch (_) {
      localStorage.removeItem(profileKey());
    }
  }
  applyThemeColor(state.profile.color || 'sage');
  return false;
}

function saveProfile(p) { state.profile = { ...state.profile, ...p }; localStorage.setItem(profileKey(), JSON.stringify(state.profile)); loadProfile(); }

function applyThemeColor(c) {
  const r = document.documentElement;
  if (c === 'blue') { r.style.setProperty('--accent', '#4CB7FF'); r.style.setProperty('--accent-hover', '#2FA6F4'); r.style.setProperty('--accent-dim', 'rgba(76,183,255,0.14)'); }
  else { r.style.setProperty('--accent', '#86C8A3'); r.style.setProperty('--accent-hover', '#72B691'); r.style.setProperty('--accent-dim', 'rgba(134,200,163,0.12)'); }
}

function maybeOpenProfileSetup() {
  if (!state.user) return;
  if (!localStorage.getItem(profileKey())) { $('#display-name').value = state.user.email.split('@')[0]; $('#app-color').value = 'sage'; $('#profile-dialog').showModal(); }
}

function inDays(ds, d) { return (new Date(today) - new Date(ds)) / dayMs <= d - 1; }

let _toastTimer;
function showToast(msg, type = 'success') {
  let t = $('#app-toast');
  if (!t) { t = document.createElement('div'); t.id = 'app-toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = `toast ${type} show`;
  clearTimeout(_toastTimer); _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ═══ AUTH ═══ */
let _authMode = 'login';
function showAuthDialog() { $('#auth-dialog').showModal(); }
function hideAuthDialog() { $('#auth-dialog').close(); }
$('#auth-dialog').addEventListener('cancel', e => e.preventDefault());

function setAuthMode(mode) {
  _authMode = mode;
  $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.auth === mode));
  $('#auth-submit').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  $('#auth-footer').innerHTML = mode === 'login'
    ? `Don't have an account? <a href="#" id="auth-switch">Sign up</a>`
    : `Already have an account? <a href="#" id="auth-switch">Sign in</a>`;
  $('#auth-error').textContent = '';
  wireAuthSwitch();
}
function wireAuthSwitch() { const l = $('#auth-switch'); if (l) l.onclick = e => { e.preventDefault(); setAuthMode(_authMode === 'login' ? 'signup' : 'login'); }; }
$$('.auth-tab').forEach(t => t.addEventListener('click', () => setAuthMode(t.dataset.auth)));
wireAuthSwitch();

$('#auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#auth-email').value.trim(), password = $('#auth-password').value, errEl = $('#auth-error'), btn = $('#auth-submit');
  btn.innerHTML = '<span class="spinner"></span> Working…'; btn.disabled = true; errEl.textContent = '';
  let error;
  if (_authMode === 'login') { error = (await _supabase.auth.signInWithPassword({ email, password })).error; }
  else {
    const res = await _supabase.auth.signUp({ email, password }); error = res.error;
    if (!error && !res.data?.session) { btn.innerHTML = 'Create Account'; btn.disabled = false; errEl.style.color = 'var(--accent)'; errEl.textContent = 'Check your email for a confirmation link!'; return; }
  }
  btn.innerHTML = _authMode === 'login' ? 'Sign In' : 'Create Account'; btn.disabled = false;
  errEl.style.color = 'var(--danger)';
  if (error) errEl.textContent = error.message;
});

let _hydrated = false;
async function hydrateSignedInUser(u) {
  if (_hydrated && state.user?.id === u.id) return;
  _hydrated = true; state.user = u; hideAuthDialog();
  state.profile.displayName = capitalise(u.email.split('@')[0]);
  const hasProfile = loadProfile();
  if (!hasProfile) maybeOpenProfileSetup();
  await loadSessions(); renderAll();
}
function resetSignedOutUser() { _hydrated = false; state.user = null; state.sessions = []; destroyAllCharts(); showAuthDialog(); }
_supabase.auth.onAuthStateChange(async (event, s) => {
  if (s?.user) { try { await hydrateSignedInUser(s.user); } catch (err) { console.error('Hydrate failed:', err); renderAll(); } }
  else if (event === 'SIGNED_OUT') resetSignedOutUser();
});
$('#logout-btn').addEventListener('click', async () => { await _supabase.auth.signOut(); });

$('#dev-login-btn').addEventListener('click', async () => {
  const email = window.DEV_EMAIL, password = window.DEV_PASSWORD, errEl = $('#auth-error'), btn = $('#dev-login-btn');
  if (!email || !password) { errEl.textContent = 'Dev credentials not set in index.html'; return; }
  btn.innerHTML = '<span class="spinner"></span> Bypassing…'; btn.disabled = true; errEl.textContent = '';
  const { error } = await window._supabase.auth.signInWithPassword({ email, password });
  btn.innerHTML = 'Dev Login (Bypass)'; btn.disabled = false;
  if (error) { errEl.style.color = 'var(--danger)'; errEl.textContent = error.message; }
});

/* ═══ SUPABASE DATA LAYER ═══ */
function rowsToSession(sRow, eRows, ssRows) {
  const entries = eRows.map(e => {
    const base = { _id: e.id, type: e.type, exercise: e.exercise_name, note: e.notes || '' };
    if (e.type === 'cardio') return { ...base, durationMin: e.duration_seconds ? e.duration_seconds / 60 : undefined, distanceKm: e.distance_km ? Number(e.distance_km) : undefined, speedKmh: e.speed_kmh ? Number(e.speed_kmh) : undefined };
    if (e.type === 'strength') {
      const sets = ssRows.filter(s => s.entry_id === e.id).sort((a, b) => a.set_index - b.set_index).map(s => ({ weightKg: Number(s.weight_kg), reps: s.reps }));
      return { ...base, sets, muscle: EXERCISE_DB.strength.find(x => x.name === e.exercise_name)?.muscle || 'Other' };
    }
    return { ...base, sets: e.hold_sets ?? 1, seconds: e.hold_seconds_per_set ?? 0 };
  });
  return { id: sRow.id, sessionDate: sRow.session_date, weightKg: Number(sRow.weight_kg), notes: sRow.notes || '', entries };
}

async function loadSessions() {
  if (!state.user) return;
  const { data: sessions, error: sErr } = await _supabase.from('sessions').select('*').eq('user_id', state.user.id).order('session_date', { ascending: true });
  if (sErr) { console.error(sErr); return; } if (!sessions.length) { state.sessions = []; return; }
  const sIds = sessions.map(s => s.id);
  const { data: entries, error: eErr } = await _supabase.from('entries').select('*').in('session_id', sIds).order('sort_order', { ascending: true });
  if (eErr) { console.error(eErr); return; }
  const eIds = entries.filter(e => e.type === 'strength').map(e => e.id);
  let ss = [];
  if (eIds.length) { const { data: sets, error: ssErr } = await _supabase.from('strength_sets').select('*').in('entry_id', eIds).order('set_index', { ascending: true }); if (!ssErr) ss = sets; }
  state.sessions = sessions.map(s => rowsToSession(s, entries.filter(e => e.session_id === s.id), ss));
}

async function ensureSession() {
  const { data: { session }, error } = await _supabase.auth.getSession();
  if (error || !session) { const { error: re } = await _supabase.auth.refreshSession(); if (re) throw new Error('Session expired. Please sign in again.'); }
}

async function saveSessionToDb(session) {
  await ensureSession();
  const isEdit = !!state.editingId;
  if (isEdit) {
    const { error: sErr } = await _supabase.from('sessions').update({ session_date: session.sessionDate, weight_kg: session.weightKg, notes: session.notes }).eq('id', state.editingId);
    if (sErr) throw sErr;
    const { error: dErr } = await _supabase.from('entries').delete().eq('session_id', state.editingId);
    if (dErr) throw dErr;
    await insertEntries(state.editingId, session.entries);
  } else {
    const { data: [ns], error: sErr } = await _supabase.from('sessions').insert({ user_id: state.user.id, session_date: session.sessionDate, weight_kg: session.weightKg, notes: session.notes }).select();
    if (sErr) throw sErr;
    await insertEntries(ns.id, session.entries);
  }
  await loadSessions();
}

async function insertEntries(sid, entries) {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const row = { session_id: sid, exercise_name: e.exercise, type: e.type, sort_order: i, notes: e.note || null };
    if (e.type === 'cardio') { row.duration_seconds = e.durationMin ? Math.round(e.durationMin * 60) : null; row.distance_km = e.distanceKm || null; row.speed_kmh = e.speedKmh || null; }
    else if (e.type === 'hold') { row.hold_sets = e.sets || 1; row.hold_seconds_per_set = e.seconds || 0; }
    const { data: [ne], error: eErr } = await _supabase.from('entries').insert(row).select();
    if (eErr) throw eErr;
    if (e.type === 'strength' && e.sets?.length) {
      const sr = e.sets.map((s, si) => ({ entry_id: ne.id, set_index: si, weight_kg: s.weightKg || 0, reps: s.reps || 0 }));
      const { error: ssErr } = await _supabase.from('strength_sets').insert(sr);
      if (ssErr) throw ssErr;
    }
  }
}

async function deleteSessionFromDb(id) {
  const { error } = await _supabase.from('sessions').delete().eq('id', id);
  if (error) throw error; await loadSessions();
}

/* ═══ Chart.js Config ═══ */
Chart.defaults.color = '#6b7f8e'; Chart.defaults.borderColor = 'rgba(30,42,49,0.5)';
Chart.defaults.font.family = "'Inter',system-ui,sans-serif"; Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = '#12181D'; Chart.defaults.plugins.tooltip.borderColor = '#1E2A31';
Chart.defaults.plugins.tooltip.borderWidth = 1; Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.scale.grid = { color: 'rgba(30,42,49,0.5)', drawBorder: false };

/* ═══ Sticky Tooltip Plugin (tooltips persist ~4s on tap) ═══ */
Chart.register({
  id: 'stickyTooltip',
  beforeEvent(chart, args) {
    const evt = args.event;
    if (evt.type === 'click') {
      clearTimeout(chart.__stickyTimer);
      chart.__tooltipPinned = true;
      chart.__stickyTimer = setTimeout(() => {
        chart.__tooltipPinned = false;
        if (chart.tooltip) { chart.tooltip.setActiveElements([], { x: 0, y: 0 }); chart.update('none'); }
      }, 4000);
    }
    if (chart.__tooltipPinned && (evt.type === 'mouseout' || evt.type === 'pointerleave')) {
      return false;
    }
  }
});

function destroyChart(k) { if (state.charts[k]) { state.charts[k].destroy(); state.charts[k] = null; } }
function destroyAllCharts() { Object.keys(state.charts).forEach(destroyChart); }
function createChart(k, ctx, c) { destroyChart(k); state.charts[k] = new Chart(ctx, c); }

/* ═══ Helpers ═══ */
function calcSpeed(e) { if (e.speedKmh) return e.speedKmh; if (e.distanceKm && e.durationMin) return e.distanceKm / (e.durationMin / 60); return 0; }
function calcDistance(e) { if (e.distanceKm) return e.distanceKm; if (e.speedKmh && e.durationMin) return e.speedKmh * (e.durationMin / 60); return 0; }
function strengthVolume(s) { return s.entries.filter(e => e.type === 'strength').flatMap(e => e.sets || []).reduce((a, set) => a + ((set.weightKg || 0) * (set.reps || 0)), 0); }
function sortedSessions() { return [...state.sessions].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)); }
function sortedDesc() { return [...state.sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)); }

function filterByPeriod(sessions) {
  if (state.statsPeriod === 'all') return sessions;
  const d = Number(state.statsPeriod);
  return sessions.filter(s => inDays(s.sessionDate, d));
}

/* ═══ Exercise Icons (minimalistic SVGs) ═══ */
const ICONS = {
  run: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="14" cy="4" r="2"/><path d="M8 20l3-8 2 3 2-3 3 8"/></svg>',
  cycle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l3-7h4l3 7"/></svg>',
  swim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 18c2-1 4 1 6 0s4-1 6 0 4 1 6 0"/><path d="M2 14c2-1 4 1 6 0s4-1 6 0 4 1 6 0"/><circle cx="12" cy="7" r="2"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5h11M6 12h12M6.5 17.5h11M4 6.5V17.5M20 6.5V17.5M2 9v6M22 9v6"/></svg>',
  squat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="4" r="2"/><path d="M8 22v-4l-2-4 3-4h6l3 4-2 4v4"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="9"/><polyline points="12 7 12 13 15 15"/><path d="M10 2h4"/></svg>',
  arm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 18c0-4 3-6 5-10 1-2 3-4 5-4"/><path d="M7 18c-2 0-3-1-3-3"/></svg>',
  core: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="12" height="16" rx="2"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="18" y2="16"/></svg>',
};

function getExerciseIcon(name, type) {
  const n = name.toLowerCase();
  if (/run|jog|sprint|walk|treadmill/.test(n)) return ICONS.run;
  if (/cycl|bike/.test(n)) return ICONS.cycle;
  if (/swim|row/.test(n)) return ICONS.swim;
  if (/squat|leg|calf|lunge|deadlift/.test(n)) return ICONS.squat;
  if (/curl|bicep|hammer|preacher/.test(n)) return ICONS.arm;
  if (/crunch|twist|ab|roller|core/.test(n)) return ICONS.core;
  if (/plank|wall sit|hang|hold|l-sit/.test(n)) return ICONS.timer;
  if (type === 'cardio') return ICONS.run;
  if (type === 'hold') return ICONS.timer;
  return ICONS.dumbbell;
}

/* ═══ DASHBOARD RENDERING ═══ */
function renderDashboard() {
  const sessions = sortedSessions(), desc = sortedDesc(), last = desc[0];
  $('#last-session-text').textContent = last ? `Last Session - ${dateFmtShort(last.sessionDate)}` : 'No sessions yet. Add your first!';
  const filtered = filterByPeriod(sessions);
  renderGoals(sessions);
  renderStats(filtered);
  renderRunningAnalytics(filtered);
  renderStrengthAnalytics(filtered);
  renderRecentExerciseTabs();
}

/* ─── Goals ─── */
function renderGoals(sessions) {
  // Weekly sessions (Mon-Sun of current week)
  const now = new Date(), dow = (now.getDay() + 6) % 7;
  const monDate = new Date(now.getTime() - dow * dayMs).toISOString().slice(0, 10);
  const weekDates = new Set(sessions.filter(s => s.sessionDate >= monDate).map(s => s.sessionDate));
  const weekSessions = weekDates.size;
  const numEl = $('#goal-sessions .goal-num');
  if (numEl) numEl.textContent = weekSessions;

  // Fastest 5km
  const runs = sessions.flatMap(s => s.entries.filter(e => e.type === 'cardio').map(e => ({ dur: e.durationMin || 0, dist: calcDistance(e), date: s.sessionDate })));
  const fives = runs.filter(r => Math.abs(r.dist - 5) < 0.5 && r.dur > 0).sort((a, b) => a.dur - b.dur);
  const best5 = fives[0], target = 30;
  const timeEl = $('#goal-5k-time'), arcEl = $('#goal-5k-arc');
  if (best5) {
    timeEl.textContent = `${Math.round(best5.dur)}min`;
    const pct = Math.min(1, Math.max(0, (60 - best5.dur) / (60 - target)));
    const circ = 2 * Math.PI * 34;
    arcEl.setAttribute('stroke-dashoffset', circ * (1 - pct));
    arcEl.setAttribute('stroke', best5.dur <= target ? '#4ADE80' : '#c2a700');
  } else { timeEl.textContent = '-'; }

  // Consecutive weekly streaks (how many weeks in a row had ≥3 sessions)
  function getWeekMonday(d) {
    const dt = new Date(d + 'T00:00:00');
    const dow = (dt.getDay() + 6) % 7; // Mon=0
    dt.setDate(dt.getDate() - dow);
    return dt.toISOString().slice(0, 10);
  }
  // Build a map of weekMonday -> sessionCount
  const weekCounts = new Map();
  sessions.forEach(s => {
    const wk = getWeekMonday(s.sessionDate);
    weekCounts.set(wk, (weekCounts.get(wk) || 0) + 1);
  });
  // Walk backwards week by week from the last completed week
  const nowDt = new Date();
  const curDow = (nowDt.getDay() + 6) % 7;
  // Start from previous Monday (skip current partial week)
  let checkDt = new Date(nowDt.getTime() - curDow * dayMs - 7 * dayMs);
  let weekStreak = 0;
  for (let i = 0; i < 52; i++) {
    const wkKey = checkDt.toISOString().slice(0, 10);
    if ((weekCounts.get(wkKey) || 0) >= 3) {
      weekStreak++;
      checkDt = new Date(checkDt.getTime() - 7 * dayMs);
    } else break;
  }
  const sn = $('#goal-streak .goal-streak-num');
  if (sn) sn.textContent = weekStreak;
  // Update label to say "weeks"
  const su = $('#goal-streak .goal-streak-unit');
  if (su) su.textContent = 'weeks';
}

/* ─── Stats ─── */
function renderStats(filtered) {
  // Distance & Time (kept as-is)
  const runs = filtered.flatMap(s => s.entries.filter(e => e.type === 'cardio').map(e => ({ dist: calcDistance(e), dur: e.durationMin || 0 })));
  const totalDist = runs.reduce((a, r) => a + r.dist, 0);
  const totalMin = runs.reduce((a, r) => a + r.dur, 0);
  const hrs = Math.floor(totalMin / 60), mins = Math.round(totalMin % 60);
  $('#stat-distance').textContent = totalDist > 0 ? totalDist.toFixed(1) : '-';
  $('#stat-time').textContent = totalMin > 0 ? `${hrs}:${String(mins).padStart(2, '0')}` : '-';

  // New premium visuals
  renderMuscleBalance(filtered);
  renderWeeklyLoad(filtered);
  renderHeatmap(state.sessions); // always uses all sessions
  renderRecovery(filtered);
}

/* ─── 1. Muscle Balance Donut ─── */
function getExerciseCategory(entry) {
  if (entry.type === 'cardio') return 'Cardio';
  if (entry.type === 'hold') return 'Core';
  const ex = EXERCISE_DB.strength.find(s => s.name.toLowerCase() === (entry.exercise || '').toLowerCase());
  return ex ? ex.muscle : 'Other';
}

function renderMuscleBalance(filtered) {
  const counts = {};
  filtered.forEach(s => s.entries.forEach(e => {
    const cat = getExerciseCategory(e);
    counts[cat] = (counts[cat] || 0) + 1;
  }));

  const total = Object.values(counts).reduce((a, v) => a + v, 0);
  if (total === 0) {
    const legendEl = $('#muscle-balance-legend');
    legendEl.innerHTML = '<span class="donut-legend-item" style="color:var(--muted)">No data yet</span>';
    destroyChart('muscleBalance');
    return;
  }

  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const labels = sortedEntries.map(([k]) => k);
  const data = sortedEntries.map(([, v]) => v);

  const CATEGORY_COLORS = {
    Cardio: '#60A5FA', Biceps: '#86C8A3', Triceps: '#72B691',
    Back: '#5EA07D', Chest: '#4A8E6B', Shoulders: '#9DD6B5',
    Legs: '#B4E2C8', Core: '#3D7A5A', Other: '#6b7f8e'
  };
  const colors = labels.map(l => CATEGORY_COLORS[l] || '#6b7f8e');

  const canvas = $('#muscle-balance-chart');
  createChart('muscleBalance', canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: 'rgba(18, 24, 29, 0.8)',
        borderWidth: 2,
        borderRadius: 4,
        spacing: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const pct = ((ctx.parsed / total) * 100).toFixed(0);
              return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // Custom legend
  const legendEl = $('#muscle-balance-legend');
  legendEl.innerHTML = sortedEntries.map(([cat, count]) => {
    const pct = ((count / total) * 100).toFixed(0);
    const color = CATEGORY_COLORS[cat] || '#6b7f8e';
    return `<div class="donut-legend-item"><span class="donut-legend-dot" style="background:${color}"></span>${cat} <span class="donut-legend-pct">${pct}%</span></div>`;
  }).join('');
}

/* ─── 2. Weekly Load Progression ─── */
function renderWeeklyLoad(filtered) {
  // Group by day of week for the current/selected period
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayVolumes = new Array(7).fill(0);
  const dayCounts = new Array(7).fill(0);

  filtered.forEach(s => {
    const dt = new Date(s.sessionDate + 'T00:00:00');
    const dow = (dt.getDay() + 6) % 7; // Mon=0
    const vol = strengthVolume(s);
    const cardioLoad = s.entries.filter(e => e.type === 'cardio').reduce((a, e) => a + (e.durationMin || 0), 0);
    dayVolumes[dow] += vol + (cardioLoad * 10); // weight cardio min * 10 for relative scale
    dayCounts[dow]++;
  });

  const canvas = $('#weekly-load-chart');
  const ctx = canvas.getContext('2d');
  const h = canvas.parentElement?.clientHeight || 140;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(134,200,163,0.5)');
  grad.addColorStop(1, 'rgba(134,200,163,0.05)');

  createChart('weeklyLoad', canvas, {
    type: 'bar',
    data: {
      labels: dayNames,
      datasets: [{
        label: 'Load',
        data: dayVolumes,
        backgroundColor: grad,
        borderColor: '#86C8A3',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ` Load: ${ctx.parsed.y.toLocaleString()}`;
            },
            afterLabel: function (ctx) {
              return `Sessions: ${dayCounts[ctx.dataIndex]}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { callback: v => v > 999 ? (v / 1000).toFixed(0) + 'k' : v } }
      }
    }
  });
}

/* ─── 3. Contribution Graph (GitHub-style) ─── */
function renderHeatmap(allSessions) {
  const container = $('#contribution-graph');
  container.innerHTML = '';
  const summaryEl = $('#heatmap-summary');

  // Build a map of date -> session count
  const dateCounts = {};
  allSessions.forEach(s => {
    dateCounts[s.sessionDate] = (dateCounts[s.sessionDate] || 0) + 1;
  });

  // Determine date range: last ~6 months ending at Saturday of this week
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  // Find this Saturday (end of current week, Sun=0-based)
  const dow = now.getDay(); // 0=Sun
  const endDate = new Date(now.getTime() + (6 - dow) * dayMs);
  // Go back N weeks to fit nicely on mobile (~26 weeks = 6 months)
  const numWeeks = 26;
  const startDate = new Date(endDate.getTime() - (numWeeks * 7 - 1) * dayMs);

  // Organise into weeks (columns) of 7 days (rows: Sun=0 to Sat=6)
  const weeks = [];
  let week = [];
  let activeDays = 0;
  const totalDays = numWeeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate.getTime() + i * dayMs);
    const key = d.toISOString().slice(0, 10);
    const count = dateCounts[key] || 0;
    if (count > 0 && d <= now) activeDays++;
    let level = 0;
    if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count === 3) level = 3;
    else if (count >= 4) level = 4;
    week.push({ key, count, level, future: d > now, isToday: key === todayStr, dayOfWeek: d.getDay(), monthIdx: d.getMonth(), date: d });
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) weeks.push(week);

  // Month labels: find the first week where a month starts
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY_LABELS = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];

  // Build table
  const table = document.createElement('table');
  table.className = 'contrib-table';

  // Month header row
  const thead = document.createElement('thead');
  const monthRow = document.createElement('tr');
  monthRow.innerHTML = '<td></td>'; // spacer for day label column
  let prevMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    // Use the first real day in the week to determine month
    const firstDay = weeks[w][0];
    const m = firstDay.monthIdx;
    if (m !== prevMonth) {
      const td = document.createElement('td');
      td.className = 'contrib-month-label';
      // Count how many consecutive weeks share this month
      let span = 0;
      for (let ww = w; ww < weeks.length; ww++) {
        if (weeks[ww][0].monthIdx === m) span++; else break;
      }
      td.colSpan = span;
      td.textContent = MONTHS[m];
      monthRow.appendChild(td);
      prevMonth = m;
      w += span - 1; // skip ahead
    }
  }
  thead.appendChild(monthRow);
  table.appendChild(thead);

  // Body: 7 rows (Sun–Sat), N columns (weeks)
  const tbody = document.createElement('tbody');
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const tr = document.createElement('tr');
    // Day label
    const labelTd = document.createElement('td');
    labelTd.className = 'contrib-day-label';
    labelTd.textContent = DAY_LABELS[dayIdx];
    tr.appendChild(labelTd);

    for (let w = 0; w < weeks.length; w++) {
      const day = weeks[w][dayIdx];
      const td = document.createElement('td');
      td.className = 'contrib-cell';
      if (!day || !day.key) {
        td.classList.add('empty');
      } else {
        td.dataset.level = day.future ? 0 : day.level;
        if (day.future) td.style.opacity = '0.15';
        if (day.isToday) td.classList.add('today');
        td.title = `${dateFmt(day.key)}: ${day.count} session${day.count !== 1 ? 's' : ''}`;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'contrib-legend';
  legend.innerHTML = '<span>Less</span>';
  for (let l = 0; l <= 4; l++) {
    const c = document.createElement('span');
    c.className = 'contrib-legend-cell contrib-cell';
    c.dataset.level = l;
    legend.appendChild(c);
  }
  legend.innerHTML += '<span>More</span>';
  container.appendChild(legend);

  // Summary
  const actualDays = Math.min(totalDays, Math.ceil((now - startDate) / dayMs) + 1);
  const pct = ((activeDays / actualDays) * 100).toFixed(0);
  summaryEl.textContent = `${activeDays}d / ${actualDays}d (${pct}%)`;
}

/* ─── 4. Volume & Recovery ─── */
function renderRecovery(filtered) {
  // Show volume per session over time, with rest-day gaps indicated
  const sessions = [...filtered].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  const statsEl = $('#recovery-stats');

  if (sessions.length < 2) {
    destroyChart('recovery');
    statsEl.innerHTML = '<span class="recovery-stat-item"><span class="recovery-stat-label">Need more data</span><span class="recovery-stat-value">Log 2+ sessions</span></span>';
    return;
  }

  const labels = sessions.map(s => dateFmtShort(s.sessionDate));
  const volumes = sessions.map(s => strengthVolume(s));
  const cardioMins = sessions.map(s => s.entries.filter(e => e.type === 'cardio').reduce((a, e) => a + (e.durationMin || 0), 0));

  // Calculate rest days between sessions
  const restDays = [];
  for (let i = 1; i < sessions.length; i++) {
    const d1 = new Date(sessions[i - 1].sessionDate + 'T00:00:00');
    const d2 = new Date(sessions[i].sessionDate + 'T00:00:00');
    restDays.push(Math.round((d2 - d1) / dayMs) - 1);
  }
  restDays.unshift(0);

  const avgRest = restDays.length > 1 ? (restDays.slice(1).reduce((a, v) => a + v, 0) / (restDays.length - 1)).toFixed(1) : 0;
  const avgVol = volumes.reduce((a, v) => a + v, 0) / volumes.length;
  const lastVol = volumes[volumes.length - 1] || 0;
  const volTrend = lastVol >= avgVol ? 'Up' : 'Down';

  // Fatigue indicator: high volume + few rest days = high fatigue
  let fatigueClass = 'recovery-good', fatigueLabel = 'Fresh';
  if (avgRest < 1 && avgVol > 3000) { fatigueClass = 'recovery-high'; fatigueLabel = 'High Load'; }
  else if (avgRest < 2 && avgVol > 2000) { fatigueClass = 'recovery-moderate'; fatigueLabel = 'Moderate'; }

  const canvas = $('#recovery-chart');
  const ctx = canvas.getContext('2d');
  const h = canvas.parentElement?.clientHeight || 120;
  const volGrad = ctx.createLinearGradient(0, 0, 0, h);
  volGrad.addColorStop(0, 'rgba(134,200,163,0.35)');
  volGrad.addColorStop(1, 'rgba(134,200,163,0.02)');

  createChart('recovery', canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Volume (kg)',
          data: volumes,
          borderColor: '#86C8A3',
          backgroundColor: volGrad,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#86C8A3',
          pointBorderColor: '#12181D',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          label: 'Rest Days',
          data: restDays,
          borderColor: 'rgba(96, 165, 250, 0.6)',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.3,
          pointBackgroundColor: '#60A5FA',
          pointBorderColor: '#12181D',
          pointBorderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top', labels: { boxWidth: 8, padding: 8, font: { size: 10 } } },
        tooltip: {
          callbacks: {
            afterBody: function (items) {
              const idx = items[0]?.dataIndex;
              if (idx !== undefined && cardioMins[idx] > 0) {
                return `Cardio: ${cardioMins[idx]} min`;
              }
            }
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 0, font: { size: 9 } } },
        y: { position: 'left', beginAtZero: true, ticks: { callback: v => v > 999 ? (v / 1000).toFixed(0) + 'k' : v, font: { size: 9 } } },
        y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 9 }, callback: v => v + 'd' } }
      }
    }
  });

  statsEl.innerHTML = `
    <div class="recovery-stat-item"><span class="recovery-stat-label">Avg Rest</span><span class="recovery-stat-value">${avgRest} days</span></div>
    <div class="recovery-stat-item"><span class="recovery-stat-label">Trend</span><span class="recovery-stat-value">${volTrend === 'Up' ? '📈' : '📉'} ${volTrend}</span></div>
    <div class="recovery-stat-item"><span class="recovery-stat-label">Fatigue</span><span class="recovery-stat-value ${fatigueClass}">${fatigueLabel}</span></div>
  `;
}

/* ─── Running Chart (gradient area) ─── */
function renderRunningAnalytics(sessions) {
  const runs = sessions.map(s => ({ s, e: s.entries.find(e => e.type === 'cardio') })).filter(x => x.e)
    .map(({ s, e }) => ({ date: s.sessionDate, dist: calcDistance(e), speed: calcSpeed(e), duration: e.durationMin || 0, exercise: e.exercise }));
  const latestRun = runs[runs.length - 1];
  const statEl = $('#run-chart-stat');
  if (statEl) statEl.textContent = latestRun ? `${latestRun.speed.toFixed(1)} km/h` : '';
  drawRunChart(runs, state.activeRunChart);
}

function drawRunChart(runs, mode) {
  const canvas = $('#run-chart'), ctx = canvas.getContext('2d');
  const labels = runs.map(r => dateFmtShort(r.date));
  const h = canvas.parentElement?.clientHeight || 180;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(134,200,163,0.35)'); grad.addColorStop(1, 'rgba(134,200,163,0.02)');
  let config;
  if (mode === 'run-distance') {
    config = {
      type: 'line', data: { labels, datasets: [{ label: 'Distance (km)', data: runs.map(r => r.dist), borderColor: '#86C8A3', backgroundColor: grad, fill: true, tension: 0.4, pointBackgroundColor: '#86C8A3', pointBorderColor: '#12181D', pointBorderWidth: 2, pointRadius: 3, pointHoverRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { title: i => runs[i[0].dataIndex] ? dateFmt(runs[i[0].dataIndex].date) : '', label: i => `Distance: ${i.parsed.y.toFixed(2)} km` } } }, scales: { x: { ticks: { maxRotation: 0 } }, y: { ticks: { callback: v => v + ' km' }, beginAtZero: true } } }
    };
  } else if (mode === 'run-speed') {
    config = {
      type: 'line', data: { labels, datasets: [{ label: 'Speed (km/h)', data: runs.map(r => r.speed), borderColor: '#86C8A3', backgroundColor: grad, fill: true, tension: 0.4, pointBackgroundColor: '#86C8A3', pointBorderColor: '#12181D', pointBorderWidth: 2, pointRadius: 3, pointHoverRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { title: i => runs[i[0].dataIndex] ? dateFmt(runs[i[0].dataIndex].date) : '', label: i => `Speed: ${i.parsed.y.toFixed(1)} km/h` } } }, scales: { x: { ticks: { maxRotation: 0 } }, y: { ticks: { callback: v => v + ' km/h' } } } }
    };
  } else {
    config = {
      type: 'bar', data: {
        labels, datasets: [
          { type: 'bar', label: 'Distance (km)', data: runs.map(r => r.dist), backgroundColor: 'rgba(134,200,163,0.35)', borderColor: '#86C8A3', borderWidth: 1, borderRadius: 6, borderSkipped: false, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'Speed (km/h)', data: runs.map(r => r.speed), borderColor: '#9DD6B5', backgroundColor: 'transparent', tension: 0.35, pointBackgroundColor: '#9DD6B5', pointBorderColor: '#12181D', pointBorderWidth: 2, pointRadius: 3, yAxisID: 'y1', order: 1 }
        ]
      }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, padding: 12 } } }, scales: { x: { ticks: { maxRotation: 0 } }, y: { position: 'left', ticks: { callback: v => v + ' km' }, beginAtZero: true }, y1: { position: 'right', ticks: { callback: v => v + ' km/h' }, grid: { drawOnChartArea: false } } } }
    };
  }
  createChart('run', canvas, config);
}

/* ─── Strength Chart (max weight per exercise, horizontal bars) ─── */
function renderStrengthAnalytics(sessions) {
  const maxByEx = new Map();
  sessions.forEach(s => s.entries.filter(e => e.type === 'strength').forEach(e => {
    const mx = (e.sets || []).reduce((m, set) => Math.max(m, set.weightKg || 0), 0);
    if (mx > (maxByEx.get(e.exercise) || 0)) maxByEx.set(e.exercise, mx);
  }));
  const sorted = [...maxByEx.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!sorted.length) return;
  createChart('muscle', $('#muscle-chart'), {
    type: 'bar', data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'Max Weight (kg)', data: sorted.map(([, w]) => w), backgroundColor: 'rgba(134,200,163,0.4)', borderColor: '#86C8A3', borderWidth: 1, borderRadius: 6 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { callback: v => v + ' kg' }, beginAtZero: true }, y: { ticks: { font: { size: 11 } } } }, plugins: { tooltip: { callbacks: { label: i => `${i.parsed.x} kg` } } } }
  });
}

/* ─── Recent Exercises (with icons) ─── */
function renderRecentExerciseTabs() {
  const out = $('#recent-exercises'), latest = new Map();
  sortedDesc().forEach(s => s.entries.forEach(e => {
    if (!latest.has(e.exercise)) latest.set(e.exercise, { session: s, entry: e });
  }));
  if (!latest.size) { out.innerHTML = '<p class="muted" style="padding:8px;">No exercise history yet.</p>'; return; }
  out.innerHTML = [...latest.entries()].slice(0, 15).map(([name, data]) => {
    const days = Math.max(0, Math.floor((new Date(today) - new Date(data.session.sessionDate)) / dayMs));
    const hue = Math.max(0, 120 - (days * 6));
    const detail = data.entry.type === 'strength'
      ? `${data.entry.sets?.[0]?.weightKg || 0}kg · ${data.entry.sets?.map(x => x.reps).join('/') || '0'}`
      : `${data.entry.durationMin || data.entry.seconds || 0}${data.entry.type === 'hold' ? 's' : 'm'}`;
    const icon = getExerciseIcon(name, data.entry.type);
    return `<div class="recent-tab">
      <div class="recent-tab-icon">${icon}</div>
      <div class="recent-tab-info"><div class="recent-tab-name">${name}</div><div class="recent-tab-meta">${days}d ago · ${detail}</div></div>
      <div class="recent-tab-freshness" style="background:hsl(${hue} 80% 55%)"></div>
    </div>`;
  }).join('');
}

/* ═══ Sessions List ═══ */
function renderSessions() {
  const list = $('#sessions-list'), sessions = sortedDesc();
  if (!sessions.length) { list.innerHTML = '<li class="muted" style="padding:20px;text-align:center;">No sessions yet. Tap + to add one!</li>'; return; }
  list.innerHTML = sessions.map(s => {
    const types = [...new Set(s.entries.map(e => e.type))];
    const emoji = { cardio: '🏃', strength: '💪', hold: '🧘' };
    const tags = types.map(t => `<span class="session-tag">${emoji[t] || ''} ${t}</span>`).join('');
    return `<li class="session-row" data-session-id="${s.id}"><div><div class="session-date">${dateFmt(s.sessionDate)}</div><div class="session-meta">${s.weightKg} kg · ${s.entries.length} exercise${s.entries.length !== 1 ? 's' : ''}${s.notes ? ' · ' + s.notes : ''}</div><div class="session-tags">${tags}</div></div><span class="session-arrow">›</span></li>`;
  }).join('');
}

/* ═══ Session Detail ═══ */
function showSessionDetail(id) {
  const s = state.sessions.find(x => x.id === id); if (!s) return;
  const body = $('#detail-body'), vol = strengthVolume(s);
  let html = `<div class="detail-meta"><div class="detail-meta-item"><span class="detail-meta-label">Date</span><span class="detail-meta-value">${dateFmt(s.sessionDate)}</span></div><div class="detail-meta-item"><span class="detail-meta-label">Weight</span><span class="detail-meta-value">${s.weightKg} kg</span></div>${vol ? `<div class="detail-meta-item"><span class="detail-meta-label">Total Volume</span><span class="detail-meta-value">${vol.toLocaleString()} kg</span></div>` : ''}</div>${s.notes ? `<div style="color:var(--muted);font-size:0.85rem;font-style:italic;">"${s.notes}"</div>` : ''}`;
  for (const e of s.entries) {
    const icon = { cardio: '🏃', strength: '💪', hold: '🧘' }[e.type];
    html += `<div class="detail-entry"><div class="detail-entry-title">${icon} ${e.exercise}</div>`;
    if (e.type === 'cardio') { html += `<div class="detail-entry-stat">${e.durationMin ? `Duration: ${parseFloat(e.durationMin.toFixed(2))} min<br>` : ''}${e.distanceKm ? `Distance: ${e.distanceKm} km<br>` : ''}Speed: ${calcSpeed(e).toFixed(1)} km/h</div>`; }
    else if (e.type === 'strength') {
      html += `<div class="detail-entry-stat">Muscle: ${e.muscle || 'N/A'}</div>`;
      if (e.sets?.length) { html += `<table class="detail-sets-table"><thead><tr><th>Set</th><th>Weight</th><th>Reps</th><th>Volume</th></tr></thead><tbody>${e.sets.map((set, i) => `<tr><td>${i + 1}</td><td>${set.weightKg} kg</td><td>${set.reps}</td><td>${(set.weightKg * set.reps).toLocaleString()} kg</td></tr>`).join('')}</tbody></table>`; }
    } else { html += `<div class="detail-entry-stat">${e.sets || 1} set${(e.sets || 1) > 1 ? 's' : ''} × ${e.seconds || 0}s</div>`; }
    html += `</div>`;
  }
  body.innerHTML = html;
  $('#detail-title').textContent = dateFmt(s.sessionDate);
  $('#detail-edit').onclick = () => { $('#detail-dialog').close(); openForEdit(id); };
  state._detailSessionId = id;
  $('#detail-dialog').showModal();
}

/* ═══ Form Builder ═══ */
function addEntryCard(type, data = null) {
  const idx = state.entryCounter++, container = $('#entries-container'), card = document.createElement('div');
  card.className = 'entry-card'; card.dataset.entryIdx = idx; card.dataset.entryType = type;
  const icons = { cardio: '🏃', strength: '💪', hold: '🧘' }, labels = { cardio: 'Cardio', strength: 'Strength', hold: 'Timed Hold' };
  let f = '';
  if (type === 'cardio') {
    f = `<div class="entry-fields"><div class="search-wrap"><label class="form-label"><span>Exercise</span><input list="cardio-options" type="text" class="exercise-search" data-search-type="cardio" placeholder="Walk / Run / Row" value="${data?.exercise || ''}" autocomplete="off" /></label><div class="search-suggestions" id="suggestions-${idx}"></div></div><div class="form-row-3 compact-group"><label class="form-label"><span>Duration (min)</span><input type="number" class="entry-dur" min="0" step="0.01" value="${data?.durationMin || ''}" /></label><label class="form-label"><span>Distance (km)</span><input type="number" class="entry-dist" min="0" step="0.01" value="${data?.distanceKm || ''}" /></label><label class="form-label"><span>Speed (km/h)</span><input type="number" class="entry-speed" min="0" step="0.1" value="${data?.speedKmh || ''}" /></label></div><label class="form-label"><span>Note</span><textarea class="entry-note" rows="2">${data?.note || ''}</textarea></label></div>`;
  } else if (type === 'strength') {
    const muscle = data?.muscle || 'Chest';
    const muscleOpts = MUSCLES.map(m => `<option ${m === muscle ? 'selected' : ''}>${m}</option>`).join('');
    const sets = (data?.sets || [{ weightKg: '', reps: '' }, { weightKg: '', reps: '' }, { weightKg: '', reps: '' }]).slice(0, data?.sets?.length || 3);
    const setsHTML = sets.map((s, si) => buildSetRow(si + 1, s.weightKg, s.reps)).join('');
    f = `<div class="entry-fields"><div class="form-row" style="grid-template-columns:1fr auto;"><div class="search-wrap"><label class="form-label"><span>Exercise</span><input list="strength-options" type="text" class="exercise-search" data-search-type="strength" placeholder="Select or enter custom" value="${data?.exercise || ''}" autocomplete="off" /></label><div class="search-suggestions" id="suggestions-${idx}"></div></div><label class="form-label"><span>Muscle</span><select class="entry-muscle">${muscleOpts}</select></label></div><div class="sets-container">${setsHTML}</div><label class="form-label"><span>Note</span><textarea class="entry-note" rows="2">${data?.note || ''}</textarea></label></div>`;
  } else {
    f = `<div class="entry-fields"><div class="search-wrap"><label class="form-label"><span>Exercise</span><input list="hold-options" type="text" class="exercise-search" data-search-type="hold" placeholder="Select or enter custom" value="${data?.exercise || ''}" autocomplete="off" /></label><div class="search-suggestions" id="suggestions-${idx}"></div></div><div class="form-row-3" style="grid-template-columns:1fr 1fr;"><label class="form-label"><span>Sets</span><select class="entry-hold-sets">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map(n => `<option ${Number(data?.sets || 1) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="form-label"><span>Seconds / set</span><select class="entry-hold-secs">${[10, 15, 20, 30, 45, 60, 75, 90, 120, 180].map(n => `<option ${Number(data?.seconds || 30) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div><label class="form-label"><span>Note</span><textarea class="entry-note" rows="2">${data?.note || ''}</textarea></label></div>`;
  }
  card.innerHTML = `<div class="entry-card-header"><div class="entry-card-title">${icons[type]} ${labels[type]}</div><button type="button" class="entry-remove" title="Remove entry">✕</button></div>${f}`;
  container.appendChild(card);
  card.querySelector('.entry-remove').addEventListener('click', () => { card.style.opacity = '0'; card.style.transform = 'translateX(-20px)'; setTimeout(() => card.remove(), 200); });
  wireSetRemove(card.querySelector('.sets-container'));
  wireSmartSearch(card, type);
  return card;
}

function buildSetRow(num, w, r) { return `<div class="set-row"><div class="set-num">${num}</div><label class="form-label"><span style="font-size:0.72rem;">Weight (kg)</span><input type="number" class="set-weight" min="0" step="0.5" value="${w}" /></label><label class="form-label"><span style="font-size:0.72rem;">Reps</span><input type="number" class="set-reps" min="0" step="1" value="${r}" /></label><button type="button" class="set-remove" title="Remove set">✕</button></div>`; }

function wireSetRemove(c) { if (!c) return; c.querySelectorAll('.set-remove').forEach(b => { b.onclick = () => { b.closest('.set-row').remove(); c.querySelectorAll('.set-row').forEach((r, i) => { r.querySelector('.set-num').textContent = i + 1; }); }; }); }

function wireSmartSearch(card, type) {
  const input = card.querySelector('.exercise-search'), sugDiv = card.querySelector('.search-suggestions');
  if (!input || !sugDiv) return;
  let db; if (type === 'cardio') db = EXERCISE_DB.cardio.map(n => ({ name: n })); else if (type === 'strength') db = EXERCISE_DB.strength; else db = EXERCISE_DB.hold.map(n => ({ name: n }));
  input.addEventListener('input', () => { const q = input.value.trim().toLowerCase(); if (!q) { sugDiv.classList.remove('open'); return; } const m = db.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8); if (!m.length) { sugDiv.classList.remove('open'); return; } sugDiv.innerHTML = m.map(i => `<div class="search-suggestion" data-name="${i.name}" ${i.muscle ? `data-muscle="${i.muscle}"` : ``}>${i.name}${i.muscle ? ` <span style="color:var(--muted);font-size:0.75rem;">(${i.muscle})</span>` : ''}</div>`).join(''); sugDiv.classList.add('open'); });
  sugDiv.addEventListener('click', e => { const i = e.target.closest('.search-suggestion'); if (!i) return; input.value = i.dataset.name; sugDiv.classList.remove('open'); if (type === 'strength' && i.dataset.muscle) { const s = card.querySelector('.entry-muscle'); if (s) s.value = i.dataset.muscle; } });
  input.addEventListener('blur', () => setTimeout(() => sugDiv.classList.remove('open'), 150));
}

/* ═══ Form: Reset, Open, Collect, Save ═══ */
function resetForm() { $('#session-form').reset(); $('#session-form').sessionDate.value = today; $('#entries-container').innerHTML = ''; $('#delete-btn').classList.add('hidden'); $('#dialog-title').textContent = 'Add Session'; $('#form-error').textContent = ''; state.editingId = null; state.entryCounter = 0; }

function openForEdit(id) {
  const s = state.sessions.find(x => x.id === id); if (!s) return;
  resetForm(); state.editingId = id; $('#dialog-title').textContent = 'Edit Session'; $('#delete-btn').classList.remove('hidden');
  const f = $('#session-form'); f.sessionDate.value = s.sessionDate; f.weightKg.value = s.weightKg; f.notes.value = s.notes || '';
  for (const e of s.entries) addEntryCard(e.type, e);
  $('#session-dialog').showModal();
}

function collectEntries() {
  const cards = $$('.entry-card'), entries = [], errors = [];
  for (const card of cards) {
    const type = card.dataset.entryType;
    if (type === 'cardio') {
      const exercise = card.querySelector('.exercise-search')?.value?.trim() || 'Cardio';
      const dur = Number(card.querySelector('.entry-dur')?.value) || 0, dist = Number(card.querySelector('.entry-dist')?.value) || 0, speed = Number(card.querySelector('.entry-speed')?.value) || 0;
      if (!dur && !dist) { errors.push('Cardio must include duration or distance.'); continue; }
      entries.push({ type: 'cardio', exercise, durationMin: dur || undefined, distanceKm: dist || undefined, speedKmh: speed || undefined, note: card.querySelector('.entry-note')?.value?.trim() || '' });
    } else if (type === 'strength') {
      const exercise = card.querySelector('.exercise-search')?.value?.trim() || 'Strength';
      const muscle = card.querySelector('.entry-muscle')?.value || 'Core';
      const sets = []; card.querySelectorAll('.set-row').forEach(row => { const w = Number(row.querySelector('.set-weight')?.value) || 0, r = Number(row.querySelector('.set-reps')?.value) || 0; if (r > 0) sets.push({ weightKg: w, reps: r }); });
      if (!sets.length) { errors.push(`Strength entry "${exercise}" needs at least 1 set with reps.`); continue; }
      entries.push({ type: 'strength', exercise, sets, muscle, note: card.querySelector('.entry-note')?.value?.trim() || '' });
    } else {
      const exercise = card.querySelector('.exercise-search')?.value?.trim() || 'Hold';
      entries.push({ type: 'hold', exercise, sets: Number(card.querySelector('.entry-hold-sets')?.value) || 1, seconds: Number(card.querySelector('.entry-hold-secs')?.value) || 0, note: card.querySelector('.entry-note')?.value?.trim() || '' });
    }
  }
  return { entries, errors };
}

$('#session-form').addEventListener('submit', async e => {
  e.preventDefault();
  const { entries, errors } = collectEntries();
  if (errors.length) { $('#form-error').textContent = errors[0]; return; }
  if (!entries.length) { $('#form-error').textContent = 'Add at least 1 exercise entry.'; return; }
  const saveBtn = $('#session-form .btn-save');
  saveBtn.innerHTML = '<span class="spinner"></span> Saving…'; saveBtn.disabled = true;
  try {
    await saveSessionToDb({ sessionDate: $('#session-form').sessionDate.value, weightKg: Number($('#session-form').weightKg.value), notes: $('#session-form').notes.value || '', entries });
    $('#session-dialog').close(); renderAll();
    showToast(state.editingId ? 'Session updated!' : 'Session saved!', 'success');
  } catch (err) { $('#form-error').textContent = err.message || 'Save failed. Please try again.'; console.error(err); }
  finally { saveBtn.innerHTML = 'Save Session'; saveBtn.disabled = false; }
});

$('#delete-btn').addEventListener('click', async () => {
  if (!state.editingId) return; if (!confirm('Delete this session? This cannot be undone.')) return;
  try { await deleteSessionFromDb(state.editingId); $('#session-dialog').close(); renderAll(); showToast('Session deleted.', 'success'); }
  catch (err) { alert('Delete failed: ' + err.message); }
});

/* ═══ Render All ═══ */
function renderAll() { renderDashboard(); renderSessions(); }

/* ═══ Event Listeners ═══ */
$('#add-session-open').addEventListener('click', () => { resetForm(); $('#session-dialog').showModal(); });
$('#cancel-btn').addEventListener('click', () => $('#session-dialog').close());
$('#sessions-list').addEventListener('click', e => { const r = e.target.closest('.session-row'); if (r) showSessionDetail(r.dataset.sessionId); });
$('#detail-close').addEventListener('click', () => $('#detail-dialog').close());
$('#detail-delete').addEventListener('click', async () => {
  const id = state._detailSessionId; if (!id) return;
  if (!confirm('Delete this session? This cannot be undone.')) return;
  try { await deleteSessionFromDb(id); $('#detail-dialog').close(); renderAll(); showToast('Session deleted.', 'success'); }
  catch (err) { alert('Delete failed: ' + err.message); }
});

// Bottom nav
$$('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
  $$('.nav-btn').forEach(t => t.classList.remove('active'));
  $$('.view').forEach(v => v.classList.remove('active'));
  btn.classList.add('active');
  $(`#${btn.dataset.target}`).classList.add('active');
  if (btn.dataset.target === 'dashboard-view') renderDashboard();
}));

$$('.btn-entry-add').forEach(b => b.addEventListener('click', () => addEntryCard(b.dataset.entryType)));

// Profile menu
$('#profile-button').addEventListener('click', () => $('#profile-menu').classList.toggle('hidden'));
$('#profile-settings-btn').addEventListener('click', () => { $('#profile-menu').classList.add('hidden'); $('#display-name').value = state.profile.displayName || ''; $('#app-color').value = state.profile.color || 'sage'; $('#profile-dialog').showModal(); });
$('#profile-cancel').addEventListener('click', () => $('#profile-dialog').close());
$('#profile-form').addEventListener('submit', e => { e.preventDefault(); saveProfile({ displayName: $('#display-name').value.trim() || 'Athlete', color: $('#app-color').value }); $('#profile-dialog').close(); });

// Stats period toggle
$$('.period-pill').forEach(b => b.addEventListener('click', () => {
  $$('.period-pill').forEach(t => t.classList.remove('active'));
  b.classList.add('active');
  state.statsPeriod = b.dataset.period;
  renderDashboard();
}));

// Chart tabs (running)
$$('.chart-tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.chart-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  state.activeRunChart = tab.dataset.chart;
  const runs = sortedSessions().map(s => ({ s, e: s.entries.find(e => e.type === 'cardio') })).filter(x => x.e)
    .map(({ s, e }) => ({ date: s.sessionDate, dist: calcDistance(e), speed: calcSpeed(e), duration: e.durationMin || 0, exercise: e.exercise }));
  drawRunChart(runs, state.activeRunChart);
}));

// Close dialogs on backdrop click
['session-dialog', 'detail-dialog'].forEach(id => { const d = $(`#${id}`); d.addEventListener('click', e => { if (e.target === d) d.close(); }); });
// Close profile menu on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('#profile-button') && !e.target.closest('#profile-menu')) $('#profile-menu').classList.add('hidden');
  // Dismiss pinned chart tooltips when tapping outside any chart canvas
  if (!e.target.closest('canvas')) {
    Object.values(state.charts).forEach(c => {
      if (c && c.__tooltipPinned) {
        clearTimeout(c.__stickyTimer);
        c.__tooltipPinned = false;
        if (c.tooltip) { c.tooltip.setActiveElements([], { x: 0, y: 0 }); c.update('none'); }
      }
    });
  }
});

/* ═══ Init ═══ */
resetForm();
_supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) hydrateSignedInUser(session.user).catch(err => { console.error('Init hydrate failed:', err); renderAll(); });
  else showAuthDialog();
});
