const STORAGE_KEY = 'fitness.sessions.v1';
const muscles = ['Biceps', 'Triceps', 'Back', 'Chest', 'Shoulders', 'Legs', 'Core'];

const state = {
  sessions: JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seedData(),
  editingId: null,
};

const $ = (s) => document.querySelector(s);
const fmt = (n, unit = '') => (Number.isFinite(n) ? `${n.toFixed(1)}${unit}` : '-');
const dateFmt = (d) => new Date(d).toLocaleDateString();
const today = new Date().toISOString().slice(0, 10);

function seedData() {
  const base = [
    { id: crypto.randomUUID(), sessionDate: '2026-02-10', weightKg: 84.2, notes: 'Leg day', entries: [{ type: 'cardio', exercise: 'Run', durationMin: 32, distanceKm: 5, speedKmh: 9.4 }, { type: 'strength', exercise: 'Squat', sets: [{ weightKg: 80, reps: 8 }], muscle: 'Legs' }] },
    { id: crypto.randomUUID(), sessionDate: '2026-02-15', weightKg: 83.9, notes: 'Push', entries: [{ type: 'cardio', exercise: 'Run', durationMin: 29, distanceKm: 5, speedKmh: 10.3 }, { type: 'strength', exercise: 'Bench', sets: [{ weightKg: 70, reps: 10 }], muscle: 'Chest' }, { type: 'hold', exercise: 'Plank', sets: 3, seconds: 60 }] },
    { id: crypto.randomUUID(), sessionDate: '2026-02-20', weightKg: 83.4, notes: 'Back', entries: [{ type: 'cardio', exercise: 'Jog', durationMin: 24, distanceKm: 4, speedKmh: 10 }, { type: 'strength', exercise: 'Row', sets: [{ weightKg: 55, reps: 12 }], muscle: 'Back' }] },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
  return base;
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions)); }
function sortedSessions() { return [...state.sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)); }

function inDays(dateStr, days) {
  const dayMs = 86400000;
  return (new Date(today) - new Date(dateStr)) / dayMs <= days - 1;
}

function getRunEntry(s) {
  return s.entries.find((e) => e.type === 'cardio');
}

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
    .filter((e) => e.type === 'strength')
    .flatMap((e) => e.sets || [])
    .reduce((sum, set) => sum + ((set.weightKg || 0) * (set.reps || 0)), 0);
}

function drawLine(canvas, points, color) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (points.length < 2) return;
  const min = Math.min(...points), max = Math.max(...points);
  const norm = (v) => ch - 16 - ((v - min) / ((max - min) || 1)) * (ch - 32);
  const step = (cw - 30) / (points.length - 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = 15 + i * step;
    const y = norm(p);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
}

function drawBars(canvas, values, color) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  const max = Math.max(...values, 1);
  const bw = (cw - 20) / values.length - 4;
  values.forEach((v, i) => {
    const bh = (v / max) * (ch - 24);
    ctx.fillStyle = color;
    ctx.fillRect(12 + i * (bw + 4), ch - bh - 10, bw, bh);
  });
}

function renderDashboard() {
  const sessions = sortedSessions();
  const last = sessions[0];
  $('#last-session-text').textContent = last ? `Last session: ${dateFmt(last.sessionDate)} • Weight: ${last.weightKg}kg` : 'No sessions yet.';

  const weights = [...sessions].reverse().map((s) => s.weightKg).filter(Boolean);
  const latest = weights[weights.length - 1];
  const rolling = weights.slice(-7);
  const avg = rolling.reduce((a, b) => a + b, 0) / (rolling.length || 1);
  $('#weight-latest').textContent = fmt(latest, 'kg');
  $('#weight-avg').textContent = fmt(avg, 'kg');
  $('#weight-dev').textContent = Number.isFinite(latest) ? `${(latest - avg >= 0 ? '+' : '')}${(latest - avg).toFixed(2)}kg` : '-';
  drawLine($('#weight-chart'), weights, '#86C8A3');

  const runs = sessions
    .map((s) => ({ s, e: getRunEntry(s) }))
    .filter((x) => x.e)
    .map(({ s, e }) => ({ date: s.sessionDate, dist: calcDistance(e), speed: calcSpeed(e), duration: e.durationMin || 0 }));
  const sumDays = (d) => runs.filter((r) => inDays(r.date, d)).reduce((sum, r) => sum + r.dist, 0);
  $('#run-30').textContent = fmt(sumDays(30), 'km');
  $('#run-7').textContent = fmt(sumDays(7), 'km');
  $('#run-today').textContent = fmt(runs.filter((r) => r.date === today).reduce((a, r) => a + r.dist, 0), 'km');
  const best5 = runs.filter((r) => Math.abs(r.dist - 5) < 0.01).sort((a, b) => a.duration - b.duration)[0];
  $('#run-best').textContent = best5 ? `${best5.duration}m (${dateFmt(best5.date)})` : '-';
  drawLine($('#run-chart'), runs.map((r) => r.speed), '#86C8A3');

  const strVol = sessions.map((s) => ({ date: s.sessionDate, vol: strengthVolume(s) }));
  const sumVol = (d) => strVol.filter((x) => inDays(x.date, d)).reduce((a, x) => a + x.vol, 0);
  $('#str-30').textContent = fmt(sumVol(30), 'kg');
  $('#str-7').textContent = fmt(sumVol(7), 'kg');
  $('#str-today').textContent = fmt(strVol.filter((x) => x.date === today).reduce((a, x) => a + x.vol, 0), 'kg');

  const muscleTotals = Object.fromEntries(muscles.map((m) => [m, 0]));
  sessions.forEach((s) => s.entries.filter((e) => e.type === 'strength').forEach((e) => {
    const v = (e.sets || []).reduce((a, set) => a + (set.weightKg || 0) * (set.reps || 0), 0);
    muscleTotals[e.muscle || 'Core'] += v;
  }));
  drawBars($('#muscle-chart'), muscles.map((m) => muscleTotals[m]), '#72B691');
}

function renderSessions() {
  const list = $('#sessions-list');
  const sessions = sortedSessions();
  list.innerHTML = sessions.map((s) => `
    <li class="session-row">
      <div>
        <strong>${dateFmt(s.sessionDate)}</strong>
        <div class="muted">${s.weightKg}kg • ${s.entries.length} entries</div>
      </div>
      <button data-edit="${s.id}">Edit</button>
    </li>
  `).join('') || '<li class="muted">No sessions yet.</li>';
}

function resetForm() {
  const form = $('#session-form');
  form.reset();
  form.sessionDate.value = today;
  $('#delete-btn').classList.add('hidden');
  $('#dialog-title').textContent = 'Add Session';
  $('#form-error').textContent = '';
  state.editingId = null;
}

function openForEdit(id) {
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return;
  const form = $('#session-form');
  resetForm();
  state.editingId = id;
  $('#dialog-title').textContent = 'Edit Session';
  $('#delete-btn').classList.remove('hidden');
  form.sessionDate.value = s.sessionDate;
  form.weightKg.value = s.weightKg;
  form.notes.value = s.notes || '';
  const c = s.entries.find((e) => e.type === 'cardio');
  if (c) { form.cardioName.value = c.exercise || ''; form.cardioDuration.value = c.durationMin || ''; form.cardioDistance.value = c.distanceKm || ''; form.cardioSpeed.value = c.speedKmh || ''; }
  const st = s.entries.find((e) => e.type === 'strength');
  if (st) { form.strengthName.value = st.exercise || ''; form.strengthWeight.value = st.sets?.[0]?.weightKg || ''; form.strengthReps.value = st.sets?.[0]?.reps || ''; form.strengthMuscle.value = st.muscle || 'Core'; }
  const h = s.entries.find((e) => e.type === 'hold');
  if (h) { form.holdName.value = h.exercise || ''; form.holdSets.value = h.sets || ''; form.holdSeconds.value = h.seconds || ''; }
  $('#session-dialog').showModal();
}

function upsertSession(formData) {
  const entries = [];
  const cardioDuration = Number(formData.get('cardioDuration'));
  const cardioDistance = Number(formData.get('cardioDistance'));
  if (formData.get('cardioName') || cardioDuration || cardioDistance) {
    if (!(cardioDuration || cardioDistance)) return 'Cardio must include duration or distance.';
    entries.push({
      type: 'cardio', exercise: formData.get('cardioName') || 'Cardio',
      durationMin: cardioDuration || undefined,
      distanceKm: cardioDistance || undefined,
      speedKmh: Number(formData.get('cardioSpeed')) || undefined,
    });
  }
  const reps = Number(formData.get('strengthReps'));
  if (formData.get('strengthName') || reps) {
    if (!reps) return 'Strength sets must include reps.';
    entries.push({ type: 'strength', exercise: formData.get('strengthName') || 'Strength', sets: [{ weightKg: Number(formData.get('strengthWeight')) || 0, reps }], muscle: formData.get('strengthMuscle') || 'Core' });
  }
  const holdSets = Number(formData.get('holdSets'));
  const holdSecs = Number(formData.get('holdSeconds'));
  if (formData.get('holdName') || holdSets || holdSecs) {
    entries.push({ type: 'hold', exercise: formData.get('holdName') || 'Hold', sets: holdSets || 1, seconds: holdSecs || 0 });
  }
  if (!entries.length) return 'At least 1 entry is required.';

  const session = {
    id: state.editingId || crypto.randomUUID(),
    sessionDate: formData.get('sessionDate'),
    weightKg: Number(formData.get('weightKg')),
    notes: formData.get('notes') || '',
    entries,
  };

  if (state.editingId) state.sessions = state.sessions.map((s) => s.id === state.editingId ? session : s);
  else state.sessions.push(session);
  persist();
  return null;
}

function renderAll() { renderDashboard(); renderSessions(); }

$('#add-session-open').addEventListener('click', () => { resetForm(); $('#session-dialog').showModal(); });
$('#cancel-btn').addEventListener('click', () => $('#session-dialog').close());
$('#delete-btn').addEventListener('click', () => {
  if (!state.editingId) return;
  if (confirm('Delete this session?')) {
    state.sessions = state.sessions.filter((s) => s.id !== state.editingId);
    persist();
    $('#session-dialog').close();
    renderAll();
  }
});
$('#session-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = upsertSession(new FormData(e.target));
  $('#form-error').textContent = err || '';
  if (!err) {
    $('#session-dialog').close();
    renderAll();
  }
});
$('#sessions-list').addEventListener('click', (e) => {
  const id = e.target.getAttribute('data-edit');
  if (id) openForEdit(id);
});
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  tab.classList.add('active');
  $(`#${tab.dataset.target}`).classList.add('active');
}));

resetForm();
renderAll();
