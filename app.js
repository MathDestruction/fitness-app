/* ════════════════════════════════════════════════════════════
   Fitness Tracker — App Logic
   Phase 1 · localStorage · Chart.js
   ════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'fitness.sessions.v2';
const MUSCLES = ['Biceps', 'Triceps', 'Back', 'Chest', 'Shoulders', 'Legs', 'Core'];
const MUSCLE_COLORS = {
  Biceps:    '#86C8A3',
  Triceps:   '#72B691',
  Back:      '#5EA07D',
  Chest:     '#4A8E6B',
  Shoulders: '#9DD6B5',
  Legs:      '#B4E2C8',
  Core:      '#3D7A5A',
};

/* ─── Exercise Database for Smart Search ─── */
const EXERCISE_DB = {
  cardio: ['Run', 'Jog', 'Sprint', 'Walk', 'Cycling', 'Rowing', 'Elliptical', 'Swimming', 'Jump Rope', 'HIIT', 'Stair Climber', 'Treadmill'],
  strength: [
    { name: 'Bench Press', muscle: 'Chest' },
    { name: 'Incline Press', muscle: 'Chest' },
    { name: 'Chest Fly', muscle: 'Chest' },
    { name: 'Push Up', muscle: 'Chest' },
    { name: 'Cable Crossover', muscle: 'Chest' },
    { name: 'Squat', muscle: 'Legs' },
    { name: 'Leg Press', muscle: 'Legs' },
    { name: 'Leg Curl', muscle: 'Legs' },
    { name: 'Leg Extension', muscle: 'Legs' },
    { name: 'Calf Raise', muscle: 'Legs' },
    { name: 'Lunge', muscle: 'Legs' },
    { name: 'Deadlift', muscle: 'Back' },
    { name: 'Barbell Row', muscle: 'Back' },
    { name: 'Lat Pulldown', muscle: 'Back' },
    { name: 'Seated Row', muscle: 'Back' },
    { name: 'Pull Up', muscle: 'Back' },
    { name: 'T-Bar Row', muscle: 'Back' },
    { name: 'Bicep Curl', muscle: 'Biceps' },
    { name: 'Hammer Curl', muscle: 'Biceps' },
    { name: 'Preacher Curl', muscle: 'Biceps' },
    { name: 'Concentration Curl', muscle: 'Biceps' },
    { name: 'Tricep Pushdown', muscle: 'Triceps' },
    { name: 'Tricep Dip', muscle: 'Triceps' },
    { name: 'Overhead Extension', muscle: 'Triceps' },
    { name: 'Skull Crusher', muscle: 'Triceps' },
    { name: 'Shoulder Press', muscle: 'Shoulders' },
    { name: 'Lateral Raise', muscle: 'Shoulders' },
    { name: 'Front Raise', muscle: 'Shoulders' },
    { name: 'Face Pull', muscle: 'Shoulders' },
    { name: 'Reverse Fly', muscle: 'Shoulders' },
    { name: 'Crunch', muscle: 'Core' },
    { name: 'Russian Twist', muscle: 'Core' },
    { name: 'Hanging Leg Raise', muscle: 'Core' },
    { name: 'Cable Crunch', muscle: 'Core' },
    { name: 'Ab Roller', muscle: 'Core' },
  ],
  hold: ['Plank', 'Side Plank', 'Wall Sit', 'Dead Hang', 'L-Sit', 'Hollow Hold', 'Superman'],
};

/* ─── State ─── */
const state = {
  sessions: JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seedData(),
  editingId: null,
  entryCounter: 0,
  charts: {},
  activeRunChart: 'run-distance',
};

/* ─── Helpers ─── */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const fmt = (n, unit = '') => Number.isFinite(n) ? `${n.toFixed(1)}${unit}` : '-';
const fmtInt = (n, unit = '') => Number.isFinite(n) ? `${Math.round(n)}${unit}` : '-';
const dateFmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateFmtShort = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const today = new Date().toISOString().slice(0, 10);
const dayMs = 86400000;

function inDays(dateStr, days) {
  return (new Date(today) - new Date(dateStr)) / dayMs <= days - 1;
}

/* ─── Seed Data ─── */
function seedData() {
  const base = [
    {
      id: crypto.randomUUID(),
      sessionDate: '2026-01-25',
      weightKg: 85.1,
      notes: 'Easy morning session',
      entries: [
        { type: 'cardio', exercise: 'Run', durationMin: 30, distanceKm: 4.5, speedKmh: 9.0 },
        { type: 'strength', exercise: 'Bench Press', sets: [{ weightKg: 60, reps: 12 }, { weightKg: 65, reps: 10 }, { weightKg: 70, reps: 8 }], muscle: 'Chest' },
      ],
    },
    {
      id: crypto.randomUUID(),
      sessionDate: '2026-01-29',
      weightKg: 84.8,
      notes: 'Pull day',
      entries: [
        { type: 'cardio', exercise: 'Run', durationMin: 25, distanceKm: 4.0, speedKmh: 9.6 },
        { type: 'strength', exercise: 'Barbell Row', sets: [{ weightKg: 55, reps: 10 }, { weightKg: 60, reps: 8 }], muscle: 'Back' },
        { type: 'strength', exercise: 'Bicep Curl', sets: [{ weightKg: 14, reps: 12 }, { weightKg: 16, reps: 10 }], muscle: 'Biceps' },
      ],
    },
    {
      id: crypto.randomUUID(),
      sessionDate: '2026-02-03',
      weightKg: 84.5,
      notes: 'Leg day',
      entries: [
        { type: 'strength', exercise: 'Squat', sets: [{ weightKg: 80, reps: 8 }, { weightKg: 85, reps: 6 }, { weightKg: 90, reps: 5 }], muscle: 'Legs' },
        { type: 'strength', exercise: 'Leg Press', sets: [{ weightKg: 120, reps: 12 }, { weightKg: 140, reps: 10 }], muscle: 'Legs' },
        { type: 'hold', exercise: 'Plank', sets: 3, seconds: 60 },
      ],
    },
    {
      id: crypto.randomUUID(),
      sessionDate: '2026-02-08',
      weightKg: 84.1,
      notes: 'Push day focus',
      entries: [
        { type: 'cardio', exercise: 'Run', durationMin: 32, distanceKm: 5.0, speedKmh: 9.4 },
        { type: 'strength', exercise: 'Shoulder Press', sets: [{ weightKg: 40, reps: 10 }, { weightKg: 45, reps: 8 }], muscle: 'Shoulders' },
        { type: 'strength', exercise: 'Bench Press', sets: [{ weightKg: 65, reps: 10 }, { weightKg: 72.5, reps: 8 }, { weightKg: 75, reps: 6 }], muscle: 'Chest' },
      ],
    },
    {
      id: crypto.randomUUID(),
      sessionDate: '2026-02-12',
      weightKg: 83.9,
      notes: 'Back & biceps',
      entries: [
        { type: 'cardio', exercise: 'Run', durationMin: 28, distanceKm: 5.0, speedKmh: 10.7 },
        { type: 'strength', exercise: 'Lat Pulldown', sets: [{ weightKg: 60, reps: 12 }, { weightKg: 65, reps: 10 }, { weightKg: 70, reps: 8 }], muscle: 'Back' },
        { type: 'strength', exercise: 'Hammer Curl', sets: [{ weightKg: 16, reps: 10 }, { weightKg: 18, reps: 8 }], muscle: 'Biceps' },
      ],
    },
    {
      id: crypto.randomUUID(),
      sessionDate: '2026-02-16',
      weightKg: 83.6,
      notes: 'Push + core',
      entries: [
        { type: 'cardio', exercise: 'Run', durationMin: 30, distanceKm: 5.0, speedKmh: 10.0 },
        { type: 'strength', exercise: 'Bench Press', sets: [{ weightKg: 70, reps: 10 }, { weightKg: 75, reps: 8 }, { weightKg: 80, reps: 6 }], muscle: 'Chest' },
        { type: 'strength', exercise: 'Tricep Pushdown', sets: [{ weightKg: 25, reps: 12 }, { weightKg: 30, reps: 10 }], muscle: 'Triceps' },
        { type: 'hold', exercise: 'Plank', sets: 3, seconds: 75 },
      ],
    },
    {
      id: crypto.randomUUID(),
      sessionDate: '2026-02-20',
      weightKg: 83.4,
      notes: 'Back + heavy rows',
      entries: [
        { type: 'cardio', exercise: 'Jog', durationMin: 24, distanceKm: 4.0, speedKmh: 10.0 },
        { type: 'strength', exercise: 'Barbell Row', sets: [{ weightKg: 60, reps: 10 }, { weightKg: 65, reps: 8 }, { weightKg: 70, reps: 6 }], muscle: 'Back' },
        { type: 'strength', exercise: 'Bicep Curl', sets: [{ weightKg: 16, reps: 10 }, { weightKg: 18, reps: 8 }], muscle: 'Biceps' },
      ],
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
  return base;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function sortedSessions() {
  return [...state.sessions].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

function sortedDesc() {
  return [...state.sessions].sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
}

/* ─── Calculation Helpers ─── */
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

/* ═══════════════════════════════════════
   Chart.js Global Config
   ═══════════════════════════════════════ */
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

/* ─── Chart Creation Helpers ─── */
function destroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    state.charts[key] = null;
  }
}

function createChart(key, ctx, config) {
  destroyChart(key);
  state.charts[key] = new Chart(ctx, config);
}

/* ═══════════════════════════════════════
   Dashboard Rendering
   ═══════════════════════════════════════ */
function renderDashboard() {
  const sessions = sortedSessions();
  const sessionsDesc = sortedDesc();
  const last = sessionsDesc[0];

  // Greeting
  $('#last-session-text').textContent = last
    ? `Last session: ${dateFmt(last.sessionDate)} • Weight: ${last.weightKg}kg`
    : 'No sessions yet.';

  renderWeightChart(sessions);
  renderRunningAnalytics(sessions);
  renderStrengthAnalytics(sessions);
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
        {
          label: 'Weight',
          data: weights,
          borderColor: '#86C8A3',
          backgroundColor: 'rgba(134,200,163,0.08)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#86C8A3',
          pointBorderColor: '#12181D',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
        },
        {
          label: 'Rolling Avg (7)',
          data: avg,
          borderColor: 'rgba(134,200,163,0.4)',
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0.4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const i = items[0].dataIndex;
              return dateFmt(sessions[i]?.sessionDate || '');
            },
            label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(1)} kg`,
          },
        },
      },
      scales: {
        x: { ticks: { maxRotation: 0 } },
        y: { ticks: { callback: v => v + ' kg' } },
      },
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

  const sumDays = (d) => runs.filter(r => inDays(r.date, d)).reduce((sum, r) => sum + r.dist, 0);
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
      data: {
        labels,
        datasets: [{
          label: 'Distance (km)',
          data: runs.map(r => r.dist),
          backgroundColor: 'rgba(134,200,163,0.5)',
          borderColor: '#86C8A3',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => runs[items[0].dataIndex] ? dateFmt(runs[items[0].dataIndex].date) : '',
              afterTitle: (items) => runs[items[0].dataIndex]?.exercise || '',
              label: (item) => `Distance: ${item.parsed.y.toFixed(2)} km`,
              afterLabel: (item) => {
                const r = runs[item.dataIndex];
                return r ? `Duration: ${r.duration} min\nSpeed: ${r.speed.toFixed(1)} km/h` : '';
              },
            },
          },
        },
        scales: {
          x: { ticks: { maxRotation: 0 } },
          y: { ticks: { callback: v => v + ' km' }, beginAtZero: true },
        },
      },
    };
  } else if (mode === 'run-speed') {
    config = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Speed (km/h)',
          data: runs.map(r => r.speed),
          borderColor: '#86C8A3',
          backgroundColor: 'rgba(134,200,163,0.08)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#86C8A3',
          pointBorderColor: '#12181D',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => runs[items[0].dataIndex] ? dateFmt(runs[items[0].dataIndex].date) : '',
              label: (item) => `Speed: ${item.parsed.y.toFixed(1)} km/h`,
              afterLabel: (item) => {
                const r = runs[item.dataIndex];
                return r ? `Distance: ${r.dist.toFixed(2)} km\nDuration: ${r.duration} min` : '';
              },
            },
          },
        },
        scales: {
          x: { ticks: { maxRotation: 0 } },
          y: { ticks: { callback: v => v + ' km/h' } },
        },
      },
    };
  } else {
    // Dual axis
    config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Distance (km)',
            data: runs.map(r => r.dist),
            backgroundColor: 'rgba(134,200,163,0.35)',
            borderColor: '#86C8A3',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: 'Speed (km/h)',
            data: runs.map(r => r.speed),
            borderColor: '#9DD6B5',
            backgroundColor: 'transparent',
            tension: 0.35,
            pointBackgroundColor: '#9DD6B5',
            pointBorderColor: '#12181D',
            pointBorderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { boxWidth: 10, padding: 12 } },
          tooltip: {
            callbacks: {
              title: (items) => runs[items[0].dataIndex] ? dateFmt(runs[items[0].dataIndex].date) : '',
              afterTitle: (items) => runs[items[0].dataIndex]?.exercise || '',
            },
          },
        },
        scales: {
          x: { ticks: { maxRotation: 0 } },
          y: { position: 'left', ticks: { callback: v => v + ' km' }, beginAtZero: true },
          y1: { position: 'right', ticks: { callback: v => v + ' km/h' }, grid: { drawOnChartArea: false } },
        },
      },
    };
  }

  createChart('run', $('#run-chart'), config);
}

/* ─── Strength Analytics ─── */
function renderStrengthAnalytics(sessions) {
  const strVol = sessions.map(s => ({ date: s.sessionDate, vol: strengthVolume(s) }));
  const sumVol = (d) => strVol.filter(x => inDays(x.date, d)).reduce((a, x) => a + x.vol, 0);

  $('#str-30').textContent = fmtInt(sumVol(30), ' kg');
  $('#str-7').textContent = fmtInt(sumVol(7), ' kg');
  $('#str-today').textContent = fmtInt(strVol.filter(x => x.date === today).reduce((a, x) => a + x.vol, 0), ' kg');

  // Stacked bar — muscle group volume per session
  const labels = sessions.map(s => dateFmtShort(s.sessionDate));
  const datasets = MUSCLES.map(muscle => ({
    label: muscle,
    data: sessions.map(s => {
      return s.entries
        .filter(e => e.type === 'strength' && e.muscle === muscle)
        .flatMap(e => e.sets || [])
        .reduce((sum, set) => sum + (set.weightKg || 0) * (set.reps || 0), 0);
    }),
    backgroundColor: MUSCLE_COLORS[muscle],
    borderRadius: 3,
    borderSkipped: false,
  }));

  createChart('muscle', $('#muscle-chart'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, ticks: { maxRotation: 0 } },
        y: { stacked: true, ticks: { callback: v => v + ' kg' }, beginAtZero: true },
      },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 10, padding: 8, font: { size: 10 } },
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const i = items[0].dataIndex;
              return sessions[i] ? dateFmt(sessions[i].sessionDate) : '';
            },
            label: (item) => item.parsed.y > 0 ? `${item.dataset.label}: ${item.parsed.y} kg` : null,
          },
        },
      },
    },
  });
}

/* ═══════════════════════════════════════
   Sessions List
   ═══════════════════════════════════════ */
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
          <div class="session-meta">${s.weightKg} kg • ${s.entries.length} exercise${s.entries.length !== 1 ? 's' : ''}${s.notes ? ' • ' + s.notes : ''}</div>
          <div class="session-tags">${tags}</div>
        </div>
        <span class="session-arrow">›</span>
      </li>`;
  }).join('');
}

/* ═══════════════════════════════════════
   Session Detail View
   ═══════════════════════════════════════ */
function showSessionDetail(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return;

  const body = $('#detail-body');
  const totalVol = strengthVolume(s);

  let html = `
    <div class="detail-meta">
      <div class="detail-meta-item">
        <span class="detail-meta-label">Date</span>
        <span class="detail-meta-value">${dateFmt(s.sessionDate)}</span>
      </div>
      <div class="detail-meta-item">
        <span class="detail-meta-label">Weight</span>
        <span class="detail-meta-value">${s.weightKg} kg</span>
      </div>
      ${totalVol ? `<div class="detail-meta-item">
        <span class="detail-meta-label">Total Volume</span>
        <span class="detail-meta-value">${totalVol.toLocaleString()} kg</span>
      </div>` : ''}
    </div>
    ${s.notes ? `<div style="color:var(--muted);font-size:0.85rem;font-style:italic;">"${s.notes}"</div>` : ''}
  `;

  for (const e of s.entries) {
    const icon = { cardio: '🏃', strength: '💪', hold: '🧘' }[e.type];
    html += `<div class="detail-entry">`;
    html += `<div class="detail-entry-title">${icon} ${e.exercise}</div>`;

    if (e.type === 'cardio') {
      html += `<div class="detail-entry-stat">`;
      if (e.durationMin) html += `Duration: ${e.durationMin} min<br>`;
      if (e.distanceKm) html += `Distance: ${e.distanceKm} km<br>`;
      html += `Speed: ${calcSpeed(e).toFixed(1)} km/h`;
      html += `</div>`;
    } else if (e.type === 'strength') {
      html += `<div class="detail-entry-stat">Muscle: ${e.muscle || 'Not specified'}</div>`;
      if (e.sets?.length) {
        html += `<table class="detail-sets-table">
          <thead><tr><th>Set</th><th>Weight</th><th>Reps</th><th>Volume</th></tr></thead>
          <tbody>`;
        e.sets.forEach((set, i) => {
          html += `<tr>
            <td>${i + 1}</td>
            <td>${set.weightKg} kg</td>
            <td>${set.reps}</td>
            <td>${(set.weightKg * set.reps).toLocaleString()} kg</td>
          </tr>`;
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

  // Wire edit button
  $('#detail-edit').onclick = () => {
    $('#detail-dialog').close();
    openForEdit(id);
  };

  $('#detail-dialog').showModal();
}

/* ═══════════════════════════════════════
   Form: Dynamic Entry Builder
   ═══════════════════════════════════════ */
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
            <input type="text" class="exercise-search" data-search-type="cardio" placeholder="Search exercise…" value="${data?.exercise || ''}" autocomplete="off" />
          </label>
          <div class="search-suggestions" id="suggestions-${idx}"></div>
        </div>
        <div class="form-row-3">
          <label class="form-label"><span>Duration (min)</span>
            <input type="number" class="entry-dur" min="0" step="1" value="${data?.durationMin || ''}" />
          </label>
          <label class="form-label"><span>Distance (km)</span>
            <input type="number" class="entry-dist" min="0" step="0.01" value="${data?.distanceKm || ''}" />
          </label>
          <label class="form-label"><span>Speed (km/h)</span>
            <input type="number" class="entry-speed" min="0" step="0.1" value="${data?.speedKmh || ''}" />
          </label>
        </div>
      </div>`;
  } else if (type === 'strength') {
    const muscle = data?.muscle || 'Chest';
    const sets = data?.sets || [{ weightKg: '', reps: '' }];
    const muscleOpts = MUSCLES.map(m => `<option ${m === muscle ? 'selected' : ''}>${m}</option>`).join('');

    let setsHTML = sets.map((s, si) => buildSetRow(si + 1, s.weightKg, s.reps)).join('');

    fieldsHTML = `
      <div class="entry-fields">
        <div class="form-row" style="grid-template-columns: 1fr auto;">
          <div class="search-wrap">
            <label class="form-label"><span>Exercise</span>
              <input type="text" class="exercise-search" data-search-type="strength" placeholder="Search exercise…" value="${data?.exercise || ''}" autocomplete="off" />
            </label>
            <div class="search-suggestions" id="suggestions-${idx}"></div>
          </div>
          <label class="form-label"><span>Muscle</span>
            <select class="entry-muscle">${muscleOpts}</select>
          </label>
        </div>
        <div class="sets-container">${setsHTML}</div>
        <button type="button" class="btn-add-set">+ Add Set</button>
      </div>`;
  } else {
    fieldsHTML = `
      <div class="entry-fields">
        <div class="search-wrap">
          <label class="form-label"><span>Exercise</span>
            <input type="text" class="exercise-search" data-search-type="hold" placeholder="Search exercise…" value="${data?.exercise || ''}" autocomplete="off" />
          </label>
          <div class="search-suggestions" id="suggestions-${idx}"></div>
        </div>
        <div class="form-row-3" style="grid-template-columns: 1fr 1fr;">
          <label class="form-label"><span>Sets</span>
            <input type="number" class="entry-hold-sets" min="1" step="1" value="${data?.sets || ''}" />
          </label>
          <label class="form-label"><span>Seconds / set</span>
            <input type="number" class="entry-hold-secs" min="0" step="1" value="${data?.seconds || ''}" />
          </label>
        </div>
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

  // Wire remove
  card.querySelector('.entry-remove').addEventListener('click', () => {
    card.style.opacity = '0';
    card.style.transform = 'translateX(-20px)';
    setTimeout(() => card.remove(), 200);
  });

  // Wire add set
  const addSetBtn = card.querySelector('.btn-add-set');
  if (addSetBtn) {
    addSetBtn.addEventListener('click', () => {
      const setsC = card.querySelector('.sets-container');
      const num = setsC.children.length + 1;
      setsC.insertAdjacentHTML('beforeend', buildSetRow(num, '', ''));
      wireSetRemove(setsC);
    });
    wireSetRemove(card.querySelector('.sets-container'));
  }

  // Wire smart search
  wireSmartSearch(card, type);

  return card;
}

function buildSetRow(num, weight, reps) {
  return `
    <div class="set-row">
      <div class="set-num">${num}</div>
      <label class="form-label"><span style="font-size:0.72rem;">Weight (kg)</span>
        <input type="number" class="set-weight" min="0" step="0.5" value="${weight}" />
      </label>
      <label class="form-label"><span style="font-size:0.72rem;">Reps</span>
        <input type="number" class="set-reps" min="0" step="1" value="${reps}" />
      </label>
      <button type="button" class="set-remove" title="Remove set">✕</button>
    </div>`;
}

function wireSetRemove(container) {
  if (!container) return;
  container.querySelectorAll('.set-remove').forEach(btn => {
    btn.onclick = () => {
      btn.closest('.set-row').remove();
      // Renumber
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
  if (type === 'cardio') {
    db = EXERCISE_DB.cardio.map(n => ({ name: n }));
  } else if (type === 'strength') {
    db = EXERCISE_DB.strength;
  } else {
    db = EXERCISE_DB.hold.map(n => ({ name: n }));
  }

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

  sugDiv.addEventListener('click', (e) => {
    const item = e.target.closest('.search-suggestion');
    if (!item) return;
    input.value = item.dataset.name;
    sugDiv.classList.remove('open');

    // Auto-set muscle group for strength
    if (type === 'strength' && item.dataset.muscle) {
      const muscleSelect = card.querySelector('.entry-muscle');
      if (muscleSelect) muscleSelect.value = item.dataset.muscle;
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => sugDiv.classList.remove('open'), 150);
  });
}

/* ═══════════════════════════════════════
   Form: Reset, Open, Save
   ═══════════════════════════════════════ */
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

  // Rebuild entries
  for (const e of s.entries) {
    addEntryCard(e.type, e);
  }

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
      entries.push({
        type: 'cardio',
        exercise,
        durationMin: dur || undefined,
        distanceKm: dist || undefined,
        speedKmh: speed || undefined,
      });
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
      if (!sets.length) { errors.push(`Strength entry "${exercise}" must have at least 1 set with reps.`); continue; }
      entries.push({ type: 'strength', exercise, sets, muscle });
    } else if (type === 'hold') {
      const exercise = card.querySelector('.exercise-search')?.value?.trim() || 'Hold';
      const sets = Number(card.querySelector('.entry-hold-sets')?.value) || 1;
      const seconds = Number(card.querySelector('.entry-hold-secs')?.value) || 0;
      entries.push({ type: 'hold', exercise, sets, seconds });
    }
  }

  return { entries, errors };
}

function saveSession() {
  const form = $('#session-form');
  const { entries, errors } = collectEntries();

  if (errors.length) {
    $('#form-error').textContent = errors[0];
    return false;
  }
  if (!entries.length) {
    $('#form-error').textContent = 'Add at least 1 exercise entry.';
    return false;
  }

  const session = {
    id: state.editingId || crypto.randomUUID(),
    sessionDate: form.sessionDate.value,
    weightKg: Number(form.weightKg.value),
    notes: form.notes.value || '',
    entries,
  };

  if (state.editingId) {
    state.sessions = state.sessions.map(s => s.id === state.editingId ? session : s);
  } else {
    state.sessions.push(session);
  }

  persist();
  return true;
}

/* ═══════════════════════════════════════
   Render All
   ═══════════════════════════════════════ */
function renderAll() {
  renderDashboard();
  renderSessions();
}

/* ═══════════════════════════════════════
   Event Listeners
   ═══════════════════════════════════════ */

// Add session button
$('#add-session-open').addEventListener('click', () => {
  resetForm();
  $('#session-dialog').showModal();
});

// Cancel
$('#cancel-btn').addEventListener('click', () => $('#session-dialog').close());

// Delete
$('#delete-btn').addEventListener('click', () => {
  if (!state.editingId) return;
  if (confirm('Delete this session? This cannot be undone.')) {
    state.sessions = state.sessions.filter(s => s.id !== state.editingId);
    persist();
    $('#session-dialog').close();
    renderAll();
  }
});

// Save
$('#session-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (saveSession()) {
    $('#session-dialog').close();
    renderAll();
  }
});

// Session list — click to view detail
$('#sessions-list').addEventListener('click', (e) => {
  const row = e.target.closest('.session-row');
  if (row) showSessionDetail(row.dataset.sessionId);
});

// Detail close
$('#detail-close').addEventListener('click', () => $('#detail-dialog').close());

// Tabs
$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.tab').forEach(t => t.classList.remove('active'));
  $$('.view').forEach(v => v.classList.remove('active'));
  tab.classList.add('active');
  $(`#${tab.dataset.target}`).classList.add('active');
  if (tab.dataset.target === 'dashboard-view') renderDashboard();
}));

// Entry add buttons
$$('.btn-entry-add').forEach(btn => {
  btn.addEventListener('click', () => addEntryCard(btn.dataset.entryType));
});

// Chart tabs (running)
$$('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeRunChart = tab.dataset.chart;
    const sessions = sortedSessions();
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
    drawRunChart(runs, state.activeRunChart);
  });
});

// Close dialogs on backdrop click
['session-dialog', 'detail-dialog'].forEach(id => {
  const dialog = $(`#${id}`);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
});

/* ─── Init ─── */
resetForm();
renderAll();
