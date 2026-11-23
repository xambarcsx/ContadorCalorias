'use strict';

/* ================= Estado y almacenamiento ================= */
const KEY = 'contador-macros-v1';
const MEALS = ['Desayuno', 'Comida', 'Cena', 'Snacks'];
const GLASS_ML = 250;

const defaultState = () => ({
  profile: null,
  override: null,      // {kcal, prot, carbs, fat}
  logs: {},            // 'YYYY-MM-DD' -> [{id, meal, name, g, k, p, c, f}]
  water: {},           // 'YYYY-MM-DD' -> vasos
  customFoods: [],
  recent: [],          // nombres de alimentos usados recientemente
  weights: [],         // [{date, kg}]
  routine: null,
  workouts: {},        // 'YYYY-MM-DD' -> índice del día de rutina
  lifts: {},           // nombre del ejercicio -> kg
});

let S = load();
let currentDate = ymd(new Date());

function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* almacenamiento no disponible */ }
  if (!raw) return defaultState();
  try { return sanitize(JSON.parse(raw)); }
  catch (e) {
    // Datos dañados: guarda una copia antes de empezar de cero para no perderlos
    console.error('No se pudieron leer los datos guardados', e);
    try { localStorage.setItem(KEY + '-dañado', raw); } catch (e2) {}
    return defaultState();
  }
}

/* Limpia los datos (del navegador o de la nube) antes de usarlos: los números
   se vuelven números, las fechas se validan y la rutina se reconstruye desde su
   configuración. Así un dato alterado no puede inyectar código en la página. */
function sanitize(d) {
  const num = v => (v == null || v === '' || !Number.isFinite(+v) ? null : +v);
  const isDate = k => /^\d{4}-\d{2}-\d{2}$/.test(k);
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const src = obj(d);
  const s = defaultState();
  s._updated = num(src._updated) || 0;

  const p = src.profile && typeof src.profile === 'object' ? src.profile : null;
  if (p) {
    s.profile = { sexo: p.sexo === 'm' ? 'm' : 'h' };
    for (const k of ['edad', 'peso', 'altura', 'actividad', 'objetivo', 'grasa', 'rm', 'visceral', 'musculo']) s.profile[k] = num(p[k]);
    if (!s.profile.peso || !s.profile.altura || !s.profile.edad || !s.profile.actividad) s.profile = null;
    else s.profile.objetivo = s.profile.objetivo || 0;
  }
  if (src.override && typeof src.override === 'object') {
    s.override = {};
    for (const k of ['kcal', 'prot', 'carbs', 'fat']) s.override[k] = num(src.override[k]) || 0;
  }
  for (const [date, list] of Object.entries(obj(src.logs))) {
    if (!isDate(date) || !Array.isArray(list)) continue;
    const clean = list.filter(e => e && MEALS.includes(e.meal)).map(e => ({
      id: String(e.id || Math.random().toString(36).slice(2)), meal: e.meal, name: String(e.name || ''), amount: e.amount != null ? String(e.amount) : undefined,
      g: num(e.g) || 0, k: num(e.k) || 0, p: num(e.p) || 0, c: num(e.c) || 0, f: num(e.f) || 0,
    }));
    if (clean.length) s.logs[date] = clean;
  }
  for (const [date, v] of Object.entries(obj(src.water))) if (isDate(date) && num(v) > 0) s.water[date] = Math.round(num(v));
  s.customFoods = (Array.isArray(src.customFoods) ? src.customFoods : []).filter(f => f && f.n).map(f => ({
    n: String(f.n), k: num(f.k) || 0, p: num(f.p) || 0, c: num(f.c) || 0, f: num(f.f) || 0,
    ...(Array.isArray(f.por) && num(f.por[1]) > 0 ? { por: [String(f.por[0]), num(f.por[1])] } : {}),
  }));
  s.recent = (Array.isArray(src.recent) ? src.recent : []).map(String).slice(0, 8);
  s.weights = (Array.isArray(src.weights) ? src.weights : []).filter(w => w && isDate(w.date) && num(w.kg) > 0).map(w => {
    const o = { date: w.date, kg: num(w.kg) };
    for (const k of ['fat', 'rm', 'visc', 'musc']) if (num(w[k]) != null) o[k] = num(w[k]);
    return o;
  });
  const cfg = src.routine && obj(src.routine.cfg);
  if (cfg && SPLITS[cfg.dias] && SCHEMES[cfg.enfoque] && ['principiante', 'intermedio', 'avanzado'].includes(cfg.nivel) && ['gym', 'manc', 'casa'].includes(cfg.equipo)) {
    s.routine = buildRoutine({ dias: +cfg.dias, nivel: cfg.nivel, enfoque: cfg.enfoque, equipo: cfg.equipo });
    if (isDate(src.routine.created)) s.routine.created = src.routine.created;
  }
  for (const [date, v] of Object.entries(obj(src.workouts))) if (isDate(date) && Number.isInteger(v) && v >= 0) s.workouts[date] = v;
  for (const [name, v] of Object.entries(obj(src.lifts))) if (num(v) > 0) s.lifts[name] = num(v);
  return s;
}
// touch=false guarda solo en el navegador sin marcar cambios (se usa al bajar datos de la nube)
function save(touch = true) {
  if (touch) S._updated = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('No se pudo guardar: el almacenamiento del navegador está bloqueado'); }
  if (touch && typeof scheduleSync === 'function') scheduleSync();
}

/* ================= Utilidades ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const r0 = n => Math.round(n);
const r1 = n => Math.round(n * 10) / 10;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function prettyDate(s) {
  const today = ymd(new Date());
  if (s === today) return 'Hoy';
  if (s === addDays(today, -1)) return 'Ayer';
  if (s === addDays(today, 1)) return 'Mañana';
  return parseYmd(s).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ================= Cálculo de macros ================= */
function calcTargets(p) {
  // Metabolismo basal: báscula (RM) > Katch-McArdle (con % de grasa) > Mifflin-St Jeor
  const lbm = p.grasa ? p.peso * (1 - p.grasa / 100) : null;
  let bmr, bmrSrc;
  if (p.rm) { bmr = p.rm; bmrSrc = 'medido por tu báscula'; }
  else if (lbm) { bmr = 370 + 21.6 * lbm; bmrSrc = 'fórmula Katch-McArdle (con tu % de grasa)'; }
  else { bmr = 10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === 'h' ? 5 : -161); bmrSrc = 'fórmula Mifflin-St Jeor'; }
  const tdee = bmr * p.actividad;
  let kcal = tdee * (1 + p.objetivo / 100);
  const minK = p.sexo === 'h' ? 1500 : 1200;
  const lowWarn = kcal < minK;
  kcal = Math.max(kcal, minK);

  const hM = p.altura / 100;
  const bmi = p.peso / (hM * hM);
  let prot, protNote;
  if (lbm) {
    // Con % de grasa: proteína sobre masa magra (más precisa con grasa alta)
    const perLbm = p.objetivo < 0 ? 2.4 : 2.2;
    prot = lbm * perLbm;
    protNote = `${perLbm} g por kg de masa magra`;
  } else {
    // Con IMC alto se calcula la proteína sobre un peso de referencia para no inflarla.
    const refW = bmi > 30 ? 27 * hM * hM : p.peso;
    const perKg = p.objetivo < 0 ? 2.2 : 1.8;
    prot = refW * perKg;
    protNote = `${perKg} g por kg de peso${bmi > 30 ? ' (sobre peso de referencia por IMC alto)' : ''}`;
  }
  const fat = Math.max((kcal * 0.25) / 9, p.peso * 0.6);
  const carbs = Math.max(0, (kcal - prot * 4 - fat * 9) / 4);

  return {
    bmr, bmrSrc, tdee, kcal, prot, fat, carbs, fiber: (kcal / 1000) * 14, waterMl: p.peso * 35,
    bmi, lowWarn, protNote, lbm, fatMass: lbm ? p.peso - lbm : null,
  };
}

/* Clasificaciones de báscula (rangos de referencia de Omron) */
function visceralStatus(v) {
  if (v == null) return '';
  return v <= 9 ? '<span class="ok">Normal</span>' : v <= 14 ? '<span class="bad">Alto</span>' : '<span class="bad">Muy alto</span>';
}
function highFat(p) {
  return p && p.grasa != null && (p.sexo === 'h' ? p.grasa >= 25 : p.grasa >= 32);
}
function targets() {
  if (!S.profile) return null;
  const t = calcTargets(S.profile);
  if (S.override) Object.assign(t, S.override);
  return t;
}
function dayTotals(date) {
  return (S.logs[date] || []).reduce((a, e) => {
    a.k += e.k; a.p += e.p; a.c += e.c; a.f += e.f; return a;
  }, { k: 0, p: 0, c: 0, f: 0 });
}

/* ================= Pestañas ================= */
function showTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  window.scrollTo(0, 0);
  ({ hoy: renderToday, perfil: renderProfile, rutina: renderRoutine, historial: renderHistory })[name]();
  try { sessionStorage.setItem('tab', name); } catch (e) {}
}
$$('.tabbar button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
document.addEventListener('click', e => {
  const g = e.target.closest('[data-goto]');
  if (g) showTab(g.dataset.goto);
});

/* ================= HOY ================= */
const RING_LEN = 2 * Math.PI * 52;

function renderToday() {
  $('#dateLabel').textContent = prettyDate(currentDate);
  const t = targets();
  $('#noProfile').classList.toggle('hidden', !!t);
  const tot = dayTotals(currentDate);
  const goal = t ? t.kcal : 0;

  // Anillo de calorías
  const left = goal - tot.k;
  const ring = $('#ringFg');
  const pct = goal ? Math.min(tot.k / goal, 1) : 0;
  ring.style.strokeDasharray = RING_LEN;
  ring.style.strokeDashoffset = RING_LEN * (1 - pct);
  ring.classList.toggle('over', goal > 0 && tot.k > goal * 1.05);
  $('#kcalLeft').textContent = goal ? r0(Math.abs(left)) : r0(tot.k);
  $('#kcalLeftLabel').textContent = !goal ? 'kcal' : left >= 0 ? 'kcal restantes' : 'kcal de más';
  $('#kcalEaten').textContent = r0(tot.k);
  $('#kcalTarget').textContent = goal ? r0(goal) : '—';

  // Barras de macros
  const macros = [
    ['Proteína', tot.p, t && t.prot, 'var(--prot)'],
    ['Carbohidratos', tot.c, t && t.carbs, 'var(--carb)'],
    ['Grasa', tot.f, t && t.fat, 'var(--fat)'],
  ];
  $('#macroBars').innerHTML = macros.map(([n, v, g, col]) => {
    const w = g ? Math.min(v / g, 1) * 100 : 0;
    const over = g && v > g * 1.1 && n !== 'Proteína';
    return `<div>
      <div class="mbar-head"><span>${n}</span><span>${r0(v)} / ${g ? r0(g) : '—'} g</span></div>
      <div class="mbar"><i class="${over ? 'over' : ''}" style="width:${w}%;background:${col}"></i></div>
    </div>`;
  }).join('');

  // Agua
  const glasses = S.water[currentDate] || 0;
  const waterGoal = t ? t.waterMl : 2000;
  $('#waterGlasses').textContent = glasses;
  $('#waterText').textContent = `${glasses * GLASS_ML} / ${r0(waterGoal / 100) * 100} ml · vasos de ${GLASS_ML} ml`;

  // Comidas
  const entries = S.logs[currentDate] || [];
  $('#meals').innerHTML = MEALS.map(meal => {
    const list = entries.filter(e => e.meal === meal);
    const mk = list.reduce((a, e) => a + e.k, 0);
    return `<div class="card">
      <div class="meal-head"><h3>${meal}</h3><small>${r0(mk)} kcal</small></div>
      <ul class="entries">${list.map(e => `
        <li class="entry">
          <div class="entry-main">
            <div class="entry-name">${esc(e.name)}</div>
            <div class="entry-sub">${esc(e.amount || r0(e.g) + ' g')} · P ${r0(e.p)} · C ${r0(e.c)} · G ${r0(e.f)}</div>
          </div>
          <div class="entry-kcal">${r0(e.k)}</div>
          <button class="del" data-del="${e.id}" aria-label="Eliminar ${esc(e.name)}">✕</button>
        </li>`).join('')}
      </ul>
      <button class="btn add-btn" data-add="${meal}">+ Agregar alimento</button>
    </div>`;
  }).join('');

  const hasYesterday = (S.logs[addDays(currentDate, -1)] || []).length > 0;
  $('#copyYesterday').classList.toggle('hidden', !hasYesterday || entries.length > 0);
}

$('#prevDay').addEventListener('click', () => { currentDate = addDays(currentDate, -1); renderToday(); });
$('#nextDay').addEventListener('click', () => { currentDate = addDays(currentDate, 1); renderToday(); });
$('#dateLabel').addEventListener('click', () => { currentDate = ymd(new Date()); renderToday(); });

$('#meals').addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) {
    S.logs[currentDate] = (S.logs[currentDate] || []).filter(x => x.id !== del.dataset.del);
    if (!S.logs[currentDate].length) delete S.logs[currentDate];
    save(); renderToday();
    return;
  }
  const add = e.target.closest('[data-add]');
  if (add) openAdd(add.dataset.add);
});

$('#waterPlus').addEventListener('click', () => { S.water[currentDate] = (S.water[currentDate] || 0) + 1; save(); renderToday(); });
$('#waterMinus').addEventListener('click', () => {
  const v = (S.water[currentDate] || 0) - 1;
  if (v > 0) S.water[currentDate] = v; else delete S.water[currentDate];
  save(); renderToday();
});

$('#copyYesterday').addEventListener('click', () => {
  const src = S.logs[addDays(currentDate, -1)] || [];
  S.logs[currentDate] = src.map(e => ({ ...e, id: uid() }));
  save(); renderToday(); toast('Comidas copiadas');
});

/* ================= Diálogo: agregar alimento ================= */
const dlg = $('#addDlg');
let selFood = null;

function allFoods() {
  return [...S.customFoods.map(f => ({ ...f, cat: 'Mis alimentos' })), ...FOODS];
}
function findFood(name) { return allFoods().find(f => f.n === name); }

function openAdd(meal) {
  $('#dlgMeal').innerHTML = MEALS.map(m => `<option ${m === meal ? 'selected' : ''}>${m}</option>`).join('');
  setPane('buscar');
  $('#foodSearch').value = '';
  backToSearch();
  dlg.showModal();
  if (matchMedia('(pointer:fine)').matches) $('#foodSearch').focus();
}
$('#dlgClose').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

function setPane(name) {
  $$('#addDlg .seg button').forEach(b => b.classList.toggle('active', b.dataset.pane === name));
  $('#pane-buscar').classList.toggle('hidden', name !== 'buscar');
  $('#pane-nuevo').classList.toggle('hidden', name !== 'nuevo');
}
$$('#addDlg .seg button').forEach(b => b.addEventListener('click', () => setPane(b.dataset.pane)));

function foodRow(f) {
  const label = f.por ? `${r0(f.k * f.por[1] / 100)} kcal / ${esc(f.por[0])}` : `${r0(f.k)} kcal / 100 g`;
  return `<li><button data-food="${esc(f.n)}"><span>${esc(f.n)}</span><small>${label}</small></button></li>`;
}
function renderResults() {
  const q = norm($('#foodSearch').value.trim());
  const foods = allFoods();
  let html = '';
  if (!q) {
    const recent = S.recent.map(findFood).filter(Boolean);
    if (recent.length) html += `<li class="group">Recientes</li>` + recent.map(foodRow).join('');
    const groups = {};
    foods.forEach(f => (groups[f.cat] = groups[f.cat] || []).push(f));
    for (const [cat, list] of Object.entries(groups)) {
      html += `<li class="group">${esc(cat)}</li>` + list.map(foodRow).join('');
    }
  } else {
    const words = q.split(/\s+/);
    const hits = foods.filter(f => { const n = norm(f.n); return words.every(w => n.includes(w)); });
    html = hits.length
      ? hits.slice(0, 50).map(foodRow).join('')
      : `<li class="group">Sin resultados — agrégalo en “Nuevo alimento”</li>`;
  }
  $('#foodResults').innerHTML = html;
}
$('#foodSearch').addEventListener('input', renderResults);
$('#foodResults').addEventListener('click', e => {
  const b = e.target.closest('[data-food]');
  if (b) selectFood(findFood(b.dataset.food));
});

function selectFood(f) {
  if (!f) return;
  selFood = f;
  $('#foodSearch').classList.add('hidden');
  $('#foodResults').classList.add('hidden');
  $('#amountBox').classList.remove('hidden');
  $('#amountTitle').textContent = f.n;
  const opts = [];
  if (f.por) opts.push(`<option value="por">${esc(f.por[0])} (${r0(f.por[1])} g)</option>`);
  opts.push('<option value="g">gramos</option>');
  $('#unit').innerHTML = opts.join('');
  $('#qty').value = f.por ? 1 : 100;
  updatePreview();
}
function backToSearch() {
  selFood = null;
  $('#foodSearch').classList.remove('hidden');
  $('#foodResults').classList.remove('hidden');
  $('#amountBox').classList.add('hidden');
  renderResults();
}
$('#backToSearch').addEventListener('click', backToSearch);

function currentGrams() {
  const q = parseFloat($('#qty').value) || 0;
  return $('#unit').value === 'por' ? q * selFood.por[1] : q;
}
function updatePreview() {
  if (!selFood) return;
  const x = currentGrams() / 100;
  $('#preview').innerHTML = [
    ['kcal', r0(selFood.k * x)], ['Proteína', r1(selFood.p * x) + ' g'],
    ['Carbs', r1(selFood.c * x) + ' g'], ['Grasa', r1(selFood.f * x) + ' g'],
  ].map(([l, v]) => `<div><b>${v}</b><small>${l}</small></div>`).join('');
}
$('#qty').addEventListener('input', updatePreview);
$('#unit').addEventListener('change', () => {
  // Al cambiar de unidad, ajusta la cantidad para mantener los mismos gramos
  const prev = $('#unit').value === 'g' ? 'por' : 'g';
  const q = parseFloat($('#qty').value) || 0;
  if (selFood.por) {
    const g = prev === 'por' ? q * selFood.por[1] : q;
    $('#qty').value = $('#unit').value === 'por' ? r1(g / selFood.por[1]) : r0(g);
  }
  updatePreview();
});

$('#addFood').addEventListener('click', () => {
  if (!selFood) return;
  const g = currentGrams();
  if (g <= 0) { toast('Escribe una cantidad'); return; }
  const x = g / 100;
  const qty = parseFloat($('#qty').value);
  const pl = selFood.por && qty !== 1 && /^[a-zñ]+[aeiou]$/i.test(selFood.por[0]) ? 's' : '';
  const amount = $('#unit').value === 'por' ? `${r1(qty)} ${selFood.por[0]}${pl}` : `${r0(g)} g`;
  const entry = {
    id: uid(), meal: $('#dlgMeal').value, name: selFood.n, g, amount,
    k: selFood.k * x, p: selFood.p * x, c: selFood.c * x, f: selFood.f * x,
  };
  (S.logs[currentDate] = S.logs[currentDate] || []).push(entry);
  S.recent = [selFood.n, ...S.recent.filter(n => n !== selFood.n)].slice(0, 8);
  save();
  dlg.close();
  renderToday();
  toast(`${selFood.n} agregado`);
});

$('#pane-nuevo').addEventListener('submit', e => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const g = parseFloat(fd.g) || 100;
  const per100 = v => r1(((parseFloat(v) || 0) * 100) / g);
  const name = fd.n.trim();
  if (allFoods().some(f => f.n.toLowerCase() === name.toLowerCase())) {
    toast('Ya existe un alimento con ese nombre'); return;
  }
  const food = {
    n: name, k: per100(fd.k), p: per100(fd.p), c: per100(fd.c), f: per100(fd.f),
    por: [fd.pl.trim() || 'porción', g],
  };
  S.customFoods.unshift(food);
  save();
  e.target.reset();
  setPane('buscar');
  selectFood(food);
});

/* ================= PERFIL / MACROS ================= */
const ACT_LABEL = { 1.2: 'Sedentario', 1.375: 'Ligero', 1.55: 'Moderado', 1.725: 'Activo', 1.9: 'Muy activo' };

function renderProfile() {
  const form = $('#profileForm');
  if (S.profile) {
    for (const [k, v] of Object.entries(S.profile)) if (form.elements[k]) form.elements[k].value = v ?? '';
  }
  const res = $('#results');
  const ov = $('#overrideCard');
  if (!S.profile) { res.classList.add('hidden'); ov.classList.add('hidden'); return; }

  const calc = calcTargets(S.profile);
  const t = targets();
  const pk = r0(t.prot * 4), ck = r0(t.carbs * 4), fk = r0(t.fat * 9);
  const tk = pk + ck + fk || 1;
  res.classList.remove('hidden');
  res.innerHTML = `
    <h2>Tu objetivo diario ${S.override ? '<span class="badge">personalizado</span>' : ''}</h2>
    <div class="big-kcal">${r0(t.kcal)} <small style="font-size:1rem">kcal</small></div>
    ${calc.lowWarn && !S.override ? `<p class="warn">Tu déficit quedaba por debajo del mínimo recomendado, así que se ajustó a ${r0(calc.kcal)} kcal. Considera un ritmo más suave.</p>` : ''}
    <div class="macro-cards">
      <div class="macro-card" style="border-top:3px solid var(--prot)"><b>${r0(t.prot)} g</b><small>Proteína · ${r0(pk / tk * 100)}%</small></div>
      <div class="macro-card" style="border-top:3px solid var(--carb)"><b>${r0(t.carbs)} g</b><small>Carbos · ${r0(ck / tk * 100)}%</small></div>
      <div class="macro-card" style="border-top:3px solid var(--fat)"><b>${r0(t.fat)} g</b><small>Grasa · ${r0(fk / tk * 100)}%</small></div>
    </div>
    ${calc.lbm ? `<div class="kv" style="margin-bottom:12px">
      <span>Masa magra</span><b>${r1(calc.lbm)} kg</b>
      <span>Masa grasa</span><b>${r1(calc.fatMass)} kg (${S.profile.grasa}%)</b>
      ${S.profile.visceral != null ? `<span>Grasa visceral</span><b>${S.profile.visceral} · ${visceralStatus(S.profile.visceral)}</b>` : ''}
      ${S.profile.musculo != null ? `<span>Músculo esquelético</span><b>${S.profile.musculo}% (${r1(S.profile.peso * S.profile.musculo / 100)} kg)</b>` : ''}
    </div>` : ''}
    <div class="kv">
      <span>Metabolismo basal (TMB)</span><b>${r0(calc.bmr)} kcal</b>
      <span>Gasto diario total (TDEE)</span><b>${r0(calc.tdee)} kcal</b>
      <span>Ajuste por objetivo</span><b>${S.profile.objetivo > 0 ? '+' : ''}${S.profile.objetivo}%</b>
      <span>Fibra recomendada</span><b>${r0(calc.fiber)} g</b>
      <span>Agua recomendada</span><b>${r1(calc.waterMl / 1000)} L</b>
      <span>IMC</span><b>${r1(calc.bmi)}</b>
    </div>
    <p class="muted small" style="margin-bottom:0">Metabolismo basal ${calc.bmrSrc}, multiplicado por tu nivel de actividad. Proteína a ${calc.protNote}, grasa ~25% de las calorías y el resto en carbohidratos. Son estimaciones: ajusta según cómo cambien tu peso y tu % de grasa en 2-3 semanas.</p>
    ${highFat(S.profile) && S.profile.objetivo < -20 ? '<p class="hint" style="margin:10px 0 0">Con tu % de grasa conviene un déficit moderado (−20% o −10%) y pesas para no perder músculo.</p>' : ''}`;

  ov.classList.remove('hidden');
  $('#useOverride').checked = !!S.override;
  $('#overrideFields').classList.toggle('hidden', !S.override);
  const src = S.override || calc;
  $('#ovK').value = r0(src.kcal); $('#ovP').value = r0(src.prot);
  $('#ovC').value = r0(src.carbs); $('#ovF').value = r0(src.fat);
}

$('#profileForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target.elements;
  const opt = el => (el.value === '' ? null : +el.value);
  S.profile = {
    sexo: f.sexo.value, edad: +f.edad.value, peso: +f.peso.value, altura: +f.altura.value,
    actividad: +f.actividad.value, objetivo: +f.objetivo.value,
    grasa: opt(f.grasa), rm: opt(f.rm), visceral: opt(f.visceral), musculo: opt(f.musculo),
  };
  // Registra la medición del día si cambió algo
  const p = S.profile;
  const m = { date: ymd(new Date()), kg: p.peso, fat: p.grasa, rm: p.rm, visc: p.visceral, musc: p.musculo };
  const last = [...S.weights].sort((a, b) => a.date.localeCompare(b.date)).pop();
  const same = last && ['kg', 'fat', 'rm', 'visc', 'musc'].every(k => (last[k] ?? null) === (m[k] ?? null));
  if (!same) addMeasurement(m);
  save(); renderProfile(); toast('Macros calculados');
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#useOverride').addEventListener('change', e => {
  $('#overrideFields').classList.toggle('hidden', !e.target.checked);
  if (!e.target.checked) { S.override = null; save(); renderProfile(); toast('Usando objetivos calculados'); }
});
$('#saveOverride').addEventListener('click', () => {
  const v = id => Math.max(0, parseFloat($(id).value) || 0);
  S.override = { kcal: v('#ovK'), prot: v('#ovP'), carbs: v('#ovC'), fat: v('#ovF') };
  save(); renderProfile(); toast('Objetivos personalizados guardados');
});

/* ================= RUTINA ================= */
function buildRoutine(cfg) {
  const split = SPLITS[cfg.dias];
  const scheme = SCHEMES[cfg.enfoque];
  const days = split.days.map((key, i) => {
    const tpl = DAY_TEMPLATES[key];
    let pats = tpl.ex;
    if (cfg.nivel === 'principiante') pats = pats.slice(0, 5);
    const ex = pats.map(pat => {
      const e = EXERCISES[pat];
      const base = e.comp ? scheme.comp : scheme.acc;
      let sets = base.s;
      if (cfg.nivel === 'principiante') sets = Math.max(2, sets - 1);
      if (cfg.nivel === 'avanzado' && e.comp) sets += 1;
      return { name: e[cfg.equipo], sets, reps: base.r, rest: base.d, comp: e.comp };
    });
    const repeat = split.days.indexOf(key) !== i;
    return { name: tpl.name + (repeat ? ' (2)' : ''), when: split.when[i], ex };
  });
  return { cfg, split: split.name, days, created: ymd(new Date()) };
}

const CARDIO = {
  fuerza: 'Cardio ligero 2 veces por semana (20 min caminando o bici) para salud cardiovascular sin afectar la recuperación.',
  hipertrofia: '2-3 sesiones de 20-30 min de cardio suave (caminar inclinado, bici). Mantén 7-10 mil pasos al día.',
  definicion: '3-4 sesiones de 25-40 min de cardio moderado o 2 de intervalos (HIIT). Busca 8-12 mil pasos diarios.',
  recomposicion: '2-3 sesiones de 20-30 min de cardio moderado (caminar inclinado, bici, elíptica) después de las pesas o en días de descanso, y 8-10 mil pasos al día. Las pesas son la prioridad: son las que conservan y suben tu músculo.',
};

function suggestedFocus(p) {
  if (!p) return 'hipertrofia';
  if (highFat(p)) return 'recomposicion';
  return p.objetivo < 0 ? 'definicion' : 'hipertrofia';
}

function renderRoutine() {
  const form = $('#routineForm');
  const out = $('#routineOut');
  if (S.routine) {
    for (const [k, v] of Object.entries(S.routine.cfg)) if (form.elements[k]) form.elements[k].value = v;
  } else if (S.profile) {
    form.elements.enfoque.value = suggestedFocus(S.profile);
  }
  const hint = $('#routineHint');
  if (highFat(S.profile)) {
    hint.innerHTML = `Con ${S.profile.grasa}% de grasa, el enfoque más efectivo es la <b>recomposición</b>: pesas para ganar o conservar músculo y un déficit moderado para bajar grasa. Tu báscula puede mostrar que bajas de grasa aunque el peso baje poco.`;
    hint.classList.remove('hidden');
  } else hint.classList.add('hidden');
  if (!S.routine) { out.innerHTML = ''; return; }

  const R = S.routine;
  const today = ymd(new Date());
  // sesiones de esta semana (lunes a domingo)
  const d = new Date(); const dow = (d.getDay() + 6) % 7;
  const monday = addDays(today, -dow);
  const weekCount = Object.keys(S.workouts).filter(k => k >= monday && k <= today).length;
  const lastDone = idx => Object.keys(S.workouts).filter(k => S.workouts[k] === idx).sort().pop();

  out.innerHTML = `
    <div class="card">
      <h2>${esc(R.split)}</h2>
      <div class="stats" style="margin-bottom:0">
        <div class="stat"><b>${weekCount} / ${R.days.length}</b><small>Esta semana</small></div>
        <div class="stat"><b>${Object.keys(S.workouts).length}</b><small>Entrenamientos</small></div>
        <div class="stat"><b>${S.workouts[today] !== undefined ? '✓' : '—'}</b><small>Hoy</small></div>
      </div>
    </div>
    ${R.days.map((day, i) => {
      const ld = lastDone(i);
      return `<div class="card day-card">
        <h3>Día ${i + 1}: ${esc(day.name)} <small>${esc(day.when)}</small></h3>
        <table class="ex-table"><tbody>
          ${day.ex.map(ex => `<tr>
            <td><div class="ex-name">${esc(ex.name)}</div>
              <div class="ex-meta">${ex.sets} × ${ex.reps} reps · descanso ${ex.rest}</div></td>
            <td style="text-align:right"><input type="number" min="0" step="0.5" inputmode="decimal" placeholder="kg"
              data-lift="${esc(ex.name)}" value="${S.lifts[ex.name] ?? ''}" aria-label="Peso usado en ${esc(ex.name)}"></td>
          </tr>`).join('')}
        </tbody></table>
        <div class="row-btns" style="align-items:center;justify-content:space-between">
          <span class="muted small">${ld ? 'Última vez: ' + prettyDate(ld) : 'Aún no registrado'}</span>
          ${S.workouts[today] === i
            ? `<button class="btn sm" data-undo="${i}"><span class="done-tag">✓ Hecho hoy</span></button>`
            : `<button class="btn sm primary" data-done="${i}">Marcar hecho hoy</button>`}
        </div>
      </div>`;
    }).join('')}
    <div class="card">
      <h2>Indicaciones</h2>
      <ul class="tips">
        <li><b>Calentamiento:</b> 5-10 min de cardio suave y 1-2 series ligeras del primer ejercicio.</li>
        <li><b>Progresión:</b> cuando completes todas las series en el tope del rango de repeticiones, sube el peso 2.5-5%.</li>
        <li><b>Intensidad:</b> termina cada serie dejando 1-3 repeticiones “en reserva”, con buena técnica.</li>
        <li><b>Cardio:</b> ${CARDIO[R.cfg.enfoque]}</li>
        <li><b>Descanso:</b> duerme 7-9 h. Si hay dolor articular, cambia el ejercicio por una variante cómoda.</li>
        <li>Anota el peso que usas en cada ejercicio (casilla “kg”) para saber cuánto subir la próxima vez.</li>
      </ul>
    </div>`;
}

$('#routineForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target.elements;
  const cfg = { dias: +f.dias.value, nivel: f.nivel.value, enfoque: f.enfoque.value, equipo: f.equipo.value };
  if (S.routine && !confirm('¿Reemplazar tu rutina actual por una nueva?')) return;
  S.routine = buildRoutine(cfg);
  save(); renderRoutine(); toast('Rutina generada');
  $('#routineOut').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#routineOut').addEventListener('change', e => {
  const inp = e.target.closest('[data-lift]');
  if (!inp) return;
  const v = parseFloat(inp.value);
  if (v > 0) S.lifts[inp.dataset.lift] = v; else delete S.lifts[inp.dataset.lift];
  save();
});
$('#routineOut').addEventListener('click', e => {
  const today = ymd(new Date());
  const done = e.target.closest('[data-done]');
  const undo = e.target.closest('[data-undo]');
  if (done) { S.workouts[today] = +done.dataset.done; save(); renderRoutine(); toast('¡Buen entrenamiento! 💪'); }
  if (undo) { delete S.workouts[today]; save(); renderRoutine(); }
});

/* ================= HISTORIAL ================= */
function renderHistory() {
  const t = targets();
  const today = ymd(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const totals = days.map(d => ({ d, ...dayTotals(d), n: (S.logs[d] || []).length }));
  const logged = totals.filter(x => x.n > 0);
  const avg = k => logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0;

  $('#histStats').innerHTML = `
    <div class="stat"><b>${r0(avg('k'))}</b><small>kcal promedio</small></div>
    <div class="stat"><b>${r0(avg('p'))} g</b><small>proteína prom.</small></div>
    <div class="stat"><b>${logged.length}/14</b><small>días registrados</small></div>`;

  const goal = t ? t.kcal : 0;
  const max = Math.max(goal * 1.2, ...totals.map(x => x.k), 1);
  $('#histBars').innerHTML = totals.map(x => {
    const h = (x.k / max) * 100;
    const cls = !x.n ? 'empty' : goal && x.k > goal * 1.05 ? 'over' : '';
    const lbl = parseYmd(x.d).toLocaleDateString('es', { weekday: 'narrow' });
    return `<div class="col" title="${prettyDate(x.d)}: ${r0(x.k)} kcal"><div class="bar-area"><div class="bar ${cls}" style="height:${h}%"></div></div><span class="lbl">${lbl}</span></div>`;
  }).join('') + (goal ? `<div class="target" style="bottom:calc(${(goal / max)} * (100% - 20px) + 20px)"></div>` : '');

  renderMeasurements();
}

/* ---------- Mediciones de báscula ---------- */
const METRICS = {
  kg:   { label: 'Peso',           unit: ' kg', get: w => w.kg, goodDown: true },
  fat:  { label: '% de grasa',     unit: '%',   get: w => w.fat, goodDown: true },
  lbm:  { label: 'Masa magra',     unit: ' kg', get: w => (w.fat != null ? w.kg * (1 - w.fat / 100) : null), goodDown: false },
  visc: { label: 'Grasa visceral', unit: '',    get: w => w.visc, goodDown: true },
};
let metric = 'kg';

function addMeasurement(m) {
  for (const k of Object.keys(m)) if (m[k] == null) delete m[k];
  // Si ya hay una medición ese día, se combinan (lo nuevo reemplaza lo anterior)
  const prev = S.weights.find(w => w.date === m.date);
  S.weights = S.weights.filter(w => w.date !== m.date);
  S.weights.push({ ...prev, ...m });
}

function renderMeasurements() {
  const M = METRICS[metric];
  $$('#metricSeg button').forEach(b => b.classList.toggle('active', b.dataset.metric === metric));
  const ws = [...S.weights].sort((a, b) => a.date.localeCompare(b.date));
  const pts = ws.filter(w => M.get(w) != null).slice(-30);

  // Cambio desde la primera medición
  const ch = $('#metricChange');
  if (pts.length >= 2) {
    const d = M.get(pts[pts.length - 1]) - M.get(pts[0]);
    const cls = Math.abs(d) < 0.05 ? '' : (d < 0) === M.goodDown ? 'metric-down' : 'metric-up';
    ch.innerHTML = `${M.label}: <b class="${cls}">${d > 0 ? '+' : ''}${r1(d)}${M.unit}</b> <span class="muted">desde ${prettyDate(pts[0].date)}</span>`;
  } else {
    ch.innerHTML = `<span class="muted">${pts.length ? 'Registra otra medición para ver tu progreso.' : `Aún no hay datos de ${M.label.toLowerCase()}.`}</span>`;
  }

  const chart = $('#weightChart');
  if (pts.length >= 2) {
    const vals = pts.map(M.get);
    const pad = metric === 'visc' ? 1 : 0.5;
    const min = Math.min(...vals) - pad, mx = Math.max(...vals) + pad;
    const W = 300, H = 120;
    const xy = vals.map((v, i) => [(i / (vals.length - 1)) * (W - 20) + 10, H - 10 - ((v - min) / (mx - min)) * (H - 20)]);
    chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gráfica de ${M.label}">
      <polyline points="${xy.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      ${xy.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--accent)"/>`).join('')}
    </svg>`;
  } else chart.innerHTML = '';

  $('#weightList').innerHTML = ws.slice(-10).reverse().map(w => {
    const extra = [
      w.fat != null && `${w.fat}% grasa`,
      w.fat != null && `${r1(w.kg * (1 - w.fat / 100))} kg magra`,
      w.visc != null && `visceral ${w.visc}`,
      w.musc != null && `${w.musc}% músculo`,
      w.rm != null && `RM ${w.rm}`,
    ].filter(Boolean).join(' · ');
    return `<li><span>${prettyDate(w.date)}${extra ? `<br><small class="muted">${extra}</small>` : ''}</span>
      <span style="white-space:nowrap"><b>${w.kg} kg</b> <button class="del" data-wdel="${w.date}" aria-label="Eliminar medición">✕</button></span></li>`;
  }).join('') || '<li class="muted">Aún no hay mediciones.</li>';
}

$('#metricSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-metric]');
  if (b) { metric = b.dataset.metric; renderMeasurements(); }
});

$('#weightForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target.elements;
  const opt = el => (el.value === '' ? null : +el.value);
  const m = { date: ymd(new Date()), kg: +f.kg.value, fat: opt(f.fat), rm: opt(f.rm), visc: opt(f.visc), musc: opt(f.musc) };
  if (!(m.kg > 0)) return;
  addMeasurement({ ...m });
  // Mantiene el perfil (y por lo tanto los macros) al día con la última medición
  if (S.profile) {
    S.profile.peso = m.kg;
    if (m.fat != null) S.profile.grasa = m.fat;
    if (m.rm != null) S.profile.rm = m.rm;
    if (m.visc != null) S.profile.visceral = m.visc;
    if (m.musc != null) S.profile.musculo = m.musc;
  }
  save(); e.target.reset(); renderMeasurements(); toast('Medición registrada · macros actualizados');
});
$('#weightList').addEventListener('click', e => {
  const b = e.target.closest('[data-wdel]');
  if (!b) return;
  S.weights = S.weights.filter(w => w.date !== b.dataset.wdel);
  save(); renderMeasurements();
});

/* ================= Inicio ================= */
let startTab = 'hoy';
try { startTab = sessionStorage.getItem('tab') || (S.profile ? 'hoy' : 'perfil'); } catch (e) {}
showTab(startTab);
