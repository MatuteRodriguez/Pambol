// =====================================================================
// PAMBOL · CAPA DE DATOS REALES (Supabase)
// ---------------------------------------------------------------------
// Reemplaza todo lo que antes estaba fijo en el código (Jornada 11,
// resultados, rankings, ligas de mentira). Se carga después de app.js y
// redefine las funciones que dependían de datos simulados.
// Regla de oro: cero azar. Los puntos salen del acta cargada en el panel.
// =====================================================================

const PAMBOL_CFG = window.PAMBOL_CONFIG || {};
const Pambol = window.Pambol = {
  client: null,
  online: false,        // hay conexión configurada con Supabase
  ready: false,         // ya se cargó calendario y catálogo
  tournament: null,
  gameweeks: [],
  fixtures: [],
  clubs: {},
  editGw: null,         // jornada que se está armando
  liveGw: null,         // última jornada que ya arrancó
  viewGw: null,         // jornada visible en la Quiniela
  session: null,
  profile: null,
  isAdmin: false,
  myTeams: [],
  pickPoints: {},
  savedPicks: {},
  trends: {},
  breakdown: null,
  breakdownGw: null,
  championPick: null,
  dirty: false,
  applying: false,
  totalProfiles: null,
  countdownTimer: null,
  pollTimer: null
};

// Estado que antes vivía en app.js
let activeSeasonChip = 'NONE';
let usedSeasonChips = { TRIPLE_CAP: false, FREE_HIT: false, BENCH_BOOST: false };
let userLeagues = [];
let liguillaPicks = {};
let PEÑAS_CLUBES = [];
let LIGA_MX_AFICIONES = [];

const PENA_NAMES = {
  AME: 'La Monumental Águila', CHI: 'Nación Chivahermana', CAZ: 'Comunidad Sangre Azul', TIG: 'Incomparables de San Nicolás',
  MTY: 'La Pandilla del Cerro', TOL: 'Diablos Rojos del Infierno', PUM: 'Orgullo Azul y Oro', LEO: 'La Fiera Esmeralda',
  ATS: 'Fiel Rojinegra', PAC: 'Tuzomanía Hidalguense', SAN: 'Guerreros de La Laguna', NEC: 'Fuerza Rayos del Necaxa',
  PUE: 'La Franja Camotera', TIJ: 'La Jauría Xoloitzcuintle', QRO: 'Resistencia Albiazul', ADSL: 'La Guerrilla Tunera',
  JUA: 'Bravos de la Frontera', ATL: 'Fuerza Azulgrana', MAZ: 'Armada Cañonera'
};
const CLUB_ICONS = { AME: '🦅', CHI: '🐐', CAZ: '🚂', TIG: '🐯', MTY: '🤠', TOL: '👹', PUM: '🐾', LEO: '🦁', ATS: '🦊', PAC: '🐹',
  SAN: '⚔️', NEC: '⚡', PUE: '🎽', TIJ: '🐕', QRO: '🐓', ADSL: '🛡️', JUA: '🐎', ATL: '🐴', MAZ: '⚓' };

// ---------------------------------------------------------------------
// Utilidades de interfaz: avisos dentro de la app (reemplazan alert())
// ---------------------------------------------------------------------
function showToast(msg, kind) {
  let wrap = document.getElementById('pambolToastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'pambolToastWrap';
    wrap.className = 'pambol-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'pambol-toast ' + (kind || '');
  t.textContent = String(msg);
  wrap.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
}

function pambolDialog(msg, opts) {
  opts = opts || {};
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'pambol-dialog-overlay';
    const box = document.createElement('div');
    box.className = 'pambol-dialog';
    const p = document.createElement('div');
    p.className = 'pambol-dialog-text';
    p.textContent = String(msg);
    box.appendChild(p);
    const row = document.createElement('div');
    row.className = 'pambol-dialog-actions';
    if (opts.cancel) {
      const c = document.createElement('button');
      c.className = 'pambol-btn ghost';
      c.textContent = opts.cancel;
      c.onclick = () => { ov.remove(); resolve(false); };
      row.appendChild(c);
    }
    const ok = document.createElement('button');
    ok.className = 'pambol-btn';
    ok.textContent = opts.ok || 'Entendido';
    ok.onclick = () => { ov.remove(); resolve(true); };
    row.appendChild(ok);
    box.appendChild(row);
    ov.appendChild(box);
    ov.addEventListener('click', e => { if (e.target === ov) { ov.remove(); resolve(false); } });
    document.body.appendChild(ov);
    setTimeout(() => ok.focus(), 30);
  });
}
// Los 50+ alert() del código original ahora se muestran como aviso dentro de la app
window.alert = function (msg) { pambolDialog(msg); };

function pambolTz() { return PAMBOL_CFG.TIMEZONE || 'America/Mexico_City'; }
function fmtKickoff(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const day = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: pambolTz() });
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: pambolTz() });
  return `${day.replace(/\./g, '')} · ${time}`;
}
function fmtDayKey(ts) {
  return new Date(ts).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', timeZone: pambolTz() }).replace(/\./g, '');
}
function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${d ? d + 'd ' : ''}${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}
function pambolErr(e) {
  const m = (e && (e.message || e.error_description || e.msg)) || String(e || 'Error desconocido');
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  if (/JWT|token/i.test(m)) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Primero confirma tu correo (revisa tu bandeja y spam).';
  if (/User already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (/duplicate key.*username/i.test(m)) return 'Ese nombre de DT ya está ocupado.';
  if (/Password should be/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
  return m;
}

// ---------------------------------------------------------------------
// Clubes y catálogos
// ---------------------------------------------------------------------
function clubShortOf(p) {
  if (!p) return '';
  if (p.clubShort) return p.clubShort;
  return (DB.teams.find(x => x.id === p.tId)?.short || '').toUpperCase();
}
function clubName(short) { return Pambol.clubs[short]?.name || DB.teams.find(t => t.short === short)?.name || short; }
function clubIcon(short) { return Pambol.clubs[short]?.icon || CLUB_ICONS[short] || '⚽'; }
function clubShortByName(name) { return DB.teams.find(t => t.name === name)?.short || null; }

function pambolBuildFanbases() {
  const shorts = DB.teams.map(t => t.short);
  PEÑAS_CLUBES = shorts.map(s => ({ short: s, name: PENA_NAMES[s] || ('Peña ' + clubName(s)), club: clubName(s), members: 0, icon: clubIcon(s) }));
  LIGA_MX_AFICIONES = shorts.map(s => ({
    name: clubName(s), short: s, icon: clubIcon(s),
    nickname: (Pambol.clubs[s] && Pambol.clubs[s].nickname) || (typeof CLUB_NICKNAMES !== 'undefined' && CLUB_NICKNAMES[s]) || clubName(s),
    pena: PENA_NAMES[s] || clubName(s)
  }));
}

// ---------------------------------------------------------------------
// Jornadas: cuál se arma, cuál está en vivo
// ---------------------------------------------------------------------
function gwById(id) { return Pambol.gameweeks.find(g => g.id === id) || null; }
function gwByNumber(n) { return Pambol.gameweeks.find(g => String(g.number) === String(n)) || null; }
function gwFixtures(gwId) { return Pambol.fixtures.filter(f => f.gameweek_id === gwId); }
function gwLabel(g) { return g ? (g.name || ('Jornada ' + g.number)) : 'Jornada'; }
function gwShort(g) { return g ? ('J' + g.number) : 'J—'; }
function fixtureStarted(f) { return f.status !== 'postponed' && (f.status === 'live' || f.status === 'finished' || new Date(f.kickoff_at) <= new Date()); }
function fixtureLocked(f) { return f.status !== 'scheduled' || new Date(f.kickoff_at) <= new Date(); }
function gwFirstKickoff(g) {
  const fx = gwFixtures(g.id).filter(f => f.status !== 'postponed').map(f => new Date(f.kickoff_at).getTime());
  return fx.length ? Math.min(...fx) : null;
}
function gwLockedClubs(g) {
  const set = new Set();
  if (!g) return set;
  gwFixtures(g.id).forEach(f => { if (f.status !== 'postponed' && new Date(f.kickoff_at) <= new Date()) { set.add(f.home_club); set.add(f.away_club); } });
  return set;
}
function pambolComputeGwState() {
  const now = new Date();
  const gws = [...Pambol.gameweeks].sort((a, b) => a.number - b.number);
  Pambol.editGw = gws.find(g => g.status !== 'scored' && gwFixtures(g.id).some(f => f.status === 'scheduled' && new Date(f.kickoff_at) > now)) || null;
  const started = gws.filter(g => gwFixtures(g.id).some(f => fixtureStarted(f)));
  Pambol.liveGw = started.length ? started[started.length - 1] : null;
  if (!Pambol.viewGw || !gwById(Pambol.viewGw.id)) Pambol.viewGw = Pambol.editGw || Pambol.liveGw || gws[0] || null;
  else Pambol.viewGw = gwById(Pambol.viewGw.id);
  currentGw = Pambol.viewGw ? String(Pambol.viewGw.number) : '';
}
function gwInProgress(g) {
  if (!g) return false;
  const fx = gwFixtures(g.id);
  return fx.some(fixtureStarted) && fx.some(f => !['finished', 'postponed'].includes(f.status));
}

// ---------------------------------------------------------------------
// Conexión con Supabase
// ---------------------------------------------------------------------
const PambolCloud = window.PambolCloud = {
  get client() { return Pambol.client; },
  isConnected() { return !!Pambol.client; },
  isLoggedIn() { return !!(Pambol.session && Pambol.session.user); },
  uid() { return Pambol.session?.user?.id || null; }
};

function pambolInitClient() {
  const url = PAMBOL_CFG.SUPABASE_URL, key = PAMBOL_CFG.SUPABASE_ANON_KEY;
  if (!url || !key || /PEGA_AQUI/.test(key) || !window.supabase) return false;
  try {
    Pambol.client = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    Pambol.online = true;
    return true;
  } catch (e) {
    console.warn('PAMBOL: no se pudo iniciar Supabase', e);
    return false;
  }
}

async function pambolLoadCatalog() {
  const sb = Pambol.client;
  const [clubsR, playersR, coachesR] = await Promise.all([
    sb.from('clubs').select('*').eq('active', true).order('name'),
    sb.from('players').select('id,name,pos,club_short,price,prev_price,form,projection,value_score,role,availability,squad_number,ex_clubs').eq('active', true).limit(2000),
    sb.from('coaches').select('*').eq('active', true).order('name')
  ]);
  if (clubsR.error) throw clubsR.error;
  if (playersR.error) throw playersR.error;
  if (coachesR.error) throw coachesR.error;
  Pambol.clubs = {};
  clubsR.data.forEach(c => { Pambol.clubs[c.short] = c; });
  // Equipos: conserva los ids anteriores para no romper camisetas/colores
  const prevTeams = DB.teams.slice();
  let nextId = Math.max(0, ...prevTeams.map(t => t.id)) + 1;
  DB.teams = clubsR.data.map(c => {
    const old = prevTeams.find(t => t.short === c.short);
    return { id: old ? old.id : nextId++, name: c.name, short: c.short };
  });
  const idByShort = {}; DB.teams.forEach(t => { idByShort[t.short] = t.id; });
  if (playersR.data.length) {
    DB.players = playersR.data.filter(p => idByShort[p.club_short]).map(p => ({
      id: p.id, name: p.name, pos: p.pos, team: clubName(p.club_short), tId: idByShort[p.club_short], clubShort: p.club_short,
      price: Number(p.price), form: Number(p.form || 5),
      trend: p.prev_price != null ? Math.round((Number(p.price) - Number(p.prev_price)) * 10) / 10 : 0,
      squadNumber: p.squad_number, exClubs: p.ex_clubs || [],
      rival: 'A confirmar',
      fantasy: { role: p.role, availability: p.availability, projection: p.projection != null ? Number(p.projection) : null, valueScore: p.value_score != null ? Number(p.value_score) : null }
    }));
  }
  if (coachesR.data.length) {
    COACHES.length = 0;
    coachesR.data.forEach(c => COACHES.push({ id: c.id, team: clubName(c.club_short), short: c.club_short, name: c.name, nat: c.nat, price: Number(c.price), profile: c.profile || '', formation: c.formation || '' }));
  }
  pambolBuildFanbases();
}

async function pambolLoadCalendar() {
  const sb = Pambol.client;
  const tR = await sb.from('tournaments').select('*').eq('is_current', true).maybeSingle();
  if (tR.error) throw tR.error;
  Pambol.tournament = tR.data;
  if (!tR.data) { Pambol.gameweeks = []; Pambol.fixtures = []; return; }
  const gR = await sb.from('gameweeks').select('*').eq('tournament_id', tR.data.id).order('number');
  if (gR.error) throw gR.error;
  Pambol.gameweeks = gR.data;
  const ids = gR.data.map(g => g.id);
  if (ids.length) {
    const fR = await sb.from('fixtures').select('*').in('gameweek_id', ids).order('kickoff_at');
    if (fR.error) throw fR.error;
    Pambol.fixtures = fR.data;
  } else Pambol.fixtures = [];
  // Compatibilidad con el formato anterior (DB.fixtures por número de jornada)
  DB.fixtures = {};
  Pambol.gameweeks.forEach(g => {
    DB.fixtures[g.number] = gwFixtures(g.id).map(f => ({
      id: f.id, home: clubName(f.home_club), hShort: f.home_club, away: clubName(f.away_club), aShort: f.away_club,
      time: fmtKickoff(f.kickoff_at) + (f.venue ? ' · ' + f.venue : ''), hScore: f.home_score, aScore: f.away_score, status: f.status
    }));
  });
  pambolComputeGwState();
  pambolUpdateRivals();
}

// Próximo rival de cada jugador en la jornada que se arma
function pambolUpdateRivals() {
  const g = Pambol.editGw || Pambol.liveGw;
  const opp = {};
  if (g) gwFixtures(g.id).forEach(f => { opp[f.home_club] = 'vs ' + f.away_club + ' (L)'; opp[f.away_club] = 'vs ' + f.home_club + ' (V)'; });
  DB.players.forEach(p => {
    const s = clubShortOf(p);
    p.rival = opp[s] || 'Sin partido';
    if (p.fantasy) p.fantasy.opponent = p.rival;
  });
}

// ---------------------------------------------------------------------
// Sesión y datos del usuario
// ---------------------------------------------------------------------
function pambolGuestUser() {
  return { isLoggedIn: false, fullName: '', name: 'Invitado', username: '', email: '', favoriteClub: '', clubShort: '', clubIcon: '👤', syncedWithCloud: false };
}

function loadUserProfile() {
  // La sesión real la maneja Supabase; mientras carga se muestra como invitado
  if (!PambolCloud.isLoggedIn()) currentUser = window.currentUser = pambolGuestUser();
  updateUserAuthDisplay();
}

async function pambolOnSession(session) {
  Pambol.session = session || null;
  if (!session) {
    Pambol.profile = null; Pambol.isAdmin = false; Pambol.myTeams = []; Pambol.breakdown = null; Pambol.pickPoints = {}; Pambol.savedPicks = {};
    userLeagues = []; usedSeasonChips = { TRIPLE_CAP: false, FREE_HIT: false, BENCH_BOOST: false };
    currentUser = window.currentUser = pambolGuestUser();
    pambolRenderAll();
    return;
  }
  try {
    const sb = Pambol.client;
    const { data: prof } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    Pambol.profile = prof || null;
    const adminR = await sb.rpc('is_admin');
    Pambol.isAdmin = !!adminR.data;
    const short = prof?.favorite_club || '';
    currentUser = window.currentUser = {
      isLoggedIn: true, fullName: prof?.full_name || '', name: prof?.full_name || prof?.username || 'DT',
      username: prof?.username || session.user.email.split('@')[0], email: session.user.email,
      favoriteClub: short ? clubName(short) : '', clubShort: short, clubIcon: short ? clubIcon(short) : '👑', syncedWithCloud: true
    };
    if (prof?.badge && typeof customBadgeState !== 'undefined') {
      try { Object.assign(customBadgeState, prof.badge); localStorage.setItem('pambol_custom_badge', JSON.stringify(customBadgeState)); applyCustomBadgeToUI(); } catch (e) {}
    }
    await pambolLoadMyData();
    pambolHandlePendingInvite();
  } catch (e) {
    console.warn('PAMBOL: error cargando sesión', e);
    showToast(pambolErr(e), 'error');
  }
  pambolRenderAll();
  applyUserClubStadiumLighting();
}

async function pambolLoadMyData() {
  const sb = Pambol.client, uid = PambolCloud.uid();
  if (!sb || !uid || !Pambol.tournament) return;
  const gwIds = Pambol.gameweeks.map(g => g.id);
  const fxIds = Pambol.fixtures.map(f => f.id);
  const [teamsR, picksR, champR, leaguesR] = await Promise.all([
    gwIds.length ? sb.from('fantasy_teams').select('*').eq('user_id', uid).in('gameweek_id', gwIds) : { data: [] },
    fxIds.length ? sb.from('quiniela_picks').select('*').eq('user_id', uid).in('fixture_id', fxIds) : { data: [] },
    sb.from('champion_picks').select('*').eq('user_id', uid).eq('tournament_id', Pambol.tournament.id).maybeSingle(),
    sb.rpc('my_leagues')
  ]);
  Pambol.myTeams = (teamsR.data || []).map(t => ({ ...t, gw: gwById(t.gameweek_id) })).sort((a, b) => (a.gw?.number || 0) - (b.gw?.number || 0));
  Pambol.savedPicks = {}; Pambol.pickPoints = {};
  (picksR.data || []).forEach(p => {
    userPicks[p.fixture_id] = { h: p.home_score, a: p.away_score };
    Pambol.savedPicks[p.fixture_id] = { h: p.home_score, a: p.away_score };
    Pambol.pickPoints[p.fixture_id] = p.points;
  });
  Pambol.championPick = champR.data || null;
  if (champR.data?.bracket) liguillaPicks = champR.data.bracket;
  userLeagues = (leaguesR.data || []).map(l => ({ id: l.id, name: l.name, icon: l.icon, code: l.code, members: Number(l.members), myRank: Number(l.my_rank), myPts: Number(l.my_pts), creator: l.creator_name || '—', creatorId: l.creator_id }));
  // Comodines ya gastados (en otras jornadas del torneo)
  usedSeasonChips = { TRIPLE_CAP: false, FREE_HIT: false, BENCH_BOOST: false };
  Pambol.myTeams.forEach(t => { if (t.chip !== 'NONE' && (!Pambol.editGw || t.gameweek_id !== Pambol.editGw.id)) usedSeasonChips[t.chip] = true; });
  pambolApplyServerTeam();
  await pambolLoadBreakdown();
}

function pambolBaselineTeam(gw) {
  if (!gw) return null;
  const prev = Pambol.myTeams.filter(t => t.gw && t.gw.number < gw.number && t.chip !== 'FREE_HIT');
  return prev.length ? prev[prev.length - 1] : null;
}

function pambolApplyServerTeam() {
  const g = Pambol.editGw;
  if (!g) return;
  const own = Pambol.myTeams.find(t => t.gameweek_id === g.id);
  if (own) { pambolApplyTeamRow(own, false); Pambol.dirty = false; }
  else {
    const base = pambolBaselineTeam(g);
    if (base) { pambolApplyTeamRow(base, true); Pambol.dirty = false; }
    else Pambol.dirty = true; // equipo armado como invitado: falta guardarlo
  }
}

function pambolApplyTeamRow(row, carry) {
  Pambol.applying = true;
  const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
  (row.starters || []).forEach(id => { const p = getPlayer(id); if (p) byPos[p.pos].push(id); });
  lineup = byPos;
  bench = { GK: row.bench.GK || null, DEF: row.bench.DEF || null, MID: row.bench.MID || null, FWD: row.bench.FWD || null };
  captainId = row.captain_id;
  selectedCoachId = row.coach_id;
  activeModifiers = carry ? {} : Object.fromEntries(Object.entries(row.modifiers || {}).map(([k, v]) => [Number(k), v]));
  activeSeasonChip = carry ? 'NONE' : (row.chip || 'NONE');
  selectedFormation = `${byPos.DEF.length}-${byPos.MID.length}-${byPos.FWD.length}`;
  if (!FORMATIONS[selectedFormation]) selectedFormation = '4-3-3';
  document.querySelectorAll('.formation-btn').forEach(b => b.classList.toggle('active', b.dataset.formation === selectedFormation));
  try { saveState(); } catch (e) {}
  Pambol.applying = false;
}

async function pambolLoadBreakdown() {
  Pambol.breakdown = null; Pambol.breakdownGw = null;
  const g = Pambol.liveGw;
  if (!g || !PambolCloud.isLoggedIn()) return;
  const r = await Pambol.client.rpc('my_team_breakdown', { p_gw: g.id });
  if (!r.error && r.data) { Pambol.breakdown = r.data; Pambol.breakdownGw = g; }
}

async function pambolLoadTrends() {
  const g = Pambol.viewGw;
  if (!g || !Pambol.online) return;
  const r = await Pambol.client.rpc('fixture_trends', { p_gw: g.id });
  if (!r.error) { (r.data || []).forEach(t => { Pambol.trends[t.fixture_id] = t; }); }
}

// ---------------------------------------------------------------------
// Plantilla: veda, transferencias, guardado
// ---------------------------------------------------------------------
function squadIds() { return Object.values(lineup).flat().filter(Boolean).concat(Object.values(bench).filter(Boolean)); }

function isPlayerInVeda(player) {
  if (!player || !Pambol.editGw) return false;
  return gwLockedClubs(Pambol.editGw).has(clubShortOf(player));
}

function pambolCanPlace(newId, replacedId) {
  const np = getPlayer(newId);
  if (np && isPlayerInVeda(np)) { pambolDialog(`🔒 Veda: el partido de ${np.name} ya empezó. No puedes ficharlo en esta jornada.`); return false; }
  const rp = replacedId ? getPlayer(replacedId) : null;
  if (rp && isPlayerInVeda(rp)) { pambolDialog(`🔒 Veda: ${rp.name} ya está jugando y no se puede quitar.`); return false; }
  if (np) {
    const club = clubShortOf(np);
    const ids = squadIds().filter(id => id !== replacedId && id !== newId);
    const sameClub = ids.map(getPlayer).filter(p => p && clubShortOf(p) === club).length;
    if (sameClub >= 5) { pambolDialog(`Máximo 5 futbolistas de ${np.team} en tu plantilla.`); return false; }
  }
  pambolMarkDirty();
  return true;
}

function pambolMarkDirty() {
  if (Pambol.applying) return;
  Pambol.dirty = true;
  pambolUpdateSaveButton();
}

function pambolUpdateSaveButton() {
  const el = document.getElementById('saveTeamBtnLabel');
  if (!el) return;
  const g = Pambol.editGw;
  const tag = g ? ` (${gwShort(g)})` : '';
  el.textContent = Pambol.dirty ? `💾 Guardar cambios${tag} •` : `✅ Equipo guardado${tag}`;
}

// Envuelve saveState para detectar cambios sin guardar
(function () {
  const original = saveState;
  window.saveState = saveState = function () {
    original();
    if (Pambol.ready && !Pambol.applying) pambolMarkDirty();
  };
})();

function pambolTransfers() {
  const base = pambolBaselineTeam(Pambol.editGw);
  if (!base) return { count: 0, penalty: 0, first: true };
  const baseIds = new Set([...(base.starters || []), ...Object.values(base.bench || {})].map(Number));
  const count = squadIds().filter(id => !baseIds.has(Number(id))).length;
  const penalty = activeSeasonChip === 'FREE_HIT' ? 0 : Math.max(0, count - 2) * 4;
  return { count, penalty, first: false };
}

function recordTransferMade() { pambolMarkDirty(); return true; }

function updateTransferDisplay() {
  const display = document.getElementById('transfersCountDisplay');
  const pill = document.getElementById('transferLimitPill');
  const note = document.getElementById('transferPenaltyNote');
  if (!display || !pill) return;
  const t = pambolTransfers();
  if (activeSeasonChip === 'FREE_HIT') {
    display.innerText = 'ILIMITADAS (Fecha Libre)'; display.style.color = 'var(--gold)';
    pill.className = 'transfer-limit-pill warning';
    if (note) note.innerHTML = 'Comodín <strong>Fecha Libre</strong> activo';
    return;
  }
  if (t.first) {
    display.innerText = 'Libres (primer equipo)'; display.style.color = 'var(--accent-green)';
    pill.className = 'transfer-limit-pill';
    if (note) note.innerHTML = 'Después: 2 gratis por jornada, <strong>−4 pts</strong> por cambio extra';
    return;
  }
  const free = Math.max(0, 2 - t.count);
  display.innerText = `${t.count} hechas · ${free} gratis`;
  display.style.color = t.penalty ? '#f87171' : 'var(--accent-green)';
  pill.className = 'transfer-limit-pill' + (t.penalty ? ' penalty' : (free === 0 ? ' warning' : ''));
  if (note) note.innerHTML = t.penalty ? `Penalización: <strong style="color:#f87171">−${t.penalty} pts</strong>` : 'Penalización: <strong>−4 pts</strong> por cambio extra';
}

function pambolLocalValidate() {
  const starters = Object.values(lineup).flat().filter(Boolean);
  const benchIds = Object.values(bench).filter(Boolean);
  if (starters.length < 11) return `Te faltan titulares: tienes ${starters.length} de 11.`;
  if (benchIds.length < 4) return `Te falta completar la banca: tienes ${benchIds.length} de 4 suplentes.`;
  if (!captainId || !starters.includes(captainId)) return 'Elige un Capitán (👑) entre tus titulares.';
  const cost = calculateTotalSquadCost();
  if (cost > 100.0001) return `Tu plantilla cuesta ${cost.toFixed(1)} V y el tope es 100.0 V.`;
  const per = {}, perStart = {};
  starters.concat(benchIds).forEach(id => { const c = clubShortOf(getPlayer(id)); per[c] = (per[c] || 0) + 1; });
  starters.forEach(id => { const c = clubShortOf(getPlayer(id)); perStart[c] = (perStart[c] || 0) + 1; });
  const over5 = Object.entries(per).find(([, n]) => n > 5);
  if (over5) return `Máximo 5 futbolistas de ${clubName(over5[0])}.`;
  const over3 = Object.entries(perStart).find(([, n]) => n > 3);
  if (over3) return `Máximo 3 titulares de ${clubName(over3[0])}.`;
  if (Object.keys(activeModifiers).length > 2) return 'Máximo 2 modificadores por jornada.';
  return null;
}

async function saveTeamValidation() {
  hapticFeedback([40, 60, 40]);
  const err = pambolLocalValidate();
  if (err) { pambolDialog(err); return; }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ lineup, bench, selectedCoachId, captainId, activeModifiers, selectedFormation, userPicks })); } catch (e) {}
  if (!Pambol.online) { showToast('Guardado en este dispositivo (modo sin conexión).'); return; }
  if (!PambolCloud.isLoggedIn()) {
    await pambolDialog('Tu equipo quedó guardado en este teléfono. Crea tu cuenta gratis para que cuente en el ranking y en tus ligas.', { ok: 'Crear cuenta' });
    activeAuthTab = 'register'; openAuthModal();
    return;
  }
  const g = Pambol.editGw;
  if (!g) { pambolDialog('No hay ninguna jornada abierta para armar equipo en este momento.'); return; }
  const payload = {
    user_id: PambolCloud.uid(), gameweek_id: g.id, formation: selectedFormation,
    starters: Object.values({ GK: lineup.GK, DEF: lineup.DEF, MID: lineup.MID, FWD: lineup.FWD }).flat().filter(Boolean).map(Number),
    bench: { GK: Number(bench.GK), DEF: Number(bench.DEF), MID: Number(bench.MID), FWD: Number(bench.FWD) },
    coach_id: Number(selectedCoachId), captain_id: Number(captainId),
    modifiers: Object.fromEntries(Object.entries(activeModifiers).map(([k, v]) => [String(k), v])),
    chip: activeSeasonChip || 'NONE'
  };
  const btn = document.getElementById('saveTeamBtnLabel');
  if (btn) btn.textContent = '⏳ Guardando…';
  const { data, error } = await Pambol.client.from('fantasy_teams').upsert(payload, { onConflict: 'user_id,gameweek_id' }).select().single();
  if (error) { pambolUpdateSaveButton(); pambolDialog('No se pudo guardar: ' + pambolErr(error)); return; }
  const row = { ...data, gw: g };
  Pambol.myTeams = Pambol.myTeams.filter(t => t.gameweek_id !== g.id).concat([row]).sort((a, b) => (a.gw?.number || 0) - (b.gw?.number || 0));
  Pambol.dirty = false;
  pambolUpdateSaveButton();
  updateTransferDisplay();
  playStadiumSound('whistle'); triggerConfetti();
  const extra = data.transfer_penalty ? ` · Penalización por cambios: −${data.transfer_penalty} pts` : '';
  showToast(`✅ Equipo guardado para la ${gwLabel(g)} (${Number(data.squad_cost ?? calculateTotalSquadCost()).toFixed(1)} V)${extra}`, 'ok');
}

// ---------------------------------------------------------------------
// Comodines
// ---------------------------------------------------------------------
function toggleSeasonChip(chipKey) {
  if (usedSeasonChips[chipKey]) { pambolDialog('Este comodín ya lo usaste en otra jornada del torneo.'); return; }
  const g = Pambol.editGw;
  if (g && gwFirstKickoff(g) && gwFirstKickoff(g) <= Date.now()) { pambolDialog('Los comodines se cierran con el primer partido de la jornada.'); return; }
  if (activeSeasonChip === chipKey) { activeSeasonChip = 'NONE'; showToast('Comodín desactivado para la jornada.'); }
  else {
    activeSeasonChip = chipKey;
    const names = {
      TRIPLE_CAP: '🚀 Triple Capitán activado: tu capitán multiplica x3.',
      FREE_HIT: '🔄 Fecha Libre activada: cambios ilimitados; la siguiente jornada vuelves a tu equipo anterior.',
      BENCH_BOOST: '🛡️ Banca Blindada activada: tus 4 suplentes también suman.'
    };
    showToast(names[chipKey]);
  }
  pambolMarkDirty();
  renderSeasonChips();
  updateTransferDisplay();
}

function renderSeasonChips() {
  const elMap = { TRIPLE_CAP: ['chipTripleCap', 'chipStatusTC'], FREE_HIT: ['chipFreeHit', 'chipStatusFH'], BENCH_BOOST: ['chipBenchBoost', 'chipStatusBB'] };
  Object.entries(elMap).forEach(([k, [b, s]]) => {
    const btn = document.getElementById(b), st = document.getElementById(s);
    if (!btn || !st) return;
    btn.classList.remove('active', 'used');
    if (usedSeasonChips[k]) { btn.classList.add('used'); st.innerText = 'Gastado'; }
    else if (activeSeasonChip === k) { btn.classList.add('active'); st.innerText = `¡ACTIVO ${gwShort(Pambol.editGw)}!`; }
    else st.innerText = 'Disponible';
  });
}

// ---------------------------------------------------------------------
// Puntos en vivo (calculados por el servidor)
// ---------------------------------------------------------------------
function pambolShowPitchPoints() {
  // Solo se muestran sobre la cancha si la jornada que armas ya empezó
  return !!(Pambol.breakdown && Pambol.breakdownGw && (!Pambol.editGw || Pambol.breakdownGw.id === Pambol.editGw.id));
}
function pambolLivePoints(pid) {
  if (!pambolShowPitchPoints()) return null;
  const e = Pambol.breakdown.players && Pambol.breakdown.players[String(pid)];
  if (!e) return null;
  return Number(e.counted ? e.points : e.raw);
}
function calculateTotalLivePoints() { return Pambol.breakdown ? Number(Pambol.breakdown.total) : 0; }
function pambolLiveLabel(total) {
  if (!Pambol.breakdown || !Pambol.breakdownGw) return '⚡ <strong>Puntos en vivo</strong> (aún sin partidos)';
  const live = gwInProgress(Pambol.breakdownGw) ? 'EN VIVO' : 'FINAL';
  return `⚡ <strong>${total} PTS ${live}</strong> (${gwShort(Pambol.breakdownGw)})`;
}

function openPlayerMatchBreakdown(id) {
  const p = getPlayer(id);
  if (!p) return;
  const modalEl = document.getElementById('playerStatsModal');
  const contentEl = document.getElementById('playerStatsModalContent');
  if (!modalEl || !contentEl) return;
  const e = Pambol.breakdown && Pambol.breakdown.players && Pambol.breakdown.players[String(id)];
  const g = Pambol.breakdownGw;
  const isCap = Number(captainId) === Number(id);
  let body;
  if (!e) {
    body = `<div class="pambol-empty">Todavía no hay acta para ${escapeHtml(p.name)} en ${escapeHtml(gwLabel(g))}. Los puntos aparecen en cuanto el administrador carga el partido.</div>`;
  } else {
    const lines = (e.lines || []).map(l => `<div class="pambol-line"><span>${escapeHtml(l[0])}</span><strong class="${Number(l[1]) < 0 ? 'neg' : 'pos'}">${Number(l[1]) > 0 ? '+' : ''}${l[1]}</strong></div>`).join('') || '<div class="pambol-line"><span>Sin participación registrada</span><strong>0</strong></div>';
    const flags = [e.sub_in ? '🔁 Entró por cambio automático' : '', e.sub_out ? '🔁 No jugó: lo reemplazó tu suplente' : '', !e.counted ? 'No suma (suplente)' : '', e.counted && e.captain ? `👑 Capitán x${Pambol.breakdown.captain_mult}` : ''].filter(Boolean);
    body = `
      <div class="pambol-acta-head">
        <div><div class="pambol-kicker">${escapeHtml(p.team)} · ${POS_DISPLAY[p.pos]}</div><h3>${escapeHtml(p.name)}</h3><div class="pambol-muted">${escapeHtml(gwLabel(g))} · ${e.minutes}'</div></div>
        <div class="pambol-acta-pts">${e.counted ? e.points : e.raw}<small>pts</small></div>
      </div>
      <div class="pambol-card">${lines}</div>
      ${flags.length ? `<div class="pambol-muted" style="margin-top:6px">${flags.join(' · ')}</div>` : ''}`;
  }
  contentEl.innerHTML = body + `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
      <button type="button" class="btn-assign-player" style="justify-content:center;padding:9px;font-size:11px" onclick="setCaptainDirect('${p.id}')"><span>👑 ${isCap ? 'Quitar Capitán' : 'Hacer Capitán'}</span></button>
      <button type="button" class="btn-liga-action" style="justify-content:center;padding:9px;font-size:11px" onclick="closePlayerStatsModal()"><span>Volver a Cancha</span></button>
    </div>`;
  modalEl.classList.add('open');
}

// ---------------------------------------------------------------------
// Cuenta regresiva de veda y recordatorios
// ---------------------------------------------------------------------
function startDeadlineCountdown() {
  if (Pambol.countdownTimer) return;
  const tick = () => {
    const display = document.getElementById('liveCountdownDisplay');
    if (!display) return;
    const g = Pambol.editGw;
    if (!g) { display.innerText = Pambol.online ? 'No hay jornada abierta por ahora' : 'Calendario disponible al conectar'; return; }
    const next = gwFixtures(g.id).filter(f => f.status === 'scheduled' && new Date(f.kickoff_at) > new Date()).sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))[0];
    if (!next) { display.innerText = 'Jornada en juego · alineaciones cerradas'; return; }
    const first = gwFirstKickoff(g);
    const prefix = first && first <= Date.now() ? `Próxima veda (${next.home_club}-${next.away_club})` : `Arranca ${gwShort(g)}`;
    display.innerText = `${prefix}: ${fmtCountdown(new Date(next.kickoff_at) - Date.now())}`;
    if (new Date(next.kickoff_at) - Date.now() < 1000) setTimeout(() => { pambolComputeGwState(); pambolRenderAll(); }, 1500);
  };
  tick();
  Pambol.countdownTimer = setInterval(tick, 1000);
}

// Descarga un archivo de calendario con alarma 2 h antes de cada jornada
function requestGameNotification() {
  const gws = Pambol.gameweeks.filter(g => { const k = gwFirstKickoff(g); return k && k > Date.now(); });
  if (!gws.length) { pambolDialog('Todavía no hay jornadas futuras en el calendario.'); return; }
  const stamp = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ev = gws.map(g => {
    const k = gwFirstKickoff(g);
    const first = gwFixtures(g.id).find(f => new Date(f.kickoff_at).getTime() === k);
    return ['BEGIN:VEVENT', `UID:pambol-${g.id}@pambol`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(k)}`, `DTEND:${stamp(k + 2 * 3600e3)}`,
      `SUMMARY:PAMBOL · Cierre ${gwLabel(g)}`, `DESCRIPTION:Arranca ${first ? first.home_club + ' vs ' + first.away_club : 'la jornada'}. Revisa tu Once y tu quiniela.`,
      `URL:${PAMBOL_CFG.SITE_URL || ''}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Cierre PAMBOL en 2 horas', 'END:VALARM', 'END:VEVENT'].join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PAMBOL//Cierres//ES', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'pambol-cierres.ics';
  a.click();
  showToast('📅 Abre el archivo para agregar los cierres (con alarma 2 h antes) a tu calendario.');
}

// ---------------------------------------------------------------------
// Encabezados y textos dinámicos de jornada
// ---------------------------------------------------------------------
function pambolRenderHeaders() {
  const g = Pambol.editGw || Pambol.liveGw;
  const t = Pambol.tournament;
  const pill = document.getElementById('gwPill');
  if (pill) {
    if (!Pambol.online) pill.textContent = 'Modo sin conexión';
    else if (!t) pill.textContent = 'Sin torneo activo';
    else if (!g) pill.textContent = `${t.name} · sin jornadas`;
    else pill.textContent = `${t.name} · ${gwLabel(g)}${gwInProgress(g) ? ' · EN JUEGO' : ''}`;
  }
  const brand = document.getElementById('brandSub');
  if (brand && t) brand.textContent = 'LIGA MX FANTASY · ' + t.name.toUpperCase();
  document.querySelectorAll('.pambol-gw-name').forEach(el => { el.textContent = gwLabel(g); });
  document.querySelectorAll('.pambol-tournament-name').forEach(el => { el.textContent = t ? t.name : 'Liga MX'; });
  const hb = document.getElementById('heroGwBadge');
  if (hb) hb.textContent = `${gwLabel(Pambol.editGw).toUpperCase()} · ${t ? t.name.toUpperCase() : 'LIGA MX'}`;
  const hd = document.getElementById('heroDeadline');
  const ho = document.getElementById('heroOpener');
  if (Pambol.editGw) {
    const k = gwFirstKickoff(Pambol.editGw);
    const first = gwFixtures(Pambol.editGw.id).find(f => new Date(f.kickoff_at).getTime() === k);
    if (hd) hd.textContent = k ? fmtKickoff(k) : '—';
    if (ho) ho.textContent = first ? `${first.home_club} vs ${first.away_club}` : '—';
  } else { if (hd) hd.textContent = '—'; if (ho) ho.textContent = '—'; }
  const pg = document.getElementById('profileGwBadge');
  if (pg) pg.textContent = Pambol.editGw ? (Pambol.dirty ? `${gwShort(Pambol.editGw)} sin guardar` : `${gwShort(Pambol.editGw)} lista`) : 'Sin jornada';
  pambolUpdateSaveButton();
  pambolRenderOnceChips();
}

function pambolRenderOnceChips() {
  const el = document.getElementById('onceGwChips');
  if (!el) return;
  const chips = [];
  if (Pambol.editGw) chips.push(`<button class="once-gw-chip active" onclick="switchOnceGameweek(${Pambol.editGw.id})">${gwShort(Pambol.editGw)} (Actual)</button>`);
  [...Pambol.myTeams].reverse().filter(t => t.scored_at && t.gw).slice(0, 6).forEach(t => {
    chips.push(`<button class="once-gw-chip" onclick="switchOnceGameweek(${t.gameweek_id})">${gwShort(t.gw)} (${Number(t.points)} Pts)</button>`);
  });
  el.innerHTML = chips.join('') || '<span class="pambol-muted">Tu historial aparece al puntuarse tu primera jornada.</span>';
}

function switchOnceGameweek(gwId) {
  const t = Pambol.myTeams.find(x => x.gameweek_id === Number(gwId));
  if (!t || (Pambol.editGw && t.gameweek_id === Pambol.editGw.id)) { switchCanchitaSubTab('cancha'); showToast(`Mostrando tu equipo para la ${gwLabel(Pambol.editGw)}`); return; }
  const cap = getPlayer(t.captain_id);
  const top = t.breakdown && t.breakdown.players ? Object.entries(t.breakdown.players).filter(([, v]) => v.counted).sort((a, b) => b[1].points - a[1].points).slice(0, 3)
    .map(([id, v]) => `${playerShortName(getPlayer(Number(id)))} ${v.points}`).join(', ') : '';
  pambolDialog(`📅 ${gwLabel(t.gw)}: ${Number(t.points)} puntos\nFormación ${t.formation} · Capitán ${cap ? cap.name : '—'}${t.chip !== 'NONE' ? ' · Comodín ' + t.chip : ''}${t.transfer_penalty ? ' · Penalización −' + t.transfer_penalty : ''}${top ? '\nMejores: ' + top : ''}`);
}

function updateUserClubMatchAlert() {
  let alertEl = document.getElementById('userClubMatchAlertBar');
  const short = currentUser && currentUser.clubShort;
  const g = Pambol.editGw;
  const f = short && g ? gwFixtures(g.id).find(x => x.home_club === short || x.away_club === short) : null;
  if (!f) { if (alertEl) alertEl.style.display = 'none'; return; }
  if (!alertEl) {
    const pitch = document.getElementById('canchitaViewPitch');
    if (!pitch) return;
    alertEl = document.createElement('div');
    alertEl.id = 'userClubMatchAlertBar';
    alertEl.className = 'user-club-match-alert';
    pitch.insertBefore(alertEl, pitch.querySelector('.pitch-wrapper'));
  }
  alertEl.innerHTML = `<div style="display:flex;align-items:center;gap:6px"><span>${clubIcon(short)}</span><span><strong>¡Tu club juega!</strong> ${escapeHtml(clubName(f.home_club))} vs ${escapeHtml(clubName(f.away_club))} · ${fmtKickoff(f.kickoff_at)}</span></div><span class="user-club-match-badge">${gwShort(g)}</span>`;
  alertEl.style.display = 'flex';
}

// ---------------------------------------------------------------------
// Render general
// ---------------------------------------------------------------------
function pambolSafe(fn) { try { fn(); } catch (e) { console.warn('PAMBOL render:', e); } }
function pambolRenderAll() {
  pambolSafe(updateUserAuthDisplay);
  pambolSafe(pambolRenderHeaders);
  pambolSafe(renderLineup);
  pambolSafe(renderMarket);
  pambolSafe(renderFixtures);
  pambolSafe(renderStandings);
  pambolSafe(renderSeasonChips);
  pambolSafe(updateTransferDisplay);
  pambolSafe(updateUserClubMatchAlert);
  pambolSafe(pambolRenderProfileBanner);
  pambolSafe(renderUserLeagues);
  pambolSafe(renderAchievements);
  pambolSafe(pambolRenderBanner);
}

function pambolRenderBanner() {
  let b = document.getElementById('pambolStatusBanner');
  let msg = '';
  if (!Pambol.online) msg = '⚠️ Modo sin conexión: tu equipo se guarda solo en este teléfono.';
  else if (Pambol.loadError) msg = '⚠️ No pudimos conectar con el servidor. Reintentando…';
  else if (!PambolCloud.isLoggedIn()) msg = '👋 Estás como invitado. <a href="#" onclick="activeAuthTab=\'register\';openAuthModal();return false;">Crea tu cuenta</a> para competir.';
  if (!msg) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement('div');
    b.id = 'pambolStatusBanner';
    b.className = 'pambol-status-banner';
    const bar = document.querySelector('.gameweek-bar');
    if (bar) bar.parentNode.insertBefore(b, bar.nextSibling); else document.body.prepend(b);
  }
  b.innerHTML = msg;
}

// Refresca marcadores y puntos mientras haya partidos en juego
function pambolStartPolling() {
  if (Pambol.pollTimer) clearInterval(Pambol.pollTimer);
  Pambol.pollTimer = setInterval(async () => {
    if (document.hidden || !Pambol.online) return;
    const live = Pambol.fixtures.some(f => f.status === 'live' || (f.status === 'scheduled' && new Date(f.kickoff_at) <= new Date() && Date.now() - new Date(f.kickoff_at) < 4 * 3600e3));
    if (!live) return;
    try {
      await pambolLoadCalendar();
      await pambolLoadBreakdown();
      pambolSafe(renderLineup); pambolSafe(renderFixtures); pambolSafe(renderStandings); pambolSafe(pambolRenderHeaders);
    } catch (e) { /* reintenta en el siguiente ciclo */ }
  }, 60000);
}

// ---------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------
async function pambolBoot() {
  pambolBuildFanbases();
  if (!pambolInitClient()) {
    Pambol.ready = true;
    pambolRenderAll();
    return;
  }
  try {
    await pambolLoadCatalog();
    await pambolLoadCalendar();
    Pambol.loadError = false;
  } catch (e) {
    console.warn('PAMBOL: error cargando datos', e);
    Pambol.loadError = true;
    showToast(pambolErr(e), 'error');
    setTimeout(pambolBoot, 15000);
    pambolRenderAll();
    return;
  }
  const { data } = await Pambol.client.auth.getSession();
  await pambolOnSession(data.session);
  Pambol.client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { Pambol.session = session; activeAuthTab = 'newpass'; openAuthModal(); return; }
    if (event === 'SIGNED_IN' && Pambol.session && session && Pambol.session.user.id === session.user.id) { Pambol.session = session; return; }
    if (event === 'TOKEN_REFRESHED') { Pambol.session = session; return; }
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') pambolOnSession(session);
  });
  await pambolLoadTrends();
  Pambol.ready = true;
  pambolRenderAll();
  pambolStartPolling();
  pambolHandlePendingInvite();
}

document.addEventListener('DOMContentLoaded', () => {
  pambolBoot();
  pambolRegisterServiceWorker();
});

// ---------------------------------------------------------------------
// Actualizaciones de la app (service worker)
// ---------------------------------------------------------------------
function pambolRegisterServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let refreshing = false;
  let userAskedUpdate = false;
  // Solo recarga cuando el usuario pidió actualizar (la primera instalación no recarga la página)
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshing || !userAskedUpdate) return; refreshing = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offer = (worker) => {
      if (document.getElementById('pambolUpdateBar')) return;
      const bar = document.createElement('div');
      bar.id = 'pambolUpdateBar';
      bar.className = 'pambol-update-bar';
      bar.innerHTML = '<span>🚀 Hay una nueva versión de PAMBOL</span>';
      const btn = document.createElement('button');
      btn.textContent = 'Actualizar';
      btn.onclick = () => { userAskedUpdate = true; btn.disabled = true; btn.textContent = 'Actualizando…'; worker.postMessage({ type: 'SKIP_WAITING' }); };
      bar.appendChild(btn);
      document.body.appendChild(bar);
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(e => console.warn('PAMBOL: service worker no registrado', e));
}
