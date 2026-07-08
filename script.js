/* ══════════════════════════════════════════
   HELPERS UMUM
   ══════════════════════════════════════════ */
function v(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat(el.value) || 0;
}
function fmt(n, dec = 0) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("id-ID", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtRp(n) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return "Rp " + fmt(n, 0);
}
// n dalam satuan "Rp juta" -> tampil otomatis ke Juta/Miliar/Triliun
function fmtBesar(nJuta) {
  if (!isFinite(nJuta) || isNaN(nJuta)) return "—";
  const abs = Math.abs(nJuta);
  const sign = nJuta < 0 ? "-" : "";
  if (abs >= 1e6) return "Rp " + sign + fmt(abs / 1e6, 2) + " T";
  if (abs >= 1e3) return "Rp " + sign + fmt(abs / 1e3, 2) + " M";
  return "Rp " + sign + fmt(abs, 0) + " jt";
}
function pct(n, dec = 1) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return fmt(n, dec) + "%";
}

/* ══════════════════════════════════════════
   FORMAT RIBUAN OTOMATIS (Rp gaya Indonesia)
   Contoh: ketik 24000000,23 -> tampil 24.000.000,23
   ══════════════════════════════════════════ */

// Ubah string terformat ("24.000.000,23") -> angka murni (24000000.23)
function parseFormatted(str) {
  if (str === null || str === undefined || str === "") return null;
  const clean = str.toString().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// Format angka murni -> string gaya Indonesia (dipakai saat render awal, bukan saat mengetik)
function formatStatic(n) {
  if (n === null || n === undefined || isNaN(n)) return "";
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

// Format LIVE saat user mengetik, sambil menjaga posisi kursor
function formatNumberLive(e) {
  const input = e.target;
  const cursorPos = input.selectionStart;
  const rawBefore = input.value;
  const digitsBeforeCursor = rawBefore.substring(0, cursorPos).replace(/[^0-9]/g, "").length;

  // hanya izinkan digit dan satu koma desimal
  let raw = rawBefore.replace(/[^0-9,]/g, "");
  const firstComma = raw.indexOf(",");
  if (firstComma !== -1) {
    raw = raw.substring(0, firstComma + 1) + raw.substring(firstComma + 1).replace(/,/g, "");
  }

  let [intPart, decPart] = raw.split(",");
  intPart = intPart.replace(/^0+(?=\d)/, "");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatted = formattedInt + (decPart !== undefined ? "," + decPart : raw.endsWith(",") ? "," : "");

  input.value = formatted;

  // kembalikan posisi kursor berdasarkan jumlah digit sebelum posisi semula
  let pos = 0, digitCount = 0;
  while (pos < formatted.length && digitCount < digitsBeforeCursor) {
    if (/[0-9]/.test(formatted[pos])) digitCount++;
    pos++;
  }
  input.setSelectionRange(pos, pos);
}

// Ambil nilai numerik dari input yang pakai format ribuan (fmt-number)
function vf(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const n = parseFormatted(el.value);
  return n === null ? 0 : n;
}
function clamp(n, min, max) {
  if (isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}
function average(arr) {
  const clean = arr.filter((x) => x !== null && x !== undefined && isFinite(x));
  if (clean.length === 0) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}
function tierMin(val, table, elseVal) {
  // table: [[minValue, poin], ...] terurut menurun berdasarkan minValue
  if (val === null || val === undefined || isNaN(val)) return elseVal;
  for (const [min, pts] of table) if (val >= min) return pts;
  return table[table.length - 1][1];
}
function tierMax(val, table, elseVal) {
  // table: [[maxValue, poin], ...] terurut menaik berdasarkan maxValue (semakin kecil semakin baik)
  if (val === null || val === undefined || isNaN(val)) return elseVal;
  for (const [max, pts] of table) if (val <= max) return pts;
  return table[table.length - 1][1];
}

/* ══════════════════════════════════════════
   TAB SWITCHER
   ══════════════════════════════════════════ */
function showTab(name) {
  ["fv", "pl", "avg"].forEach((t) => {
    document.getElementById("tab-" + t).classList.toggle("active", t === name);
    document.getElementById("tabBtn-" + t).classList.toggle("active", t === name);
  });
}

/* ══════════════════════════════════════════
   TAB 1 — STATE DATA KEUANGAN TAHUNAN
   ══════════════════════════════════════════ */
const FIELDS = [
  { key: "revenue", label: "Revenue / Penjualan", group: "Laporan Laba Rugi", ph: "Contoh: 75000" },
  { key: "opProfit", label: "Laba Operasi (EBIT)", group: "Laporan Laba Rugi", ph: "Contoh: 22000" },
  { key: "netIncome", label: "Laba Bersih (Net Income)", group: "Laporan Laba Rugi", ph: "Contoh: 18000" },
  { key: "assets", label: "Total Aset", group: "Laporan Posisi Keuangan", ph: "Contoh: 210000" },
  { key: "liabilities", label: "Total Liabilitas", group: "Laporan Posisi Keuangan", ph: "Contoh: 60000" },
  { key: "equity", label: "Total Ekuitas", group: "Laporan Posisi Keuangan", ph: "Contoh: 150000" },
  { key: "currentAssets", label: "Aset Lancar", group: "Laporan Posisi Keuangan", ph: "Contoh: 40000" },
  { key: "currentLiabilities", label: "Liabilitas Lancar", group: "Laporan Posisi Keuangan", ph: "Contoh: 15000" },
  { key: "ocf", label: "Arus Kas Operasi (CFO)", group: "Laporan Arus Kas", ph: "Contoh: 20000" },
  { key: "capex", label: "CapEx (Belanja Modal)", group: "Laporan Arus Kas", ph: "Contoh: 6000" },
];

let yearCount = 3;
let yearLabels = ["Tahun-2", "Tahun-1", "Tahun Ini"];
let finData = {};
FIELDS.forEach((f) => (finData[f.key] = new Array(3).fill(null)));

function renderFinTable() {
  const table = document.getElementById("finTable");
  let head = `<thead><tr><th>Data (satuan sama semua tahun, sarankan Rp juta)</th>`;
  for (let i = 0; i < yearCount; i++) {
    head += `<th class="year-col"><input class="year-label-input" value="${yearLabels[i]}" oninput="updateYearLabel(${i}, this.value)" /></th>`;
  }
  head += `</tr></thead>`;

  let body = "<tbody>";
  let lastGroup = null;
  FIELDS.forEach((f) => {
    if (f.group !== lastGroup) {
      body += `<tr><th class="fin-section-label" colspan="${yearCount + 1}">${f.group}</th></tr>`;
      lastGroup = f.group;
    }
    body += `<tr><th>${f.label}</th>`;
    for (let i = 0; i < yearCount; i++) {
      const val = finData[f.key][i];
      body += `<td><input type="text" inputmode="decimal" class="fin-cell-input fmt-number" placeholder="${f.ph}" value="${formatStatic(val)}" oninput="handleFinCellInput(event, '${f.key}', ${i})" /></td>`;
    }
    body += `</tr>`;
  });
  body += "</tbody>";

  table.innerHTML = head + body;

  document.getElementById("btnAddYear").disabled = yearCount >= 5;
  document.getElementById("btnRemoveYear").disabled = yearCount <= 3;
  document.getElementById("yearCountLabel").textContent = `${yearCount} tahun data (minimal 3, maksimal 5)`;
}

function updateYearLabel(i, val) {
  yearLabels[i] = val;
}
function updateCell(key, i, val) {
  finData[key][i] = parseFormatted(val);
}
// Dipanggil dari sel tabel data keuangan: format tampilan live + simpan nilai aslinya
function handleFinCellInput(e, key, i) {
  formatNumberLive(e);
  updateCell(key, i, e.target.value);
}

function addYear() {
  if (yearCount >= 5) return;
  yearLabels.push("Tahun+" + yearCount);
  FIELDS.forEach((f) => finData[f.key].push(null));
  yearCount++;
  renderFinTable();
}
function removeYear() {
  if (yearCount <= 3) return;
  yearLabels.pop();
  FIELDS.forEach((f) => finData[f.key].pop());
  yearCount--;
  renderFinTable();
}

function resetForm() {
  ["emiten", "hargaSaatIni", "sharesOut", "discountRate", "terminalGrowth", "mosBuffer"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  yearCount = 3;
  yearLabels = ["Tahun-2", "Tahun-1", "Tahun Ini"];
  finData = {};
  FIELDS.forEach((f) => (finData[f.key] = new Array(3).fill(null)));
  renderFinTable();
  document.getElementById("results").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ══════════════════════════════════════════
   GLOSSARY (statis)
   ══════════════════════════════════════════ */
function renderGlossary() {
  const items = [
    ["Harga Wajar Akhir", "Rata-rata tertimbang (weighted average) dari 5 metode: DCF 30%, PER 25%, PBV 20%, Graham 15%, PEG 10%. Menggabungkan sudut pandang arus kas, earning, aset, dan growth."],
    ["Discount", "Seberapa 'murah' harga saat ini dibanding harga wajar. Rumus: (Harga Wajar − Harga) ÷ Harga Wajar."],
    ["Upside Potential", "Potensi kenaikan harga jika saham mencapai harga wajar. Rumus: (Harga Wajar − Harga) ÷ Harga saat ini."],
    ["Margin of Safety (Harga Beli Ideal)", "Harga ideal untuk entry menurut prinsip Benjamin Graham: Harga Wajar dikurangi buffer risiko (default 30%)."],
    ["Status Undervalued / Wajar / Overvalued", "Undervalued: harga ≤ 90% harga wajar. Wajar: harga di kisaran 90–110% harga wajar. Overvalued: harga ≥ 110% harga wajar."],
    ["Target PER & Current PER", "Current PER = Harga ÷ EPS tahun terakhir. Target PER dihitung dari kombinasi ROE, growth, dan margin rata-rata historis. Harga Wajar (PER) = EPS × Target PER."],
    ["Target PBV & Current PBV", "Current PBV = Harga ÷ BVPS tahun terakhir. Target PBV pakai rumus Justified P/BV = (ROE − g) ÷ (Ke − g), g = estimasi growth, Ke = discount rate."],
    ["DCF (Discounted Cash Flow)", "Memproyeksikan Free Cash Flow 5 tahun ke depan dari data historis, lalu didiskon ke nilai sekarang + nilai terminal. Paling mendekati 'nilai intrinsik' namun paling sensitif terhadap asumsi."],
    ["Graham Number", "√(22.5 × EPS × BVPS) — formula klasik Benjamin Graham, konservatif dan tidak bergantung asumsi growth. Cocok sebagai batas bawah kewajaran harga."],
    ["PEG Ratio", "Fair value dihitung dengan asumsi PEG = 1, artinya Target PER = growth (%) itu sendiri. Cocok untuk saham growth."],
    ["Profitability Score", "Skor 0–100 dari rata-rata historis ROE, ROA, Net Profit Margin, dan Operating Margin."],
    ["Growth Score", "Skor 0–100 dari pertumbuhan (CAGR/YoY) Revenue, Laba Bersih, dan Free Cash Flow."],
    ["Financial Health Score", "Skor 0–100 dari Current Ratio, Debt to Equity Ratio (DER), dan Debt Ratio tahun terakhir."],
    ["Cash Flow Score", "Skor 0–100 dari konsistensi FCF positif, FCF Margin, dan pertumbuhan FCF."],
    ["Valuation Score", "Skor 0–100 dari Discount (40 poin), Upside (30 poin), dan posisi harga terhadap Margin of Safety (30 poin)."],
    ["Overall Score", "Gabungan akhir: 25% Profitability + 20% Growth + 20% Financial Health + 15% Cash Flow + 20% Valuation. Bisnis bagus lebih diprioritaskan daripada sekadar murah, karena bisnis buruk yang murah bisa jadi 'value trap'."],
  ];
  document.getElementById("glossaryList").innerHTML = items
    .map(([t, d]) => `<div class="glossary-item"><dt>${t}</dt><dd>${d}</dd></div>`)
    .join("");
}

/* ══════════════════════════════════════════
   CHART INSTANCES
   ══════════════════════════════════════════ */
let chartTrend, chartMargin, chartMethods, chartRadar;
const CHART_GREEN = "#16a34a";
const CHART_GREEN2 = "#4ade80";
const CHART_GREEN3 = "#166534";
const CHART_RED = "#ef4444";
const CHART_GRAY = "#9ca3af";

function destroyCharts() {
  [chartTrend, chartMargin, chartMethods, chartRadar].forEach((c) => c && c.destroy());
}

/* ══════════════════════════════════════════
   KALKULASI UTAMA
   ══════════════════════════════════════════ */
const WEIGHTS = { dcf: 0.3, per: 0.25, pbv: 0.2, graham: 0.15, peg: 0.1 };

function calculate() {
  const emiten = document.getElementById("emiten").value || "Emiten";
  const price = vf("hargaSaatIni");
  const sharesOut = vf("sharesOut");
  const discRate = v("discountRate") / 100 || 0.12;
  const termGrowthInput = v("terminalGrowth");
  const termGrowth = termGrowthInput > 0 ? termGrowthInput / 100 : 0.03;
  const mosBufferInput = v("mosBuffer");
  const mosBufferPct = mosBufferInput > 0 ? mosBufferInput : 30;

  const n = yearCount;
  const last = n - 1;
  const d = finData;

  // ── Rasio per tahun ──
  const roe = [], roa = [], opMargin = [], npm = [], currentRatio = [], der = [], debtRatio = [],
    fcf = [], fcfMargin = [], eps = [], bvps = [];
  for (let i = 0; i < n; i++) {
    const rev = d.revenue[i], op = d.opProfit[i], ni = d.netIncome[i], as = d.assets[i],
      li = d.liabilities[i], eq = d.equity[i], ca = d.currentAssets[i], cl = d.currentLiabilities[i],
      ocf = d.ocf[i], capex = d.capex[i];
    roe.push(eq ? (ni / eq) * 100 : null);
    roa.push(as ? (ni / as) * 100 : null);
    opMargin.push(rev ? (op / rev) * 100 : null);
    npm.push(rev ? (ni / rev) * 100 : null);
    currentRatio.push(cl ? ca / cl : null);
    der.push(eq ? li / eq : null);
    debtRatio.push(as ? (li / as) * 100 : null);
    const fcfVal = (ocf || 0) - (capex || 0);
    fcf.push(fcfVal);
    fcfMargin.push(rev ? (fcfVal / rev) * 100 : null);
    eps.push(sharesOut ? ni / sharesOut : null);
    bvps.push(sharesOut ? eq / sharesOut : null);
  }

  // ── Growth YoY & CAGR ──
  function growthSeries(arr) {
    const g = [null];
    for (let i = 1; i < n; i++) {
      g.push(arr[i - 1] ? ((arr[i] - arr[i - 1]) / Math.abs(arr[i - 1])) * 100 : null);
    }
    return g;
  }
  function cagr(arr) {
    const first = arr[0], lastVal = arr[last];
    if (first > 0 && lastVal > 0 && last > 0) return (Math.pow(lastVal / first, 1 / last) - 1) * 100;
    return null;
  }
  const revGrowth = growthSeries(d.revenue);
  const opGrowth = growthSeries(d.opProfit);
  const niGrowth = growthSeries(d.netIncome);
  const fcfGrowth = growthSeries(fcf);
  const revCAGR = cagr(d.revenue);
  const niCAGR = cagr(d.netIncome);
  const fcfCAGR = fcf[0] !== 0 ? cagr(fcf) : null;

  // ── Rata-rata untuk valuasi & skor ──
  const avgROE = average(roe);
  const avgROA = average(roa);
  const avgOPM = average(opMargin);
  const avgNPM = average(npm);
  const avgRevGrowth = average(revGrowth);
  const avgNIGrowth = average(niGrowth);
  const avgFCFGrowth = average(fcfGrowth);
  const avgFCFMargin = average(fcfMargin);

  const growthForVal = niCAGR !== null ? niCAGR : avgNIGrowth !== null ? avgNIGrowth : 0;
  const revGrowthQuality = revCAGR !== null ? revCAGR : avgRevGrowth !== null ? avgRevGrowth : 0;

  const curCurrentRatio = currentRatio[last];
  const curDER = der[last];
  const curDebtRatio = debtRatio[last];
  const latestEPS = eps[last] || 0;
  const latestBVPS = bvps[last] || 0;

  // ── Current Valuation ──
  const currentPER = latestEPS > 0 ? price / latestEPS : null;
  const currentPBV = latestBVPS > 0 ? price / latestBVPS : null;

  // ── 1. Target PER & Harga Wajar PER ──
  const qualityPER = (avgROE || 0) * 0.4 + clamp(growthForVal, 0, 40) * 0.35 + (avgNPM || 0) * 0.25;
  const targetPER = clamp(8 + qualityPER * 0.32, 6, 30);
  const fvPER = latestEPS > 0 ? latestEPS * targetPER : 0;

  // ── 2. Target PBV (Justified P/BV) & Harga Wajar PBV ──
  const gSustainable = clamp(growthForVal, 0, 30) / 100;
  const ke = discRate;
  let targetPBV;
  if (ke - gSustainable > 0.005) {
    targetPBV = clamp(((avgROE || 0) / 100 - gSustainable) / (ke - gSustainable), 0.5, 6);
  } else {
    targetPBV = 3;
  }
  const fvPBV = latestBVPS > 0 ? latestBVPS * targetPBV : 0;

  // ── 3. Graham Number ──
  let fvGraham = 0;
  if (latestEPS > 0 && latestBVPS > 0) {
    fvGraham = Math.sqrt(22.5 * latestEPS * latestBVPS);
  } else if (latestEPS > 0) {
    fvGraham = latestEPS * (8.5 + 2 * clamp(growthForVal, 0, 20));
  }

  // ── 4. PEG (PEG = 1) ──
  const normalizedGrowth = clamp(growthForVal, 5, 30);
  const fvPEG = latestEPS > 0 ? latestEPS * normalizedGrowth : 0;

  // ── 5. DCF ──
  const dcfGrowth = clamp(growthForVal, 5, 15) / 100;
  let totalPV = 0;
  let fcfCurr = fcf[last] || 0;
  for (let i = 1; i <= 5; i++) {
    fcfCurr *= 1 + dcfGrowth;
    totalPV += fcfCurr / Math.pow(1 + discRate, i);
  }
  const tv = (fcfCurr * (1 + termGrowth)) / (discRate - termGrowth);
  const pvTV = tv / Math.pow(1 + discRate, 5);
  const intrinsicVal = totalPV + pvTV;
  const fvDCF = sharesOut > 0 ? intrinsicVal / sharesOut : 0;

  // ── Harga Wajar Akhir ──
  const fvFinal = fvDCF * WEIGHTS.dcf + fvPER * WEIGHTS.per + fvPBV * WEIGHTS.pbv + fvGraham * WEIGHTS.graham + fvPEG * WEIGHTS.peg;

  const discount = fvFinal > 0 ? ((fvFinal - price) / fvFinal) * 100 : 0;
  const upside = price > 0 ? ((fvFinal - price) / price) * 100 : 0;
  const buyPrice = fvFinal * (1 - mosBufferPct / 100);

  let status, statusClass;
  if (price > 0 && price <= fvFinal * 0.9) { status = "Undervalued (Murah)"; statusClass = "status-under"; }
  else if (price > 0 && price >= fvFinal * 1.1) { status = "Overvalued (Mahal)"; statusClass = "status-over"; }
  else { status = "Wajar (Fairly Valued)"; statusClass = "status-fair"; }

  /* ── SCORE: Profitability ── */
  const scoreROE = tierMin(avgROE, [[20, 40], [15, 32], [10, 22], [5, 12]], 4);
  const scoreROA = tierMin(avgROA, [[10, 25], [7, 18], [5, 12], [2, 6]], 2);
  const scoreNPM = tierMin(avgNPM, [[20, 20], [15, 14], [10, 9], [5, 4]], 1);
  const scoreOPM = tierMin(avgOPM, [[20, 15], [15, 10], [10, 6], [5, 3]], 1);
  const profitScore = scoreROE + scoreROA + scoreNPM + scoreOPM;

  /* ── SCORE: Growth ── */
  const scoreRevG = tierMin(revGrowthQuality, [[20, 35], [15, 28], [10, 20], [5, 12], [0, 5]], 0);
  const scoreNIG = tierMin(growthForVal, [[20, 40], [15, 32], [10, 23], [5, 14], [0, 6]], 0);
  const scoreFCFG = tierMin(fcfCAGR !== null ? fcfCAGR : avgFCFGrowth, [[15, 25], [10, 18], [5, 12], [0, 6]], 0);
  const growthScore = scoreRevG + scoreNIG + scoreFCFG;

  /* ── SCORE: Financial Health ── */
  const scoreCR = tierMin(curCurrentRatio, [[2, 35], [1.5, 25], [1, 15]], 5);
  const scoreDER = tierMax(curDER, [[0.5, 35], [1, 25], [1.5, 15], [2, 8]], 2);
  const scoreDebtRatio = tierMax(curDebtRatio, [[30, 30], [50, 22], [70, 12]], 4);
  const finHealthScore = scoreCR + scoreDER + scoreDebtRatio;

  /* ── SCORE: Cash Flow ── */
  const fcfPositiveCount = fcf.filter((x) => x > 0).length;
  const scoreFCFPositive = n > 0 ? (fcfPositiveCount / n) * 40 : 0;
  const scoreFCFMargin = tierMin(avgFCFMargin, [[15, 30], [10, 22], [5, 14], [0, 6]], 0);
  const scoreFCFGrowth2 = tierMin(avgFCFGrowth, [[10, 30], [5, 20], [0, 10]], 0);
  const cashFlowScore = scoreFCFPositive + scoreFCFMargin + scoreFCFGrowth2;

  /* ── SCORE: Valuation ── */
  let discScore = 0;
  if (discount >= 40) discScore = 40; else if (discount >= 30) discScore = 32; else if (discount >= 20) discScore = 24;
  else if (discount >= 10) discScore = 16; else if (discount >= 0) discScore = 8; else discScore = 0;
  let upsideScore = 0;
  if (upside >= 50) upsideScore = 30; else if (upside >= 35) upsideScore = 24; else if (upside >= 20) upsideScore = 18;
  else if (upside >= 10) upsideScore = 12; else if (upside >= 0) upsideScore = 6; else upsideScore = 0;
  let mosScore = price > 0 && price <= buyPrice ? 30 : price > 0 && price <= buyPrice * 1.1 ? 20 : price > 0 && price <= buyPrice * 1.2 ? 10 : 0;
  const valScore = discScore + upsideScore + mosScore;

  /* ── OVERALL SCORE ── */
  const overallScore = profitScore * 0.25 + growthScore * 0.2 + finHealthScore * 0.2 + cashFlowScore * 0.15 + valScore * 0.2;

  let recoClass, recoLabel, recoSub;
  if (overallScore >= 90) { recoClass = "reco-sangat-bagus"; recoLabel = "🚀 Sangat Bagus Dibeli"; recoSub = "Bisnis sangat fundamental dengan valuasi sangat menarik."; }
  else if (overallScore >= 80) { recoClass = "reco-bagus"; recoLabel = "✅ Bagus Dibeli"; recoSub = "Fundamental solid dengan valuasi yang wajar untuk entry."; }
  else if (overallScore >= 70) { recoClass = "reco-pantau"; recoLabel = "👀 Layak Dipantau"; recoSub = "Potensi ada, namun tunggu momentum entry yang lebih baik."; }
  else if (overallScore >= 60) { recoClass = "reco-hati"; recoLabel = "⏳ Jangan Buru-buru, Pantau"; recoSub = "Fundamental atau valuasi perlu perhatian lebih sebelum masuk."; }
  else if (overallScore >= 50) { recoClass = "reco-hindari"; recoLabel = "⚠️ Hindari Membeli Saat Ini"; recoSub = "Risiko lebih tinggi dari potensi return pada harga saat ini."; }
  else { recoClass = "reco-sangat-hindari"; recoLabel = "🚫 Sangat Hindari"; recoSub = "Fundamental lemah dan/atau valuasi sangat mahal saat ini."; }

  /* ══════════════ RENDER ══════════════ */
  document.getElementById("results").style.display = "block";

  const banner = document.getElementById("recoBanner");
  banner.className = "reco-banner " + recoClass;
  document.getElementById("recoScore").textContent = fmt(overallScore, 1);
  document.getElementById("recoLabel").textContent = recoLabel;
  document.getElementById("recoSub").textContent = `${emiten.toUpperCase()} — Overall Score ${fmt(overallScore, 1)} / 100`;
  document.getElementById("statusBadge").innerHTML = `<span class="status-badge-lg ${statusClass}">${status}</span>`;

  document.getElementById("summaryEmiten").textContent = `${emiten.toUpperCase()} — Harga Saat Ini: ${fmtRp(price)}`;
  const metrics = [
    { label: "Harga Wajar (Estimasi)", val: fmtRp(fvFinal), sub: "Rata-rata tertimbang 5 metode (DCF 30% • PER 25% • PBV 20% • Graham 15% • PEG 10%)", hi: true },
    { label: "Harga Saat Ini", val: fmtRp(price), sub: "Harga pasar saat ini (input kamu)" },
    { label: "Discount", val: pct(discount), sub: "Seberapa murah harga vs harga wajar" },
    { label: "Upside Potential", val: pct(upside), sub: "Potensi kenaikan jika harga capai harga wajar" },
    { label: "Margin of Safety (Harga Beli Ideal)", val: fmtRp(buyPrice), sub: `Harga wajar − buffer risiko ${fmt(mosBufferPct,0)}%` },
    { label: "Current PER / Target PER", val: `${currentPER !== null ? fmt(currentPER, 1) + "x" : "—"} / ${fmt(targetPER, 1)}x`, sub: "PER saat ini dibanding PER wajar hasil model" },
    { label: "Current PBV / Target PBV", val: `${currentPBV !== null ? fmt(currentPBV, 1) + "x" : "—"} / ${fmt(targetPBV, 1)}x`, sub: "Justified P/BV = (ROE−g) ÷ (Ke−g)" },
    { label: "EPS / BVPS Terbaru", val: `${fmtRp(latestEPS)} / ${fmtRp(latestBVPS)}`, sub: "Laba per saham & nilai buku per saham tahun terakhir" },
  ];
  document.getElementById("summaryMetrics").innerHTML = metrics
    .map((m) => `<div class="metric-card${m.hi ? " highlight" : ""}"><div class="metric-label">${m.label}</div><div class="metric-val">${m.val}</div><div class="metric-sub">${m.sub}</div></div>`)
    .join("");

  // Method Table
  const methods = [
    { name: "DCF", fv: fvDCF, w: WEIGHTS.dcf },
    { name: "PER", fv: fvPER, w: WEIGHTS.per },
    { name: "PBV (Justified)", fv: fvPBV, w: WEIGHTS.pbv },
    { name: "Graham Number", fv: fvGraham, w: WEIGHTS.graham },
    { name: "PEG (PEG=1)", fv: fvPEG, w: WEIGHTS.peg },
  ];
  document.getElementById("methodTableBody").innerHTML =
    methods.map((m) => {
      const diff = price > 0 ? ((m.fv - price) / price) * 100 : 0;
      const sign = diff >= 0 ? "+" : "";
      const diffColor = diff >= 0 ? "color:#15803d" : "color:#dc2626";
      return `<tr><td><span class="method-name">${m.name}</span></td><td><strong>${fmtRp(m.fv)}</strong></td><td><span class="method-weight">${m.w * 100}%</span></td><td>${fmtRp(m.fv * m.w)}</td><td style="${diffColor};font-weight:600;">${sign}${pct(diff)}</td></tr>`;
    }).join("") +
    `<tr style="background:var(--green-50);"><td colspan="3"><strong>Harga Wajar Akhir</strong></td><td colspan="2"><strong style="color:var(--green-700);font-size:1rem;">${fmtRp(fvFinal)}</strong></td></tr>`;

  // Score Display
  document.getElementById("scoreDisplay").innerHTML = `
    <div class="score-grid-5">
      <div class="score-mini-card"><div class="smc-label"><span>Profitability</span><span>${fmt(profitScore,0)}/100</span></div><div class="score-bar-bg"><div class="score-bar-fill" style="width:${profitScore}%"></div></div></div>
      <div class="score-mini-card"><div class="smc-label"><span>Growth</span><span>${fmt(growthScore,0)}/100</span></div><div class="score-bar-bg"><div class="score-bar-fill" style="width:${growthScore}%"></div></div></div>
      <div class="score-mini-card"><div class="smc-label"><span>Financial Health</span><span>${fmt(finHealthScore,0)}/100</span></div><div class="score-bar-bg"><div class="score-bar-fill" style="width:${finHealthScore}%"></div></div></div>
      <div class="score-mini-card"><div class="smc-label"><span>Cash Flow</span><span>${fmt(cashFlowScore,0)}/100</span></div><div class="score-bar-bg"><div class="score-bar-fill" style="width:${cashFlowScore}%"></div></div></div>
      <div class="score-mini-card"><div class="smc-label"><span>Valuation</span><span>${fmt(valScore,0)}/100</span></div><div class="score-bar-bg"><div class="score-bar-fill" style="width:${valScore}%"></div></div></div>
    </div>
    <div class="score-section" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--green-100);">
      <div class="score-header">
        <span class="score-name" style="font-size:0.9rem;font-weight:700;color:var(--green-800)">Overall Score (25% Profit + 20% Growth + 20% Fin. Health + 15% Cash Flow + 20% Valuation)</span>
        <span class="score-num" style="font-size:1.1rem;color:var(--green-700)">${fmt(overallScore, 1)} / 100</span>
      </div>
      <div class="score-bar-bg" style="height:14px;"><div class="score-bar-fill" style="width:${overallScore}%"></div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-top:20px;">
      ${[["≥ 90", "Sangat Bagus Dibeli", overallScore >= 90], ["80–89", "Bagus Dibeli", overallScore >= 80 && overallScore < 90],
        ["70–79", "Layak Dipantau", overallScore >= 70 && overallScore < 80], ["60–69", "Jangan Buru-buru", overallScore >= 60 && overallScore < 70],
        ["50–59", "Hindari", overallScore >= 50 && overallScore < 60], ["< 50", "Sangat Hindari", overallScore < 50]]
        .map(([range, label, active]) => `<div style="padding:10px 12px;border-radius:8px;border:2px solid ${active ? "var(--green-500)" : "var(--gray-200)"};background:${active ? "var(--green-50)" : "white"};"><div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${active ? "var(--green-700)" : "var(--gray-400)"};">${range}</div><div style="font-size:0.82rem;font-weight:600;color:${active ? "var(--green-800)" : "var(--gray-500)"};margin-top:3px;">${label}</div></div>`)
        .join("")}
    </div>`;

  // Ratio Table per Tahun
  const ratioRows = [
    ["ROE (%)", roe], ["ROA (%)", roa], ["Operating Margin (%)", opMargin], ["Net Profit Margin (%)", npm],
    ["Revenue Growth YoY (%)", revGrowth], ["Laba Operasi Growth YoY (%)", opGrowth], ["Laba Bersih Growth YoY (%)", niGrowth],
    ["Current Ratio (x)", currentRatio], ["DER (x)", der], ["Debt Ratio (%)", debtRatio],
    ["Free Cash Flow", fcf.map((x) => x)], ["FCF Margin (%)", fcfMargin], ["FCF Growth YoY (%)", fcfGrowth],
    ["EPS (Rp)", eps], ["BVPS (Rp)", bvps],
  ];
  let ratioHead = `<thead><tr><th>Rasio</th>${yearLabels.map((l) => `<th>${l}</th>`).join("")}</tr></thead>`;
  let ratioBody = "<tbody>" + ratioRows.map(([label, arr]) => {
    const isRp = label.includes("(Rp)") || label === "Free Cash Flow";
    return `<tr><td><strong>${label}</strong></td>${arr.map((x) => `<td>${x === null || x === undefined ? "—" : isRp ? (label === "Free Cash Flow" ? fmtBesar(x) : fmtRp(x)) : fmt(x, 1)}</td>`).join("")}</tr>`;
  }).join("") + "</tbody>";
  document.getElementById("ratioTable").innerHTML = ratioHead + ratioBody;

  /* ── CHARTS ── */
  destroyCharts();

  chartTrend = new Chart(document.getElementById("chartTrend"), {
    type: "line",
    data: {
      labels: yearLabels,
      datasets: [
        { label: "Revenue", data: d.revenue, borderColor: CHART_GREEN, backgroundColor: CHART_GREEN, tension: 0.3 },
        { label: "Laba Operasi", data: d.opProfit, borderColor: CHART_GREEN2, backgroundColor: CHART_GREEN2, tension: 0.3 },
        { label: "Laba Bersih", data: d.netIncome, borderColor: CHART_GREEN3, backgroundColor: CHART_GREEN3, tension: 0.3 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { ticks: { callback: (val) => fmtBesar(val) } } } },
  });

  chartMargin = new Chart(document.getElementById("chartMargin"), {
    type: "line",
    data: {
      labels: yearLabels,
      datasets: [
        { label: "ROE (%)", data: roe, borderColor: CHART_GREEN, backgroundColor: CHART_GREEN, tension: 0.3 },
        { label: "ROA (%)", data: roa, borderColor: "#facc15", backgroundColor: "#facc15", tension: 0.3 },
        { label: "NPM (%)", data: npm, borderColor: "#0ea5e9", backgroundColor: "#0ea5e9", tension: 0.3 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { ticks: { callback: (val) => val + "%" } } } },
  });

  const methodLabels = ["DCF", "PER", "PBV", "Graham", "PEG", "Harga Saat Ini"];
  const methodVals = [fvDCF, fvPER, fvPBV, fvGraham, fvPEG, price];
  chartMethods = new Chart(document.getElementById("chartMethods"), {
    type: "bar",
    data: {
      labels: methodLabels,
      datasets: [{
        label: "Rp per saham",
        data: methodVals,
        backgroundColor: methodVals.map((val, i) => (i === 5 ? CHART_GRAY : val >= price ? CHART_GREEN : CHART_RED)),
      }],
    },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: (val) => fmtRp(val) } } } },
  });

  chartRadar = new Chart(document.getElementById("chartRadar"), {
    type: "radar",
    data: {
      labels: ["Profitability", "Growth", "Financial Health", "Cash Flow", "Valuation"],
      datasets: [{
        label: "Skor",
        data: [profitScore, growthScore, finHealthScore, cashFlowScore, valScore],
        borderColor: CHART_GREEN, backgroundColor: "rgba(34,197,94,0.25)", pointBackgroundColor: CHART_GREEN,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } } },
  });

  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ══════════════════════════════════════════
   TAB 2 — KALKULATOR UNTUNG / RUGI
   ══════════════════════════════════════════ */
function resetPL() {
  ["plHargaBeli", "plLot", "plHargaJual", "plFeeBeli", "plFeeJual"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("plResults").style.display = "none";
}

function calculatePL() {
  const hargaBeli = vf("plHargaBeli");
  const lot = v("plLot");
  const hargaJual = vf("plHargaJual");
  const feeBeliPct = v("plFeeBeli") > 0 ? v("plFeeBeli") : 0.15;
  const feeJualPct = v("plFeeJual") > 0 ? v("plFeeJual") : 0.25;

  const lembar = lot * 100;
  const modalKotor = hargaBeli * lembar;
  const biayaBeli = modalKotor * (feeBeliPct / 100);
  const modalBersih = modalKotor + biayaBeli;

  const nilaiJualKotor = hargaJual * lembar;
  const biayaJual = nilaiJualKotor * (feeJualPct / 100);
  const nilaiJualBersih = nilaiJualKotor - biayaJual;

  const untungRugiRp = nilaiJualBersih - modalBersih;
  const untungRugiPct = modalBersih > 0 ? (untungRugiRp / modalBersih) * 100 : 0;

  document.getElementById("plResults").style.display = "block";
  const banner = document.getElementById("plBanner");
  const isUntung = untungRugiRp >= 0;
  banner.className = "pl-banner " + (isUntung ? "pl-untung" : "pl-rugi");
  document.getElementById("plPct").textContent = (isUntung ? "+" : "") + pct(untungRugiPct);
  document.getElementById("plLabel").textContent = isUntung ? `🚀 Untung ${fmtRp(Math.abs(untungRugiRp))}` : `📉 Rugi ${fmtRp(Math.abs(untungRugiRp))}`;

  const metrics = [
    { label: "Total Lembar Saham", val: fmt(lembar) + " lembar" },
    { label: "Modal Awal (Bersih)", val: fmtRp(modalBersih), sub: `Termasuk fee beli ${fmt(feeBeliPct, 2)}%` },
    { label: "Nilai Jual (Bersih)", val: fmtRp(nilaiJualBersih), sub: `Setelah fee jual ${fmt(feeJualPct, 2)}%` },
    { label: isUntung ? "Total Untung" : "Total Rugi", val: fmtRp(Math.abs(untungRugiRp)), sub: isUntung ? "Selisih nilai jual − modal" : "Selisih modal − nilai jual", hi: true },
    { label: "Persentase", val: (isUntung ? "+" : "") + pct(untungRugiPct), sub: "Terhadap modal bersih" },
    { label: "Biaya Transaksi Total", val: fmtRp(biayaBeli + biayaJual), sub: "Fee beli + fee jual" },
  ];
  document.getElementById("plMetrics").innerHTML = metrics
    .map((m) => `<div class="metric-card${m.hi ? " highlight" : ""}"><div class="metric-label">${m.label}</div><div class="metric-val">${m.val}</div><div class="metric-sub">${m.sub || ""}</div></div>`)
    .join("");

  document.getElementById("plResults").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ══════════════════════════════════════════
   TAB 3 — KALKULATOR AVERAGE
   ══════════════════════════════════════════ */
function resetAverage() {
  ["avgLotLama", "avgHargaLama", "avgLotBaru", "avgHargaBaru"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("avgResults").style.display = "none";
}

function calculateAverage() {
  const lotLama = v("avgLotLama");
  const hargaLama = vf("avgHargaLama");
  const lotBaru = v("avgLotBaru");
  const hargaBaru = vf("avgHargaBaru");

  const modalLama = lotLama * 100 * hargaLama;
  const modalBaru = lotBaru * 100 * hargaBaru;
  const totalLot = lotLama + lotBaru;
  const totalModal = modalLama + modalBaru;
  const avgBaru = totalLot > 0 ? totalModal / (totalLot * 100) : 0;
  const perubahan = hargaLama > 0 ? ((avgBaru - hargaLama) / hargaLama) * 100 : 0;

  document.getElementById("avgResults").style.display = "block";
  document.getElementById("avgScore").textContent = fmtRp(avgBaru);
  document.getElementById("avgSub").textContent = `Dari ${fmt(lotLama)} lot @${fmtRp(hargaLama)} + ${fmt(lotBaru)} lot @${fmtRp(hargaBaru)}`;

  const metrics = [
    { label: "Total Lot Setelah Beli", val: fmt(totalLot) + " lot", sub: `${fmt(lotLama)} lot lama + ${fmt(lotBaru)} lot baru` },
    { label: "Total Modal", val: fmtRp(totalModal), sub: "Modal lama + modal tambahan" },
    { label: "Harga Average Lama", val: fmtRp(hargaLama), sub: "Sebelum penambahan" },
    { label: "Harga Average Baru", val: fmtRp(avgBaru), sub: "Setelah penambahan", hi: true },
    { label: perubahan <= 0 ? "Average Turun" : "Average Naik", val: (perubahan <= 0 ? "" : "+") + pct(perubahan), sub: "Perubahan average lama → baru" },
  ];
  document.getElementById("avgMetrics").innerHTML = metrics
    .map((m) => `<div class="metric-card${m.hi ? " highlight" : ""}"><div class="metric-label">${m.label}</div><div class="metric-val">${m.val}</div><div class="metric-sub">${m.sub || ""}</div></div>`)
    .join("");

  document.getElementById("avgResults").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ══════════════════════════════════════════
   INIT
   ══════════════════════════════════════════ */
renderFinTable();
renderGlossary();