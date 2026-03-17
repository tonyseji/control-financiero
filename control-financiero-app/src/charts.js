import Chart from 'chart.js/auto';
import { state, getCat, getMonthTx, amt } from './store.js';
import { fmt, typeIsIncome, parseDateParts } from './utils.js';

// ─── Gráfica de tarta (gastos por categoría) ─────────────────────────────────
export function renderPieChart(txs) {
  const grouped = {};
  txs.filter(t => t.type !== 'income').forEach(t => {
    grouped[t.catId] = (grouped[t.catId] || 0) + amt(t);
  });
  const labels = [], data = [], colors = [];
  Object.entries(grouped).forEach(([cid, v]) => {
    const c = getCat(cid);
    labels.push(c.name); data.push(v); colors.push(c.color);
  });
  const ctx = document.getElementById('chartPie').getContext('2d');
  if (state.chartPieI) state.chartPieI.destroy();
  if (!data.length) {
    ctx.clearRect(0, 0, 300, 200);
    ctx.fillStyle = '#7b83a6'; ctx.font = '14px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText('Sin gastos este mes', 150, 100);
    return;
  }
  state.chartPieI = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#161b2e' }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'right', labels: { color: '#e8edf8', font: { size: 10 }, padding: 8, boxWidth: 10 } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)}` } },
      },
    },
  });
}

// ─── Resumen anual (debajo del gráfico de barras) ─────────────────────────────
export function renderAnnualSummary(year) {
  const el = document.getElementById('annualSummary');
  if (!el) return;
  const txs = state.transactions.filter(t => {
    const d = parseDateParts(t.date);
    return d && d.getFullYear() === year;
  });
  const inc = txs.filter(t => typeIsIncome(t.type)).reduce((s, t) => s + amt(t), 0);
  const exp = txs.filter(t => t.type === 'expense' || t.type === 'expense_var').reduce((s, t) => s + amt(t), 0);
  const sav = txs.filter(t => t.type === 'saving' || t.type === 'invest').reduce((s, t) => s + amt(t), 0);
  const bal = inc - exp - sav;
  const savRate = inc > 0 ? Math.round(sav / inc * 100) : 0;
  el.style.display = 'block';
  el.innerHTML = `
    <div class="annual-title">Resumen anual ${year}</div>
    <div class="annual-grid">
      <div class="annual-card">
        <div class="annual-card-label">Ingresos totales</div>
        <div class="annual-card-val" style="color:var(--green)">${fmt(inc)}</div>
        <div class="annual-card-sub">Media ${fmt(inc / 12)}/mes</div>
      </div>
      <div class="annual-card">
        <div class="annual-card-label">Gastos totales</div>
        <div class="annual-card-val" style="color:var(--red)">${fmt(exp)}</div>
        <div class="annual-card-sub">${inc > 0 ? Math.round(exp / inc * 100) + '% de ingresos' : ''}</div>
      </div>
      <div class="annual-card">
        <div class="annual-card-label">Ahorro / Inversión</div>
        <div class="annual-card-val" style="color:var(--cyan)">${fmt(sav)}</div>
        <div class="annual-card-sub">Tasa de ahorro ${savRate}%</div>
      </div>
      <div class="annual-card">
        <div class="annual-card-label">Balance anual</div>
        <div class="annual-card-val" style="color:${bal >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(bal)}</div>
        <div class="annual-card-sub">${bal >= 0 ? 'Año positivo ✓' : 'Déficit del año'}</div>
      </div>
    </div>`;
}

// ─── Toggle período del gráfico de barras ─────────────────────────────────────
export function setChartPeriod(p) {
  state.chartPeriod = p;
  if (p === 'year') state.chartY = state.curY;
  const b6 = document.getElementById('btn6m');
  const by = document.getElementById('btnYear');
  if (b6 && by) {
    b6.style.background   = p === '6m'   ? 'var(--blue)' : 'var(--s2)';
    b6.style.color        = p === '6m'   ? '#fff'        : 'var(--muted)';
    b6.style.borderColor  = p === '6m'   ? 'var(--blue)' : 'var(--border)';
    by.style.background   = p === 'year' ? 'var(--blue)' : 'var(--s2)';
    by.style.color        = p === 'year' ? '#fff'        : 'var(--muted)';
    by.style.borderColor  = p === 'year' ? 'var(--blue)' : 'var(--border)';
  }
  const yn = document.getElementById('yearNav');
  if (yn) yn.style.display = p === 'year' ? 'flex' : 'none';
  renderBarChart();
}

export function changeChartYear(d) {
  state.chartY += d;
  renderBarChart();
}

// ─── Gráfica de barras (evolución mensual) ────────────────────────────────────
export function renderBarChart() {
  const months = [], inc = [], exp = [], sav = [];

  if (state.chartPeriod === 'year') {
    const yl = document.getElementById('chartYearLabel');
    if (yl) yl.textContent = state.chartY;
    const title = document.getElementById('chartBarTitle');
    if (title) title.textContent = `Evolución ${state.chartY}`;
    for (let m = 0; m < 12; m++) {
      const txs = getMonthTx(state.chartY, m);
      months.push(new Date(state.chartY, m, 1).toLocaleString('es-ES', { month: 'short' }));
      inc.push(txs.filter(t => typeIsIncome(t.type)).reduce((s, t) => s + amt(t), 0));
      exp.push(txs.filter(t => t.type === 'expense' || t.type === 'expense_var').reduce((s, t) => s + amt(t), 0));
      sav.push(txs.filter(t => t.type === 'saving' || t.type === 'invest').reduce((s, t) => s + amt(t), 0));
    }
  } else {
    const title = document.getElementById('chartBarTitle');
    if (title) title.textContent = 'Evolución (6 meses)';
    for (let i = 5; i >= 0; i--) {
      let m = state.curM - i, y = state.curY;
      if (m < 0) { m += 12; y--; }
      const txs = getMonthTx(y, m);
      months.push(new Date(y, m, 1).toLocaleString('es-ES', { month: 'short', year: '2-digit' }));
      inc.push(txs.filter(t => typeIsIncome(t.type)).reduce((s, t) => s + amt(t), 0));
      exp.push(txs.filter(t => t.type === 'expense' || t.type === 'expense_var').reduce((s, t) => s + amt(t), 0));
      sav.push(txs.filter(t => t.type === 'saving' || t.type === 'invest').reduce((s, t) => s + amt(t), 0));
    }
  }

  const ctx = document.getElementById('chartBar').getContext('2d');
  if (state.chartBarI) state.chartBarI.destroy();
  state.chartBarI = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Ingresos',   data: inc, backgroundColor: 'rgba(34,197,94,.72)',  borderRadius: 4, borderSkipped: false },
        { label: 'Gastos',     data: exp, backgroundColor: 'rgba(244,63,94,.68)',  borderRadius: 4, borderSkipped: false },
        { label: 'Ahorro/Inv.',data: sav, backgroundColor: 'rgba(6,182,212,.65)',  borderRadius: 4, borderSkipped: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e8edf8', font: { size: 10 }, padding: 10, boxWidth: 10 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)}` } },
      },
      scales: {
        x: { ticks: { color: '#7b83a6', font: { size: 10 } }, grid: { color: 'rgba(46,53,88,.5)' } },
        y: {
          beginAtZero: true,
          ticks: { color: '#7b83a6', font: { size: 10 }, callback: v => v >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${v}` },
          grid: { color: 'rgba(46,53,88,.5)' },
        },
      },
    },
  });

  const as = document.getElementById('annualSummary');
  if (state.chartPeriod === 'year') {
    renderAnnualSummary(state.chartY);
  } else if (as) {
    as.style.display = 'none';
  }
}
