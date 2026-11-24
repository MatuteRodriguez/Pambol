// =====================================================================
// PAMBOL · PANTALLAS CON DATOS REALES
// Quiniela, tabla, liguilla, mercado, cuenta, ligas, rankings, diario.
// =====================================================================

// ---------------------------------------------------------------------
// MERCADO
// ---------------------------------------------------------------------
function renderMarket() {
  const searchEl = document.getElementById('playerSearch');
  const container = document.getElementById('marketListContainer');
  if (!searchEl || !container) return;
  const search = searchEl.value.toLowerCase().trim();
  const club = document.getElementById('clubFilter')?.value || 'ALL';
  const remaining = Math.max(0, 100.0 - calculateTotalSquadCost());
  const affordDisp = document.getElementById('affordMaxPriceDisplay');
  if (affordDisp) affordDisp.innerText = `≤ ${remaining.toFixed(1)} V`;
  const inSquad = new Set(squadIds());
  const filtered = DB.players.filter(p =>
    p.name.toLowerCase().includes(search) && (club === 'ALL' || p.team === club) &&
    (currentPosFilter === 'ALL' || p.pos === currentPosFilter) && (!filterOnlyAffordable || p.price <= remaining));
  const sorters = {
    price_desc: (a, b) => b.price - a.price || a.name.localeCompare(b.name),
    price_asc: (a, b) => a.price - b.price || a.name.localeCompare(b.name),
    form_desc: (a, b) => b.form - a.form || b.price - a.price
  };
  filtered.sort(sorters[currentMarketSort] || sorters.price_desc);
  const label = { price_desc: 'mayor precio', price_asc: 'menor precio', form_desc: 'mejor forma' }[currentMarketSort] || 'precio';
  document.getElementById('marketCount').innerText = `${filtered.length} futbolistas · ordenados por ${label}`;
  container.innerHTML = filtered.slice(0, 250).map(p => {
    const f = p.fantasy || {};
    const statusClass = f.role === 'probable_starter' ? 'fb-green' : (f.role === 'questionable' ? 'fb-yellow' : (f.role === 'out' || f.role === 'suspended' ? 'fb-red' : 'fb-gray'));
    const trendClass = p.trend > 0 ? 'trend-up' : (p.trend < 0 ? 'trend-down' : '');
    const trendArrow = p.trend > 0 ? `▲ +${p.trend.toFixed(1)} V` : (p.trend < 0 ? `▼ ${p.trend.toFixed(1)} V` : '= 0.0 V');
    const veda = isPlayerInVeda(p) ? ' 🔒' : '';
    return `
      <div class="player-row" onclick="openPlayerDetail(${p.id})">
        <div class="player-row-left">
          <div class="pos-tag ${p.pos}">${p.pos}</div>
          <div class="player-meta">
            <h4>${escapeHtml(p.name)}${veda}${inSquad.has(p.id) ? ' <span class="pambol-in-squad">EN TU EQUIPO</span>' : ''}</h4>
            <p>${escapeHtml(p.team)} · Forma ⭐ ${Number(p.form).toFixed(1)} · ${escapeHtml(p.rival || 'Sin partido')}</p>
            <div class="market-extra"><span class="fantasy-badge ${statusClass}">${escapeHtml(f.availability || 'Sin confirmación')}</span>${f.projection != null ? ` · Proyección <strong>${f.projection}</strong>` : ''}</div>
          </div>
        </div>
        <div class="player-row-right">
          <div class="player-row-price">${Number(p.price).toFixed(1)} V</div>
          <div class="player-row-trend ${trendClass}">${trendArrow}</div>
        </div>
      </div>`;
  }).join('') + (filtered.length > 250 ? `<div class="pambol-muted" style="text-align:center;padding:10px">Mostrando 250 de ${filtered.length}. Usa el buscador o los filtros.</div>` : '');
}

function openPlayerModal(name) {
  const p = DB.players.find(x => x.name === name);
  if (p) openPlayerDetail(p.id);
}

function executeClausulaRescision() {
  pambolDialog('Las cláusulas de rescisión y las subastas entre amigos llegan en una próxima versión.');
}

function renderStockMovers() {
  const movers = DB.players.filter(p => p.trend).sort((a, b) => b.trend - a.trend);
  const card = (p, up) => `
    <div class="stock-ticker-card" onclick="openPlayerDetail(${p.id})">
      <div>
        <div style="font-size:13px;font-weight:800;color:#fff">${escapeHtml(p.name)}</div>
        <div style="font-size:10.5px;color:#cbd5e1">${escapeHtml(p.team)} · ${POS_DISPLAY[p.pos]} · Cotización: <b style="color:var(--gold)">${p.price.toFixed(1)} V</b></div>
      </div>
      <div class="stock-trend-badge ${up ? 'up' : 'down'}">${up ? '+' : ''}${p.trend.toFixed(1)} V</div>
    </div>`;
  const up = movers.filter(p => p.trend > 0).slice(0, 8);
  const down = movers.filter(p => p.trend < 0).reverse().slice(0, 8);
  const empty = '<div class="pambol-empty">Aún no hay cambios de cotización esta semana.</div>';
  const u = document.getElementById('stockMoversUpList'), d = document.getElementById('stockMoversDownList');
  if (u) u.innerHTML = up.map(p => card(p, true)).join('') || empty;
  if (d) d.innerHTML = down.map(p => card(p, false)).join('') || empty;
}

// ---------------------------------------------------------------------
// QUINIELA
// ---------------------------------------------------------------------
function pambolRenderGwSelector() {
  const el = document.getElementById('quinielaGwSelector');
  if (!el) return;
  if (!Pambol.gameweeks.length) { el.innerHTML = `<div class="gw-chip-btn active">${Pambol.online ? 'Calendario próximamente' : 'Sin conexión'}</div>`; return; }
  el.innerHTML = [...Pambol.gameweeks].sort((a, b) => a.number - b.number).map(g => {
    const tag = g.status === 'scored' ? 'Final' : (gwInProgress(g) ? 'En juego' : (Pambol.editGw && g.id === Pambol.editGw.id ? 'Abierta' : (gwFixtures(g.id).some(fixtureStarted) ? 'Jugada' : 'Próxima')));
    const active = Pambol.viewGw && g.id === Pambol.viewGw.id;
    return `<div class="gw-chip-btn ${active ? 'active' : ''} ${g.status === 'scored' ? 'historical' : ''}" onclick="switchGw(${g.id}, this)">${gwShort(g)} · ${tag}</div>`;
  }).join('');
  const act = el.querySelector('.active');
  if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function switchGw(gwId, el) {
  const g = gwById(Number(gwId)) || gwByNumber(gwId);
  if (!g) return;
  Pambol.viewGw = g; currentGw = String(g.number); selectedFixtureDay = 'ALL';
  renderFixtures();
  pambolLoadTrends().then(renderFixtures);
}

function pambolRenderDayFilter(fixtures) {
  const el = document.getElementById('fixtureDayFilter');
  if (!el) return;
  const days = [];
  fixtures.forEach(f => { const k = fmtDayKey(f.kickoff_at); if (!days.includes(k)) days.push(k); });
  const count = k => fixtures.filter(f => fmtDayKey(f.kickoff_at) === k).length;
  el.innerHTML = `<button class="day-filter-btn ${selectedFixtureDay === 'ALL' ? 'active' : ''}" onclick="setFixtureDayFilter('ALL', this)">Todos (${fixtures.length})</button>` +
    days.map(k => `<button class="day-filter-btn ${selectedFixtureDay === k ? 'active' : ''}" onclick="setFixtureDayFilter('${k}', this)">${k} (${count(k)})</button>`).join('');
}

function quinielaPoints(pick, f) {
  if (!pick || f.home_score == null || f.away_score == null) return null;
  if (pick.h === f.home_score && pick.a === f.away_score) return 5;
  return Math.sign(pick.h - pick.a) === Math.sign(f.home_score - f.away_score) ? 3 : 0;
}

function renderFixtures() {
  const container = document.getElementById('fixturesContainer');
  if (!container) return;
  pambolRenderGwSelector();
  const g = Pambol.viewGw;
  if (!g) {
    container.innerHTML = `<div class="pambol-empty">${Pambol.online ? 'El calendario del torneo se publica pronto. Vuelve en unos días.' : 'Conéctate a internet para ver el calendario.'}</div>`;
    pambolRenderDayFilter([]);
    return;
  }
  const all = gwFixtures(g.id);
  pambolRenderDayFilter(all);
  const fixtures = selectedFixtureDay === 'ALL' ? all : all.filter(f => fmtDayKey(f.kickoff_at) === selectedFixtureDay);
  const open = all.filter(f => !fixtureLocked(f));
  const done = all.filter(f => userPicks[f.id]).length;
  const statusEl = document.getElementById('quinielaStatus');
  if (statusEl) statusEl.innerText = `Pronósticos: ${done} / ${all.length} listos`;
  const saveCountEl = document.getElementById('quinielaSaveCount');
  if (saveCountEl) saveCountEl.innerText = `(${done}/${all.length} Listos)`;
  const pot = document.getElementById('quinielaPotential');
  if (pot) {
    const earned = all.reduce((a, f) => a + (Pambol.pickPoints[f.id] || 0), 0);
    pot.innerText = g.status === 'scored' ? `Ganaste: ${earned} Pts` : `Potencial: ${open.length * 5} Pts`;
  }
  if (!fixtures.length) { container.innerHTML = '<div class="pambol-empty">No hay partidos cargados para esta jornada.</div>'; return; }

  container.innerHTML = fixtures.map(f => {
    const locked = fixtureLocked(f);
    const pick = userPicks[f.id];
    const shown = pick || { h: 0, a: 0 };
    const scoreStr = `${shown.h}-${shown.a}`;
    const outcome = !pick ? 'SIN PRONÓSTICO' : (pick.h > pick.a ? 'GANA LOCAL' : (pick.h < pick.a ? 'GANA VISITA' : 'EMPATE'));
    const outcomePillClass = !pick ? '' : (pick.h > pick.a ? 'win-local' : (pick.h < pick.a ? 'win-away' : 'draw'));
    const unsaved = pick && !locked && (!Pambol.savedPicks[f.id] || Pambol.savedPicks[f.id].h !== pick.h || Pambol.savedPicks[f.id].a !== pick.a);
    const hasScore = f.home_score != null && f.away_score != null && fixtureStarted(f);
    const pts = Pambol.pickPoints[f.id] != null && f.status === 'finished' && g.status === 'scored' ? Pambol.pickPoints[f.id] : quinielaPoints(pick, f);
    const statusTxt = f.status === 'finished' ? 'FINAL' : (f.status === 'postponed' ? 'POSPUESTO' : (fixtureStarted(f) ? 'EN JUEGO' : ''));
    const tr = Pambol.trends[f.id];
    const stepper = (side) => locked ? '' : `
      <div class="stepper">
        <button class="step-btn" onclick="adjustScore(${f.id}, '${side}', -1)">−</button>
        <span class="step-val" id="score-${f.id}-${side}">${shown[side]}</span>
        <button class="step-btn" onclick="adjustScore(${f.id}, '${side}', 1)">+</button>
      </div>`;
    return `
      <div class="score-card ${locked ? 'pambol-locked' : ''}">
        <div class="fixture-meta-header">
          <span>📅 ${escapeHtml(fmtKickoff(f.kickoff_at))}${f.venue ? ' · ' + escapeHtml(f.venue) : ''}</span>
          ${statusTxt ? `<span class="pambol-fx-status ${f.status}">${statusTxt}</span>` : (unsaved ? '<span class="pambol-fx-status unsaved">SIN GUARDAR</span>' : '')}
        </div>
        <div class="score-matchup-row">
          <div class="score-team-col">
            ${getClubCrestHtml(f.home_club)}
            <div class="score-team-title-row">${getTeamFlagHtml(f.home_club)}<span class="score-team-name-text">${escapeHtml(clubName(f.home_club))}</span></div>
            ${stepper('h')}
          </div>
          <div class="score-center-col">
            ${hasScore ? `<span class="pambol-final-score">${f.home_score} - ${f.away_score}</span>` : '<span class="score-vs">VS</span>'}
            ${locked ? `<span class="pambol-my-pick">${pick ? 'Tu pick: ' + pick.h + '-' + pick.a : 'Sin pick'}</span>` : `<span class="score-status-pill ${outcomePillClass}">${outcome}</span>`}
            ${locked && pts != null ? `<span class="pambol-pick-pts p${pts}">${pts === 5 ? '🎯 +5' : pts === 3 ? '⚖️ +3' : '0'} pts</span>` : ''}
          </div>
          <div class="score-team-col">
            ${getClubCrestHtml(f.away_club)}
            <div class="score-team-title-row">${getTeamFlagHtml(f.away_club)}<span class="score-team-name-text">${escapeHtml(clubName(f.away_club))}</span></div>
            ${stepper('a')}
          </div>
        </div>
        <div class="community-trend-bar">
          ${tr && tr.total ? `
          <div class="community-trend-label">
            <span>Comunidad (${tr.total}): <strong>${tr.home_pct}% L</strong></span><span><strong>${tr.draw_pct}% E</strong></span><span><strong>${tr.away_pct}% V</strong></span>
          </div>
          <div class="community-bar-track">
            <div class="comm-bar-seg local" style="width:${tr.home_pct}%"></div><div class="comm-bar-seg draw" style="width:${tr.draw_pct}%"></div><div class="comm-bar-seg away" style="width:${tr.away_pct}%"></div>
          </div>` : '<div class="community-trend-label"><span>Comunidad: todavía no hay pronósticos</span></div>'}
        </div>
        ${locked ? '' : `
        <div class="quick-chips-row">
          <span class="quick-chip-label">Picks Rápidos:</span>
          ${['1-0', '2-1', '1-1', '2-0', '0-0', '1-2', '0-1', '2-2'].map(s => { const [h, a] = s.split('-').map(Number); return `<button class="quick-chip ${pick && scoreStr === s ? 'active' : ''}" onclick="setQuickScore(${f.id}, ${h}, ${a})">${s}</button>`; }).join('')}
        </div>`}
      </div>`;
  }).join('');
}

function pambolFixture(id) { return Pambol.fixtures.find(f => f.id === Number(id)); }

function adjustScore(fixtureId, side, delta) {
  const f = pambolFixture(fixtureId);
  if (f && fixtureLocked(f)) { showToast('🔒 Ese partido ya empezó.'); return; }
  if (!userPicks[fixtureId]) userPicks[fixtureId] = { h: 0, a: 0 };
  hapticFeedback([14]);
  userPicks[fixtureId][side] = Math.max(0, Math.min(15, (userPicks[fixtureId][side] || 0) + delta));
  renderFixtures();
  pambolSaveLocalPicks();
}

function setQuickScore(fixtureId, h, a) {
  const f = pambolFixture(fixtureId);
  if (f && fixtureLocked(f)) { showToast('🔒 Ese partido ya empezó.'); return; }
  playStadiumSound('click');
  userPicks[fixtureId] = { h, a };
  renderFixtures();
  pambolSaveLocalPicks();
}

function pambolSaveLocalPicks() {
  try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); s.userPicks = userPicks; localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
}

async function saveQuinielaPicks() {
  hapticFeedback([40, 60, 40]);
  const g = Pambol.viewGw;
  if (!g) return;
  const rows = gwFixtures(g.id).filter(f => !fixtureLocked(f) && userPicks[f.id]).map(f => ({
    user_id: PambolCloud.uid(), fixture_id: f.id, home_score: userPicks[f.id].h, away_score: userPicks[f.id].a
  }));
  pambolSaveLocalPicks();
  if (!Pambol.online) { showToast('Pronósticos guardados en este dispositivo.'); return; }
  if (!PambolCloud.isLoggedIn()) {
    await pambolDialog('Tus pronósticos quedaron en este teléfono. Crea tu cuenta para que sumen puntos.', { ok: 'Crear cuenta' });
    activeAuthTab = 'register'; openAuthModal(); return;
  }
  if (!rows.length) { pambolDialog('No hay pronósticos nuevos en partidos abiertos.'); return; }
  const { error } = await Pambol.client.from('quiniela_picks').upsert(rows, { onConflict: 'user_id,fixture_id' });
  if (error) { pambolDialog('No se pudo guardar: ' + pambolErr(error)); return; }
  rows.forEach(r => { Pambol.savedPicks[r.fixture_id] = { h: r.home_score, a: r.away_score }; });
  playStadiumSound('whistle'); triggerConfetti();
  showToast(`✅ ${rows.length} pronóstico(s) guardados para la ${gwLabel(g)}`, 'ok');
  pambolLoadTrends().then(renderFixtures);
  renderFixtures();
}

// ---------------------------------------------------------------------
// TABLA GENERAL (calculada con los resultados reales)
// ---------------------------------------------------------------------
function pambolComputeStandings() {
  const rows = {};
  DB.teams.forEach(t => { rows[t.short] = { team: t.name, short: t.short, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dif: 0, pts: 0, form: [] }; });
  const played = Pambol.fixtures.filter(f => f.stage === 'regular' && f.status === 'finished' && f.home_score != null && f.away_score != null)
    .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at));
  played.forEach(f => {
    const h = rows[f.home_club], a = rows[f.away_club];
    if (!h || !a) return;
    h.pj++; a.pj++; h.gf += f.home_score; h.gc += f.away_score; a.gf += f.away_score; a.gc += f.home_score;
    if (f.home_score > f.away_score) { h.g++; a.p++; h.pts += 3; h.form.push('W'); a.form.push('L'); }
    else if (f.home_score < f.away_score) { a.g++; h.p++; a.pts += 3; a.form.push('W'); h.form.push('L'); }
    else { h.e++; a.e++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
  });
  const list = Object.values(rows).map(r => ({ ...r, dif: r.gf - r.gc, form: r.form.slice(-5) }));
  list.sort((x, y) => y.pts - x.pts || y.dif - x.dif || y.gf - x.gf || x.team.localeCompare(y.team));
  list.forEach((r, i) => { r.pos = i + 1; });
  return { list, played: played.length };
}

function renderStandings() {
  const tbody = document.getElementById('standingsTableBody');
  if (!tbody) return;
  const useSeed = !Pambol.online;
  const { list } = useSeed ? { list: DB.standings || [] } : pambolComputeStandings();
  tbody.innerHTML = list.map(row => {
    const formHtml = (row.form || []).map(f => f === 'W' ? '<div class="form-dot w">✔</div>' : (f === 'D' ? '<div class="form-dot d">➖</div>' : '<div class="form-dot l">✖</div>')).join('');
    const dgColor = row.dif > 0 ? 'var(--accent-green)' : (row.dif < 0 ? 'var(--accent-red)' : 'var(--text-muted)');
    return `
      <tr>
        <td><span class="pos-indicator ${row.pos <= 8 ? 'liguilla' : 'none'}">${row.pos}</span></td>
        <td><div class="col-team"><span>${escapeHtml(row.team)}</span></div></td>
        <td>${row.pj}</td><td>${row.g}</td><td>${row.e}</td><td>${row.p}</td><td>${row.gf}</td><td>${row.gc}</td>
        <td style="color:${dgColor};font-weight:700">${row.dif > 0 ? '+' + row.dif : row.dif}</td>
        <td style="font-weight:900;color:var(--gold);font-size:12.5px">${row.pts}</td>
        <td><div class="form-dots">${formHtml}</div></td>
      </tr>`;
  }).join('');
}

// ---------------------------------------------------------------------
// LIGUILLA: pronóstico de campeón (+20)
// ---------------------------------------------------------------------
function pambolLiguillaSeeds() {
  return pambolComputeStandings().list.slice(0, 8).map(r => ({ short: r.short, name: r.team, seed: r.pos }));
}

function renderLiguillaBracket() {
  const container = document.getElementById('liguillaBracketContainer');
  if (!container) return;
  const t = Pambol.tournament;
  const seeds = pambolLiguillaSeeds();
  const lockAt = t && t.liguilla_lock_at ? new Date(t.liguilla_lock_at) : null;
  const closed = lockAt && lockAt <= new Date();
  const notOpen = !lockAt;
  const bySeed = s => seeds.find(x => x.seed === s);
  if (seeds.length < 8 || !Pambol.online) { container.innerHTML = '<div class="pambol-empty">El cuadro se arma con los 8 primeros de la tabla general.</div>'; return; }
  const qf = [[1, 8], [2, 7], [3, 6], [4, 5]].map((p, i) => ({ id: 'QF' + (i + 1), t1: bySeed(p[0]), t2: bySeed(p[1]) }));
  const winner = (id, a, b) => { const w = liguillaPicks[id]; return [a, b].find(x => x && x.short === w) || null; };
  const qfW = qf.map(s => winner(s.id, s.t1, s.t2));
  let sf = [];
  if (qfW.every(Boolean)) {
    const o = [...qfW].sort((a, b) => a.seed - b.seed); // reclasificación: mejor vs peor
    sf = [{ id: 'SF1', t1: o[0], t2: o[3] }, { id: 'SF2', t1: o[1], t2: o[2] }];
  }
  const sfW = sf.map(s => winner(s.id, s.t1, s.t2));
  const fin = sfW.length === 2 && sfW.every(Boolean) ? [{ id: 'F', t1: [...sfW].sort((a, b) => a.seed - b.seed)[0], t2: [...sfW].sort((a, b) => a.seed - b.seed)[1] }] : [];
  const champ = fin.length ? winner('F', fin[0].t1, fin[0].t2) : null;
  const ro = closed;
  const teamRow = (s, tm) => {
    const sel = liguillaPicks[s.id] === tm.short;
    return `<div class="bracket-team-row ${sel ? 'selected-advancing' : ''}" ${ro ? '' : `onclick="pickSeriesWinner('${s.id}','${tm.short}')"`}>
      <div class="bracket-team-left"><span class="seed-tag">#${tm.seed}</span>${getClubCrestHtml(tm.short)}<span style="font-size:12.5px;font-weight:800;color:#fff">${escapeHtml(tm.name)}</span></div>
      <span style="font-size:12px;font-weight:900;color:${sel ? 'var(--accent-green)' : 'var(--text-muted)'}">${sel ? '✔ Avanza' : (ro ? '' : 'Elegir')}</span></div>`;
  };
  const phase = (title, list) => list.length ? `<div class="bracket-phase-title"><span>${title}</span></div>` + list.map(s => `<div class="bracket-series-card">${teamRow(s, s.t1)}${teamRow(s, s.t2)}</div>`).join('') : '';
  const official = t && t.champion_club;
  container.innerHTML = `
    ${notOpen ? '<div class="pambol-note">Puedes ir armando tu cuadro. El pronóstico se podrá guardar cuando abra la Liguilla.</div>' : ''}
    ${closed ? '<div class="pambol-note">El pronóstico de campeón ya cerró.</div>' : (lockAt ? `<div class="pambol-note">Cierra el ${fmtKickoff(lockAt)}.</div>` : '')}
    ${phase('⚔️ Cuartos de Final', qf)}${phase('🔥 Semifinales', sf)}${phase('🏆 Final', fin)}
    <div class="champ-banner-card">
      <div style="font-size:11px;font-weight:800;color:var(--gold);text-transform:uppercase;letter-spacing:.8px">🏆 Tu campeón de ${escapeHtml(t ? t.name : 'la Liga MX')}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:8px 0">
        ${champ ? getClubCrestHtml(champ.short) + `<span style="font-size:18px;font-weight:950;color:#fff">${escapeHtml(champ.name)}</span>` : '<span class="pambol-muted">Completa el cuadro para elegir campeón</span>'}
      </div>
      ${official ? `<div style="font-size:12px;color:#fff">Campeón oficial: <strong>${escapeHtml(clubName(official))}</strong> · Ganaste ${Pambol.championPick ? Pambol.championPick.points : 0} pts</div>` : '<div style="font-size:11px;color:#cbd5e1">Acertar al campeón vale <strong style="color:var(--gold)">+20 puntos PAMBOL</strong></div>'}
      ${!ro ? `<button class="btn-save-quiniela" style="margin-top:10px" onclick="saveLiguillaPrediction()" ${champ ? '' : 'disabled'}><span>💾 Guardar pronóstico de campeón</span></button>` : ''}
    </div>`;
}

function pickSeriesWinner(serieId, teamShort) {
  liguillaPicks[serieId] = teamShort;
  // Si cambia una serie, se borran las rondas siguientes que dependían de ella
  if (serieId.startsWith('QF')) { delete liguillaPicks.SF1; delete liguillaPicks.SF2; delete liguillaPicks.F; }
  if (serieId.startsWith('SF')) delete liguillaPicks.F;
  renderLiguillaBracket();
}

async function saveLiguillaPrediction() {
  const champ = liguillaPicks.F;
  if (!champ) { pambolDialog('Completa el cuadro hasta la Final.'); return; }
  if (!PambolCloud.isLoggedIn()) { activeAuthTab = 'register'; openAuthModal(); return; }
  const t = Pambol.tournament;
  const { data, error } = await Pambol.client.from('champion_picks').upsert({ user_id: PambolCloud.uid(), tournament_id: t.id, club_short: champ, bracket: liguillaPicks }, { onConflict: 'user_id,tournament_id' }).select().single();
  if (error) { pambolDialog('No se pudo guardar: ' + pambolErr(error)); return; }
  Pambol.championPick = data;
  triggerConfetti();
  showToast(`🏆 Guardado: ${clubName(champ)} campeón`, 'ok');
}

// ---------------------------------------------------------------------
// CUENTA: registro, acceso, perfil
// ---------------------------------------------------------------------
function openClubSelectorOnly() { activeAuthTab = 'profile'; renderAuthModal(); }

function switchAuthTab(tab) { activeAuthTab = tab; renderAuthModal(); }

function pambolLegalLinks() {
  return '<div class="pambol-legal"><a href="privacidad.html" target="_blank">Aviso de Privacidad</a> · <a href="terminos.html" target="_blank">Términos y Reglas</a><br>PAMBOL es un juego independiente de aficionados, sin relación con la Liga MX, la FMF ni los clubes.</div>';
}

function renderAuthModal() {
  const container = document.getElementById('authModalContent');
  const titleEl = document.getElementById('authModalTitle');
  if (!container) return;
  if (!Pambol.online) {
    titleEl.textContent = '👤 Cuenta PAMBOL';
    container.innerHTML = `<div class="pambol-empty">Las cuentas no están disponibles en modo sin conexión. Tu equipo se guarda en este teléfono.</div>${pambolLegalLinks()}`;
    return;
  }
  if (activeAuthTab === 'newpass') {
    titleEl.textContent = '🔑 Nueva contraseña';
    container.innerHTML = `<div class="pambol-form">
      <label>Nueva contraseña (mínimo 8 caracteres)</label><input type="password" id="newPassInput" class="picker-search" autocomplete="new-password">
      <button class="btn-save-quiniela" onclick="pambolSetNewPassword()"><span>Guardar contraseña</span></button></div>`;
    return;
  }
  if (PambolCloud.isLoggedIn()) {
    titleEl.textContent = '👤 Mi perfil de DT';
    const prof = Pambol.profile || {};
    const short = prof.favorite_club || '';
    const options = LIGA_MX_AFICIONES.map(c => `<option value="${c.short}" ${c.short === short ? 'selected' : ''}>${c.icon} ${escapeHtml(c.name)}</option>`).join('');
    container.innerHTML = `
      <div class="fan-profile-card">
        <div class="fan-badge-strip">
          <div class="fan-club-badge-icon">${short ? clubIcon(short) : '⚽'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:800;color:var(--gold);text-transform:uppercase">${short ? 'Aficionado de' : 'Elige tu club'}</div>
            <h3 style="font-size:16px;font-weight:900;color:#fff;margin:1px 0">${escapeHtml(short ? clubName(short) : 'Sin club')}</h3>
            <div style="font-size:11px;color:#38bdf8;font-weight:700">@${escapeHtml(prof.username || currentUser.username)}</div>
          </div>
        </div>
        <div class="pambol-stats-grid">
          <div><b>${Number(prof.total_pts || 0)}</b><span>Puntos totales</span></div>
          <div><b>${prof.national_rank ? '#' + prof.national_rank : '—'}</b><span>Ranking nacional</span></div>
          <div><b>${Number(prof.total_fantasy_pts || 0)}</b><span>Fantasy</span></div>
          <div><b>${Number(prof.total_quiniela_pts || 0)}</b><span>Quiniela</span></div>
        </div>
      </div>
      <div class="pambol-form">
        <label>Nombre de DT</label><input id="profUsername" class="picker-search" value="${escapeHtml(prof.username || '')}" maxlength="24">
        <label>Nombre y apellido (opcional)</label><input id="profFullName" class="picker-search" value="${escapeHtml(prof.full_name || '')}" maxlength="80">
        <label>Club favorito (define tu peña)</label><select id="profClub" class="club-select">${options}</select>
        <button class="btn-save-quiniela" onclick="pambolSaveProfile()"><span>💾 Guardar perfil</span></button>
        <div class="pambol-muted">Correo: ${escapeHtml(currentUser.email || '')}</div>
        ${Pambol.isAdmin ? '<a class="pambol-btn" href="admin.html" style="text-align:center">🛠️ Abrir panel de administración</a>' : ''}
        <button class="btn-skip-guest" onclick="logoutUser()">Cerrar sesión</button>
        <button class="btn-skip-guest" style="color:#f87171" onclick="pambolDeleteAccount()">Borrar mi cuenta y mis datos</button>
      </div>${pambolLegalLinks()}`;
    return;
  }
  if (activeAuthTab === 'forgot') {
    titleEl.textContent = '🔑 Recuperar contraseña';
    container.innerHTML = `<div class="pambol-form">
      <label>Correo de tu cuenta</label><input type="email" id="forgotEmailInput" class="picker-search" autocomplete="email">
      <button class="btn-save-quiniela" onclick="pambolSendReset()"><span>Enviar enlace</span></button>
      <button class="btn-skip-guest" onclick="switchAuthTab('login')">Volver</button></div>`;
    return;
  }
  const tabs = `<div class="pambol-tabs"><button class="${activeAuthTab === 'login' ? 'active' : ''}" onclick="switchAuthTab('login')">Entrar</button><button class="${activeAuthTab !== 'login' ? 'active' : ''}" onclick="switchAuthTab('register')">Crear cuenta</button></div>`;
  if (activeAuthTab === 'login') {
    titleEl.textContent = '👤 Entrar a PAMBOL';
    container.innerHTML = tabs + `<div class="pambol-form">
      ${PAMBOL_CFG.ENABLE_GOOGLE_LOGIN ? '<button type="button" class="btn-google-login" onclick="loginWithGoogle()"><span>Continuar con Google</span></button><div class="pambol-muted" style="text-align:center">o con tu correo</div>' : ''}
      <label>Correo</label><input type="email" id="loginUserInput" class="picker-search" autocomplete="email">
      <label>Contraseña</label><input type="password" id="loginPassInput" class="picker-search" autocomplete="current-password" onkeydown="if(event.key==='Enter')handleUserLogin()">
      <button class="btn-save-quiniela" onclick="handleUserLogin()"><span>🔑 Entrar</span></button>
      <button class="btn-skip-guest" onclick="switchAuthTab('forgot')">¿Olvidaste tu contraseña?</button>
    </div>${pambolLegalLinks()}`;
    return;
  }
  titleEl.textContent = '⚽ Crea tu cuenta gratis';
  const clubsGrid = LIGA_MX_AFICIONES.map(c => `
    <div class="club-choose-card ${c.short === selectedRegisterClub ? 'selected' : ''}" onclick="selectRegisterClub('${c.short}')" data-short="${c.short}">
      <div class="club-choose-icon">${c.icon}</div>
      <div class="club-choose-info"><div class="club-choose-name">${escapeHtml(c.name)}</div><div class="club-choose-nick">${escapeHtml(c.nickname)}</div></div>
      <span class="club-check-icon">✔</span>
    </div>`).join('');
  container.innerHTML = tabs + `<div class="pambol-form">
    <label>Nombre de DT (público)</label><input id="regUserInput" class="picker-search" placeholder="Ej: Matute_DT" maxlength="24" autocomplete="nickname">
    <label>Correo</label><input type="email" id="regEmailInput" class="picker-search" autocomplete="email">
    <label>Contraseña (mínimo 8 caracteres)</label><input type="password" id="regPassInput" class="picker-search" autocomplete="new-password">
    <div class="club-select-header-box"><div class="club-select-title"><span>🇲🇽 ¿De qué club eres?</span></div><div class="club-select-sub">Define tu peña y el ranking de tu afición.</div></div>
    <div class="club-selection-grid">${clubsGrid}</div>
    <label class="pambol-check"><input type="checkbox" id="regAccept"> Acepto el <a href="privacidad.html" target="_blank">Aviso de Privacidad</a> y los <a href="terminos.html" target="_blank">Términos</a>.</label>
    <button class="btn-save-quiniela" onclick="handleUserRegistration()"><span>⚽ Crear cuenta</span></button>
    <button class="btn-skip-guest" onclick="closeAuthModal()">Seguir como invitado</button>
  </div>${pambolLegalLinks()}`;
}

function selectRegisterClub(short) {
  selectedRegisterClub = short;
  playStadiumSound('click');
  document.querySelectorAll('.club-choose-card').forEach(c => c.classList.toggle('selected', c.dataset.short === short));
}

async function handleUserRegistration() {
  const username = (document.getElementById('regUserInput')?.value || '').trim().replace(/\s+/g, '_');
  const email = (document.getElementById('regEmailInput')?.value || '').trim();
  const password = document.getElementById('regPassInput')?.value || '';
  if (!/^[A-Za-z0-9_.ÁÉÍÓÚÜÑáéíóúüñ-]{3,24}$/.test(username)) { pambolDialog('El nombre de DT debe tener de 3 a 24 letras, números, guion o guion bajo.'); return; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { pambolDialog('Escribe un correo válido.'); return; }
  if (password.length < 8) { pambolDialog('La contraseña debe tener al menos 8 caracteres.'); return; }
  if (!selectedRegisterClub) { pambolDialog('Elige tu club favorito.'); return; }
  if (!document.getElementById('regAccept')?.checked) { pambolDialog('Para crear tu cuenta debes aceptar el Aviso de Privacidad y los Términos.'); return; }
  const { data, error } = await Pambol.client.auth.signUp({
    email, password,
    options: { data: { username, favorite_club: selectedRegisterClub }, emailRedirectTo: PAMBOL_CFG.SITE_URL || location.origin }
  });
  if (error) { pambolDialog(pambolErr(error)); return; }
  if (!data.session) {
    closeAuthModal();
    pambolDialog(`📩 Te enviamos un correo a ${email}. Confirma tu cuenta con el enlace y vuelve a entrar.`);
    return;
  }
  closeAuthModal();
  playStadiumSound('whistle'); triggerConfetti();
  showToast(`🎉 ¡Bienvenido a PAMBOL, ${username}!`, 'ok');
  // Si armó equipo como invitado, se guarda de inmediato
  setTimeout(() => { if (Pambol.dirty && Pambol.editGw) saveTeamValidation(); }, 1500);
}

async function handleUserLogin() {
  const email = (document.getElementById('loginUserInput')?.value || '').trim();
  const password = document.getElementById('loginPassInput')?.value || '';
  if (!email || !password) { pambolDialog('Escribe tu correo y contraseña.'); return; }
  const { error } = await Pambol.client.auth.signInWithPassword({ email, password });
  if (error) { pambolDialog(pambolErr(error)); return; }
  closeAuthModal();
  playStadiumSound('whistle');
  showToast('✅ ¡Bienvenido de vuelta!', 'ok');
}

async function loginWithGoogle() {
  const { error } = await Pambol.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: PAMBOL_CFG.SITE_URL || location.origin } });
  if (error) pambolDialog(pambolErr(error));
}

async function pambolSendReset() {
  const email = (document.getElementById('forgotEmailInput')?.value || '').trim();
  if (!email) return;
  const { error } = await Pambol.client.auth.resetPasswordForEmail(email, { redirectTo: PAMBOL_CFG.SITE_URL || location.origin });
  if (error) { pambolDialog(pambolErr(error)); return; }
  pambolDialog('📩 Si el correo tiene cuenta, te llegará un enlace para cambiar la contraseña.');
  switchAuthTab('login');
}

async function pambolSetNewPassword() {
  const password = document.getElementById('newPassInput')?.value || '';
  if (password.length < 8) { pambolDialog('Mínimo 8 caracteres.'); return; }
  const { error } = await Pambol.client.auth.updateUser({ password });
  if (error) { pambolDialog(pambolErr(error)); return; }
  activeAuthTab = 'profile'; closeAuthModal();
  showToast('✅ Contraseña actualizada', 'ok');
}

async function pambolSaveProfile() {
  const username = (document.getElementById('profUsername')?.value || '').trim().replace(/\s+/g, '_');
  const full_name = (document.getElementById('profFullName')?.value || '').trim() || null;
  const favorite_club = document.getElementById('profClub')?.value || null;
  if (!/^[A-Za-z0-9_.ÁÉÍÓÚÜÑáéíóúüñ-]{3,24}$/.test(username)) { pambolDialog('El nombre de DT debe tener de 3 a 24 letras, números, guion o guion bajo.'); return; }
  const { data, error } = await Pambol.client.from('profiles').update({ username, full_name, favorite_club }).eq('id', PambolCloud.uid()).select().single();
  if (error) { pambolDialog(pambolErr(error)); return; }
  Pambol.profile = data;
  currentUser.username = data.username; currentUser.name = data.full_name || data.username;
  currentUser.clubShort = data.favorite_club; currentUser.favoriteClub = clubName(data.favorite_club); currentUser.clubIcon = clubIcon(data.favorite_club);
  showToast('✅ Perfil actualizado', 'ok');
  renderAuthModal(); pambolRenderAll();
}

function saveUserProfile() { /* el perfil vive en Supabase (pambolSaveProfile) */ }

async function logoutUser() {
  if (Pambol.client) await Pambol.client.auth.signOut();
  closeAuthModal();
  showToast('Cerraste sesión.');
}

async function pambolDeleteAccount() {
  const ok = await pambolDialog('Se borrarán tu cuenta, tus equipos, pronósticos, mensajes y las ligas que creaste. No se puede deshacer.', { ok: 'Borrar definitivamente', cancel: 'Cancelar' });
  if (!ok) return;
  const { error } = await Pambol.client.rpc('delete_my_account');
  if (error) { pambolDialog(pambolErr(error)); return; }
  await Pambol.client.auth.signOut();
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  closeAuthModal();
  pambolDialog('Tu cuenta y tus datos fueron eliminados.');
}

function updateUserAuthDisplay() {
  const icon = document.getElementById('userAuthIcon');
  const name = document.getElementById('userAuthName');
  const btn = document.getElementById('userAuthBtn');
  if (!icon || !name) return;
  if (currentUser.isLoggedIn) {
    icon.innerText = currentUser.clubIcon || '👑';
    name.innerText = currentUser.username || 'Mi DT';
    if (btn) { btn.style.borderColor = 'rgba(34,197,94,.55)'; btn.style.background = 'rgba(34,197,94,.15)'; }
  } else {
    icon.innerText = '👤'; name.innerText = 'Entrar';
    if (btn) { btn.style.borderColor = 'rgba(251,191,36,.4)'; btn.style.background = 'rgba(251,191,36,.1)'; }
  }
  const title = document.getElementById('userCustomTeamTitle');
  if (title) title.textContent = currentUser.isLoggedIn ? `${currentUser.username} ${currentUser.clubIcon || ''}` : 'Mi Once Pambolero';
}

function pambolRenderProfileBanner() {
  const prof = Pambol.profile;
  const r = document.getElementById('profileRankVal'), p = document.getElementById('profilePtsVal'), o = document.getElementById('profileOfTotal');
  if (r) r.textContent = prof && prof.national_rank ? '#' + prof.national_rank : '—';
  if (p) p.textContent = `${prof ? Number(prof.total_pts) : 0} Pts Totales`;
  if (o) o.textContent = prof ? (Pambol.totalProfiles ? `de ${Pambol.totalProfiles.toLocaleString('es-MX')} pamboleros` : 'Ranking nacional') : 'Inicia sesión para competir';
  const coach = document.getElementById('userProfileCoach');
  if (coach && getCoach()) coach.textContent = getCoach().name;
  const cap = document.getElementById('profileCapBadge');
  if (cap) { const c = getPlayer(captainId); cap.textContent = c ? `${playerShortName(c)} (C)` : 'Sin capitán'; }
}

// ---------------------------------------------------------------------
// LIGAS PRIVADAS (reales)
// ---------------------------------------------------------------------
const pambolLeagueCache = {};

function pambolLoginCta(text) {
  return `<div class="pambol-empty">${text}<br><button class="btn-liga-action primary" style="margin-top:8px" onclick="activeAuthTab='register';openAuthModal()"><span>Crear cuenta / Entrar</span></button></div>`;
}

function renderUserLeagues() {
  const container = document.getElementById('leaguesListContainer');
  const countEl = document.getElementById('userLeaguesCount');
  if (!container) return;
  if (countEl) countEl.innerText = `${userLeagues.length} Liga${userLeagues.length === 1 ? '' : 's'}`;
  if (!PambolCloud.isLoggedIn()) { container.innerHTML = pambolLoginCta('Crea o únete a ligas privadas con tus amigos.'); return; }
  if (!userLeagues.length) { container.innerHTML = '<div class="pambol-empty">Todavía no estás en ninguna liga. Crea una y comparte el código por WhatsApp.</div>'; return; }
  container.innerHTML = userLeagues.map(l => `
    <div class="league-card" onclick="openLeagueDetail('${l.id}')">
      <div class="league-left"><div class="league-icon">${escapeHtml(l.icon)}</div>
        <div class="league-meta"><h4>${escapeHtml(l.name)}</h4><p>${l.members} miembro${l.members === 1 ? '' : 's'} · Código: <strong>${escapeHtml(l.code)}</strong></p></div></div>
      <div class="league-right">
        <span class="league-rank-badge ${l.myRank === 1 ? 'rank-first' : 'rank-other'}">${l.myRank === 1 ? '🥇 #1 Lugar' : `#${l.myRank} Lugar`}</span>
        <span style="font-size:11px;font-weight:800;color:#fff">${l.myPts} pts</span>
      </div>
    </div>`).join('');
}

async function pambolReloadLeagues() {
  const r = await Pambol.client.rpc('my_leagues');
  if (!r.error) userLeagues = (r.data || []).map(l => ({ id: l.id, name: l.name, icon: l.icon, code: l.code, members: Number(l.members), myRank: Number(l.my_rank), myPts: Number(l.my_pts), creator: l.creator_name || '—', creatorId: l.creator_id }));
  renderUserLeagues();
}

async function confirmCreateLeague() {
  if (!PambolCloud.isLoggedIn()) { closeCreateLeagueModal(); activeAuthTab = 'register'; openAuthModal(); return; }
  const name = document.getElementById('newLeagueName').value.trim();
  if (name.length < 3) { pambolDialog('El nombre de la liga debe tener al menos 3 letras.'); return; }
  const { data, error } = await Pambol.client.rpc('create_league', { p_name: name.slice(0, 40), p_icon: currentSelectedLeagueIcon });
  if (error) { pambolDialog(pambolErr(error)); return; }
  closeCreateLeagueModal();
  await pambolReloadLeagues();
  triggerConfetti();
  const go = await pambolDialog(`🎉 Liga "${data.name}" creada.\n\nCódigo de invitación: ${data.code}`, { ok: 'Invitar por WhatsApp', cancel: 'Listo' });
  if (go) shareLeagueCode(data.name, data.code);
}

async function confirmJoinLeague() {
  if (!PambolCloud.isLoggedIn()) { closeJoinLeagueModal(); activeAuthTab = 'register'; openAuthModal(); return; }
  const code = document.getElementById('joinLeagueCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 4) { pambolDialog('Escribe el código que te compartieron.'); return; }
  const { data, error } = await Pambol.client.rpc('join_league', { p_code: code });
  if (error) { pambolDialog(pambolErr(error)); return; }
  closeJoinLeagueModal();
  await pambolReloadLeagues();
  showToast(`✅ Te uniste a "${data.name}"`, 'ok');
}

function pambolInviteUrl(code) { return `${(PAMBOL_CFG.SITE_URL || location.origin).replace(/\/$/, '')}/?liga=${encodeURIComponent(code)}`; }

async function shareLeagueCode(leagueName, code) {
  const url = pambolInviteUrl(code);
  const text = `¡Únete a mi liga "${leagueName}" en PAMBOL, el fantasy de la Liga MX! Código: ${code}\n${url}`;
  if (navigator.share) { try { await navigator.share({ title: 'PAMBOL', text }); return; } catch (e) { /* cancelado */ } }
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function pambolHandlePendingInvite() {
  let code = null;
  try { code = new URLSearchParams(location.search).get('liga') || sessionStorage.getItem('pambol_pending_liga'); } catch (e) {}
  if (!code) return;
  if (!Pambol.online) return;
  if (!PambolCloud.isLoggedIn()) {
    try { sessionStorage.setItem('pambol_pending_liga', code); } catch (e) {}
    if (Pambol.ready && !document.getElementById('authModalOverlay').classList.contains('open')) { activeAuthTab = 'register'; openAuthModal(); showToast('Crea tu cuenta para unirte a la liga ' + code); }
    return;
  }
  try { sessionStorage.removeItem('pambol_pending_liga'); history.replaceState(null, '', location.pathname); } catch (e) {}
  openJoinLeagueModal();
  document.getElementById('joinLeagueCode').value = code.toUpperCase();
}

// Cara a Cara: calendario round-robin determinista (método del círculo)
function pambolH2H(members, gwPoints) {
  const ids = members.map(m => m.user_id);
  if (ids.length < 2) return { table: [], next: [] };
  const list = ids.length % 2 ? ids.concat([null]) : ids.slice();
  const n = list.length;
  const roundPairs = r => {
    const arr = [list[0]].concat(list.slice(1).map((_, i) => list[1 + ((i + r) % (n - 1))]));
    const pairs = [];
    for (let i = 0; i < n / 2; i++) pairs.push([arr[i], arr[n - 1 - i]]);
    return pairs;
  };
  const pts = {}; gwPoints.forEach(x => { pts[x.user_id + ':' + x.gw_number] = Number(x.points); });
  const scored = [...new Set(gwPoints.map(x => x.gw_number))].sort((a, b) => a - b);
  const tbl = {}; ids.forEach(id => { tbl[id] = { pj: 0, g: 0, e: 0, p: 0, pf: 0, pc: 0, pts: 0 }; });
  scored.forEach((gw, i) => {
    roundPairs(i).forEach(([a, b]) => {
      if (!a || !b) return;
      const pa = pts[a + ':' + gw] || 0, pb = pts[b + ':' + gw] || 0;
      const A = tbl[a], B = tbl[b];
      A.pj++; B.pj++; A.pf += pa; A.pc += pb; B.pf += pb; B.pc += pa;
      if (pa > pb) { A.g++; B.p++; A.pts += 3; } else if (pb > pa) { B.g++; A.p++; B.pts += 3; } else { A.e++; B.e++; A.pts++; B.pts++; }
    });
  });
  return { table: ids.map(id => ({ user_id: id, ...tbl[id] })).sort((x, y) => y.pts - x.pts || (y.pf - y.pc) - (x.pf - x.pc) || y.pf - x.pf), next: roundPairs(scored.length) };
}

async function renderLeagueDetailModal() {
  const l = userLeagues.find(x => x.id === currentDetailLeagueId);
  const container = document.getElementById('leagueDetailContent');
  if (!l || !container) return;
  document.getElementById('leagueDetailTitle').innerText = `${l.icon} ${l.name}`;
  document.getElementById('leagueDetailSubtitle').innerText = `Código: ${l.code} · ${l.members} competidores · Creador: ${l.creator}`;
  let cache = pambolLeagueCache[l.id];
  if (!cache || Date.now() - cache.at > 60000) {
    container.innerHTML = '<div class="pambol-empty">Cargando liga…</div>';
    const [tbl, gwp, msgs] = await Promise.all([
      Pambol.client.rpc('league_table', { p_league: l.id }),
      Pambol.client.rpc('league_gw_points', { p_league: l.id }),
      Pambol.client.from('league_messages').select('id,user_id,body,created_at').eq('league_id', l.id).order('created_at', { ascending: false }).limit(60)
    ]);
    if (tbl.error) { container.innerHTML = `<div class="pambol-empty">${escapeHtml(pambolErr(tbl.error))}</div>`; return; }
    cache = pambolLeagueCache[l.id] = { at: Date.now(), table: tbl.data || [], gw: gwp.data || [], msgs: (msgs.data || []).reverse() };
  }
  const me = PambolCloud.uid();
  const nameOf = id => (cache.table.find(m => m.user_id === id) || {}).username || 'Ex miembro';
  const lastScored = [...Pambol.gameweeks].filter(g => g.status === 'scored').sort((a, b) => b.number - a.number)[0];
  const sub = `<div class="league-subtabs-bar">
      <button class="league-subtab-btn ${currentLeagueSubTab === 'clasica' ? 'active' : ''}" onclick="switchLeagueSubTab('clasica')">📊 Tabla</button>
      <button class="league-subtab-btn ${currentLeagueSubTab === 'h2h' ? 'active' : ''}" onclick="switchLeagueSubTab('h2h')">⚔️ Cara a Cara</button>
      <button class="league-subtab-btn ${currentLeagueSubTab === 'muro' ? 'active' : ''}" onclick="switchLeagueSubTab('muro')">💬 Vestuario</button></div>`;
  let body = '';
  if (currentLeagueSubTab === 'clasica') {
    body = cache.table.map(m => `
      <div class="league-card" style="padding:10px 12px;margin:0 0 6px;${m.user_id === me ? 'border-color:var(--gold);background:rgba(251,191,36,.12)' : ''}">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:14px;font-weight:900;color:${m.rank == 1 ? 'var(--gold)' : 'var(--text-muted)'};min-width:24px">${m.rank == 1 ? '🥇' : m.rank == 2 ? '🥈' : m.rank == 3 ? '🥉' : '#' + m.rank}</span>
          <div><div style="font-size:13px;font-weight:800;color:#fff">${escapeHtml(m.username)}${m.user_id === me ? ' (tú)' : ''}</div><div style="font-size:10.5px;color:var(--text-muted)">${m.favorite_club ? clubIcon(m.favorite_club) + ' ' + escapeHtml(clubName(m.favorite_club)) : ''}</div></div>
        </div>
        <div style="text-align:right"><div style="font-size:14px;font-weight:900;color:#fff">${Number(m.total_pts)} pts</div>${lastScored ? `<div style="font-size:10px;color:var(--accent-green)">+${Number(m.last_gw_pts)} en ${gwShort(lastScored)}</div>` : ''}</div>
      </div>`).join('');
  } else if (currentLeagueSubTab === 'h2h') {
    const h = pambolH2H([...cache.table].sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at)), cache.gw);
    const nextG = Pambol.editGw;
    body = cache.table.length < 2 ? '<div class="pambol-empty">Invita al menos a un amigo para jugar Cara a Cara.</div>' : `
      <div class="pambol-kicker">⚔️ Duelos de ${escapeHtml(gwLabel(nextG))}</div>
      ${h.next.map(([a, b]) => `<div class="h2h-fixture-card"><div class="h2h-team-side"><span class="h2h-team-name" ${a === me ? 'style="color:#4ade80"' : ''}>${a ? escapeHtml(nameOf(a)) : 'Descansa'}</span></div><div style="text-align:center;font-size:10.5px;font-weight:900;color:var(--gold)">VS</div><div class="h2h-team-side" style="text-align:right"><span class="h2h-team-name" ${b === me ? 'style="color:#4ade80"' : ''}>${b ? escapeHtml(nameOf(b)) : 'Descansa'}</span></div></div>`).join('')}
      <div class="pambol-kicker" style="margin-top:12px">🏆 Tabla Cara a Cara (3 pts victoria, 1 empate)</div>
      <div style="background:#090d16;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden"><table class="h2h-table"><thead><tr><th style="text-align:left;padding-left:10px">DT</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>PF</th><th>DIF</th><th style="color:var(--gold)">PTS</th></tr></thead><tbody>
      ${h.table.map((r, i) => `<tr class="${r.user_id === me ? 'is-me' : ''}"><td style="text-align:left;padding-left:10px"><strong>${i + 1}.</strong> ${escapeHtml(nameOf(r.user_id))}</td><td>${r.pj}</td><td>${r.g}</td><td>${r.e}</td><td>${r.p}</td><td>${r.pf}</td><td style="color:${r.pf - r.pc >= 0 ? '#4ade80' : '#f87171'}">${r.pf - r.pc >= 0 ? '+' : ''}${Math.round((r.pf - r.pc) * 10) / 10}</td><td style="color:var(--gold);font-weight:900">${r.pts}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="pambol-muted" style="margin-top:6px">El calendario de duelos se calcula solo, por orden de llegada a la liga.</div>`;
  } else {
    body = `<div class="locker-room-container" id="lockerRoom">
      ${cache.msgs.map(m => `<div class="locker-msg-card"><div class="locker-msg-header"><span class="locker-author">${escapeHtml(nameOf(m.user_id))}</span><span class="locker-time">${escapeHtml(new Date(m.created_at).toLocaleString('es-MX', { timeZone: pambolTz(), day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span></div><div class="locker-body">${escapeHtml(m.body)}</div></div>`).join('') || '<div class="pambol-empty">Nadie ha escrito todavía. ¡Rompe el hielo!</div>'}
      </div>
      <div class="locker-input-row"><input type="text" id="lockerMsgInput" class="picker-search" maxlength="400" placeholder="Escribe un mensaje…" style="margin-bottom:0" onkeydown="if(event.key==='Enter')postLockerMessage()">
      <button class="btn-assign-player" style="white-space:nowrap;padding:0 12px" onclick="postLockerMessage()"><span>Enviar ➔</span></button></div>`;
  }
  container.innerHTML = `
    <div style="background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.35);border-radius:12px;padding:10px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:10px;color:var(--accent-green);font-weight:800">CÓDIGO DE INVITACIÓN</div><div style="font-size:16px;font-weight:900;color:#fff;letter-spacing:1px">${escapeHtml(l.code)}</div></div>
      <div style="display:flex;gap:4px">
        <button class="btn-assign-player" style="padding:6px 10px;font-size:11px" onclick="shareLeagueCode(${JSON.stringify(l.name).replace(/"/g, '&quot;')}, '${l.code}')"><span>📲 Invitar</span></button>
        <button class="btn-assign-player" style="padding:6px 10px;font-size:11px;background:#3b82f6;color:#fff" onclick="exportLeagueTableWhatsApp('${l.id}')"><span>📊 Tabla</span></button>
      </div>
    </div>${sub}${body}
    <button class="btn-skip-guest" style="margin-top:12px;color:#f87171" onclick="pambolLeaveLeague('${l.id}')">${l.creatorId === me ? 'Borrar liga' : 'Salir de la liga'}</button>`;
  const lr = document.getElementById('lockerRoom'); if (lr) lr.scrollTop = lr.scrollHeight;
}

async function postLockerMessage() {
  const input = document.getElementById('lockerMsgInput');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  const { error } = await Pambol.client.from('league_messages').insert({ league_id: currentDetailLeagueId, user_id: PambolCloud.uid(), body: text.slice(0, 400) });
  if (error) { pambolDialog(pambolErr(error)); return; }
  delete pambolLeagueCache[currentDetailLeagueId];
  renderLeagueDetailModal();
}

async function pambolLeaveLeague(id) {
  const l = userLeagues.find(x => x.id === id);
  if (!l) return;
  const mine = l.creatorId === PambolCloud.uid();
  const ok = await pambolDialog(mine ? `¿Borrar la liga "${l.name}" para todos sus miembros?` : `¿Salir de la liga "${l.name}"?`, { ok: mine ? 'Borrar' : 'Salir', cancel: 'Cancelar' });
  if (!ok) return;
  const r = mine ? await Pambol.client.from('leagues').delete().eq('id', id) : await Pambol.client.from('league_members').delete().eq('league_id', id).eq('user_id', PambolCloud.uid());
  if (r.error) { pambolDialog(pambolErr(r.error)); return; }
  closeLeagueDetail();
  await pambolReloadLeagues();
}

async function exportLeagueTableWhatsApp(leagueId) {
  const l = userLeagues.find(x => x.id === leagueId);
  if (!l) return;
  const cache = pambolLeagueCache[l.id];
  const rows = (cache ? cache.table : []).map(m => `${m.rank == 1 ? '🥇' : m.rank == 2 ? '🥈' : m.rank == 3 ? '🥉' : '#' + m.rank} ${m.username} · ${Number(m.total_pts)} pts`).join('\n');
  const text = `🏆 TABLA · LIGA "${l.name}" (PAMBOL)\n\n${rows}\n\nÚnete con el código ${l.code}: ${pambolInviteUrl(l.code)}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

// ---------------------------------------------------------------------
// RANKING GENERAL, PEÑAS Y AFICIONES
// ---------------------------------------------------------------------
async function renderGeneralLeaderboard() {
  const container = document.getElementById('generalLeaderboardContainer');
  if (!container) return;
  if (!Pambol.online) { container.innerHTML = '<div class="pambol-empty">El ranking necesita conexión.</div>'; return; }
  container.innerHTML = '<div class="pambol-empty">Cargando ranking…</div>';
  const [top, count] = await Promise.all([
    Pambol.client.from('profiles').select('id,username,favorite_club,total_pts,last_gw_pts,national_rank').order('total_pts', { ascending: false }).order('created_at').limit(50),
    Pambol.client.from('profiles').select('id', { count: 'exact', head: true })
  ]);
  if (top.error) { container.innerHTML = `<div class="pambol-empty">${escapeHtml(pambolErr(top.error))}</div>`; return; }
  Pambol.totalProfiles = count.count || null;
  const tt = document.getElementById('generalTotalTeams');
  if (tt && count.count) tt.textContent = `${count.count.toLocaleString('es-MX')} DTs`;
  pambolRenderProfileBanner();
  const me = PambolCloud.uid(), prof = Pambol.profile;
  const myCard = prof ? `
    <div style="background:rgba(251,191,36,.12);border:1.5px solid rgba(251,191,36,.4);border-radius:12px;padding:10px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">👑</span><div><div style="font-size:13px;font-weight:900;color:#fff">${escapeHtml(prof.username)}</div><div style="font-size:10.5px;color:var(--gold)">Posición nacional: <strong>${prof.national_rank ? '#' + prof.national_rank : 'sin puntuar'}</strong></div></div></div>
      <div style="text-align:right"><div style="font-size:16px;font-weight:900;color:var(--gold)">${Number(prof.total_pts)} Pts</div><div style="font-size:10px;color:var(--text-muted)">+${Number(prof.last_gw_pts)} última jornada</div></div>
    </div>` : pambolLoginCta('Entra para aparecer en el ranking nacional.');
  const rows = (top.data || []).map((u, i) => {
    const rank = u.national_rank || i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;
    return `<div class="league-card" style="padding:8px 12px;margin:0;${u.id === me ? 'border-color:var(--gold)' : ''}">
      <div style="display:flex;align-items:center;gap:10px"><span style="font-size:13px;font-weight:900;min-width:28px;text-align:center;color:${rank <= 3 ? 'var(--gold)' : 'var(--text-muted)'}">${medal}</span>
      <div><div style="font-size:12.5px;font-weight:800;color:#fff">${escapeHtml(u.username)}</div><div style="font-size:10.5px;color:var(--text-muted)">${u.favorite_club ? clubIcon(u.favorite_club) + ' ' + escapeHtml(clubName(u.favorite_club)) : ''}</div></div></div>
      <div style="text-align:right"><div style="font-size:13px;font-weight:900;color:#fff">${Number(u.total_pts)} pts</div><div style="font-size:9.5px;color:var(--accent-green)">+${Number(u.last_gw_pts)}</div></div></div>`;
  }).join('');
  container.innerHTML = myCard + `<div style="display:flex;flex-direction:column;gap:6px">${rows || '<div class="pambol-empty">Aún no hay DTs en el ranking.</div>'}</div>`;
}

async function renderPenasList() {
  const container = document.getElementById('penasListContainer');
  if (!container) return;
  let stats = {};
  if (Pambol.online) {
    const r = await Pambol.client.rpc('fanbase_table');
    if (!r.error) (r.data || []).forEach(x => { stats[x.club_short] = x; });
  }
  const mine = currentUser.clubShort;
  const list = PEÑAS_CLUBES.map(p => ({ ...p, members: Number(stats[p.short]?.members || 0), avg: Number(stats[p.short]?.avg_pts || 0) }))
    .sort((a, b) => b.avg - a.avg || b.members - a.members);
  container.innerHTML = list.map((p, i) => `
    <div class="pena-card">
      <div class="pena-left"><div class="league-icon">${p.icon}</div>
        <div class="pena-info"><h4>${i + 1}. ${escapeHtml(p.name)}</h4><p>${escapeHtml(p.club)} · ${p.members.toLocaleString('es-MX')} DT${p.members === 1 ? '' : 's'} · Promedio ${p.avg.toFixed(1)} pts</p></div></div>
      <button class="btn-join-pena ${p.short === mine ? 'joined' : ''}" onclick="toggleJoinPena('${p.short}')">${p.short === mine ? '✔ Tu peña' : 'Es mi club'}</button>
    </div>`).join('');
}

async function toggleJoinPena(short) {
  if (!PambolCloud.isLoggedIn()) { activeAuthTab = 'register'; openAuthModal(); return; }
  if (short === currentUser.clubShort) return;
  const ok = await pambolDialog(`¿Cambiar tu club favorito a ${clubName(short)}? Tu peña cambia con él.`, { ok: 'Cambiar', cancel: 'Cancelar' });
  if (!ok) return;
  const { data, error } = await Pambol.client.from('profiles').update({ favorite_club: short }).eq('id', PambolCloud.uid()).select().single();
  if (error) { pambolDialog(pambolErr(error)); return; }
  Pambol.profile = data;
  currentUser.clubShort = short; currentUser.favoriteClub = clubName(short); currentUser.clubIcon = clubIcon(short);
  updateUserAuthDisplay(); renderPenasList(); updateUserClubMatchAlert();
}

function renderFanbaseRankings() { renderPenasList(); }

// ---------------------------------------------------------------------
// LOGROS (calculados con tus datos reales)
// ---------------------------------------------------------------------
function renderAchievements() {
  const teams = Pambol.myTeams.filter(t => t.scored_at && t.breakdown);
  const anyLine = re => teams.some(t => Object.values(t.breakdown.players || {}).some(p => p.counted && (p.lines || []).some(l => re.test(l[0]) && Number(l[1]) > 0)));
  const exact = Object.values(Pambol.pickPoints).some(p => p === 5);
  const triple = Pambol.myTeams.some(t => t.chip === 'TRIPLE_CAP');
  const saver = Pambol.myTeams.some(t => Number(t.squad_cost) <= 95);
  const leader = userLeagues.some(l => l.members >= 2 && l.myRank === 1);
  const list = [
    { icon: '🪓', title: 'Hachero de Ley', desc: 'Activa El Hachero en un jugador que cometa 4+ faltas.', ok: anyLine(/Hachero \(/) },
    { icon: '✨', title: 'Magia Pura', desc: 'Activa La Chulada y que tu jugador complete 3+ regates.', ok: anyLine(/Chulada \(/) },
    { icon: '🎯', title: 'Ojo de Halcón', desc: 'Acierta un marcador exacto en la Quiniela.', ok: exact },
    { icon: '🚀', title: 'Capitán de Oro', desc: 'Usa el comodín de Triple Capitán.', ok: triple },
    { icon: '💰', title: 'Lobo de Varos', desc: 'Guarda un equipo con 5.0 V o más de sobra.', ok: saver },
    { icon: '🏆', title: 'Líder del Barrio', desc: 'Ve primero en una liga privada con amigos.', ok: leader }
  ];
  const container = document.getElementById('badgesListContainer');
  const countEl = document.getElementById('unlockedBadgesCount');
  if (countEl) countEl.innerText = `${list.filter(a => a.ok).length} / ${list.length} Desbloqueados`;
  if (container) container.innerHTML = list.map(a => `
    <div class="badge-card ${a.ok ? 'unlocked' : 'locked'}">
      <div class="badge-card-top"><div class="badge-card-icon">${a.icon}</div><div><div class="badge-card-title">${a.title}</div><div class="badge-card-status">${a.ok ? 'Desbloqueado' : 'Bloqueado'}</div></div></div>
      <div class="badge-card-desc">${a.desc}</div>
    </div>`).join('');
}

// ---------------------------------------------------------------------
// EL DIARIO PAMBOLERO (premios reales de la jornada)
// ---------------------------------------------------------------------
async function renderDiarioContent() {
  const container = document.getElementById('diarioModalContent');
  if (!container) return;
  const g = [...Pambol.gameweeks].filter(x => x.status === 'scored').sort((a, b) => b.number - a.number)[0] || Pambol.liveGw;
  if (!g || !Pambol.online) { container.innerHTML = '<div class="pambol-empty">El Diario sale al terminar la primera jornada.</div>'; return; }
  container.innerHTML = '<div class="pambol-empty">Imprimiendo la edición…</div>';
  const r = await Pambol.client.rpc('gameweek_awards', { p_gw: g.id });
  if (r.error) { container.innerHTML = `<div class="pambol-empty">${escapeHtml(pambolErr(r.error))}</div>`; return; }
  const a = r.data || {};
  const sub = document.getElementById('diarioSubtitle'); if (sub) sub.textContent = `Edición semanal · Lo mejor de la ${gwLabel(g)}`;
  const ideal = a.ideal || [];
  const row = pos => `<div class="ideal-row" ${pos === 'GK' ? 'style="justify-content:center"' : ''}>${ideal.filter(p => p.pos === pos).map(p => `<div class="ideal-card">${p.number ? `<span class="ideal-num">#${p.number}</span>` : ''}<strong>${escapeHtml(playerShortName({ name: p.name }))}</strong> (${Number(p.points)} pts)</div>`).join('') || '<span class="pambol-muted">—</span>'}</div>`;
  const total = ideal.reduce((s, p) => s + Number(p.points), 0);
  const top = a.top_manager, axe = a.axe, wood = a.wood;
  const myPts = Pambol.breakdownGw && Pambol.breakdownGw.id === g.id ? Number(Pambol.breakdown.total) : null;
  const hero = ideal.slice().sort((x, y) => y.points - x.points)[0];
  container.innerHTML = `
    <div class="diario-newspaper-box">
      <div class="newspaper-header"><div class="newspaper-sup">EDICIÓN ESPECIAL · ${escapeHtml((Pambol.tournament?.name || '').toUpperCase())}</div><h1 class="newspaper-title">EL PAMBOLERO</h1>
        <div class="newspaper-sub-bar"><span>N° ${g.number}</span><span>${a.scored ? 'RESULTADOS FINALES' : 'EDICIÓN EN VIVO'}</span><span>CIRCULACIÓN NACIONAL</span></div></div>
      <div class="newspaper-headline-banner"><h2>${hero ? `«${escapeHtml(playerShortName({ name: hero.name }).toUpperCase())} SE ADUEÑA DE LA ${escapeHtml(gwLabel(g).toUpperCase())}»` : '«JORNADA EN JUEGO»'}</h2>
        <p>${hero ? `${escapeHtml(hero.name)} (${escapeHtml(hero.club)}) sumó ${Number(hero.points)} puntos, la mejor marca de la fecha.` : 'Aún no hay actas cargadas.'}</p></div>
      <div class="ideal-eleven-section"><div class="section-title" style="margin-bottom:8px"><span>⭐ ONCE IDEAL (4-3-3)</span><span style="color:var(--gold)">${total} Pts</span></div>
        <div class="ideal-pitch-mini">${row('FWD')}${row('MID')}${row('DEF')}${row('GK')}</div></div>
      <div class="newspaper-awards-grid">
        <div class="award-card gold"><div class="award-icon">👑</div><div class="award-info"><div class="award-badge">DT DE LA FECHA</div><div class="award-name">${top ? '@' + escapeHtml(top.username) : 'Por definir'}</div><div class="award-detail">${top ? Number(top.points) + ' puntos' : 'Se conoce al puntuar la jornada'}</div></div></div>
        <div class="award-card axe"><div class="award-icon">🪓</div><div class="award-info"><div class="award-badge">HACHERO DE ORO</div><div class="award-name">${axe ? escapeHtml(axe.name) + ' (' + escapeHtml(axe.club) + ')' : '—'}</div><div class="award-detail">${axe ? axe.fouls + ' faltas cometidas' : ''}</div></div></div>
        <div class="award-card wood"><div class="award-icon">🪵</div><div class="award-info"><div class="award-badge">EL TRONCO DE LA FECHA</div><div class="award-name">${wood ? escapeHtml(wood.name) + ' (' + escapeHtml(wood.club) + ')' : '—'}</div><div class="award-detail">${wood ? Number(wood.points) + ' pts' : ''}</div></div></div>
      </div>
      ${myPts != null ? `<button type="button" class="btn-whatsapp-share" onclick="shareVictoryCardOnWhatsApp(${myPts})"><span>💬 PRESUMIR MIS ${myPts} PTS EN WHATSAPP</span></button>` : ''}
    </div>`;
}

function shareVictoryCardOnWhatsApp(pts) {
  const g = Pambol.breakdownGw || Pambol.liveGw;
  const cap = getPlayer(captainId);
  const lg = userLeagues[0];
  const text = `🏆 ¡Sumé ${pts} puntos en la ${gwLabel(g)} de PAMBOL!${cap ? `\n👑 Mi capitán: ${cap.name}` : ''}\n\n¿Te animas a competir?${lg ? ` Únete a mi liga "${lg.name}": ${pambolInviteUrl(lg.code)}` : ' ' + (PAMBOL_CFG.SITE_URL || location.origin)}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

// ---------------------------------------------------------------------
// CENTRO DE PARTIDOS (resultados y mis puntos reales)
// ---------------------------------------------------------------------
function openOfficialScoreCenter() {
  const g = Pambol.liveGw || Pambol.editGw;
  const c = document.getElementById('simModalContent');
  if (!c) return;
  if (!g) { c.innerHTML = '<div class="pambol-empty">Todavía no empieza ninguna jornada.</div>'; document.getElementById('simModalOverlay').classList.add('open'); return; }
  const fx = gwFixtures(g.id);
  let qp = 0;
  const fxHtml = fx.map(f => {
    const pick = userPicks[f.id];
    const pts = fixtureStarted(f) ? quinielaPoints(pick, f) : null;
    if (pts) qp += pts;
    const st = f.status === 'finished' ? 'FINAL' : f.status === 'live' ? 'EN VIVO' : f.status === 'postponed' ? 'POSPUESTO' : fmtKickoff(f.kickoff_at);
    return `<div class="sim-fixture-row" style="flex-direction:column;align-items:stretch;gap:4px">
      <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:800;color:#fff">${escapeHtml(clubName(f.home_club))} vs ${escapeHtml(clubName(f.away_club))}</span>
      <div style="display:flex;align-items:center;gap:6px">${f.home_score != null ? `<span class="sim-score-box">${f.home_score} - ${f.away_score}</span>` : ''}<span class="pambol-fx-status ${f.status}">${st}</span></div></div>
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-muted)"><span>Tu pronóstico: <strong>${pick ? pick.h + ' - ' + pick.a : '—'}</strong></span><span style="font-weight:800;color:${pts === 5 ? 'var(--accent-green)' : pts === 3 ? 'var(--gold)' : 'var(--text-muted)'}">${pts == null ? '' : pts + ' pts'}</span></div></div>`;
  }).join('');
  const b = Pambol.breakdownGw && Pambol.breakdownGw.id === g.id ? Pambol.breakdown : null;
  let teamHtml = '<div class="pambol-empty">Inicia sesión y guarda tu equipo para ver tus puntos.</div>';
  if (b) {
    const rows = Object.entries(b.players || {}).sort((x, y) => (y[1].counted - x[1].counted) || (y[1].points - x[1].points)).map(([id, e]) => {
      const p = getPlayer(Number(id));
      return `<div class="sim-fixture-row" onclick="openPlayerMatchBreakdown(${id})" style="cursor:pointer;${e.counted ? '' : 'opacity:.55'}"><div style="flex:1"><div style="font-weight:800;color:#fff">${escapeHtml(p ? p.name : id)} <span style="font-size:10px;color:var(--gold)">${POS_DISPLAY[e.pos] || ''}${e.captain ? ' · 👑' : ''}${e.sub_in ? ' · 🔁 entra' : ''}${e.sub_out ? ' · 🔁 sale' : ''}</span></div>
        <div style="font-size:10px;color:var(--text-muted)">${(e.lines || []).map(l => escapeHtml(l[0]) + ' ' + (l[1] > 0 ? '+' : '') + l[1]).join(' · ') || 'Sin acta todavía'}</div></div>
        <span style="font-size:14px;font-weight:900;color:var(--gold)">${e.counted ? e.points : e.raw}</span></div>`;
    }).join('');
    const coach = getCoach();
    teamHtml = rows + `<div class="sim-fixture-row"><div style="flex:1"><div style="font-weight:800;color:#fff">👔 DT ${escapeHtml(coach ? coach.name : '')}</div><div style="font-size:10px;color:var(--text-muted)">${(b.coach.lines || []).map(l => escapeHtml(l[0])).join(' · ') || 'Sin resultado todavía'}</div></div><span style="font-size:14px;font-weight:900;color:var(--gold)">${b.coach.points}</span></div>
      ${b.penalty ? `<div class="sim-fixture-row"><div style="flex:1;font-weight:800;color:#f87171">Penalización por cambios</div><span style="font-weight:900;color:#f87171">−${b.penalty}</span></div>` : ''}`;
  }
  const ttl = document.querySelector('#simModalOverlay .pambol-gw-name'); if (ttl) ttl.textContent = gwLabel(g);
  c.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(34,197,94,.2) 0%,rgba(21,29,48,.95) 100%);border:1.5px solid var(--accent-green);border-radius:14px;padding:14px;margin-bottom:12px;text-align:center">
      <div style="font-size:10.5px;font-weight:800;color:var(--accent-green);text-transform:uppercase">${escapeHtml(gwLabel(g))} · ${gwInProgress(g) ? 'EN JUEGO' : (g.status === 'scored' ? 'FINAL' : 'POR JUGARSE')}</div>
      <div style="font-size:32px;font-weight:950;color:#fff;margin:4px 0">${b ? Number(b.total) + qp : qp} <span style="font-size:16px;color:var(--gold)">PUNTOS</span></div>
      <div style="font-size:12px;color:#cbd5e1;display:flex;justify-content:center;gap:14px"><span>🏟️ Fantasy: <strong>${b ? b.total : 0}</strong></span><span>🎯 Quiniela: <strong>${qp}</strong></span></div>
    </div>
    <div class="section-title" style="margin-bottom:8px"><span>Partidos</span><span style="color:var(--gold)">${qp} / ${fx.length * 5}</span></div>
    <div class="sim-result-card">${fxHtml || '<div class="pambol-empty">Sin partidos.</div>'}</div>
    <div class="section-title" style="margin-bottom:8px"><span>Mi Once</span></div>
    <div class="sim-result-card">${teamHtml}</div>
    <div class="pambol-muted">Los puntos se calculan con el acta oficial de cada partido. Pueden cambiar hasta que la jornada se cierre.</div>`;
  document.getElementById('simModalOverlay').classList.add('open');
}

// ---------------------------------------------------------------------
// FICHA DE FUTBOLISTA (estadísticas reales)
// ---------------------------------------------------------------------
async function openPlayerDetail(playerId) {
  const p = getPlayer(playerId);
  if (!p) return;
  const f = p.fantasy || {};
  const isStarter = Object.values(lineup).flat().includes(p.id);
  const isBench = Object.values(bench).includes(p.id);
  const isCap = captainId === p.id;
  const curMod = activeModifiers[p.id] || 'NONE';
  const club = clubShortOf(p);
  const content = document.getElementById('playerDetailContent');
  document.getElementById('playerDetailOverlay').classList.add('open');
  let stats = [];
  if (Pambol.online) {
    const r = await Pambol.client.from('player_stats').select('fixture_id,minutes,goals,assists,fouls,dribbles,saves,yellow_cards,red_cards,base_points').eq('player_id', p.id);
    if (!r.error) stats = r.data || [];
  }
  const fxById = {}; Pambol.fixtures.forEach(x => { fxById[x.id] = x; });
  const hist = stats.map(s => ({ ...s, fx: fxById[s.fixture_id] })).filter(s => s.fx).sort((a, b) => new Date(a.fx.kickoff_at) - new Date(b.fx.kickoff_at));
  const last5 = hist.slice(-5);
  const sum = k => hist.reduce((a, s) => a + (s[k] || 0), 0);
  const played = hist.filter(s => s.minutes > 0).length;
  const cs = hist.filter(s => s.minutes >= 60 && ((s.fx.home_club === club ? s.fx.away_score : s.fx.home_score) === 0)).length;
  const standings = pambolComputeStandings().list;
  const rankOf = s => (standings.find(r => r.short === s) || {}).pos || 9;
  const upcoming = Pambol.fixtures.filter(x => (x.home_club === club || x.away_club === club) && x.status === 'scheduled' && new Date(x.kickoff_at) > new Date()).slice(0, 3).map(x => {
    const home = x.home_club === club, opp = home ? x.away_club : x.home_club, rk = rankOf(opp);
    const g = gwById(x.gameweek_id);
    return { gw: gwShort(g), rival: (home ? 'vs ' : '@ ') + opp, diff: rk <= 6 ? 'hard' : rk <= 12 ? 'medium' : 'easy', label: rk <= 6 ? 'Difícil' : rk <= 12 ? 'Medio' : 'Favorable' };
  });
  let hint = '';
  if (played >= 3 && sum('fouls') / played >= 3) hint = `🪓 Promedia ${(sum('fouls') / played).toFixed(1)} faltas por partido: buen perfil para <strong>El Hachero</strong>.`;
  else if (played >= 3 && sum('dribbles') / played >= 2.5) hint = `✨ Promedia ${(sum('dribbles') / played).toFixed(1)} regates por partido: buen perfil para <strong>La Chulada</strong>.`;
  content.innerHTML = `
    <div class="player-card-hero">
      <div class="player-card-hero-top">
        <div class="player-big-jersey ${jerseyClass(p)}">${POS_DISPLAY[p.pos] || p.pos}</div>
        <div class="player-hero-meta"><h3>${escapeHtml(p.name)}${isPlayerInVeda(p) ? ' 🔒' : ''}</h3><p>${escapeHtml(p.team)} · ${POS_LABEL[p.pos]} · ${p.price.toFixed(1)} Varos</p>
          <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap"><span class="fantasy-badge fb-green">${escapeHtml(f.availability || 'Sin confirmación')}</span><span class="fantasy-badge fb-yellow">Forma ⭐ ${Number(p.form).toFixed(1)}</span>${isCap ? '<span class="fantasy-badge fb-yellow">👑 Capitán</span>' : ''}${curMod !== 'NONE' ? `<span class="fantasy-badge fb-red">${getModIcon(curMod)} ${getModShortName(curMod)}</span>` : ''}</div></div>
      </div>
      <div class="stats-kpi-grid">
        <div class="stat-kpi-card"><div class="stat-kpi-val">${p.price.toFixed(1)} V</div><div class="stat-kpi-label">Precio</div></div>
        <div class="stat-kpi-card"><div class="stat-kpi-val">${hist.reduce((a, s) => a + Number(s.base_points), 0)}</div><div class="stat-kpi-label">Pts torneo</div></div>
        <div class="stat-kpi-card"><div class="stat-kpi-val">${f.projection != null ? f.projection : '—'}</div><div class="stat-kpi-label">Proyección</div></div>
        <div class="stat-kpi-card"><div class="stat-kpi-val">${p.trend >= 0 ? '+' : ''}${p.trend.toFixed(1)} V</div><div class="stat-kpi-label">Tendencia</div></div>
      </div>
    </div>
    <div class="pambol-kicker">📈 Puntos por partido (últimos 5)</div>
    <div class="history-points-strip">${last5.map(s => { const home = s.fx.home_club === club; return `<div class="history-point-card"><div class="history-gw-name">${gwShort(gwById(s.fx.gameweek_id))}</div><div class="history-pts-val">${Number(s.base_points) >= 0 ? '+' : ''}${Number(s.base_points)}</div><div class="history-pts-rival">${home ? 'vs' : '@'} ${home ? s.fx.away_club : s.fx.home_club}</div></div>`; }).join('') || '<div class="pambol-muted">Sin partidos registrados en este torneo.</div>'}</div>
    <div class="pambol-kicker" style="margin-top:12px">📊 Estadísticas del torneo</div>
    <div style="background:#090d16;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px">
      <div>⚽ Goles: <strong>${sum('goals')}</strong></div><div>👟 Asistencias: <strong>${sum('assists')}</strong></div>
      <div>🪓 Faltas: <strong>${sum('fouls')}</strong></div><div>✨ Regates: <strong>${sum('dribbles')}</strong></div>
      <div>🛡️ Vallas invictas: <strong>${['GK', 'DEF'].includes(p.pos) ? cs : '—'}</strong></div><div>⏱️ Minutos: <strong>${sum('minutes')}' (${played} PJ)</strong></div>
      ${p.pos === 'GK' ? `<div>🧤 Atajadas: <strong>${sum('saves')}</strong></div>` : ''}<div>🟨 Tarjetas: <strong>${sum('yellow_cards')}A · ${sum('red_cards')}R</strong></div>
    </div></div>
    <div class="pambol-kicker" style="margin-top:12px">📅 Próximos rivales</div>
    <div class="fixtures-diff-row">${upcoming.map(x => `<div class="fixture-diff-card"><div style="font-size:10px;color:var(--text-muted);font-weight:700">${x.gw}</div><div style="font-size:12px;font-weight:900;color:#fff;margin:2px 0">${x.rival}</div><span class="diff-badge diff-${x.diff}">${x.label}</span></div>`).join('') || '<div class="pambol-muted">Sin partidos programados.</div>'}</div>
    ${hint ? `<div style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:10px;padding:10px;margin:12px 0;font-size:11.5px;color:#fde047;line-height:1.4">${hint}</div>` : ''}
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
      ${!isStarter ? `<button class="btn-assign-player" style="justify-content:center;padding:12px;font-size:13px" onclick="signPlayerFromDetail(${p.id}, 'pitch')">➕ Alinear como Titular (${POS_DISPLAY[p.pos]} · ${p.price.toFixed(1)} V)</button>`
        : `<button class="btn-assign-player" style="justify-content:center;padding:12px;font-size:13px;background:#3b82f6;color:#fff" onclick="toggleCaptainFromDetail(${p.id})">👑 ${isCap ? 'Quitar Capitán' : 'Asignar como Capitán (x2 Pts)'}</button>`}
      ${!isBench ? `<button class="btn-liga-action" style="justify-content:center;padding:10px" onclick="signPlayerFromDetail(${p.id}, 'bench')">🪑 Asignar a la Banca</button>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------
// COMPARTIR
// ---------------------------------------------------------------------
function openShareModal() {
  const starters = Object.values(lineup).flat().map(getPlayer).filter(Boolean);
  const cap = getPlayer(captainId), coach = getCoach();
  const line = pos => starters.filter(p => p.pos === pos).map(p => `${p.name} (${p.price.toFixed(1)}V)`).join(', ') || 'Sin asignar';
  const text = `🏆 MI ONCE EN PAMBOL (${gwLabel(Pambol.editGw)} · Liga MX)
⚽ Formación: ${selectedFormation}
💰 Costo: ${calculateTotalSquadCost().toFixed(1)} V de 100 V

🧤 POR: ${line('GK')}
🛡️ DEF: ${line('DEF')}
⚡ MED: ${line('MID')}
🎯 DEL: ${line('FWD')}

👑 Capitán: ${cap ? cap.name : 'Sin asignar'}
👔 DT: ${coach ? coach.name + ' (' + coach.team + ')' : 'Sin asignar'}

Arma el tuyo en ${PAMBOL_CFG.SITE_URL || location.origin} 🇲🇽`;
  document.getElementById('shareTextPreview').innerText = text;
  document.getElementById('shareModalOverlay').classList.add('open');
}

function downloadStoryImage() {
  const canvas = document.getElementById('storyCanvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `Mi_Once_Pambol_${gwShort(Pambol.editGw)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function shareStoryWhatsApp() {
  const cap = getPlayer(captainId);
  const text = `🏆 ¡Mira mi Once en PAMBOL (${gwLabel(Pambol.editGw)})! Capitán: ${cap ? cap.name : '—'} (x2). Arma el tuyo en ${PAMBOL_CFG.SITE_URL || location.origin}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function send1v1WhatsAppChallenge() {
  const cap = getPlayer(captainId);
  const lg = userLeagues.find(l => l.creatorId === PambolCloud.uid()) || userLeagues[0];
  const text = `⚔️ ¡TE RETO EN PAMBOL! ⚽\nDuelo 1 a 1 en la ${gwLabel(Pambol.editGw)}. Mi capitán es ${cap ? cap.name : '—'} (x2).\n¿Tu Once suma más que el mío?\n${lg ? pambolInviteUrl(lg.code) : (PAMBOL_CFG.SITE_URL || location.origin)}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}
