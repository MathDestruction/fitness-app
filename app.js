/* ════════════════════════════════════════════════════════════
   Fitness Tracker — App Logic
   Phase 2 · Supabase Auth + Database · Chart.js
   ════════════════════════════════════════════════════════════ */

/* ─── Supabase Client ─── */
const _supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
const USE_AUTH = false;
const LOCAL_SESSIONS_KEY = 'fitness_sessions_local_v1';

/* ─── Constants ─── */
const MUSCLES = ['Biceps', 'Triceps', 'Back', 'Chest', 'Shoulders', 'Legs', 'Core'];
const MUSCLE_COLORS = {
  Biceps: '#86C8A3',
  Triceps: '#72B691',
  Back: '#5EA07D',
  Chest: '#4A8E6B',
  Shoulders: '#9DD6B5',
  Legs: '#B4E2C8',
  Core: '#3D7A5A',
};

/* ─── Exercise DB (local cache for smart search) ─── */
const EXERCISE_DB = {
  cardio: ['Run', 'Jog', 'Sprint', 'Walk', 'Cycling', 'Rowing', 'Elliptical', 'Swimming', 'Jump Rope', 'HIIT', 'Stair Climber', 'Treadmill'],
  strength: [
    { name: 'Bench Press', muscle: 'Chest' }, { name: 'Incline Press', muscle: 'Chest' },
    { name: 'Chest Fly', muscle: 'Chest' }, { name: 'Push Up', muscle: 'Chest' },
    { name: 'Cable Crossover', muscle: 'Chest' },
    { name: 'Squat', muscle: 'Legs' }, { name: 'Leg Press', muscle: 'Legs' },
    { name: 'Leg Curl', muscle: 'Legs' }, { name: 'Leg Extension', muscle: 'Legs' },
    { name: 'Calf Raise', muscle: 'Legs' }, { name: 'Lunge', muscle: 'Legs' },
    { name: 'Deadlift', muscle: 'Back' }, { name: 'Barbell Row', muscle: 'Back' },
    { name: 'Lat Pulldown', muscle: 'Back' }, { name: 'Seated Row', muscle: 'Back' },
    { name: 'Pull Up', muscle: 'Back' }, { name: 'T-Bar Row', muscle: 'Back' },
    { name: 'Bicep Curl', muscle: 'Biceps' }, { name: 'Hammer Curl', muscle: 'Biceps' },
    { name: 'Preacher Curl', muscle: 'Biceps' }, { name: 'Concentration Curl', muscle: 'Biceps' },
    { name: 'Tricep Pushdown', muscle: 'Triceps' }, { name: 'Tricep Dip', muscle: 'Triceps' },
    { name: 'Overhead Extension', muscle: 'Triceps' }, { name: 'Skull Crusher', muscle: 'Triceps' },
    { name: 'Shoulder Press', muscle: 'Shoulders' }, { name: 'Lateral Raise', muscle: 'Shoulders' },
    { name: 'Front Raise', muscle: 'Shoulders' }, { name: 'Face Pull', muscle: 'Shoulders' },
    { name: 'Reverse Fly', muscle: 'Shoulders' },
    { name: 'Crunch', muscle: 'Core' }, { name: 'Russian Twist', muscle: 'Core' },
    { name: 'Hanging Leg Raise', muscle: 'Core' }, { name: 'Cable Crunch', muscle: 'Core' },
    { name: 'Ab Roller', muscle: 'Core' },
  ],
  hold: ['Plank', 'Side Plank', 'Wall Sit', 'Dead Hang', 'L-Sit', 'Hollow Hold', 'Superman'],
};

/* ─── State ─── */
const state = {
  sessions: [],      // local cache fetched from Supabase
  user: null,
  editingId: null,
  entryCounter: 0,
  charts: {},
  activeRunChart: 'run-distance',
  selectedRange: 7,
  profile: { displayName: 'Athlete', color: 'sage' },
};

const DEMO_SESSIONS = [
  {
    id: 'demo-1',
    sessionDate: '2026-02-21',
    weightKg: 82.4,
    notes: 'Great energy today',
    entries: [
      { type: 'cardio', exercise: 'Run', durationMin: 15, speedKmh: 9, distanceKm: 2.25, note: '' },
      { type: 'hold', exercise: 'Plank', sets: 2, seconds: 60, note: '' },
      { type: 'strength', exercise: 'Seated Row', muscle: 'Back', sets: [{ weightKg: 29, reps: 10 }, { weightKg: 29, reps: 8 }, { weightKg: 29, reps: 6 }], note: '' },
      { type: 'strength', exercise: 'Bicep Curl', muscle: 'Biceps', sets: [{ weightKg: 32, reps: 10 }, { weightKg: 32, reps: 8 }, { weightKg: 32, reps: 6 }], note: '' },
    ],
  },
  {
    id: 'demo-2',
    sessionDate: '2026-02-19',
    weightKg: 82.8,
    notes: '',
    entries: [
      { type: 'strength', exercise: 'Lat Pulldown', muscle: 'Back', sets: [{ weightKg: 43, reps: 10 }, { weightKg: 43, reps: 8 }, { weightKg: 43, reps: 6 }], note: '' },
      { type: 'strength', exercise: 'Tricep Pushdown', muscle: 'Triceps', sets: [{ weightKg: 45, reps: 10 }, { weightKg: 40, reps: 8 }, { weightKg: 40, reps: 6 }], note: '' },
      { type: 'strength', exercise: 'Bicep Curl', muscle: 'Biceps', sets: [{ weightKg: 36, reps: 10 }, { weightKg: 36, reps: 8 }, { weightKg: 36, reps: 6 }], note: '' },
    ],
  },
  {
    id: 'demo-3',
    sessionDate: '2026-02-17',
    weightKg: 83.1,
    notes: '',
    entries: [
      { type: 'cardio', exercise: 'Run', durationMin: 36, distanceKm: 5, speedKmh: 8, note: '' },
      { type: 'strength', exercise: 'Chest Press', muscle: 'Chest', sets: [{ weightKg: 29, reps: 10 }, { weightKg: 29, reps: 8 }, { weightKg: 29, reps: 6 }], note: '' },
    ],
  },
];

function saveLocalSessions() {
  localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(state.sessions));
}

/* ─── DOM Helpers ─── */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const fmt = (n, unit = '') => Number.isFinite(n) ? `${n.toFixed(1)}${unit}` : '-';
const fmtInt = (n, unit = '') => Number.isFinite(n) ? `${Math.round(n)}${unit}` : '-';
const dateFmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateFmtShort = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const today = new Date().toISOString().slice(0, 10);
const dayMs = 86400000;

function profileKey() {
  return state.user ? `fitness_profile_${state.user.id}` : '';
}

function loadProfile() {
  if (!state.user) return;
  const raw = localStorage.getItem(profileKey());
  if (raw) {
    try {
      state.profile = { ...state.profile, ...JSON.parse(raw) };
    } catch (_err) {
      localStorage.removeItem(profileKey());
    }
  }
  applyThemeColor(state.profile.color || 'sage');
  $('#profile-name').textContent = state.profile.displayName || 'Athlete';
  $('#welcome-title').textContent = `Welcome back, ${state.profile.displayName || 'Athlete'} 👋`;
}

function saveProfile(profile) {
  state.profile = { ...state.profile, ...profile };
  localStorage.setItem(profileKey(), JSON.stringify(state.profile));
  loadProfile();
}

function applyThemeColor(color) {
  const root = document.documentElement;
  if (color === 'blue') {
    root.style.setProperty('--accent', '#4CB7FF');
    root.style.setProperty('--accent-hover', '#2FA6F4');
    root.style.setProperty('--accent-dim', 'rgba(76,183,255,0.14)');
  } else {
    root.style.setProperty('--accent', '#86C8A3');
    root.style.setProperty('--accent-hover', '#72B691');
    root.style.setProperty('--accent-dim', 'rgba(134, 200, 163, 0.12)');
  }
}

function maybeOpenProfileSetup() {
  if (!state.user) return;
  const raw = localStorage.getItem(profileKey());
  if (!raw) {
    $('#display-name').value = state.user.email.split('@')[0];
    $('#app-color').value = 'sage';
    $('#profile-dialog').showModal();
  }
}

function inDays(dateStr, days) {
  return (new Date(today) - new Date(dateStr)) / dayMs <= days - 1;
}

/* ─── Toast ─── */
let _toastTimer;
function showToast(msg, type = 'success') {
  let toast = $('#app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ════════════════════════════════════════════════════════════
   AUTH
   ════════════════════════════════════════════════════════════ */

let _authMode = 'login';

function showAuthDialog() {
  const dlg = $('#auth-dialog');
  if (!dlg.open) dlg.showModal();
}

function hideAuthDialog() {
  const dlg = $('#auth-dialog');
  if (dlg.open) dlg.close();
}

// Prevent Escape / backdrop-click from closing the auth dialog
$('#auth-dialog').addEventListener('cancel', e => e.preventDefault());

function setAuthMode(mode) {
  _authMode = mode;
  const isLogin = mode === 'login';
  $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.auth === mode));
  $('#auth-submit').textContent = isLogin ? 'Sign In' : 'Create Account';
  $('#auth-footer').innerHTML = isLogin
    ? `Don't have an account? <a href="#" id="auth-switch">Sign up</a>`
    : `Already have an account? <a href="#" id="auth-switch">Sign in</a>`;
  $('#auth-error').textContent = '';
  wireAuthSwitch();
}

function wireAuthSwitch() {
  const link = $('#auth-switch');
  if (link) link.onclick = e => { e.preventDefault(); setAuthMode(_authMode === 'login' ? 'signup' : 'login'); };
}

$$('.auth-tab').forEach(t => t.addEventListener('click', () => setAuthMode(t.dataset.auth)));
wireAuthSwitch();

$('#auth-form').addEventListener('submit', async e => {
  if (!USE_AUTH) return;
  e.preventDefault();
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const errEl = $('#auth-error');
  const btn = $('#auth-submit');

  btn.innerHTML = '<span class="spinner"></span> Working…';
  btn.disabled = true;
  errEl.textContent = '';

  let error;
  if (_authMode === 'login') {
    const res = await _supabase.auth.signInWithPassword({ email, password });
    error = res.error;
  } else {
    const res = await _supabase.auth.signUp({ email, password });
    error = res.error;
    if (!error) {
      // signUp may need email confirmation — show message
      const needsConfirm = !res.data?.session;
      if (needsConfirm) {
        btn.innerHTML = 'Create Account';
        btn.disabled = false;
        errEl.style.color = 'var(--accent)';
        errEl.textContent = 'Check your email for a confirmation link!';
        return;
      }
    }
  }

  btn.innerHTML = _authMode === 'login' ? 'Sign In' : 'Create Account';
  btn.disabled = false;
  errEl.style.color = 'var(--danger)';

  if (error) {
    errEl.textContent = error.message;
  }
  // onAuthStateChange will fire if success
});

async function hydrateSignedInUser(sessionUser) {
  state.user = sessionUser;
  hideAuthDialog();
  const firstName = sessionUser.email.split('@')[0];
  state.profile.displayName = capitalise(firstName);
  loadProfile();
  maybeOpenProfileSetup();
  await loadSessions();
  renderAll();
}

function resetSignedOutUser() {
  state.user = null;
  state.sessions = [];
  destroyAllCharts();
  showAuthDialog();
}

_supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) await hydrateSignedInUser(session.user);
  else resetSignedOutUser();
});

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

$('#logout-btn').addEventListener('click', async () => {
  if (!USE_AUTH) {
    showToast('Auth disabled in local mode.', 'success');
    return;
  }
  await _supabase.auth.signOut();
});

/* ════════════════════════════════════════════════════════════
   SUPABASE DATA LAYER
   All CRUD operations talk to Supabase, then refresh local cache.
   ════════════════════════════════════════════════════════════ */

/* Convert Supabase row → app-internal session object */
function rowsToSession(sessionRow, entryRows, strengthRows) {
  const entries = entryRows.map(e => {
    const base = {
      _id: e.id,
      type: e.type,
      exercise: e.exercise_name,
      note: e.notes || '',
    };
    if (e.type === 'cardio') {
      return {
        ...base,
        durationMin: e.duration_seconds ? e.duration_seconds / 60 : undefined,
        distanceKm: e.distance_km ? Number(e.distance_km) : undefined,
        speedKmh: e.speed_kmh ? Number(e.speed_kmh) : undefined,
      };
    } else if (e.type === 'strength') {
      const sets = strengthRows
        .filter(s => s.entry_id === e.id)
        .sort((a, b) => a.set_index - b.set_index)
        .map(s => ({ weightKg: Number(s.weight_kg), reps: s.reps }));
      const muscleGroup = EXERCISE_DB.strength.find(x => x.name === e.exercise_name)?.muscle;
      return { ...base, sets, muscle: muscleGroup || 'Other' };
    } else {
      return {
        ...base,
        sets: e.hold_sets ?? 1,
        seconds: e.hold_seconds_per_set ?? 0,
      };
    }
  });

  return {
    id: sessionRow.id,
    sessionDate: sessionRow.session_date,
    weightKg: Number(sessionRow.weight_kg),
    notes: sessionRow.notes || '',
    entries,
  };
}

async function loadSessions() {
  if (!USE_AUTH) {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (raw) {
      try {
        state.sessions = JSON.parse(raw);
      } catch (_err) {
        state.sessions = JSON.parse(JSON.stringify(DEMO_SESSIONS));
        saveLocalSessions();
      }
    } else {
      state.sessions = JSON.parse(JSON.stringify(DEMO_SESSIONS));
      saveLocalSessions();
    }
    return;
  }
  if (!state.user) return;

  // Fetch sessions
  const { data: sessions, error: sErr } = await _supabase
    .from('sessions')
    .select('*')
    .eq('user_id', state.user.id)
    .order('session_date', { ascending: true });
  if (sErr) { console.error(sErr); return; }
  if (!sessions.length) { state.sessions = []; return; }

  const sessionIds = sessions.map(s => s.id);

  // Fetch entries
  const { data: entries, error: eErr } = await _supabase
    .from('entries')
    .select('*')
    .in('session_id', sessionIds)
    .order('sort_order', { ascending: true });
  if (eErr) { console.error(eErr); return; }

  // Fetch strength sets if there are any
  const entryIds = entries.filter(e => e.type === 'strength').map(e => e.id);
  let strengthSets = [];
  if (entryIds.length) {
    const { data: sets, error: ssErr } = await _supabase
      .from('strength_sets')
      .select('*')
      .in('entry_id', entryIds)
      .order('set_index', { ascending: true });
    if (!ssErr) strengthSets = sets;
  }

  state.sessions = sessions.map(s => {
    const sEntries = entries.filter(e => e.session_id === s.id);
    return rowsToSession(s, sEntries, strengthSets);
  });
}

async function saveSessionToDb(session) {
  if (!USE_AUTH) {
    const payload = {
      ...session,
      id: state.editingId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    };
    if (state.editingId) {
      state.sessions = state.sessions.map(s => s.id === state.editingId ? payload : s);
    } else {
      state.sessions.push(payload);
    }
    saveLocalSessions();
    return;
  }
  const isEdit = !!state.editingId;

  if (isEdit) {
    // Update session row
    const { error: sErr } = await _supabase
      .from('sessions')
      .update({
        session_date: session.sessionDate,
        weight_kg: session.weightKg,
        notes: session.notes,
      })
      .eq('id', state.editingId);
    if (sErr) throw sErr;

    // Delete old entries (cascade deletes strength_sets)
    const { error: dErr } = await _supabase
      .from('entries')
      .delete()
      .eq('session_id', state.editingId);
    if (dErr) throw dErr;

    await insertEntries(state.editingId, session.entries);
  } else {
    // Insert session
    const { data: [newSession], error: sErr } = await _supabase
      .from('sessions')
      .insert({
        user_id: state.user.id,
        session_date: session.sessionDate,
        weight_kg: session.weightKg,
        notes: session.notes,
      })
      .select();
    if (sErr) throw sErr;

    await insertEntries(newSession.id, session.entries);
  }

  await loadSessions();
}

async function insertEntries(sessionId, entries) {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];

    const entryRow = {
      session_id: sessionId,
      exercise_name: e.exercise,
      type: e.type,
      sort_order: i,
      notes: e.note || null,
    };
    if (e.type === 'cardio') {
      entryRow.duration_seconds = e.durationMin ? Math.round(e.durationMin * 60) : null;
      entryRow.distance_km = e.distanceKm || null;
      entryRow.speed_kmh = e.speedKmh || null;
    } else if (e.type === 'hold') {
      entryRow.hold_sets = e.sets || 1;
      entryRow.hold_seconds_per_set = e.seconds || 0;
    }

    const { data: [newEntry], error: eErr } = await _supabase
      .from('entries')
      .insert(entryRow)
      .select();
    if (eErr) throw eErr;

    if (e.type === 'strength' && e.sets?.length) {
      const setRows = e.sets.map((s, si) => ({
        entry_id: newEntry.id,
        set_index: si,
        weight_kg: s.weightKg || 0,
        reps: s.reps || 0,
      }));
      const { error: ssErr } = await _supabase.from('strength_sets').insert(setRows);
      if (ssErr) throw ssErr;
    }
  }
}

async function deleteSessionFromDb(id) {
  if (!USE_AUTH) {
    state.sessions = state.sessions.filter(s => s.id !== id);
    saveLocalSessions();
    return;
  }
  // Cascade handles entries + strength_sets
  const { error } = await _supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
  await loadSessions();
}

/* ════════════════════════════════════════════════════════════
   Chart.js Global Config
   ════════════════════════════════════════════════════════════ */
Chart.defaults.color = '#8a9baa';
Chart.defaults.borderColor = 'rgba(30,42,49,0.5)';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = '#12181D';
Chart.defaults.plugins.tooltip.borderColor = '#1E2A31';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.titleFont = { weight: '700', size: 12 };
Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };
Chart.defaults.scale.grid = { color: 'rgba(30,42,49,0.5)', drawBorder: false };

function destroyChart(key) {
  if (state.charts[key]) { state.charts[key].destroy(); state.charts[key] = null; }
}

function destroyAllCharts() {
  Object.keys(state.charts).forEach(destroyChart);
}

function createChart(key, ctx, config) {
  destroyChart(key);
  state.charts[key] = new Chart(ctx, config);
}

/* ════════════════════════════════════════════════════════════
   Calculation Helpers
   ════════════════════════════════════════════════════════════ */
function calcSpeed(e) {
  if (e.speedKmh) return e.speedKmh;
  if (e.distanceKm && e.durationMin) return e.distanceKm / (e.durationMin / 60);
  return 0;
}

function calcDistance(e) {
  if (e.distanceKm) return e.distanceKm;
  if (e.speedKmh && e.durationMin) return e.speedKmh * (e.durationMin / 60);
  return 0;
}

function strengthVolume(session) {
  return session.entries
    .filter(e => e.type === 'strength')
    .flatMap(e => e.sets || [])
    .reduce((sum, set) => sum + ((set.weightKg || 0) * (set.reps || 0)), 0);
}

function rollingAvg(arr, window = 7) {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function sortedSessions() { return [...state.sessions].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)); }
function sortedDesc() { return [...state.sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)); }

/* ════════════════════════════════════════════════════════════
   Dashboard Rendering
   ════════════════════════════════════════════════════════════ */
function renderDashboard() {
  const sessions = sortedSessions();
  const sessionsDesc = sortedDesc();
  const last = sessionsDesc[0];

  $('#last-session-text').textContent = last
    ? `Last session: ${dateFmt(last.sessionDate)} · ${last.weightKg} kg`
    : 'No sessions yet. Add your first!';

  const filtered = sessions.filter(s => inDays(s.sessionDate, state.selectedRange));
  renderWeightChart(filtered);
  renderRunningAnalytics(filtered);
  renderStrengthAnalytics(filtered);
  renderCalendar(sessions);
  renderRecentExerciseTabs(sessions);
}

function renderCalendar(sessions) {
  const card = $('#calendar-card');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const done = new Set(sessions.filter(s => s.sessionDate.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).map(s => Number(s.sessionDate.slice(-2))));
  let cells = '<div class="cal-grid">';
  for (let i = 0; i < startDay; i++) cells += '<span></span>';
  for (let d = 1; d <= daysInMonth; d++) cells += `<button class="cal-day ${done.has(d) ? 'done' : ''}" data-day="${d}">${d}</button>`;
  cells += '</div>';
  card.innerHTML = `<div class="card-header"><div class="card-icon">🗓️</div><h2>Gym Days</h2></div>${cells}`;
  card.querySelectorAll('.cal-day.done').forEach(btn => btn.onclick = () => {
    const day = String(btn.dataset.day).padStart(2, '0');
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${day}`;
    const match = state.sessions.find(s => s.sessionDate === ds);
    if (match) showSessionDetail(match.id);
  });
}

function renderRecentExerciseTabs() {
  const out = $('#recent-exercises');
  const latestByExercise = new Map();
  sortedDesc().forEach(s => s.entries.forEach(e => {
    if (!latestByExercise.has(e.exercise)) latestByExercise.set(e.exercise, { session: s, entry: e });
  }));
  if (!latestByExercise.size) { out.innerHTML = '<p class="muted">No exercise history yet.</p>'; return; }
  out.innerHTML = [...latestByExercise.entries()].slice(0, 20).map(([name, data]) => {
    const days = Math.max(0, Math.floor((new Date(today) - new Date(data.session.sessionDate)) / dayMs));
    const hue = Math.max(0, 120 - (days * 6));
    const detail = data.entry.type === 'strength'
      ? `${data.entry.sets?.[0]?.weightKg || 0}kg · ${data.entry.sets?.map(x => x.reps).join('/') || '0'}`
      : `${data.entry.durationMin || data.entry.seconds || 0}${data.entry.type === 'hold' ? 's' : 'm'}`;
    return `<div class="recent-tab" style="border-left:4px solid hsl(${hue} 80% 55%)"><strong>${name}</strong><span>${days}d ago · ${detail}</span></div>`;
  }).join('');
}

/* ─── Weight Chart ─── */
function renderWeightChart(sessions) {
  const weights = sessions.map(s => s.weightKg).filter(Boolean);
  const labels = sessions.map(s => dateFmtShort(s.sessionDate));
  const avg = rollingAvg(weights, 7);

  const latest = weights[weights.length - 1];
  const latestAvg = avg[avg.length - 1];
  $('#weight-latest').textContent = fmt(latest, ' kg');
  $('#weight-avg').textContent = fmt(latestAvg, ' kg');

  if (Number.isFinite(latest) && Number.isFinite(latestAvg)) {
    const dev = latest - latestAvg;
    const devEl = $('#weight-dev');
    devEl.textContent = `${dev >= 0 ? '+' : ''}${dev.toFixed(2)} kg`;
    devEl.style.color = Math.abs(dev) < 0.3 ? 'var(--accent)' : dev > 0 ? '#FF8C42' : 'var(--accent)';
  } else {
    $('#weight-dev').textContent = '-';
  }

  createChart('weight', $('#weight-chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Weight', data: weights, borderColor: '#86C8A3', backgroundColor: 'rgba(134,200,163,0.08)', fill: true, tension: 0.35, pointBackgroundColor: '#86C8A3', pointBorderColor: '#12181D', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7 },
        { label: 'Rolling Avg (7)', data: avg, borderColor: 'rgba(134,200,163,0.4)', borderDash: [6, 4], pointRadius: 0, tension: 0.4, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            title: items => dateFmt(sessions[items[0].dataIndex]?.sessionDate || ''),
            label: item => `${item.dataset.label}: ${item.parsed.y.toFixed(1)} kg`,
            afterLabel: item => {
              const idx = item.dataIndex;
              const vals = weights.slice(Math.max(0, idx - 6), idx + 1);
              const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
              const sd = Math.sqrt(vals.reduce((a, b) => a + ((b - mean) ** 2), 0) / vals.length);
              return `Rolling SD: ${sd.toFixed(2)} kg`;
            },
          }
        }
      },
      scales: { x: { ticks: { maxRotation: 0 } }, y: { ticks: { display: false }, grid: { display: false } } },
    },
  });
}

/* ─── Running Analytics ─── */
function renderRunningAnalytics(sessions) {
  const runs = sessions
    .map(s => ({ s, e: s.entries.find(e => e.type === 'cardio') }))
    .filter(x => x.e)
    .map(({ s, e }) => ({
      date: s.sessionDate,
      dist: calcDistance(e),
      speed: calcSpeed(e),
      duration: e.durationMin || 0,
      exercise: e.exercise,
    }));

  const sumDays = d => runs.filter(r => inDays(r.date, d)).reduce((sum, r) => sum + r.dist, 0);
  $('#run-30').textContent = fmt(sumDays(30), ' km');
  $('#run-7').textContent = fmt(sumDays(7), ' km');
  $('#run-today').textContent = fmt(runs.filter(r => r.date === today).reduce((a, r) => a + r.dist, 0), ' km');

  const best5 = runs.filter(r => Math.abs(r.dist - 5) < 0.05).sort((a, b) => a.duration - b.duration)[0];
  $('#run-best').textContent = best5 ? `${best5.duration}m (${dateFmtShort(best5.date)})` : '-';

  drawRunChart(runs, state.activeRunChart);
}

function drawRunChart(runs, mode) {
  const labels = runs.map(r => dateFmtShort(r.date));
  let config;

  if (mode === 'run-distance') {
    config = {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Distance (km)', data: runs.map(r => r.dist), backgroundColor: 'rgba(134,200,163,0.5)', borderColor: '#86C8A3', borderWidth: 1, borderRadius: 6, borderSkipped: false }] },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: {
          tooltip: {
            callbacks: {
              title: items => runs[items[0].dataIndex] ? dateFmt(runs[items[0].dataIndex].date) : '',
              afterTitle: items => runs[items[0].dataIndex]?.exercise || '',
              label: item => `Distance: ${item.parsed.y.toFixed(2)} km`,
              afterLabel: item => { const r = runs[item.dataIndex]; return r ? `Duration: ${r.duration} min\nSpeed: ${r.speed.toFixed(1)} km/h` : ''; },
            }
          }
        }, scales: { x: { ticks: { maxRotation: 0 } }, y: { ticks: { callback: v => v + ' km' }, beginAtZero: true } }
      },
    };
  } else if (mode === 'run-speed') {
    config = {
      type: 'line',
      data: { labels, datasets: [{ label: 'Speed (km/h)', data: runs.map(r => r.speed), borderColor: '#86C8A3', backgroundColor: 'rgba(134,200,163,0.08)', fill: true, tension: 0.35, pointBackgroundColor: '#86C8A3', pointBorderColor: '#12181D', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7 }] },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: {
          tooltip: {
            callbacks: {
              title: items => runs[items[0].dataIndex] ? dateFmt(runs[items[0].dataIndex].date) : '',
              label: item => `Speed: ${item.parsed.y.toFixed(1)} km/h`,
              afterLabel: item => { const r = runs[item.dataIndex]; return r ? `Distance: ${r.dist.toFixed(2)} km\nDuration: ${r.duration} min` : ''; },
            }
          }
        }, scales: { x: { ticks: { maxRotation: 0 } }, y: { ticks: { callback: v => v + ' km/h' } } }
      },
    };
  } else {
    config = {
      type: 'bar',
      data: {
        labels, datasets: [
          { type: 'bar', label: 'Distance (km)', data: runs.map(r => r.dist), backgroundColor: 'rgba(134,200,163,0.35)', borderColor: '#86C8A3', borderWidth: 1, borderRadius: 6, borderSkipped: false, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'Speed (km/h)', data: runs.map(r => r.speed), borderColor: '#9DD6B5', backgroundColor: 'transparent', tension: 0.35, pointBackgroundColor: '#9DD6B5', pointBorderColor: '#12181D', pointBorderWidth: 2, pointRadius: 3, yAxisID: 'y1', order: 1 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { boxWidth: 10, padding: 12 } },
          tooltip: { callbacks: { title: items => runs[items[0].dataIndex] ? dateFmt(runs[items[0].dataIndex].date) : '', afterTitle: items => runs[items[0].dataIndex]?.exercise || '' } }
        },
        scales: { x: { ticks: { maxRotation: 0 } }, y: { position: 'left', ticks: { callback: v => v + ' km' }, beginAtZero: true }, y1: { position: 'right', ticks: { callback: v => v + ' km/h' }, grid: { drawOnChartArea: false } } },
      },
    };
  }
  createChart('run', $('#run-chart'), config);
}

/* ─── Strength Analytics ─── */
function renderStrengthAnalytics(sessions) {
  const strVol = sessions.map(s => ({ date: s.sessionDate, vol: strengthVolume(s) }));
  const sumVol = d => strVol.filter(x => inDays(x.date, d)).reduce((a, x) => a + x.vol, 0);

  $('#str-30').textContent = fmtInt(sumVol(30), ' kg');
  $('#str-7').textContent = fmtInt(sumVol(7), ' kg');
  $('#str-today').textContent = fmtInt(strVol.filter(x => x.date === today).reduce((a, x) => a + x.vol, 0), ' kg');

  const labels = sessions.map(s => dateFmtShort(s.sessionDate));
  const datasets = MUSCLES.map(muscle => ({
    label: muscle,
    data: sessions.map(s =>
      s.entries.filter(e => e.type === 'strength' && e.muscle === muscle)
        .flatMap(e => e.sets || [])
        .reduce((sum, set) => sum + (set.weightKg || 0) * (set.reps || 0), 0)
    ),
    backgroundColor: MUSCLE_COLORS[muscle],
    borderRadius: 3,
    borderSkipped: false,
  }));

  createChart('muscle', $('#muscle-chart'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { stacked: true, ticks: { maxRotation: 0 } }, y: { stacked: true, ticks: { callback: v => v + ' kg' }, beginAtZero: true } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10 } } },
        tooltip: {
          callbacks: {
            title: items => sessions[items[0].dataIndex] ? dateFmt(sessions[items[0].dataIndex].sessionDate) : '',
            label: item => item.parsed.y > 0 ? `${item.dataset.label}: ${item.parsed.y} kg` : null,
          }
        },
      },
    },
  });
}

/* ════════════════════════════════════════════════════════════
   Sessions List
   ════════════════════════════════════════════════════════════ */
function renderSessions() {
  const list = $('#sessions-list');
  const sessions = sortedDesc();

  if (!sessions.length) {
    list.innerHTML = '<li class="muted" style="padding:20px;text-align:center;">No sessions yet. Tap + to add one!</li>';
    return;
  }

  list.innerHTML = sessions.map(s => {
    const types = [...new Set(s.entries.map(e => e.type))];
    const typeEmoji = { cardio: '🏃', strength: '💪', hold: '🧘' };
    const tags = types.map(t => `<span class="session-tag">${typeEmoji[t] || ''} ${t}</span>`).join('');
    return `
      <li class="session-row" data-session-id="${s.id}">
        <div>
          <div class="session-date">${dateFmt(s.sessionDate)}</div>
          <div class="session-meta">${s.weightKg} kg · ${s.entries.length} exercise${s.entries.length !== 1 ? 's' : ''}${s.notes ? ' · ' + s.notes : ''}</div>
          <div class="session-tags">${tags}</div>
        </div>
        <span class="session-arrow">›</span>
      </li>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════
   Session Detail View
   ════════════════════════════════════════════════════════════ */
function showSessionDetail(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;

  const body = $('#detail-body');
  const totalVol = strengthVolume(s);

  let html = `
    <div class="detail-meta">
      <div class="detail-meta-item"><span class="detail-meta-label">Date</span><span class="detail-meta-value">${dateFmt(s.sessionDate)}</span></div>
      <div class="detail-meta-item"><span class="detail-meta-label">Weight</span><span class="detail-meta-value">${s.weightKg} kg</span></div>
      ${totalVol ? `<div class="detail-meta-item"><span class="detail-meta-label">Total Volume</span><span class="detail-meta-value">${totalVol.toLocaleString()} kg</span></div>` : ''}
    </div>
    ${s.notes ? `<div style="color:var(--muted);font-size:0.85rem;font-style:italic;">"${s.notes}"</div>` : ''}
  `;

  for (const e of s.entries) {
    const icon = { cardio: '🏃', strength: '💪', hold: '🧘' }[e.type];
    html += `<div class="detail-entry"><div class="detail-entry-title">${icon} ${e.exercise}</div>`;

    if (e.type === 'cardio') {
      html += `<div class="detail-entry-stat">`;
      if (e.durationMin) html += `Duration: ${e.durationMin.toFixed(0)} min<br>`;
      if (e.distanceKm) html += `Distance: ${e.distanceKm} km<br>`;
      html += `Speed: ${calcSpeed(e).toFixed(1)} km/h</div>`;
    } else if (e.type === 'strength') {
      html += `<div class="detail-entry-stat">Muscle: ${e.muscle || 'Not specified'}</div>`;
      if (e.sets?.length) {
        html += `<table class="detail-sets-table"><thead><tr><th>Set</th><th>Weight</th><th>Reps</th><th>Volume</th></tr></thead><tbody>`;
        e.sets.forEach((set, i) => {
          html += `<tr><td>${i + 1}</td><td>${set.weightKg} kg</td><td>${set.reps}</td><td>${(set.weightKg * set.reps).toLocaleString()} kg</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    } else if (e.type === 'hold') {
      html += `<div class="detail-entry-stat">${e.sets || 1} set${(e.sets || 1) > 1 ? 's' : ''} × ${e.seconds || 0}s</div>`;
    }
    html += `</div>`;
  }

  body.innerHTML = html;
  $('#detail-title').textContent = dateFmt(s.sessionDate);
  $('#detail-edit').onclick = () => { $('#detail-dialog').close(); openForEdit(id); };
  $('#detail-dialog').showModal();
}

/* ════════════════════════════════════════════════════════════
   Form: Dynamic Entry Builder
   ════════════════════════════════════════════════════════════ */
function addEntryCard(type, data = null) {
  const idx = state.entryCounter++;
  const container = $('#entries-container');
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.dataset.entryIdx = idx;
  card.dataset.entryType = type;

  const icons = { cardio: '🏃', strength: '💪', hold: '🧘' };
  const labels = { cardio: 'Cardio', strength: 'Strength', hold: 'Timed Hold' };
  let fieldsHTML = '';

  if (type === 'cardio') {
    fieldsHTML = `
      <div class="entry-fields">
        <div class="search-wrap">
          <label class="form-label"><span>Exercise</span>
            <input list="cardio-options" type="text" class="exercise-search" data-search-type="cardio" placeholder="Walk / Run / Row or custom" value="${data?.exercise || ''}" autocomplete="off" />
          </label>
          <div class="search-suggestions" id="suggestions-${idx}"></div>
        </div>
        <div class="form-row-3 compact-group">
          <label class="form-label"><span>Duration (min)</span><input type="number" class="entry-dur" min="0" step="1" value="${data?.durationMin || ''}" /></label>
          <label class="form-label"><span>Distance (km)</span><input type="number" class="entry-dist" min="0" step="0.01" value="${data?.distanceKm || ''}" /></label>
          <label class="form-label"><span>Speed (km/h)</span><input type="number" class="entry-speed" min="0" step="0.1" value="${data?.speedKmh || ''}" /></label>
        </div>
        <label class="form-label"><span>Note</span><textarea class="entry-note" rows="2">${data?.note || ''}</textarea></label>
      </div>`;
  } else if (type === 'strength') {
    const muscle = data?.muscle || 'Chest';
    const sets = data?.sets || [{ weightKg: '', reps: '' }];
    const muscleOpts = MUSCLES.map(m => `<option ${m === muscle ? 'selected' : ''}>${m}</option>`).join('');
    const setsHTML = sets.map((s, si) => buildSetRow(si + 1, s.weightKg, s.reps)).join('');
    fieldsHTML = `
      <div class="entry-fields">
        <div class="form-row" style="grid-template-columns:1fr auto;">
          <div class="search-wrap">
            <label class="form-label"><span>Exercise</span>
              <input list="strength-options" type="text" class="exercise-search" data-search-type="strength" placeholder="Select or enter custom" value="${data?.exercise || ''}" autocomplete="off" />
            </label>
            <div class="search-suggestions" id="suggestions-${idx}"></div>
          </div>
          <label class="form-label"><span>Muscle</span><select class="entry-muscle">${muscleOpts}</select></label>
        </div>
        <div class="sets-container">${(data?.sets || [{ weightKg: '', reps: '' }, { weightKg: '', reps: '' }, { weightKg: '', reps: '' }]).slice(0,3).map((s, si) => buildSetRow(si + 1, s.weightKg, s.reps)).join('')}</div>
        <label class="form-label"><span>Note</span><textarea class="entry-note" rows="2">${data?.note || ''}</textarea></label>
      </div>`;
  } else {
    fieldsHTML = `
      <div class="entry-fields">
        <div class="search-wrap">
          <label class="form-label"><span>Exercise</span>
            <input list="hold-options" type="text" class="exercise-search" data-search-type="hold" placeholder="Select or enter custom" value="${data?.exercise || ''}" autocomplete="off" />
          </label>
          <div class="search-suggestions" id="suggestions-${idx}"></div>
        </div>
        <div class="form-row-3" style="grid-template-columns:1fr 1fr;">
          <label class="form-label"><span>Sets</span><select class="entry-hold-sets">${[1,2,3,4,5,6,7,8,9,10,12,15].map(n=>`<option ${Number(data?.sets||1)===n?'selected':''}>${n}</option>`).join('')}</select></label>
          <label class="form-label"><span>Seconds / set</span><select class="entry-hold-secs">${[10,15,20,30,45,60,75,90,120,180].map(n=>`<option ${Number(data?.seconds||30)===n?'selected':''}>${n}</option>`).join('')}</select></label>
        </div>
        <label class="form-label"><span>Note</span><textarea class="entry-note" rows="2">${data?.note || ''}</textarea></label>
      </div>`;
  }

  card.innerHTML = `
    <div class="entry-card-header">
      <div class="entry-card-title">${icons[type]} ${labels[type]}</div>
      <button type="button" class="entry-remove" title="Remove entry">✕</button>
    </div>
    ${fieldsHTML}
  `;
  container.appendChild(card);

  card.querySelector('.entry-remove').addEventListener('click', () => {
    card.style.opacity = '0'; card.style.transform = 'translateX(-20px)';
    setTimeout(() => card.remove(), 200);
  });

  wireSetRemove(card.querySelector('.sets-container'));
  wireSmartSearch(card, type);
  return card;
}

function buildSetRow(num, weight, reps) {
  return `
    <div class="set-row">
      <div class="set-num">${num}</div>
      <label class="form-label"><span style="font-size:0.72rem;">Weight (kg)</span><input type="number" class="set-weight" min="0" step="0.5" value="${weight}" /></label>
      <label class="form-label"><span style="font-size:0.72rem;">Reps</span><input type="number" class="set-reps" min="0" step="1" value="${reps}" /></label>
      <button type="button" class="set-remove" title="Remove set">✕</button>
    </div>`;
}

function wireSetRemove(container) {
  if (!container) return;
  container.querySelectorAll('.set-remove').forEach(btn => {
    btn.onclick = () => {
      btn.closest('.set-row').remove();
      container.querySelectorAll('.set-row').forEach((row, i) => {
        row.querySelector('.set-num').textContent = i + 1;
      });
    };
  });
}

/* ─── Smart Search ─── */
function wireSmartSearch(card, type) {
  const input = card.querySelector('.exercise-search');
  const sugDiv = card.querySelector('.search-suggestions');
  if (!input || !sugDiv) return;

  let db;
  if (type === 'cardio') db = EXERCISE_DB.cardio.map(n => ({ name: n }));
  else if (type === 'strength') db = EXERCISE_DB.strength;
  else db = EXERCISE_DB.hold.map(n => ({ name: n }));

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { sugDiv.classList.remove('open'); return; }
    const matches = db.filter(item => item.name.toLowerCase().includes(q)).slice(0, 8);
    if (!matches.length) { sugDiv.classList.remove('open'); return; }
    sugDiv.innerHTML = matches.map(m =>
      `<div class="search-suggestion" data-name="${m.name}" ${m.muscle ? `data-muscle="${m.muscle}"` : ''}>${m.name}${m.muscle ? ` <span style="color:var(--muted);font-size:0.75rem;">(${m.muscle})</span>` : ''}</div>`
    ).join('');
    sugDiv.classList.add('open');
  });

  sugDiv.addEventListener('click', e => {
    const item = e.target.closest('.search-suggestion');
    if (!item) return;
    input.value = item.dataset.name;
    sugDiv.classList.remove('open');
    if (type === 'strength' && item.dataset.muscle) {
      const sel = card.querySelector('.entry-muscle');
      if (sel) sel.value = item.dataset.muscle;
    }
  });

  input.addEventListener('blur', () => setTimeout(() => sugDiv.classList.remove('open'), 150));
}

/* ════════════════════════════════════════════════════════════
   Form: Reset, Open, Collect, Save
   ════════════════════════════════════════════════════════════ */
function resetForm() {
  const form = $('#session-form');
  form.reset();
  form.sessionDate.value = today;
  $('#entries-container').innerHTML = '';
  $('#delete-btn').classList.add('hidden');
  $('#dialog-title').textContent = 'Add Session';
  $('#form-error').textContent = '';
  state.editingId = null;
  state.entryCounter = 0;
}

function openForEdit(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;
  resetForm();
  state.editingId = id;
  $('#dialog-title').textContent = 'Edit Session';
  $('#delete-btn').classList.remove('hidden');

  const form = $('#session-form');
  form.sessionDate.value = s.sessionDate;
  form.weightKg.value = s.weightKg;
  form.notes.value = s.notes || '';

  for (const e of s.entries) addEntryCard(e.type, e);
  $('#session-dialog').showModal();
}

function collectEntries() {
  const cards = $$('.entry-card');
  const entries = [];
  const errors = [];

  for (const card of cards) {
    const type = card.dataset.entryType;

    if (type === 'cardio') {
      const exercise = card.querySelector('.exercise-search')?.value?.trim() || 'Cardio';
      const dur = Number(card.querySelector('.entry-dur')?.value) || 0;
      const dist = Number(card.querySelector('.entry-dist')?.value) || 0;
      const speed = Number(card.querySelector('.entry-speed')?.value) || 0;
      if (!dur && !dist) { errors.push('Cardio must include duration or distance.'); continue; }
      const note = card.querySelector('.entry-note')?.value?.trim() || '';
      entries.push({ type: 'cardio', exercise, durationMin: dur || undefined, distanceKm: dist || undefined, speedKmh: speed || undefined, note });
    } else if (type === 'strength') {
      const exercise = card.querySelector('.exercise-search')?.value?.trim() || 'Strength';
      const muscle = card.querySelector('.entry-muscle')?.value || 'Core';
      const setRows = card.querySelectorAll('.set-row');
      const sets = [];
      setRows.forEach(row => {
        const w = Number(row.querySelector('.set-weight')?.value) || 0;
        const r = Number(row.querySelector('.set-reps')?.value) || 0;
        if (r > 0) sets.push({ weightKg: w, reps: r });
      });
      if (!sets.length) { errors.push(`Strength entry "${exercise}" needs at least 1 set with reps.`); continue; }
      const note = card.querySelector('.entry-note')?.value?.trim() || '';
      entries.push({ type: 'strength', exercise, sets, muscle, note });
    } else if (type === 'hold') {
      const exercise = card.querySelector('.exercise-search')?.value?.trim() || 'Hold';
      const sets = Number(card.querySelector('.entry-hold-sets')?.value) || 1;
      const seconds = Number(card.querySelector('.entry-hold-secs')?.value) || 0;
      const note = card.querySelector('.entry-note')?.value?.trim() || '';
      entries.push({ type: 'hold', exercise, sets, seconds, note });
    }
  }
  return { entries, errors };
}

/* ─── Submit Form ─── */
$('#session-form').addEventListener('submit', async e => {
  e.preventDefault();
  const { entries, errors } = collectEntries();

  if (errors.length) { $('#form-error').textContent = errors[0]; return; }
  if (!entries.length) { $('#form-error').textContent = 'Add at least 1 exercise entry.'; return; }

  const form = $('#session-form');
  const saveBtn = $('#session-form .btn-save');

  if (!state.user) {
    $('#form-error').textContent = 'Session expired. Please sign in again.';
    showAuthDialog();
    return;
  }

  saveBtn.innerHTML = '<span class="spinner"></span> Saving…';
  saveBtn.disabled = true;

  const session = {
    sessionDate: form.sessionDate.value,
    weightKg: Number(form.weightKg.value),
    notes: form.notes.value || '',
    entries,
  };

  try {
    await Promise.race([
      saveSessionToDb(session),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Save timed out. Please try again.')), 15000)),
    ]);
    $('#session-dialog').close();
    renderAll();
    showToast(state.editingId ? 'Session updated!' : 'Session saved!', 'success');
  } catch (err) {
    $('#form-error').textContent = err.message || 'Save failed. Please try again.';
    console.error(err);
  } finally {
    saveBtn.innerHTML = 'Save Session';
    saveBtn.disabled = false;
  }
});

/* ─── Delete ─── */
$('#delete-btn').addEventListener('click', async () => {
  if (!state.editingId) return;
  if (!confirm('Delete this session? This cannot be undone.')) return;
  try {
    await deleteSessionFromDb(state.editingId);
    $('#session-dialog').close();
    renderAll();
    showToast('Session deleted.', 'success');
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
});

/* ────────────────────────────────────────────────────────────
   Render All
   ──────────────────────────────────────────────────────────── */
function renderAll() {
  renderDashboard();
  renderSessions();
}

/* ════════════════════════════════════════════════════════════
   Event Listeners (non-auth)
   ════════════════════════════════════════════════════════════ */
$('#add-session-open').addEventListener('click', () => { resetForm(); $('#session-dialog').showModal(); });
$('#cancel-btn').addEventListener('click', () => $('#session-dialog').close());
$('#sessions-list').addEventListener('click', e => {
  const row = e.target.closest('.session-row');
  if (row) showSessionDetail(row.dataset.sessionId);
});
$('#detail-close').addEventListener('click', () => $('#detail-dialog').close());

$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  if (!tab.dataset.target) return;
  $$('.tab').forEach(t => t.classList.remove('active'));
  $$('.view').forEach(v => v.classList.remove('active'));
  tab.classList.add('active');
  const targetView = $(`#${tab.dataset.target}`);
  if (!targetView) return;
  targetView.classList.add('active');
  if (tab.dataset.target === 'dashboard-view') renderDashboard();
}));

$$('.btn-entry-add').forEach(btn => btn.addEventListener('click', () => addEntryCard(btn.dataset.entryType)));

$('#profile-button').addEventListener('click', () => {
  $('#profile-menu').classList.toggle('hidden');
});

$('#profile-settings-btn').addEventListener('click', () => {
  $('#profile-menu').classList.add('hidden');
  $('#display-name').value = state.profile.displayName || '';
  $('#app-color').value = state.profile.color || 'sage';
  $('#profile-dialog').showModal();
});

$('#profile-cancel').addEventListener('click', () => $('#profile-dialog').close());
$('#profile-form').addEventListener('submit', e => {
  e.preventDefault();
  const displayName = $('#display-name').value.trim() || 'Athlete';
  const color = $('#app-color').value;
  saveProfile({ displayName, color });
  $('#profile-dialog').close();
});

$$('.range-tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.range-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  state.selectedRange = Number(tab.dataset.range);
  renderDashboard();
}));


$$('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeRunChart = tab.dataset.chart;
    const runs = sortedSessions()
      .map(s => ({ s, e: s.entries.find(e => e.type === 'cardio') }))
      .filter(x => x.e)
      .map(({ s, e }) => ({ date: s.sessionDate, dist: calcDistance(e), speed: calcSpeed(e), duration: e.durationMin || 0, exercise: e.exercise }));
    drawRunChart(runs, state.activeRunChart);
  });
});

['session-dialog', 'detail-dialog'].forEach(id => {
  const dialog = $(`#${id}`);
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
});

/* ─── Init ─── */
resetForm();
// Auth state change will trigger loadSessions + renderAll once session is detected.
// Show auth immediately if no session exists yet.
_supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    hydrateSignedInUser(session.user).catch(err => {
      console.error(err);
      resetSignedOutUser();
    });
  } else {
    showAuthDialog();
  }
});
