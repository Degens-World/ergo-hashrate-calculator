'use strict';

const EXPLORER = 'https://api.ergoplatform.com/api/v1';
const COINGECKO = 'https://api.coingecko.com/api/v3';

// Ergo Autolykos v2 block reward schedule (ERG per block)
// Epoch 0 starts at block 1, each epoch = 64800 blocks (~3 months)
const BLOCK_REWARD_SCHEDULE = [
  { startBlock: 1,       reward: 75.0 },
  { startBlock: 64800,   reward: 67.5 },
  { startBlock: 129600,  reward: 60.0 },
  { startBlock: 194400,  reward: 52.5 },
  { startBlock: 259200,  reward: 45.0 },
  { startBlock: 324000,  reward: 37.5 },
  { startBlock: 388800,  reward: 30.0 },
  { startBlock: 453600,  reward: 22.5 },
  { startBlock: 518400,  reward: 15.0 },
  { startBlock: 583200,  reward: 7.5  },
  { startBlock: 648000,  reward: 3.0  },  // tail emission begins
];
const TAIL_REWARD = 3.0;

let networkData = {
  price: null,
  difficulty: null,
  hashrate: null,
  blockHeight: null,
  blockReward: null,
};

let profitChart = null;

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function getBlockReward(height) {
  let reward = TAIL_REWARD;
  for (const epoch of BLOCK_REWARD_SCHEDULE) {
    if (height >= epoch.startBlock) reward = epoch.reward;
    else break;
  }
  return reward;
}

// ── Network data load ─────────────────────────────────────────────────────────

async function loadNetworkData() {
  try {
    const [statsData, priceData] = await Promise.all([
      fetchJSON(`${EXPLORER}/networkState`),
      fetchJSON(`${COINGECKO}/simple/price?ids=ergo&vs_currencies=usd`).catch(() => null),
    ]);

    const difficulty = statsData.difficulty;
    const blockHeight = statsData.height;
    // Ergo target block time = 120 seconds
    // Hashrate = difficulty / 120 (H/s)
    const hashrate = difficulty / 120;
    const blockReward = getBlockReward(blockHeight);
    const price = priceData?.ergo?.usd ?? null;

    networkData = { price, difficulty, hashrate, blockHeight, blockReward };

    // Update stats bar
    document.getElementById('ergPrice').textContent = price ? `$${price.toFixed(3)}` : 'N/A';
    document.getElementById('netHashrate').textContent = formatHashrate(hashrate);
    document.getElementById('netDifficulty').textContent = formatDifficulty(difficulty);
    document.getElementById('blockReward').textContent = `${blockReward} ERG`;

  } catch (err) {
    console.error('Failed to load network data:', err);
    document.getElementById('ergPrice').textContent = 'Error';
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatHashrate(hs) {
  if (hs >= 1e12) return (hs / 1e12).toFixed(2) + ' TH/s';
  if (hs >= 1e9)  return (hs / 1e9).toFixed(2)  + ' GH/s';
  if (hs >= 1e6)  return (hs / 1e6).toFixed(2)  + ' MH/s';
  if (hs >= 1e3)  return (hs / 1e3).toFixed(2)  + ' KH/s';
  return hs.toFixed(0) + ' H/s';
}

function formatDifficulty(d) {
  if (d >= 1e15) return (d / 1e15).toFixed(2) + ' P';
  if (d >= 1e12) return (d / 1e12).toFixed(2) + ' T';
  if (d >= 1e9)  return (d / 1e9).toFixed(2)  + ' G';
  return d.toFixed(0);
}

function fmt2(n) { return n.toFixed(4); }
function fmtUsd(n) {
  if (Math.abs(n) >= 1000) return '$' + n.toFixed(2);
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2);
}
function fmtUsdPlain(n) { return '$' + n.toFixed(2); }

// ── Core calculation ──────────────────────────────────────────────────────────

function calculate() {
  const hashrateRaw  = parseFloat(document.getElementById('hashrate').value) || 0;
  const hashrateUnit = parseFloat(document.getElementById('hashrateUnit').value);
  const powerW       = parseFloat(document.getElementById('power').value) || 0;
  const electricKwh  = parseFloat(document.getElementById('electricityCost').value) || 0;
  const poolFee      = parseFloat(document.getElementById('poolFee').value) / 100 || 0;
  const priceOverride = parseFloat(document.getElementById('ergPriceOverride').value) || 0;

  const myHashrate = hashrateRaw * hashrateUnit; // H/s
  const ergPrice   = priceOverride > 0 ? priceOverride : (networkData.price ?? 0);
  const netHashrate = networkData.hashrate ?? 1;
  const blockReward = networkData.blockReward ?? 3;

  if (!ergPrice || !netHashrate) {
    alert('Live data not loaded yet. Please wait a moment and try again.');
    return;
  }

  // Blocks per day = 86400s / 120s = 720
  const blocksPerDay = 86400 / 120;

  // Share of network
  const myShare = myHashrate / netHashrate;

  // ERG mined per hour/day/week/month (before pool fee)
  const ergPerDay   = myShare * blocksPerDay * blockReward * (1 - poolFee);
  const ergPerHour  = ergPerDay / 24;
  const ergPerWeek  = ergPerDay * 7;
  const ergPerMonth = ergPerDay * 30.44;

  // USD revenue
  const usdPerHour  = ergPerHour  * ergPrice;
  const usdPerDay   = ergPerDay   * ergPrice;
  const usdPerWeek  = ergPerWeek  * ergPrice;
  const usdPerMonth = ergPerMonth * ergPrice;

  // Power cost per period
  const powerKw = powerW / 1000;
  const costPerHour  = powerKw * electricKwh;
  const costPerDay   = costPerHour * 24;
  const costPerWeek  = costPerDay * 7;
  const costPerMonth = costPerDay * 30.44;

  // Net profit
  const netHour  = usdPerHour  - costPerHour;
  const netDay   = usdPerDay   - costPerDay;
  const netWeek  = usdPerWeek  - costPerWeek;
  const netMonth = usdPerMonth - costPerMonth;

  // Break-even price
  const breakevenPrice = ergPerDay > 0 ? costPerDay / ergPerDay : Infinity;

  // Update UI
  document.getElementById('hourlyErg').textContent  = `${fmt2(ergPerHour)} ERG`;
  document.getElementById('dailyErg').textContent   = `${fmt2(ergPerDay)} ERG`;
  document.getElementById('weeklyErg').textContent  = `${fmt2(ergPerWeek)} ERG`;
  document.getElementById('monthlyErg').textContent = `${fmt2(ergPerMonth)} ERG`;

  document.getElementById('hourlyUsd').textContent  = fmtUsdPlain(usdPerHour);
  document.getElementById('dailyUsd').textContent   = fmtUsdPlain(usdPerDay);
  document.getElementById('weeklyUsd').textContent  = fmtUsdPlain(usdPerWeek);
  document.getElementById('monthlyUsd').textContent = fmtUsdPlain(usdPerMonth);

  const setNet = (id, val) => {
    const el = document.getElementById(id);
    el.textContent = fmtUsd(val);
    el.style.color = val >= 0 ? 'var(--green)' : 'var(--red)';
  };
  setNet('hourlyNet',  netHour);
  setNet('dailyNet',   netDay);
  setNet('weeklyNet',  netWeek);
  setNet('monthlyNet', netMonth);

  document.getElementById('sharePercent').textContent  = (myShare * 100).toFixed(6) + '%';
  document.getElementById('blocksPerDay').textContent  = (myShare * blocksPerDay).toFixed(4);
  document.getElementById('dailyPowerCost').textContent = `$${costPerDay.toFixed(2)}`;
  document.getElementById('breakevenPrice').textContent = isFinite(breakevenPrice)
    ? `$${breakevenPrice.toFixed(4)}`
    : 'N/A';

  // Verdict
  const verdict = document.getElementById('verdictBanner');
  const profitRatio = usdPerDay > 0 ? netDay / usdPerDay : -1;
  verdict.className = 'verdict-banner';
  if (netDay > 0 && profitRatio > 0.2) {
    verdict.classList.add('verdict-profitable');
    verdict.textContent = `✅ PROFITABLE — You're earning $${netDay.toFixed(2)}/day net after power costs`;
  } else if (netDay > 0) {
    verdict.classList.add('verdict-marginal');
    verdict.textContent = `⚠️ MARGINAL — Barely profitable. Power is eating ${(100 - profitRatio * 100).toFixed(1)}% of revenue`;
  } else {
    verdict.classList.add('verdict-unprofitable');
    verdict.textContent = `❌ UNPROFITABLE — Losing $${Math.abs(netDay).toFixed(2)}/day. ERG needs to reach $${breakevenPrice.toFixed(3)} to break even`;
  }

  document.getElementById('resultsContent').classList.add('hidden');
  document.getElementById('resultsData').classList.remove('hidden');

  // Draw chart
  drawChart(myShare, blockReward, poolFee, powerW, electricKwh);
}

// ── Profit chart ──────────────────────────────────────────────────────────────

function drawChart(myShare, blockReward, poolFee, powerW, electricKwh) {
  const currentPrice = networkData.price ?? 1;
  const minPrice = Math.max(0.01, currentPrice * 0.1);
  const maxPrice = currentPrice * 3;
  const steps = 30;
  const step = (maxPrice - minPrice) / steps;

  const labels = [];
  const netProfits = [];
  const revenues = [];
  const costs = [];

  const blocksPerDay = 720;
  const ergPerDay = myShare * blocksPerDay * blockReward * (1 - poolFee);
  const powerKw = powerW / 1000;
  const costPerDay = powerKw * electricKwh * 24;

  for (let i = 0; i <= steps; i++) {
    const price = minPrice + i * step;
    labels.push('$' + price.toFixed(2));
    const revenue = ergPerDay * price;
    const net = revenue - costPerDay;
    revenues.push(+revenue.toFixed(4));
    netProfits.push(+net.toFixed(4));
    costs.push(+costPerDay.toFixed(4));
  }

  const ctx = document.getElementById('profitChart').getContext('2d');

  if (profitChart) profitChart.destroy();

  profitChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Net Profit/Day ($)',
          data: netProfits,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.07)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Gross Revenue/Day ($)',
          data: revenues,
          borderColor: '#f7931a',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
          borderDash: [5, 5],
        },
        {
          label: 'Power Cost/Day ($)',
          data: costs,
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0,
          pointRadius: 0,
          borderWidth: 1,
          borderDash: [3, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: '#1a2235',
          borderColor: '#1e3050',
          borderWidth: 1,
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(4)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#64748b',
            maxTicksLimit: 8,
            font: { size: 10 },
          },
          grid: { color: 'rgba(255,255,255,0.03)' },
        },
        y: {
          ticks: {
            color: '#64748b',
            font: { size: 10 },
            callback: v => '$' + v.toFixed(2),
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
    },
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.getElementById('calcBtn').addEventListener('click', calculate);

// Allow Enter key to trigger calculation
document.querySelectorAll('input').forEach(inp => {
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') calculate();
  });
});

loadNetworkData().then(() => {
  // Auto-calculate once data is loaded if user hasn't interacted
  // Don't auto-calc — let user click after reviewing their inputs
});
