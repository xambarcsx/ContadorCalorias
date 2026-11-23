'use strict';

/* ================= Sincronización con Supabase =================
   Cada usuario tiene una fila en la tabla macros_user_data con todos sus datos (jsonb).
   La app sigue guardando en el navegador; la nube se actualiza poco después de
   cada cambio y se consulta al abrir la app o al volver a ella.
   Si dos dispositivos tienen cambios, gana el que se modificó más recientemente. */

const SB_TABLE = 'macros_user_data';
const META_KEY = 'contador-macros-meta';
const sb = window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

let sbUser = null;
let syncTimer = null;
let syncing = false;
let syncState = 'off';   // off | pending | ok | error
let lastSync = null;
let syncError = '';

function getMeta() { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { return {}; } }
function setMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify({ ...getMeta(), ...m })); } catch (e) {} }
const hasData = s => !!(s.profile || Object.keys(s.logs).length || s.weights.length || s.routine);

function rerenderAll() {
  const active = document.querySelector('.tabbar button.active');
  const y = window.scrollY;
  showTab(active ? active.dataset.tab : 'hoy');
  window.scrollTo(0, y);
}

async function push() {
  const { error } = await sb.from(SB_TABLE).upsert({
    user_id: sbUser.id, data: S, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  lastSync = new Date();
}

async function pullAndMerge() {
  const { data, error } = await sb.from(SB_TABLE).select('data').eq('user_id', sbUser.id).maybeSingle();
  if (error) throw error;
  const firstTime = getMeta().syncedUser !== sbUser.id;

  if (!data) {
    await push(); // cuenta nueva: sube lo que hay en este dispositivo
  } else {
    const remote = data.data || {};
    const remoteT = remote._updated || 0;
    const localT = S._updated || 0;
    let useRemote;
    if (firstTime && hasData(S) && hasData(remote)) {
      useRemote = confirm('Tu cuenta ya tiene datos guardados.\n\nAceptar: usar los datos de tu cuenta (recomendado).\nCancelar: reemplazarlos con los de este dispositivo.');
    } else if (firstTime) {
      useRemote = hasData(remote) || !hasData(S);
    } else {
      useRemote = remoteT > localT;
    }
    if (useRemote) {
      clearTimeout(syncTimer);
      S = Object.assign(defaultState(), remote);
      save(false);
      rerenderAll();
    } else if (localT !== remoteT || firstTime) {
      await push();
    }
  }
  setMeta({ syncedUser: sbUser.id });
  lastSync = new Date();
}

async function fullSync() {
  if (!sb || !sbUser || syncing) return;
  syncing = true;
  setSyncState('pending');
  try { await pullAndMerge(); setSyncState('ok'); }
  catch (e) { syncError = e.message || String(e); setSyncState('error'); }
  syncing = false;
}

function scheduleSync() {
  if (!sb || !sbUser) return;
  clearTimeout(syncTimer);
  setSyncState('pending');
  syncTimer = setTimeout(async () => {
    if (syncing) { scheduleSync(); return; }
    try { await push(); setSyncState('ok'); }
    catch (e) { syncError = e.message || String(e); setSyncState('error'); }
  }, 1200);
}

/* ---------- Indicador y tarjeta de cuenta ---------- */
function setSyncState(s) {
  syncState = s;
  const dot = $('#syncDot');
  dot.className = 'sync-dot ' + (sbUser ? s : 'off');
  dot.title = { ok: 'Sincronizado', pending: 'Sincronizando…', error: 'Sin sincronizar', off: '' }[sbUser ? s : 'off'];
  renderAccount();
}

const AUTH_ERRORS = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Primero confirma tu cuenta con el enlace que llegó a tu correo.',
  'User already registered': 'Ese correo ya tiene una cuenta. Usa “Entrar”.',
  'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'Signups not allowed for this instance': 'Este proyecto no permite crear cuentas desde la app. Crea tu usuario en Supabase (Authentication → Users → Add user) y luego toca “Entrar”.',
  'Failed to fetch':'No hay conexión con el servidor. Revisa tu internet o los datos de config.js.',
};
const authMsg = e => AUTH_ERRORS[e.message] || e.message || 'Ocurrió un error, intenta de nuevo.';

function renderAccount() {
  const box = $('#accountBody');
  if (!box) return;
  if (!sb) {
    box.innerHTML = `<p class="muted" style="margin:0">La sincronización aún no está configurada. Agrega la URL y la clave de tu proyecto de Supabase en <code>config.js</code>.${
      window.SUPABASE_URL && !window.supabase ? ' (No se pudo cargar Supabase: revisa tu conexión a internet.)' : ''}</p>`;
    return;
  }
  if (!sbUser) {
    if ($('#authForm')) return; // no borrar lo que la persona está escribiendo
    box.innerHTML = `
      <p class="muted small" style="margin-top:0">Inicia sesión para guardar tus datos en la nube y usarlos en tu celular y tu computadora.</p>
      <form id="authForm">
        <label>Correo<input name="email" type="email" autocomplete="email" required></label>
        <label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="6" required></label>
        <div class="row-btns">
          <button class="btn primary" type="submit" data-mode="in">Entrar</button>
          <button class="btn" type="submit" data-mode="up">Crear cuenta</button>
        </div>
        <p class="small" id="authMsg"></p>
      </form>`;
    return;
  }
  const status = {
    ok: `<span class="ok">✓ Sincronizado</span>${lastSync ? ` <span class="muted">· ${lastSync.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}`,
    pending: '<span class="muted">Sincronizando…</span>',
    error: `<span class="bad">Sin sincronizar</span> <span class="muted">· ${esc(syncError === 'Failed to fetch' ? 'sin conexión' : syncError)}. Se reintentará al volver a la app.</span>`,
    off: '',
  }[syncState];
  box.innerHTML = `
    <div class="kv" style="margin-bottom:12px">
      <span>Sesión</span><b>${esc(sbUser.email || '')}</b>
      <span>Estado</span><span class="small">${status}</span>
    </div>
    <div class="row-btns">
      <button class="btn" id="syncNow">Sincronizar ahora</button>
      <button class="btn" id="signOut">Cerrar sesión</button>
    </div>`;
}

document.addEventListener('submit', async e => {
  if (e.target.id !== 'authForm') return;
  e.preventDefault();
  const f = e.target.elements;
  const mode = e.submitter && e.submitter.dataset.mode;
  const msg = $('#authMsg');
  const btns = $$('#authForm button');
  btns.forEach(b => (b.disabled = true));
  msg.textContent = '';
  try {
    const creds = { email: f.email.value.trim(), password: f.password.value };
    if (mode === 'up') {
      const { data, error } = await sb.auth.signUp(creds);
      if (error) throw error;
      if (!data.session) msg.innerHTML = '<span class="ok">Cuenta creada.</span> Revisa tu correo, confirma con el enlace y luego toca “Entrar”.';
    } else {
      const { error } = await sb.auth.signInWithPassword(creds);
      if (error) throw error;
    }
  } catch (err) {
    msg.innerHTML = `<span class="bad">${esc(authMsg(err))}</span>`;
  }
  btns.forEach(b => (b.disabled = false));
});

document.addEventListener('click', async e => {
  if (e.target.id === 'syncNow') fullSync();
  if (e.target.id === 'signOut') {
    clearTimeout(syncTimer);
    if (syncState === 'pending' || syncState === 'error') {
      try { await push(); } catch (err) {
        if (!confirm('Hay cambios que no se han subido a la nube. ¿Cerrar sesión de todos modos?')) return;
      }
    }
    await sb.auth.signOut();
    toast('Sesión cerrada. Tus datos siguen en este dispositivo.');
  }
});

/* ---------- Arranque ---------- */
if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    const user = session ? session.user : null;
    const changed = (user && user.id) !== (sbUser && sbUser.id);
    sbUser = user;
    // Las llamadas a Supabase dentro de este callback se difieren para evitar bloqueos
    if (changed && user) setTimeout(() => { fullSync(); if (event === 'SIGNED_IN') toast('Sesión iniciada'); }, 0);
    setSyncState(user ? syncState : 'off');
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fullSync(); });
  window.addEventListener('online', fullSync);
}
renderAccount();
