// =====================================================================
// PAMBOL · PANEL DE ADMINISTRACIÓN
// Todo lo que se escribe aquí pasa por las reglas del servidor:
// solo las cuentas en la tabla app_admins pueden guardar.
// =====================================================================
const CFG = window.PAMBOL_CONFIG || {};
const TZ = CFG.TIMEZONE || 'America/Mexico_City';
const A = { sb: null, session: null, tab: 'resumen', tournaments: [], tournament: null, gws: [], fixtures: [], clubs: [], players: [], coaches: [], selGw: null, selFx: null };
const $main = () => document.getElementById('admMain');

// ---------- utilidades ----------
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(msg, bad) {
  const t = document.getElementById('admToast');
  t.textContent = msg; t.className = 'adm-toast show' + (bad ? ' bad' : '');
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'adm-toast'; }, bad ? 6000 : 3000);
}
function errMsg(e) { return (e && (e.message || e.error_description)) || String(e); }
function fmt(ts) { return ts ? new Date(ts).toLocaleString('es-MX', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }
function tzParts(d) {
  const o = {}; new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(d).forEach(p => { o[p.type] = p.value; });
  return o;
}
// ISO → "AAAA-MM-DDTHH:MM" en la hora de la liga
function toLocalInput(ts) {
  if (!ts) return '';
  const p = tzParts(new Date(ts));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
// "AAAA-MM-DDTHH:MM" en la hora de la liga → ISO (UTC)
function fromLocalInput(s) {
  if (!s) return null;
  const [d, t] = s.split('T'); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = (t || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, dd, hh, mm);
  const p = tzParts(new Date(guess));
  const asTz = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return new Date(guess - (asTz - guess)).toISOString();
}
function clubOpts(sel, withEmpty) { return (withEmpty ? '<option value="">—</option>' : '') + A.clubs.map(c => `<option value="${c.short}" ${c.short === sel ? 'selected' : ''}>${esc(c.short)} · ${esc(c.name)}</option>`).join(''); }
function opts(list, sel) { return list.map(([v, l]) => `<option value="${v}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`).join(''); }
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const num = (v, d = 0) => (v === '' || v == null || isNaN(Number(v))) ? d : Number(v);
const gwName = g => g ? (g.name || 'Jornada ' + g.number) : '';
const clubName = s => (A.clubs.find(c => c.short === s) || {}).name || s;

// ---------- arranque y acceso ----------
async function boot() {
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY || /PEGA_AQUI/.test(CFG.SUPABASE_ANON_KEY) || !window.supabase) {
    $main().innerHTML = '<div class="adm-card"><h2>Falta configurar Supabase</h2><p>Pega la anon key en <code>js/config.js</code> (ver GUIA_LANZAMIENTO.md).</p></div>';
    return;
  }
  A.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  const { data } = await A.sb.auth.getSession();
  A.session = data.session;
  A.sb.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_OUT' || ev === 'SIGNED_IN') { A.session = s; gate(); } });
  gate();
}

async function gate() {
  document.getElementById('admTabs').hidden = true;
  const who = document.getElementById('admWho');
  if (!A.session) {
    who.innerHTML = '';
    $main().innerHTML = `<div class="adm-card adm-narrow"><h2>Entrar</h2>
      <label>Correo</label><input id="lgEmail" type="email" autocomplete="email">
      <label>Contraseña</label><input id="lgPass" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()">
      <button class="adm-btn" onclick="login()">Entrar</button>
      <p class="adm-muted">Usa la misma cuenta que en la app. Debe estar dada de alta como administrador.</p></div>`;
    return;
  }
  who.innerHTML = `${esc(A.session.user.email)} · <a href="#" onclick="A.sb.auth.signOut();return false">Salir</a> · <a href="index.html">Ir a la app</a>`;
  const r = await A.sb.rpc('is_admin');
  if (r.error || !r.data) {
    $main().innerHTML = `<div class="adm-card"><h2>Esta cuenta no es administradora</h2>
      <p>En Supabase → SQL Editor ejecuta:</p>
      <pre>insert into public.app_admins (user_id)
select id from auth.users where email = '${esc(A.session.user.email)}';</pre><p>Luego recarga esta página.</p></div>`;
    return;
  }
  document.getElementById('admTabs').hidden = false;
  await loadAll();
  render();
}

async function login() {
  const { error } = await A.sb.auth.signInWithPassword({ email: val('lgEmail'), password: document.getElementById('lgPass').value });
  if (error) toast(errMsg(error), true);
}

async function loadAll() {
  const [t, c, p, co] = await Promise.all([
    A.sb.from('tournaments').select('*').order('created_at', { ascending: false }),
    A.sb.from('clubs').select('*').order('name'),
    A.sb.from('players').select('*').order('club_short').order('pos').order('name').limit(3000),
    A.sb.from('coaches').select('*').order('club_short')
  ]);
  A.tournaments = t.data || []; A.clubs = c.data || []; A.players = p.data || []; A.coaches = co.data || [];
  if (!A.tournament || !A.tournaments.find(x => x.id === A.tournament.id)) A.tournament = A.tournaments.find(x => x.is_current) || A.tournaments[0] || null;
  else A.tournament = A.tournaments.find(x => x.id === A.tournament.id);
  await loadCalendar();
}

async function loadCalendar() {
  A.gws = []; A.fixtures = [];
  if (!A.tournament) return;
  const g = await A.sb.from('gameweeks').select('*').eq('tournament_id', A.tournament.id).order('number');
  A.gws = g.data || [];
  if (A.gws.length) {
    const f = await A.sb.from('fixtures').select('*').in('gameweek_id', A.gws.map(x => x.id)).order('kickoff_at');
    A.fixtures = f.data || [];
  }
  if (!A.selGw || !A.gws.find(x => x.id === A.selGw)) {
    const open = A.gws.find(x => x.status !== 'scored' && A.fixtures.some(f => f.gameweek_id === x.id));
    A.selGw = (open || A.gws[0] || {}).id || null;
  }
}

document.addEventListener('click', e => {
  const b = e.target.closest('#admTabs button');
  if (!b) return;
  A.tab = b.dataset.tab;
  document.querySelectorAll('#admTabs button').forEach(x => x.classList.toggle('active', x === b));
  render();
});

function render() {
  const fn = { resumen: renderResumen, calendario: renderCalendario, actas: renderActas, jugadores: renderJugadores, dts: renderDts, torneo: renderTorneo }[A.tab];
  if (!A.tournament && A.tab !== 'torneo') {
    $main().innerHTML = '<div class="adm-card"><h2>No hay torneo</h2><p>Crea uno en la pestaña <b>Torneo</b>.</p></div>';
    return;
  }
  fn();
}

function gwSelect(id, onchange) {
  return `<select id="${id}" onchange="${onchange}">${A.gws.map(g => `<option value="${g.id}" ${g.id === A.selGw ? 'selected' : ''}>${esc(gwName(g))}${g.status === 'scored' ? ' ✔' : ''}</option>`).join('')}</select>`;
}

// ---------- JORNADAS ----------
function renderResumen() {
  const rows = A.gws.map(g => {
    const fx = A.fixtures.filter(f => f.gameweek_id === g.id);
    const fin = fx.filter(f => f.status === 'finished' || f.status === 'postponed').length;
    const first = fx.map(f => f.kickoff_at).sort()[0];
    return `<tr>
      <td><b>${g.number}</b></td>
      <td><input id="gwn_${g.id}" value="${esc(g.name || '')}" placeholder="Jornada ${g.number}"></td>
      <td>${fx.length}</td><td>${fin}/${fx.length}</td><td>${fmt(first)}</td>
      <td>${g.status === 'scored' ? `<span class="adm-pill ok">Cerrada</span><div class="adm-muted">${fmt(g.scored_at)}</div>` : '<span class="adm-pill">Abierta</span>'}</td>
      <td class="adm-actions">
        <button class="adm-btn sm" onclick="saveGwName(${g.id})">Guardar nombre</button>
        <button class="adm-btn sm" onclick="scoreGw(${g.id}, false)">Calcular puntos</button>
        <button class="adm-btn sm gold" onclick="scoreGw(${g.id}, true)">Calcular y cerrar</button>
        ${g.status === 'scored' ? `<button class="adm-btn sm ghost" onclick="reopenGw(${g.id})">Reabrir</button>` : ''}
        ${fx.length ? '' : `<button class="adm-btn sm danger" onclick="deleteGw(${g.id})">Borrar</button>`}
      </td></tr>`;
  }).join('');
  const next = (A.gws.reduce((m, g) => Math.max(m, g.number), 0) || 0) + 1;
  $main().innerHTML = `
    <div class="adm-card">
      <h2>${esc(A.tournament.name)} · Jornadas</h2>
      <p class="adm-muted">«Calcular puntos» suma los puntos con las actas cargadas (se puede repetir las veces que quieras durante la jornada).
      «Calcular y cerrar» además cierra la jornada si todos sus partidos están en FINAL o POSPUESTO. Quien no guardó equipo juega con el de la jornada anterior.</p>
      <div class="adm-scroll"><table class="adm-table"><thead><tr><th>#</th><th>Nombre</th><th>Partidos</th><th>Finalizados</th><th>Primer partido (cierre)</th><th>Estado</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="adm-empty">Sin jornadas.</td></tr>'}</tbody></table></div>
    </div>
    <div class="adm-card">
      <h3>Nueva jornada</h3>
      <div class="adm-row"><label>Número <input id="ngNum" type="number" min="1" max="40" value="${next}"></label>
      <label>Nombre <input id="ngName" placeholder="Jornada ${next} · Cuartos (ida)…"></label>
      <button class="adm-btn" onclick="createGw()">Crear</button></div>
      <p class="adm-muted">Para la Liguilla crea jornadas con nombre (por ejemplo «Cuartos de Final») y marca sus partidos con la fase correspondiente.</p>
    </div>
    <div class="adm-card" id="scoreResult" hidden></div>`;
}

async function saveGwName(id) {
  const { error } = await A.sb.from('gameweeks').update({ name: val('gwn_' + id) || null }).eq('id', id);
  if (error) return toast(errMsg(error), true);
  toast('Nombre guardado'); await loadCalendar();
}
async function createGw() {
  const number = num(val('ngNum'));
  if (!number) return toast('Escribe el número de jornada', true);
  const { error } = await A.sb.from('gameweeks').insert({ tournament_id: A.tournament.id, number, name: val('ngName') || `Jornada ${number}` });
  if (error) return toast(errMsg(error), true);
  toast('Jornada creada'); await loadCalendar(); render();
}
async function deleteGw(id) {
  if (!confirm('¿Borrar esta jornada vacía?')) return;
  const { error } = await A.sb.from('gameweeks').delete().eq('id', id);
  if (error) return toast(errMsg(error), true);
  await loadCalendar(); render();
}
async function scoreGw(id, close) {
  const g = A.gws.find(x => x.id === id);
  if (close && !confirm(`¿Calcular y cerrar ${gwName(g)}? Los puntos quedan como definitivos (puedes reabrir para corregir).`)) return;
  toast('Calculando…');
  const { data, error } = await A.sb.rpc('admin_score_gameweek', { p_gw: id, p_close: close });
  if (error) return toast(errMsg(error), true);
  await loadCalendar(); renderResumen();
  const box = document.getElementById('scoreResult');
  box.hidden = false;
  box.innerHTML = `<h3>Resultado · ${esc(gwName(g))}</h3><ul>
    <li>Equipos arrastrados de la jornada anterior: <b>${data.carried_over}</b></li>
    <li>Equipos puntuados: <b>${data.teams_scored}</b></li>
    <li>Pronósticos de quiniela puntuados: <b>${data.picks_scored}</b></li>
    <li>Partidos pendientes: <b>${data.pending_fixtures}</b></li>
    <li>Jornada cerrada: <b>${data.closed ? 'Sí' : 'No'}</b></li></ul>`;
  toast('Puntos calculados');
}
async function reopenGw(id) {
  if (!confirm('¿Reabrir la jornada para corregir actas? Después vuelve a «Calcular y cerrar».')) return;
  const { error } = await A.sb.rpc('admin_reopen_gameweek', { p_gw: id });
  if (error) return toast(errMsg(error), true);
  await loadCalendar(); render();
}

// ---------- CALENDARIO ----------
const STAGES = [['regular', 'Fase regular'], ['quarter', 'Cuartos'], ['semi', 'Semifinal'], ['final', 'Final']];
const STATUSES = [['scheduled', 'Programado'], ['live', 'En vivo'], ['finished', 'Final'], ['postponed', 'Pospuesto']];

function fixtureRow(f) {
  const id = f ? f.id : 'new';
  return `<tr>
    <td><select id="fh_${id}">${clubOpts(f && f.home_club, !f)}</select></td>
    <td><select id="fa_${id}">${clubOpts(f && f.away_club, !f)}</select></td>
    <td><input id="fk_${id}" type="datetime-local" value="${f ? toLocalInput(f.kickoff_at) : ''}"></td>
    <td><input id="fv_${id}" value="${esc(f ? f.venue || '' : '')}" placeholder="Estadio"></td>
    <td><select id="fs_${id}">${opts(STAGES, f ? f.stage : 'regular')}</select></td>
    <td><select id="ft_${id}">${opts(STATUSES, f ? f.status : 'scheduled')}</select></td>
    <td class="adm-score"><input id="fsh_${id}" type="number" min="0" max="30" value="${f && f.home_score != null ? f.home_score : ''}"> - <input id="fsa_${id}" type="number" min="0" max="30" value="${f && f.away_score != null ? f.away_score : ''}"></td>
    <td class="adm-actions">${f ? `<button class="adm-btn sm" onclick="saveFixture(${id})">Guardar</button><button class="adm-btn sm danger" onclick="deleteFixture(${id})">Borrar</button>` : '<button class="adm-btn sm gold" onclick="saveFixture(\'new\')">Añadir</button>'}</td></tr>`;
}

function renderCalendario() {
  const fx = A.fixtures.filter(f => f.gameweek_id === A.selGw);
  $main().innerHTML = `
    <div class="adm-card">
      <div class="adm-row"><h2 style="margin:0">Calendario</h2>${A.gws.length ? gwSelect('calGw', 'A.selGw=Number(this.value);renderCalendario()') : ''}</div>
      <p class="adm-muted">Horarios en hora del centro de México (${esc(TZ)}). La jornada se cierra para cada jugador al inicio del partido de su club. El marcador y el estado también se pueden capturar en «Actas».</p>
      ${A.gws.length ? `<div class="adm-scroll"><table class="adm-table"><thead><tr><th>Local</th><th>Visita</th><th>Fecha y hora</th><th>Estadio</th><th>Fase</th><th>Estado</th><th>Marcador</th><th></th></tr></thead>
      <tbody>${fx.map(fixtureRow).join('')}${fixtureRow(null)}</tbody></table></div>` : '<p>Primero crea una jornada en la pestaña «Jornadas» o importa un CSV.</p>'}
    </div>
    <div class="adm-card">
      <h3>Importar calendario (CSV)</h3>
      <p class="adm-muted">Una línea por partido: <code>jornada,local,visita,fecha,hora,estadio,fase</code>. Ejemplo:<br>
      <code>1,TOL,CHI,2027-01-09,19:00,Estadio Nemesio Diez,regular</code><br>
      Local y visita con la clave del club (${A.clubs.map(c => c.short).join(', ')}) o su nombre. Las jornadas que no existan se crean solas. Estadio y fase son opcionales.</p>
      <textarea id="csvFx" rows="8" placeholder="jornada,local,visita,fecha,hora,estadio,fase"></textarea>
      <button class="adm-btn" onclick="importFixtures()">Importar</button>
    </div>`;
}

function readFixtureForm(id) {
  const home = val('fh_' + id), away = val('fa_' + id), k = val('fk_' + id);
  if (!home || !away || home === away) throw new Error('Elige dos clubes distintos');
  if (!k) throw new Error('Falta la fecha y hora');
  const sh = val('fsh_' + id), sa = val('fsa_' + id);
  const status = val('ft_' + id);
  if (status === 'finished' && (sh === '' || sa === '')) throw new Error('Un partido en FINAL necesita marcador');
  return { home_club: home, away_club: away, kickoff_at: fromLocalInput(k), venue: val('fv_' + id) || null, stage: val('fs_' + id), status,
    home_score: sh === '' ? null : Number(sh), away_score: sa === '' ? null : Number(sa) };
}
async function saveFixture(id) {
  let row;
  try { row = readFixtureForm(id); } catch (e) { return toast(e.message, true); }
  const q = id === 'new' ? A.sb.from('fixtures').insert({ ...row, gameweek_id: A.selGw }) : A.sb.from('fixtures').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
  const { error } = await q;
  if (error) return toast(errMsg(error), true);
  toast('Partido guardado'); await loadCalendar(); renderCalendario();
}
async function deleteFixture(id) {
  if (!confirm('¿Borrar el partido? También se borran sus actas y los pronósticos de quiniela de ese partido.')) return;
  const { error } = await A.sb.from('fixtures').delete().eq('id', id);
  if (error) return toast(errMsg(error), true);
  await loadCalendar(); renderCalendario();
}
const CLUB_ALIASES = { chivas: 'CHI', guadalajara: 'CHI', america: 'AME', 'cruz azul': 'CAZ', tigres: 'TIG', rayados: 'MTY', monterrey: 'MTY', toluca: 'TOL',
  pumas: 'PUM', unam: 'PUM', pachuca: 'PAC', tuzos: 'PAC', santos: 'SAN', leon: 'LEO', atlas: 'ATS', necaxa: 'NEC', 'san luis': 'ADSL', 'atletico de san luis': 'ADSL',
  xolos: 'TIJ', tijuana: 'TIJ', juarez: 'JUA', bravos: 'JUA', puebla: 'PUE', queretaro: 'QRO', gallos: 'QRO', atlante: 'ATL', potros: 'ATL' };
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
function findClub(s) {
  const k = norm(s);
  if (!k) return null;
  const c = A.clubs.find(c => norm(c.short) === k || norm(c.name) === k || norm(c.nickname) === k);
  if (c) return c.short;
  if (CLUB_ALIASES[k] && A.clubs.some(c => c.short === CLUB_ALIASES[k])) return CLUB_ALIASES[k];
  const part = A.clubs.find(c => norm(c.name).includes(k));
  return part ? part.short : null;
}
async function importFixtures() {
  const lines = val('csvFx').split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^jornada/i.test(l));
  if (!lines.length) return toast('Pega al menos una línea', true);
  const rows = [], errors = [];
  lines.forEach((l, i) => {
    const c = l.split(/[,;\t]/).map(x => x.trim());
    const [n, h, a, d, t, venue, stage] = c;
    const home = findClub(h || ''), away = findClub(a || '');
    if (!num(n) || !home || !away || !/^\d{4}-\d{2}-\d{2}$/.test(d || '') || !/^\d{1,2}:\d{2}$/.test(t || '')) { errors.push(`Línea ${i + 1}: «${l}»`); return; }
    rows.push({ number: num(n), home_club: home, away_club: away, kickoff_at: fromLocalInput(`${d}T${t.padStart(5, '0')}`), venue: venue || null, stage: STAGES.some(s => s[0] === stage) ? stage : 'regular' });
  });
  if (errors.length) return toast('Revisa: ' + errors.slice(0, 3).join(' · '), true);
  const missing = [...new Set(rows.map(r => r.number))].filter(n => !A.gws.find(g => g.number === n));
  if (missing.length) {
    const { error } = await A.sb.from('gameweeks').insert(missing.map(n => ({ tournament_id: A.tournament.id, number: n, name: `Jornada ${n}` })));
    if (error) return toast(errMsg(error), true);
    await loadCalendar();
  }
  const payload = rows.map(r => ({ gameweek_id: A.gws.find(g => g.number === r.number).id, home_club: r.home_club, away_club: r.away_club, kickoff_at: r.kickoff_at, venue: r.venue, stage: r.stage }));
  const { error } = await A.sb.from('fixtures').insert(payload);
  if (error) return toast(errMsg(error), true);
  toast(`${payload.length} partidos importados`);
  await loadCalendar(); renderCalendario();
}

// ---------- ACTAS ----------
const STAT_COLS = [
  ['minutes', 'Min', 'Minutos jugados'], ['started', 'Tit', 'Fue titular'], ['goals', 'G', 'Goles (todos)'], ['penalty_goals', 'G pen', 'De esos goles, de penal'],
  ['golden_goals', 'G oro', 'Gol de oro (definió el partido)'], ['set_piece_goals', 'G BP', 'Goles de balón parado'], ['assists', 'A', 'Asistencias'],
  ['pre_assists', 'Pre', 'Pre-asistencias'], ['set_piece_assists', 'A BP', 'Asistencias de balón parado'], ['saves', 'Atj', 'Atajadas'],
  ['penalties_saved', 'Pen at', 'Penales atajados'], ['penalties_missed', 'Pen fall', 'Penales fallados'], ['yellow_cards', 'TA', 'Tarjetas amarillas (0-2)'],
  ['red_cards', 'TR', 'Tarjeta roja (0-1)'], ['penalties_committed', 'Pen com', 'Penales cometidos'], ['fouls', 'Faltas', 'Faltas cometidas'], ['dribbles', 'Reg', 'Regates completados']
];

async function renderActas() {
  const fxs = A.fixtures.filter(f => f.gameweek_id === A.selGw);
  if (!A.selFx || !fxs.find(f => f.id === A.selFx)) A.selFx = (fxs[0] || {}).id || null;
  const f = fxs.find(x => x.id === A.selFx);
  $main().innerHTML = `<div class="adm-card"><div class="adm-row"><h2 style="margin:0">Actas</h2>${A.gws.length ? gwSelect('actGw', 'A.selGw=Number(this.value);A.selFx=null;renderActas()') : ''}
    <select id="actFx" onchange="A.selFx=Number(this.value);renderActas()">${fxs.map(x => `<option value="${x.id}" ${x.id === A.selFx ? 'selected' : ''}>${esc(x.home_club)} vs ${esc(x.away_club)} · ${fmt(x.kickoff_at)}${x.status === 'finished' ? ' ✔' : ''}</option>`).join('')}</select></div>
    ${f ? '<div id="actBody" class="adm-empty">Cargando acta…</div>' : '<p>No hay partidos en esta jornada.</p>'}</div>`;
  if (!f) return;
  const r = await A.sb.from('player_stats').select('*').eq('fixture_id', f.id);
  if (r.error) return toast(errMsg(r.error), true);
  const have = {}; (r.data || []).forEach(s => { have[s.player_id] = s; });
  A.acta = have;
  const order = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const squad = club => A.players.filter(p => p.club_short === club && (p.active || have[p.id])).sort((a, b) => order[a.pos] - order[b.pos] || a.name.localeCompare(b.name));
  // Jugadores con acta que ya no están en ese club (traspaso a mitad de torneo)
  const extra = (r.data || []).filter(s => !A.players.find(p => p.id === s.player_id && (p.club_short === f.home_club || p.club_short === f.away_club))).map(s => A.players.find(p => p.id === s.player_id)).filter(Boolean);
  const head = `<tr><th>Jugador</th>${STAT_COLS.map(c => `<th title="${esc(c[2])}">${c[1]}</th>`).join('')}<th>Pts</th></tr>`;
  const prow = p => {
    const s = have[p.id] || {};
    return `<tr data-pid="${p.id}" class="${s.minutes ? 'played' : ''}"><td class="adm-pname"><span class="adm-pos ${p.pos}">${p.pos}</span> ${esc(p.name)}</td>
      ${STAT_COLS.map(([k]) => k === 'started' ? `<td><input type="checkbox" data-k="started" ${s.started ? 'checked' : ''}></td>` : `<td><input type="number" min="0" data-k="${k}" value="${s[k] ? s[k] : ''}" placeholder="0"></td>`).join('')}
      <td class="adm-pts">${s.base_points != null ? Number(s.base_points) : ''}</td></tr>`;
  };
  const block = club => `<tbody><tr class="adm-club"><td colspan="${STAT_COLS.length + 2}">${esc(clubName(club))}</td></tr>${squad(club).map(prow).join('')}</tbody>`;
  document.getElementById('actBody').outerHTML = `
    <div class="adm-row adm-matchbar">
      <b>${esc(clubName(f.home_club))}</b><input id="acH" type="number" min="0" max="30" value="${f.home_score ?? ''}"> - <input id="acA" type="number" min="0" max="30" value="${f.away_score ?? ''}"><b>${esc(clubName(f.away_club))}</b>
      <select id="acSt">${opts(STATUSES, f.status)}</select>
    </div>
    <p class="adm-muted">Llena solo a quienes jugaron (minutos &gt; 0). Las casillas vacías cuentan como 0. Los puntos base se calculan en el servidor al guardar. Pasa el cursor sobre cada columna para ver qué significa.</p>
    <div class="adm-scroll"><table class="adm-table adm-acta" id="actaTable"><thead>${head}</thead>${block(f.home_club)}${block(f.away_club)}${extra.length ? `<tbody><tr class="adm-club"><td colspan="${STAT_COLS.length + 2}">Otros (cambiaron de club)</td></tr>${extra.map(prow).join('')}</tbody>` : ''}</table></div>
    <div class="adm-row" style="margin-top:10px"><button class="adm-btn gold" onclick="saveActa(${f.id})">💾 Guardar acta y marcador</button>
    <button class="adm-btn ghost" onclick="scoreGw(${f.gameweek_id}, false).then(()=>{A.tab='actas';renderActas()})">Recalcular puntos de la jornada</button></div>`;
}

async function saveActa(fixtureId) {
  const f = A.fixtures.find(x => x.id === fixtureId);
  const h = val('acH'), a = val('acA'), st = val('acSt');
  if (st === 'finished' && (h === '' || a === '')) return toast('Para marcar FINAL captura el marcador', true);
  const up = [], del = [];
  const existing = new Set();
  document.querySelectorAll('#actaTable tr[data-pid]').forEach(tr => {
    const pid = Number(tr.dataset.pid);
    const row = { fixture_id: fixtureId, player_id: pid };
    let any = false;
    tr.querySelectorAll('input[data-k]').forEach(inp => {
      const k = inp.dataset.k;
      if (k === 'started') { row.started = inp.checked; if (inp.checked) any = true; }
      else { row[k] = num(inp.value); if (row[k]) any = true; }
    });
    if (A.acta[pid]) existing.add(pid);
    if (any) {
      const p = A.players.find(x => x.id === pid);
      // Se respeta el club con el que jugó ese partido aunque luego cambie de equipo
      row.club_short = (A.acta[pid] && A.acta[pid].club_short) || p.club_short;
      up.push(row);
    } else if (existing.has(pid)) del.push(pid);
  });
  const bad = up.find(r => r.yellow_cards > 2 || r.red_cards > 1 || r.minutes > 130 || r.penalty_goals > r.goals || r.golden_goals > r.goals || r.set_piece_goals > r.goals || r.set_piece_assists > r.assists);
  if (bad) return toast(`Revisa a ${(A.players.find(p => p.id === bad.player_id) || {}).name}: datos imposibles (tarjetas, minutos o goles)`, true);
  const fxUpd = await A.sb.from('fixtures').update({ home_score: h === '' ? null : Number(h), away_score: a === '' ? null : Number(a), status: st, updated_at: new Date().toISOString() }).eq('id', fixtureId);
  if (fxUpd.error) return toast(errMsg(fxUpd.error), true);
  if (up.length) {
    const r = await A.sb.from('player_stats').upsert(up, { onConflict: 'fixture_id,player_id' });
    if (r.error) return toast(errMsg(r.error), true);
  }
  if (del.length) {
    const r = await A.sb.from('player_stats').delete().eq('fixture_id', fixtureId).in('player_id', del);
    if (r.error) return toast(errMsg(r.error), true);
  }
  toast(`Acta guardada: ${up.length} jugadores${del.length ? `, ${del.length} quitados` : ''}. Recuerda «Calcular puntos».`);
  await loadCalendar(); renderActas();
}

// ---------- JUGADORES ----------
const ROLES = [['probable_starter', 'Titular probable'], ['questionable', 'En duda'], ['out', 'Lesionado / fuera'], ['suspended', 'Suspendido'], ['unverified', 'Sin confirmar']];
let jugFilter = { q: '', club: '' };

function renderJugadores() {
  const q = jugFilter.q.toLowerCase();
  const list = A.players.filter(p => (!jugFilter.club || p.club_short === jugFilter.club) && (!q || p.name.toLowerCase().includes(q) || String(p.id) === q));
  const shown = list.slice(0, 120);
  $main().innerHTML = `
    <div class="adm-card">
      <div class="adm-row"><h2 style="margin:0">Jugadores (${list.length})</h2>
        <input id="jq" placeholder="Buscar nombre o ID" value="${esc(jugFilter.q)}" oninput="jugFilter.q=this.value;clearTimeout(window._jt);window._jt=setTimeout(renderJugadores,250)">
        <select onchange="jugFilter.club=this.value;renderJugadores()">${clubOpts(jugFilter.club, true)}</select>
        <button class="adm-btn ghost" onclick="snapshotPrices()">Nueva semana de cotizaciones</button></div>
      <p class="adm-muted">Cambiar el precio no afecta los equipos ya guardados hasta que el DT haga cambios. «Nueva semana de cotizaciones» toma los precios actuales como base para las flechas ▲▼ del mercado (úsalo justo antes de publicar los precios nuevos).</p>
      <div class="adm-scroll"><table class="adm-table"><thead><tr><th>ID</th><th>Nombre</th><th>Pos</th><th>Club</th><th>Precio</th><th>Forma</th><th>Proy.</th><th>Situación</th><th>Nota visible</th><th>#</th><th>Ex clubes</th><th>Activo</th><th></th></tr></thead>
      <tbody>${shown.map(p => `<tr>
        <td>${p.id}</td><td><input id="pn_${p.id}" value="${esc(p.name)}"></td>
        <td><select id="pp_${p.id}">${opts([['GK', 'POR'], ['DEF', 'DEF'], ['MID', 'MED'], ['FWD', 'DEL']], p.pos)}</select></td>
        <td><select id="pc_${p.id}">${clubOpts(p.club_short)}</select></td>
        <td><input id="ppr_${p.id}" type="number" step="0.1" min="0.5" max="25" value="${p.price}" class="w5">${p.prev_price != null && Number(p.prev_price) !== Number(p.price) ? `<div class="adm-muted">antes ${p.prev_price}</div>` : ''}</td>
        <td><input id="pf_${p.id}" type="number" step="0.1" min="0" max="10" value="${p.form}" class="w4"></td>
        <td><input id="pj_${p.id}" type="number" step="0.1" value="${p.projection ?? ''}" class="w4"></td>
        <td><select id="pr_${p.id}">${opts(ROLES, p.role)}</select></td>
        <td><input id="pa_${p.id}" value="${esc(p.availability)}"></td>
        <td><input id="psn_${p.id}" type="number" min="0" max="99" value="${p.squad_number ?? ''}" class="w4"></td>
        <td><input id="px_${p.id}" value="${esc((p.ex_clubs || []).join(','))}" placeholder="AME,CHI" class="w6"></td>
        <td><input id="pac_${p.id}" type="checkbox" ${p.active ? 'checked' : ''}></td>
        <td><button class="adm-btn sm" onclick="savePlayer(${p.id})">Guardar</button></td></tr>`).join('')}</tbody></table></div>
      ${list.length > shown.length ? `<p class="adm-muted">Mostrando ${shown.length} de ${list.length}. Filtra por club o nombre.</p>` : ''}
    </div>
    <div class="adm-card"><h3>Nuevo jugador</h3>
      <div class="adm-row">
        <input id="npName" placeholder="Nombre (Apodo)"><select id="npPos">${opts([['GK', 'POR'], ['DEF', 'DEF'], ['MID', 'MED'], ['FWD', 'DEL']], 'MID')}</select>
        <select id="npClub">${clubOpts('')}</select><input id="npPrice" type="number" step="0.1" placeholder="Precio" class="w5">
        <button class="adm-btn gold" onclick="createPlayer()">Añadir</button></div></div>
    <div class="adm-card"><h3>Actualización masiva (CSV)</h3>
      <p class="adm-muted">Una línea por jugador: <code>id,precio,situación,nota</code>. Situación: probable_starter, questionable, out, suspended o unverified. Deja vacío lo que no cambie. Ejemplo: <code>10157,10.9,probable_starter,Titular confirmado</code></p>
      <textarea id="csvPl" rows="6"></textarea><button class="adm-btn" onclick="bulkPlayers()">Aplicar</button></div>`;
  const inp = document.getElementById('jq'); if (inp && jugFilter.q) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

function exClubs(s) { return s.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(x => A.clubs.some(c => c.short === x)); }
async function savePlayer(id) {
  const row = { name: val('pn_' + id), pos: val('pp_' + id), club_short: val('pc_' + id), price: num(val('ppr_' + id)), form: num(val('pf_' + id), 5),
    projection: val('pj_' + id) === '' ? null : num(val('pj_' + id)), role: val('pr_' + id), availability: val('pa_' + id) || 'Sin confirmación reciente',
    squad_number: val('psn_' + id) === '' ? null : num(val('psn_' + id)), ex_clubs: exClubs(val('px_' + id)), active: document.getElementById('pac_' + id).checked, updated_at: new Date().toISOString() };
  const { data, error } = await A.sb.from('players').update(row).eq('id', id).select().single();
  if (error) return toast(errMsg(error), true);
  Object.assign(A.players.find(p => p.id === id), data);
  toast('Jugador guardado');
}
async function createPlayer() {
  const row = { name: val('npName'), pos: val('npPos'), club_short: val('npClub'), price: num(val('npPrice')) };
  if (!row.name || !row.price) return toast('Nombre y precio son obligatorios', true);
  const { data, error } = await A.sb.from('players').insert({ ...row, prev_price: row.price }).select().single();
  if (error) return toast(errMsg(error), true);
  A.players.push(data); jugFilter = { q: String(data.id), club: '' };
  toast('Jugador añadido con ID ' + data.id); renderJugadores();
}
async function bulkPlayers() {
  const lines = val('csvPl').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let ok = 0; const errs = [];
  for (const l of lines) {
    const [id, price, role, ...note] = l.split(',').map(x => x.trim());
    const p = A.players.find(x => x.id === Number(id));
    if (!p) { errs.push(l); continue; }
    const row = { updated_at: new Date().toISOString() };
    if (price) row.price = num(price);
    if (role) { if (!ROLES.some(r => r[0] === role)) { errs.push(l); continue; } row.role = role; }
    if (note.join(',')) row.availability = note.join(',');
    const { data, error } = await A.sb.from('players').update(row).eq('id', p.id).select().single();
    if (error) errs.push(l + ' → ' + errMsg(error)); else { Object.assign(p, data); ok++; }
  }
  toast(`${ok} jugadores actualizados${errs.length ? ` · ${errs.length} con error: ${errs.slice(0, 2).join(' | ')}` : ''}`, errs.length > 0);
  renderJugadores();
}
async function snapshotPrices() {
  if (!confirm('¿Tomar los precios actuales como base de la semana? Las flechas ▲▼ del mercado vuelven a 0.')) return;
  const { data, error } = await A.sb.rpc('admin_snapshot_prices');
  if (error) return toast(errMsg(error), true);
  toast(`Listo: ${data} jugadores actualizados`); await loadAll(); renderJugadores();
}

// ---------- DTs ----------
function renderDts() {
  $main().innerHTML = `<div class="adm-card"><h2>Directores técnicos</h2>
    <p class="adm-muted">Si un club cambia de DT, edita el nombre aquí (el ID se conserva y los equipos que lo tenían siguen siendo válidos).</p>
    <div class="adm-scroll"><table class="adm-table"><thead><tr><th>ID</th><th>Nombre</th><th>Club</th><th>Nac.</th><th>Precio</th><th>Esquema</th><th>Perfil</th><th>Activo</th><th></th></tr></thead><tbody>
    ${A.coaches.map(c => `<tr><td>${c.id}</td><td><input id="cn_${c.id}" value="${esc(c.name)}"></td><td><select id="cc_${c.id}">${clubOpts(c.club_short)}</select></td>
      <td><input id="cnat_${c.id}" value="${esc(c.nat || '')}" class="w4"></td><td><input id="cp_${c.id}" type="number" step="0.1" value="${c.price}" class="w5"></td>
      <td><input id="cf_${c.id}" value="${esc(c.formation || '')}" class="w5"></td><td><input id="cpr_${c.id}" value="${esc(c.profile || '')}"></td>
      <td><input id="cac_${c.id}" type="checkbox" ${c.active ? 'checked' : ''}></td><td><button class="adm-btn sm" onclick="saveCoach(${c.id})">Guardar</button></td></tr>`).join('')}
    </tbody></table></div></div>`;
}
async function saveCoach(id) {
  const row = { name: val('cn_' + id), club_short: val('cc_' + id), nat: val('cnat_' + id) || null, price: num(val('cp_' + id)), formation: val('cf_' + id) || null, profile: val('cpr_' + id) || null, active: document.getElementById('cac_' + id).checked };
  const { data, error } = await A.sb.from('coaches').update(row).eq('id', id).select().single();
  if (error) return toast(errMsg(error), true);
  Object.assign(A.coaches.find(c => c.id === id), data); toast('DT guardado');
}

// ---------- TORNEO ----------
function renderTorneo() {
  const t = A.tournament;
  $main().innerHTML = `
    <div class="adm-card"><h2>Torneos</h2>
      <div class="adm-scroll"><table class="adm-table"><thead><tr><th>Clave</th><th>Nombre</th><th>Actual</th><th>Campeón</th><th></th></tr></thead><tbody>
      ${A.tournaments.map(x => `<tr><td>${esc(x.id)}</td><td>${esc(x.name)}</td><td>${x.is_current ? '<span class="adm-pill ok">Actual</span>' : ''}</td><td>${esc(x.champion_club ? clubName(x.champion_club) : '—')}</td>
        <td class="adm-actions"><button class="adm-btn sm" onclick="A.tournament=A.tournaments.find(y=>y.id==='${x.id}');A.selGw=null;loadCalendar().then(render)">Administrar</button>${x.is_current ? '' : `<button class="adm-btn sm gold" onclick="setCurrent('${x.id}')">Hacer actual</button>`}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="adm-muted">Estás administrando: <b>${t ? esc(t.name) : '—'}</b>. La app muestra solo el torneo «Actual».</p></div>
    ${t ? `<div class="adm-card"><h3>Liguilla y campeón · ${esc(t.name)}</h3>
      <div class="adm-row"><label>Cierre del pronóstico de campeón <input id="tLock" type="datetime-local" value="${toLocalInput(t.liguilla_lock_at)}"></label>
      <button class="adm-btn" onclick="saveLock()">Guardar cierre</button></div>
      <p class="adm-muted">Mientras no haya fecha de cierre, los usuarios pueden armar su cuadro pero no guardarlo. Pon el cierre al inicio del primer partido de Cuartos.</p>
      <div class="adm-row"><label>Campeón oficial <select id="tChamp">${clubOpts(t.champion_club, true)}</select></label>
      <button class="adm-btn gold" onclick="setChampion()">Definir campeón y dar +20</button></div></div>` : ''}
    <div class="adm-card"><h3>Nuevo torneo</h3>
      <div class="adm-row"><input id="ntId" placeholder="Clave, ej. AP2027" class="w8"><input id="ntName" placeholder="Nombre, ej. Apertura 2027"><button class="adm-btn" onclick="createTournament()">Crear</button></div>
      <p class="adm-muted">Al crear un torneo nuevo no cambia el actual. Carga su calendario y luego pulsa «Hacer actual». Los puntos totales se reinician con el torneo.</p></div>`;
}
async function saveLock() {
  const { error } = await A.sb.from('tournaments').update({ liguilla_lock_at: fromLocalInput(val('tLock')) }).eq('id', A.tournament.id);
  if (error) return toast(errMsg(error), true);
  toast('Cierre guardado'); await loadAll(); renderTorneo();
}
async function setChampion() {
  const club = val('tChamp');
  if (!club) return toast('Elige un club', true);
  if (!confirm(`¿${clubName(club)} es el campeón de ${A.tournament.name}?`)) return;
  const { data, error } = await A.sb.rpc('admin_set_champion', { p_tournament: A.tournament.id, p_club: club });
  if (error) return toast(errMsg(error), true);
  toast(`Campeón definido. ${data.picks_scored} pronósticos puntuados.`); await loadAll(); renderTorneo();
}
async function setCurrent(id) {
  if (!confirm('¿Hacer este torneo el actual? La app empezará a mostrarlo de inmediato.')) return;
  const { error } = await A.sb.rpc('admin_set_current_tournament', { p_tournament: id });
  if (error) return toast(errMsg(error), true);
  await loadAll(); renderTorneo();
}
async function createTournament() {
  const id = val('ntId').toUpperCase().replace(/[^A-Z0-9]/g, ''), name = val('ntName');
  if (!id || !name) return toast('Clave y nombre son obligatorios', true);
  const { error } = await A.sb.from('tournaments').insert({ id, name, is_current: false });
  if (error) return toast(errMsg(error), true);
  toast('Torneo creado'); await loadAll(); renderTorneo();
}

boot();
