
let currentPosFilter = 'ALL';

// ==========================================
// HELPERS CRÍTICOS Y DEFINICIONES DE CLUBES
// ==========================================
function calculateTotalSquadCost() {
  const startersCost = Object.values(lineup || {}).flat()
    .map(id => getPlayer(id)?.price || 0)
    .reduce((a, b) => a + b, 0);
  const benchCost = Object.values(bench || {})
    .map(id => getPlayer(id)?.price || 0)
    .reduce((a, b) => a + b, 0);
  const coachCost = getCoach() ? getCoach().price : 4.8;
  return Math.round((startersCost + benchCost + coachCost) * 10) / 10;
}

function getCoach() {
  return COACHES.find(c => c.id === selectedCoachId) || COACHES[0];
}

const CLUB_NICKNAMES = {
  AME: 'Las Águilas', CHI: 'El Rebaño Sagrado', CAZ: 'La Máquina Celeste', TIG: 'Los Felinos',
  MTY: 'Los Rayados', TOL: 'Los Diablos Rojos', PUM: 'Los Universitarios', LEO: 'Los Panzas Verdes',
  ATS: 'Los Zorros', PAC: 'Los Tuzos', SAN: 'Los Guerreros', NEC: 'Los Rayos',
  PUE: 'La Franja', TIJ: 'Los Xolos', QRO: 'Los Gallos Blancos', ADSL: 'Los Rojiblancos',
  JUA: 'Los Bravos', MAZ: 'Los Cañoneros', ATL: 'Los Potros de Hierro'
};

/* PEÑAS_CLUBES: ver js/cloud.js */

/* LIGA_MX_AFICIONES: ver js/cloud.js */

let activeAuthTab = 'register';
let selectedRegisterClub = null;


// ==============================================================
// MOTOR DE INTEGRACIÓN CLOUD CON SUPABASE (PERSISTENCIA TOTAL)
// ==============================================================
/* PambolCloud: ver js/cloud.js */

// Inicializar cliente Cloud al cargar
/* PambolCloud.call: ver js/cloud.js */

/* loadUserProfile: ver js/cloud.js */

let currentGw = '11';
let userPicks = {};

document.addEventListener("DOMContentLoaded", () => {
  try { loadSavedState(); } catch(e) { console.warn("Error en loadSavedState:", e); }
  populateClubFilter();
  renderMarket();
  renderFixtures();
  renderStandings();
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
});

function switchTab(tabId, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');
  if (el) el.classList.add('active');

  // Control dinámico de cabecera: ocultar presupuesto en Ligas, Quiniela y Tabla
  const budgetPill = document.getElementById('budgetPill');
  const modPill = document.getElementById('modPill');
  const gameweekBar = document.querySelector('.gameweek-bar');

  if (tabId === 'canchita' || tabId === 'mercado') {
    // En Mi Once y Mercado mostramos presupuesto, modificadores y jornada
    if (budgetPill) budgetPill.style.display = 'block';
    if (modPill) modPill.style.display = 'flex';
    if (gameweekBar) gameweekBar.style.display = 'flex';
  } else {
    // En Ligas, Quiniela y Tabla NO se gestiona presupuesto del Once
    if (budgetPill) budgetPill.style.display = 'none';
    if (modPill) modPill.style.display = 'none';
    if (tabId === 'ligas' || tabId === 'tabla') {
      if (gameweekBar) gameweekBar.style.display = 'none';
    } else {
      if (gameweekBar) gameweekBar.style.display = 'flex';
    }
  }
}


// ==========================================
// SUB-PESTAÑAS DE MI ONCE (CANCHA PURA VS TÁCTICA)
// ==========================================
function switchCanchitaSubTab(viewName) {
  const views = ['cancha', 'tactics', 'tools'];
  views.forEach(v => {
    const el = document.getElementById(v === 'cancha' ? 'canchitaViewPitch' : (v === 'tactics' ? 'canchitaViewTactics' : 'canchitaViewTools'));
    const btn = document.getElementById(v === 'cancha' ? 'btnSubTabCancha' : (v === 'tactics' ? 'btnSubTabTactics' : 'btnSubTabTools'));
    if (el) el.style.display = (v === viewName) ? (v === 'cancha' ? 'block' : 'flex') : 'none';
    if (btn) btn.classList.toggle('active', v === viewName);
  });

  // Actualizar cabecera mínima si estamos en la cancha
  if (viewName === 'cancha') {
    updatePitchMinimalHeader();
  const sBanner = document.getElementById('swapActiveBanner');
  const sText = document.getElementById('swapBannerText');
  if (sBanner && sText) {
    if (swapSource) {
      sBanner.style.display = 'flex';
      sText.innerHTML = `Cambiando a <strong>${escapeHtml(swapSource.name)}</strong>: Toca otro jugador para intercambiar posición`;
    } else {
      sBanner.style.display = 'none';
    }
  }
  }
}

function updatePitchMinimalHeader() {
  const formEl = document.getElementById('canchaHeaderFormation');
  const flexEl = document.getElementById('canchaHeaderFlex');
  const capEl = document.getElementById('canchaHeaderCaptain');
  const costEl = document.getElementById('canchaHeaderCost');

  const flexCount = { DEF: (lineup.DEF || []).length, MID: (lineup.MID || []).length, FWD: (lineup.FWD || []).length };
  const flexPos = flexCount.DEF > 3 ? 'DEF' : (flexCount.MID > 3 ? 'MED' : 'DEL');

  if (formEl) formEl.textContent = `${selectedFormation} ▾`;
  if (flexEl) flexEl.textContent = flexPos;

  const cap = getPlayer(captainId);
  if (capEl && cap) capEl.textContent = `👑 ${playerShortName(cap)} (C x2)`;

  const totalCost = calculateTotalSquadCost();
  if (costEl) costEl.textContent = `${totalCost.toFixed(1)} V`;
  const livePtsEl = document.getElementById('liveTotalPtsDisplay');
  if (livePtsEl) livePtsEl.textContent = `${calculateTotalLivePoints()} Pts`;
}

// ==========================================
// CHIPS DE FILTRO DE CLUBES Y ORDEN EN MERCADO
// ==========================================
let currentMarketSort = 'price_desc';

function selectClubChip(clubName) {
  document.querySelectorAll('.club-chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.club === clubName);
  });
  const select = document.getElementById('clubFilter');
  if (select) {
    select.value = clubName;
  }
  renderMarket();
}

function setMarketSort(sortType) {
  currentMarketSort = sortType;
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
  const activeBtn = document.getElementById(sortType === 'price_desc' ? 'sortPriceDesc' : (sortType === 'price_asc' ? 'sortPriceAsc' : 'sortFormDesc'));
  if (activeBtn) activeBtn.classList.add('active');
  renderMarket();
}

function populateClubFilter() {
  const select = document.getElementById("clubFilter");
  DB.teams.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.innerText = t.name;
    select.appendChild(opt);
  });
}

function setPosFilter(pos, el) {
  currentPosFilter = pos;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filterMarket();
}


// ==============================================================
// PILAR 2: CLÁUSULAS DE RESCISIÓN (ROBO DE JUGADORES ENTRE AMIGOS)
// ==============================================================
/* executeClausulaRescision: ver js/cloud.js */

function filterMarket() {
  renderMarket();
}

/* renderMarket: ver js/cloud.js */


const TEAM_FLAGS = {
  'AME': 'linear-gradient(90deg, #fef08a 50%, #1e3a8a 50%)', // Amarillo y Azul
  'CHI': 'repeating-linear-gradient(90deg, #ef4444, #ef4444 3px, #ffffff 3px, #ffffff 6px)', // Rayas Rojiblancas
  'CAZ': 'linear-gradient(90deg, #2563eb 65%, #ffffff 65%)', // Azul y Blanco
  'TIG': 'linear-gradient(90deg, #f59e0b 50%, #1e3a8a 50%)', // Amarillo y Azul
  'MTY': 'repeating-linear-gradient(90deg, #1e3a8a, #1e3a8a 3px, #ffffff 3px, #ffffff 6px)', // Rayas Azul y Blanco
  'TOL': 'linear-gradient(90deg, #dc2626 70%, #ffffff 70%)', // Rojo y Blanco
  'PUM': 'linear-gradient(135deg, #1e293b 50%, #fbbf24 50%)', // Azul y Dorado
  'PAC': 'repeating-linear-gradient(90deg, #0284c7, #0284c7 3px, #ffffff 3px, #ffffff 6px)', // Azul y Blanco
  'SAN': 'repeating-linear-gradient(90deg, #16a34a, #16a34a 3px, #ffffff 3px, #ffffff 6px)', // Rayas Verde y Blanco
  'LEO': 'linear-gradient(90deg, #15803d 70%, #facc15 70%)', // Verde y Amarillo
  'ATS': 'linear-gradient(90deg, #dc2626 50%, #000000 50%)', // Rojinegro clásico
  'NEC': 'repeating-linear-gradient(90deg, #dc2626, #dc2626 3px, #ffffff 3px, #ffffff 6px)', // Rayas Rojiblancas
  'ADSL': 'linear-gradient(90deg, #dc2626 50%, #1e3a8a 50%)', // Rojo y Azul
  'TIJ': 'linear-gradient(90deg, #dc2626 50%, #000000 50%)', // Rojo y Negro
  'JUA': 'linear-gradient(90deg, #16a34a 50%, #dc2626 50%)', // Verde y Rojo
  'PUE': 'linear-gradient(135deg, #ffffff 35%, #2563eb 35%, #2563eb 65%, #ffffff 65%)', // Franja Azul y Blanco
  'QRO': 'linear-gradient(90deg, #2563eb 50%, #000000 50%)', // Azul y Negro
  'ATL': 'linear-gradient(90deg, #1e3a8a 50%, #b91c1c 50%)', // Azulgrana
  'MAZ': 'linear-gradient(90deg, #7e22ce 50%, #000000 50%)'  // Morado y Negro
};

function getTeamFlagHtml(shortCode) {
  const bg = TEAM_FLAGS[shortCode] || 'linear-gradient(90deg, #334155 50%, #64748b 50%)';
  return `<span class="team-flag-ribbon" style="background: ${bg};"></span>`;
}


const CLUB_CRESTS = {
  'AME': { bg: 'linear-gradient(135deg, #fef08a 45%, #1e3a8a 45%)', icon: '🦅' },
  'CHI': { bg: 'repeating-linear-gradient(90deg, #ef4444, #ef4444 4px, #ffffff 4px, #ffffff 8px)', icon: '🐐' },
  'CAZ': { bg: 'radial-gradient(circle, #2563eb 60%, #ffffff 60%)', icon: '🚂' },
  'TIG': { bg: 'linear-gradient(135deg, #f59e0b 50%, #1e3a8a 50%)', icon: '🐯' },
  'MTY': { bg: 'repeating-linear-gradient(90deg, #1e3a8a, #1e3a8a 4px, #ffffff 4px, #ffffff 8px)', icon: '🤠' },
  'TOL': { bg: 'linear-gradient(135deg, #dc2626 70%, #ffffff 70%)', icon: '👹' },
  'PUM': { bg: 'linear-gradient(135deg, #1e293b 50%, #fbbf24 50%)', icon: '🐾' },
  'PAC': { bg: 'repeating-linear-gradient(90deg, #0284c7, #0284c7 4px, #ffffff 4px, #ffffff 8px)', icon: '🐹' },
  'SAN': { bg: 'repeating-linear-gradient(90deg, #16a34a, #16a34a 4px, #ffffff 4px, #ffffff 8px)', icon: '⚔️' },
  'LEO': { bg: 'linear-gradient(135deg, #15803d 65%, #facc15 65%)', icon: '🦁' },
  'ATS': { bg: 'linear-gradient(90deg, #dc2626 50%, #000000 50%)', icon: '🦊' },
  'NEC': { bg: 'repeating-linear-gradient(90deg, #dc2626, #dc2626 4px, #ffffff 4px, #ffffff 8px)', icon: '⚡' },
  'ADSL': { bg: 'linear-gradient(90deg, #dc2626 50%, #1e3a8a 50%)', icon: '🛡️' },
  'TIJ': { bg: 'linear-gradient(135deg, #dc2626 50%, #000000 50%)', icon: '🐕' },
  'JUA': { bg: 'linear-gradient(135deg, #16a34a 50%, #dc2626 50%)', icon: '🐎' },
  'PUE': { bg: 'linear-gradient(135deg, #ffffff 30%, #2563eb 30%, #2563eb 70%, #ffffff 70%)', icon: '🎽' },
  'QRO': { bg: 'linear-gradient(90deg, #2563eb 50%, #000000 50%)', icon: '🐓' },
  'ATL': { bg: 'linear-gradient(90deg, #1e3a8a 50%, #b91c1c 50%)', icon: '🐴' },
  'MAZ': { bg: 'linear-gradient(135deg, #7e22ce 50%, #000000 50%)', icon: '⚓' }
};

function getClubCrestHtml(shortCode) {
  const c = CLUB_CRESTS[shortCode] || { bg: '#1e293b', icon: '⚽' };
  return `<div class="club-crest-emblem" style="background: ${c.bg};"><span class="club-crest-icon">${c.icon}</span></div>`;
}

/* switchGw: ver js/cloud.js */

/* renderFixtures: ver js/cloud.js */

/* saveQuinielaPicks: ver js/cloud.js */

/* adjustScore: ver js/cloud.js */

/* setQuickScore: ver js/cloud.js */

// 4. Módulo de Tabla Oficial (Formato Liguilla Directa 1-8)

/* saveSupabaseCredentials: ver js/cloud.js */

/* syncAllToCloudNow: ver js/cloud.js */

/* disconnectSupabase: ver js/cloud.js */


// ==============================================================
// PILAR 3: EL DIARIO DEPORTIVO & ONCE IDEAL DE LA JORNADA 11
// ==============================================================
function openDiarioDeportivoModal() {
  const modalEl = document.getElementById('diarioModalOverlay');
  if (!modalEl) return;
  playStadiumSound('trumpet');
  hapticFeedback([25, 40, 25]);
  renderDiarioContent();
  modalEl.classList.add('open');
}

function closeDiarioDeportivoModal() {
  const modalEl = document.getElementById('diarioModalOverlay');
  if (modalEl) modalEl.classList.remove('open');
}

/* renderDiarioContent: ver js/cloud.js */

/* shareVictoryCardOnWhatsApp: ver js/cloud.js */

/* renderStandings: ver js/cloud.js */



// ==========================================
// MI ONCE — LOGICA COMPLETA DE OPCION A
// ==========================================
/* PAMBOL_DATA_META: ver js/cloud.js */


// ==============================================================
// RESPUESTA HÁPTICA (VIBRACIÓN DE CELULAR) Y BLOQUEO DE GESTOS
// ==============================================================
function hapticFeedback(pattern = [15]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

// Prevenir doble toque accidental para zoom en pantallas táctiles
let lastTouchTimePambol = 0;
document.addEventListener('touchend', function (e) {
  const now = Date.now();
  if (now - lastTouchTimePambol <= 300) {
    e.preventDefault();
  }
  lastTouchTimePambol = now;
}, { passive: false });

// Prevenir zoom con dos dedos en la interfaz principal
document.addEventListener('touchmove', function (e) {
  if (e.touches && e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

const FORMATIONS = {
  '3-4-3': { DEF: 3, MID: 4, FWD: 3 },
  '3-3-4': { DEF: 3, MID: 3, FWD: 4 },
  '4-3-3': { DEF: 4, MID: 3, FWD: 3 }
};
const POS_LABEL = { GK:'Arquero', DEF:'Defensor', MID:'Volante', FWD:'Delantero' };
const POS_PLURAL = { GK:'Arqueros', DEF:'Defensores', MID:'Volantes', FWD:'Delanteros' };
const POS_DISPLAY = { GK:'POR', DEF:'DEF', MID:'MED', FWD:'DEL' };

let selectedFormation = '4-3-3';
// Plantel Oficial 100% Válido y Completo (Total: 99.2 Varos / Límite 100.0 V)
// 11 Titulares (1 POR, 4 DEF, 3 MED, 3 DEL) + 4 Suplentes + DT
// Máximo 3 titulares por club: Chivas (3), América (3), Toluca (2), Cruz Azul (1), Monterrey (1), Santos (1)
const DEFAULT_LINEUP = {
  GK: [10041], // Raúl Rangel (Chivas - 5.8 V)
  DEF: [10145, 10070, 10009, 10044], // Gallardo (Tol 6.0 V), Piovi (CAZ 6.6 V), Reyes (AME 5.8 V), Briseño (CHI 4.6 V)
  MID: [10029, 10136, 10049], // Fidalgo (AME 10.8 V), Óliver Torres (MTY 7.8 V), Beltrán (CHI 5.8 V)
  FWD: [10157, 10032, 10223]  // Alexis Vega (Tol 10.0 V), Henry Martín (AME 10.4 V), Santiago Muñoz (SAN 5.0 V)
};
const DEFAULT_BENCH = {
  GK: 10003,  // Jonathan Estrada (América - 3.4 V)
  DEF: 10194, // Jorge Berlanga (Pachuca - 4.2 V)
  MID: 10074, // Amaury Morales (Cruz Azul - 4.4 V)
  FWD: 10139  // Roberto de la Rosa (Monterrey - 3.8 V)
};

let lineup = JSON.parse(JSON.stringify(DEFAULT_LINEUP));
let bench = JSON.parse(JSON.stringify(DEFAULT_BENCH));
let selectedCoachId = 1; // Guillermo Almada (4.8 V)
let captainId = 10157; // Alexis Vega (Capitán x2)
let activeModifiers = { 10029: 'CHULADA', 10070: 'HACHERO' };

let pickerPosition = null; // { pos, idx, type }
let pickerContext = null;
let activeSlotContext = null; // { pos, idx, type, playerId }

function getPlayer(id) {
  return DB.players.find(p => p.id === id);
}

function playerShortName(p) {
  if (!p) return 'Elegir';
  // Limpiar apodos y paréntesis para mostrar el apellido / nombre futbolero real
  let clean = p.name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = clean.split(' ');
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    // Ej: "Alexis Vega" -> "Vega", "Álvaro Fidalgo" -> "Fidalgo", "Henry Martín" -> "Martín"
    return parts[1];
  }
  // Casos compuestos: "Jesús Alberto Gallardo" -> "Gallardo", "Santiago Muñoz" -> "Muñoz"
  return parts[parts.length - 1];
}

function jerseyClass(p) {
  const t = (DB.teams.find(x => x.id === p?.tId)?.short || '').toLowerCase();
  return ['ame','chi','caz','tig','tol','mty'].includes(t) ? t : 'default';
}

// Persistencia LocalStorage con Autovalidación y Autorreparación (v6)
const STORAGE_KEY = 'pambol_state_v6';

function loadSavedState() {
  loadUserProfile();
  applyUserClubStadiumLighting();
  updateUserClubMatchAlert();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.lineup && typeof parsed.lineup === 'object') lineup = parsed.lineup;
      if (parsed.bench && typeof parsed.bench === 'object') bench = parsed.bench;
      if (parsed.selectedCoachId) selectedCoachId = parsed.selectedCoachId;
      if (parsed.captainId) captainId = parsed.captainId;
      if (parsed.activeModifiers) activeModifiers = parsed.activeModifiers;
      if (parsed.selectedFormation) {
        selectedFormation = parsed.selectedFormation;
        document.querySelectorAll('.formation-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.formation === selectedFormation);
        });
      }
      if (parsed.userPicks) userPicks = parsed.userPicks;
    }

    // Validación estricta: verificar que TODOS los puestos estén ocupados por futbolistas existentes
    // Si algún puesto está vacío o roto, autorreparar con el plantel por defecto completo (99.2 V)
    const counts = FORMATIONS[selectedFormation] || FORMATIONS['4-3-3'];
    let needsRepair = false;

    if (!lineup.GK || !lineup.GK[0] || !getPlayer(lineup.GK[0])) needsRepair = true;
    ['DEF', 'MID', 'FWD'].forEach(pos => {
      if (!lineup[pos] || lineup[pos].length !== counts[pos]) needsRepair = true;
      else {
        for (let i = 0; i < counts[pos]; i++) {
          if (!lineup[pos][i] || !getPlayer(lineup[pos][i])) needsRepair = true;
        }
      }
    });

    const benchPosArr = ['GK', 'DEF', 'MID', 'FWD'];
    benchPosArr.forEach(pos => {
      if (!bench[pos] || !getPlayer(bench[pos])) needsRepair = true;
    });

    if (!captainId || !getPlayer(captainId)) {
      captainId = 10157; // Alexis Vega
      needsRepair = true;
    }

    if (needsRepair) {
      console.log("PAMBOL: Autorreparando plantilla a equipo completo 100% válido (99.2 V)...");
      lineup = JSON.parse(JSON.stringify(DEFAULT_LINEUP));
      bench = JSON.parse(JSON.stringify(DEFAULT_BENCH));
      captainId = 10157;
      saveState();
    }
  } catch (e) {
    console.warn("Error cargando LocalStorage, usando valores por defecto:", e);
    lineup = JSON.parse(JSON.stringify(DEFAULT_LINEUP));
    bench = JSON.parse(JSON.stringify(DEFAULT_BENCH));
    captainId = 10157;
  }
}

function saveState() {
  try {
    const payload = {
      lineup,
      bench,
      selectedCoachId,
      captainId,
      activeModifiers,
      selectedFormation,
      userPicks
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Error guardando LocalStorage:", e);
  }
}

// 1. Selector de Formaciones
function changeFormation(formation) {
  selectedFormation = formation;
  const counts = FORMATIONS[formation];
  ['DEF','MID','FWD'].forEach(pos => {
    lineup[pos] = (lineup[pos] || []).slice(0, counts[pos]);
    while (lineup[pos].length < counts[pos]) lineup[pos].push(null);
  });
  document.querySelectorAll('.formation-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.formation === formation);
  });
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  saveState();
}


function resetDefaultLineupWithConfirmation() {
  if (confirm("¿Deseas restaurar la plantilla oficial por defecto de PAMBOL?\n\nSe reestablecerán los 11 titulares de lujo (99.2 Varos) con Alexis Vega de capitán, los 4 suplentes y el DT Guillermo Almada.")) {
    lineup = JSON.parse(JSON.stringify(DEFAULT_LINEUP));
    bench = JSON.parse(JSON.stringify(DEFAULT_BENCH));
    selectedFormation = '4-3-3';
    selectedCoachId = 1;
    captainId = 10157;
    activeModifiers = { 10029: 'CHULADA', 10070: 'HACHERO' };
    swapSource = null;
    hapticFeedback([30, 50]);
    playStadiumSound('whistle');
    saveState();
    renderLineup();
    showToast("✅ ¡Plantilla oficial de lujo restaurada al 100%!");
  }
}


function renderLineup() {
  try {
    // Validación y autorreparación automática si los arreglos fueron corrompidos
    const c = FORMATIONS[selectedFormation] || FORMATIONS['4-3-3'];
    if (!lineup || !lineup.GK || !lineup.DEF || !lineup.MID || !lineup.FWD || !bench) {
      console.warn("Plantel corrupto detectado en renderLineup. Autorreparando plantilla oficial completa (99.2 V)...");
      lineup = JSON.parse(JSON.stringify(DEFAULT_LINEUP));
      bench = JSON.parse(JSON.stringify(DEFAULT_BENCH));
      selectedFormation = '4-3-3';
      selectedCoachId = 1;
      captainId = 10157;
      activeModifiers = { 10029: 'CHULADA', 10070: 'HACHERO' };
      saveState();
    }

    const rows = [
      { pos:'FWD', count: c.FWD },
      { pos:'MID', count: c.MID },
      { pos:'DEF', count: c.DEF },
      { pos:'GK', count: 1 }
    ];
    const labels = { FWD:'Delanteros', MID:'Volantes', DEF:'Defensores', GK:'Arquero' };
    const container = document.getElementById('pitchRows');
    if (container) {
      container.innerHTML = rows.map(row => {
        const arr = (row.pos === 'GK') ? (lineup.GK || [10041]) : (lineup[row.pos] || []);
        // Garantizar que la cantidad de puestos coincida con la formación seleccionada
        const slotsToRender = [];
        for (let i = 0; i < row.count; i++) {
          slotsToRender.push(arr[i] || null);
        }
        return `<div class="pitch-row" aria-label="${labels[row.pos]}">
          ${slotsToRender.map((id, idx) => renderSlot(row.pos, id, idx)).join('')}
        </div>`;
      }).join('');
    }

    const formationEl = document.getElementById('formationSummary');
    if (formationEl) {
      formationEl.innerText = `${selectedFormation} · 1 Arquero · ${c.DEF} Defensores · ${c.MID} Volantes · ${c.FWD} Delanteros`;
    }

    renderBench();
    renderSelectedCoach();
    renderLineupAnalytics();
    updateBudget();
    updatePitchMinimalHeader();

    // Actualizar etiqueta del botón en vivo en la barra táctica
    const livePill = document.getElementById('pitchLivePill');
    const liveText = document.getElementById('livePtsSummaryText');
    const liveLabel = document.getElementById('liveToggleLabel');
    if (liveText && liveLabel) {
      const totalLive = calculateTotalLivePoints();
      if (isLiveScoringMode) {
        liveText.innerHTML = pambolLiveLabel(totalLive);
        liveLabel.textContent = '🟢 VIVO';
        if (livePill) livePill.classList.remove('tactical-mode');
      } else {
        liveText.innerHTML = `🛡️ <strong>MODO TÁCTICO</strong> (COTIZACIONES)`;
        liveLabel.textContent = '⚪ COTIZ.';
        if (livePill) livePill.classList.add('tactical-mode');
      }
    }

    const sBanner = document.getElementById('swapActiveBanner');
    const sText = document.getElementById('swapBannerText');
    if (sBanner && sText) {
      if (swapSource) {
        sBanner.style.display = 'flex';
        sText.innerHTML = `Cambiando a <strong>${escapeHtml(swapSource.name)}</strong>: Toca otro jugador para intercambiar posición`;
      } else {
        sBanner.style.display = 'none';
      }
    }
  } catch (err) {
    console.error("Excepción en renderLineup:", err);
    // Rescate automático
    lineup = JSON.parse(JSON.stringify(DEFAULT_LINEUP));
    bench = JSON.parse(JSON.stringify(DEFAULT_BENCH));
    selectedFormation = '4-3-3';
    saveState();
  }
}

    // ==============================================================
// PILAR 1: MOTOR DE PUNTUACIÓN EN VIVO (LIVE SCORING JORNADA 11)
// ==============================================================
let isLiveScoringMode = true; // Modo en vivo activado por defecto

// Estadísticas detalladas oficiales de la Jornada 11 para cada futbolista
/* LIVE_PLAYER_MATCH_STATS: ver js/cloud.js */

function toggleLiveScoring() {
  isLiveScoringMode = !isLiveScoringMode;
  hapticFeedback([20]);
  renderLineup();
  showToast(isLiveScoringMode ? '🟢 Modo Puntos en Vivo activado' : '⚪ Modo Vista Táctica activado');
}

/* calculateTotalLivePoints: ver js/cloud.js */

/* openPlayerMatchBreakdown: ver js/cloud.js */

function closePlayerStatsModal() {
  const modalEl = document.getElementById('playerStatsModal');
  if (modalEl) modalEl.classList.remove('open');
}

function setCaptainDirect(pid) {
  captainId = (captainId === Number(pid)) ? null : Number(pid);
  hapticFeedback([35]);
  playStadiumSound('trumpet');
  saveState();
  renderLineup();
  closePlayerStatsModal();
  showToast(captainId ? '👑 ¡Nuevo Capitán Pambolero confirmado (x2 puntos)!' : 'Capitán desasignado');
}


// ==============================================================
// MOTOR DE INTERCAMBIO Y PERMUTA DE POSICIONES (SWAP ENGINE)
// ==============================================================
let swapSource = null; // { pos, idx, type, playerId, name }

function startPlayerSwap(pos, idx, type, playerId) {
  const p = getPlayer(playerId);
  if (!p) return;

  if (isPlayerInVeda(p)) {
    alert(`🔒 JUGADOR EN VEDA OFICIAL:\n\n${p.name} ya está disputando su partido de Liga MX y no puede ser movido de lugar.`);
    return;
  }

  swapSource = { pos, idx, type, playerId, name: p.name, pPos: p.pos };
  hapticFeedback([25]);
  playStadiumSound('click');
  closePlayerActionMenu();
  renderLineup();
  showToast(`⇄ Modo Intercambio: Toca otro jugador para cambiarlo de lugar con ${p.name}`);
}

function cancelPlayerSwap() {
  swapSource = null;
  hapticFeedback([15]);
  renderLineup();
  showToast('Intercambio cancelado');
}

function handleSwapTargetSelected(targetPos, targetIdx, targetType) {
  if (!swapSource) return;

  const src = swapSource;
  const targetSlotId = (targetType === 'pitch') ? (targetPos === 'GK' ? lineup.GK[0] : lineup[targetPos][targetIdx]) : bench[targetPos];
  const targetPlayer = targetSlotId ? getPlayer(targetSlotId) : null;

  // Si tocó al mismo jugador, cancelar
  if (src.type === targetType && src.pos === targetPos && src.idx === targetIdx) {
    cancelPlayerSwap();
    return;
  }

  if (targetPlayer && isPlayerInVeda(targetPlayer)) {
    alert(`🔒 JUGADOR EN VEDA OFICIAL:\n\n${targetPlayer.name} ya está en juego y no puede ser movido.`);
    cancelPlayerSwap();
    return;
  }

  executePlayerSwap(src, { pos: targetPos, idx: targetIdx, type: targetType, playerId: targetSlotId });
}

function executePlayerSwap(src, target) {
  hapticFeedback([40, 60, 40]);
  playStadiumSound('whistle');
  triggerConfetti();

  // Caso 1: Ambos son titulares en la cancha
  if (src.type === 'pitch' && target.type === 'pitch') {
    if (src.pos === target.pos) {
      // Intercambio directo dentro de la misma línea (ej. Defensor Derecho por Izquierdo)
      const temp = lineup[src.pos][src.idx];
      lineup[src.pos][src.idx] = lineup[target.pos][target.idx];
      lineup[target.pos][target.idx] = temp;
      showToast(`⇄ ¡Posiciones intercambiadas en cancha!`);
    } else {
      // Intercambio entre posiciones distintas en cancha
      // En PAMBOL la estructura es 1-3-3-3 + 1 FLEX. Si se intercambia el jugador FLEX, la formación se adapta.
      const srcId = lineup[src.pos][src.idx];
      const targetId = lineup[target.pos][target.idx];
      const srcP = getPlayer(srcId);
      const targetP = getPlayer(targetId);

      if (srcP && targetP) {
        // Verificar si cambiando los jugadores genera una formación válida (4-3-3, 3-4-3 o 3-3-4)
        let newDEF = lineup.DEF.slice();
        let newMID = lineup.MID.slice();
        let newFWD = lineup.FWD.slice();

        // Reemplazar
        if (src.pos === 'DEF') newDEF[src.idx] = targetId;
        else if (src.pos === 'MID') newMID[src.idx] = targetId;
        else if (src.pos === 'FWD') newFWD[src.idx] = targetId;

        if (target.pos === 'DEF') newDEF[target.idx] = srcId;
        else if (target.pos === 'MID') newMID[target.idx] = srcId;
        else if (target.pos === 'FWD') newFWD[target.idx] = srcId;

        // Contar posiciones naturales
        const all10 = [...newDEF, ...newMID, ...newFWD].map(id => getPlayer(id)).filter(Boolean);
        const defCount = all10.filter(p => p.pos === 'DEF').length;
        const midCount = all10.filter(p => p.pos === 'MID').length;
        const fwdCount = all10.filter(p => p.pos === 'FWD').length;

        let matchedFormation = null;
        for (let fName in FORMATIONS) {
          const f = FORMATIONS[fName];
          if (f.DEF === defCount && f.MID === midCount && f.FWD === fwdCount) {
            matchedFormation = fName;
            break;
          }
        }

        if (matchedFormation) {
          selectedFormation = matchedFormation;
          // Reasignar listas acordes
          lineup.DEF = all10.filter(p => p.pos === 'DEF').map(p => p.id);
          lineup.MID = all10.filter(p => p.pos === 'MID').map(p => p.id);
          lineup.FWD = all10.filter(p => p.pos === 'FWD').map(p => p.id);
          showToast(`⇄ ¡Alineación reorganizada a esquema ${selectedFormation}!`);
        } else {
          // Si no cambia la formación, permitir si es misma posición o permutar
          const temp = lineup[src.pos][src.idx];
          lineup[src.pos][src.idx] = lineup[target.pos][target.idx];
          lineup[target.pos][target.idx] = temp;
          showToast(`⇄ ¡Jugadores intercambiados de lugar!`);
        }
      }
    }
  } 
  // Caso 2: Uno es titular y el otro es suplente en la banca
  else if (src.type === 'pitch' && target.type === 'bench') {
    const starterId = lineup[src.pos][src.idx];
    const benchId = bench[target.pos];
    const starterP = getPlayer(starterId);
    const benchP = getPlayer(benchId);

    if (starterP && benchP) {
      if (starterP.pos === benchP.pos) {
        // Misma posición natural: sustitución directa
        lineup[src.pos][src.idx] = benchId;
        bench[target.pos] = starterId;
        showToast(`⇄ ¡Cambio realizado: ${benchP.name} ingresa por ${starterP.name}!`);
      } else {
        // Distinta posición: intentar ajustar el puesto FLEX
        let allStarters = Object.values(lineup).flat().filter(id => id !== starterId);
        allStarters.push(benchId); // ingresa el suplente
        const starterObjs = allStarters.map(id => getPlayer(id)).filter(Boolean);
        const defC = starterObjs.filter(p => p.pos === 'DEF').length;
        const midC = starterObjs.filter(p => p.pos === 'MID').length;
        const fwdC = starterObjs.filter(p => p.pos === 'FWD').length;

        let matched = null;
        for (let fName in FORMATIONS) {
          const f = FORMATIONS[fName];
          if (f.DEF === defC && f.MID === midC && f.FWD === fwdC) {
            matched = fName;
            break;
          }
        }

        if (matched) {
          selectedFormation = matched;
          lineup.DEF = starterObjs.filter(p => p.pos === 'DEF').map(p => p.id);
          lineup.MID = starterObjs.filter(p => p.pos === 'MID').map(p => p.id);
          lineup.FWD = starterObjs.filter(p => p.pos === 'FWD').map(p => p.id);
          bench[starterP.pos] = starterId;
          showToast(`⇄ ¡${benchP.name} ingresa a la cancha (Nueva formación: ${matched})!`);
        } else {
          alert(`⚠️ Para ingresar a un ${POS_LABEL[benchP.pos]}, tu formación debe quedar en 4-3-3, 3-4-3 o 3-3-4.`);
          cancelPlayerSwap();
          return;
        }
      }
    }
  } 
  // Caso 3: Suplente pasa a la cancha por titular (iniciado desde la banca)
  else if (src.type === 'bench' && target.type === 'pitch') {
    const benchId = bench[src.pos];
    const starterId = lineup[target.pos][target.idx];
    const benchP = getPlayer(benchId);
    const starterP = getPlayer(starterId);

    if (benchP && starterP) {
      if (benchP.pos === starterP.pos) {
        bench[src.pos] = starterId;
        lineup[target.pos][target.idx] = benchId;
        showToast(`⇄ ¡Cambio realizado: ${benchP.name} entra por ${starterP.name}!`);
      } else {
        let allStarters = Object.values(lineup).flat().filter(id => id !== starterId);
        allStarters.push(benchId);
        const starterObjs = allStarters.map(id => getPlayer(id)).filter(Boolean);
        const defC = starterObjs.filter(p => p.pos === 'DEF').length;
        const midC = starterObjs.filter(p => p.pos === 'MID').length;
        const fwdC = starterObjs.filter(p => p.pos === 'FWD').length;

        let matched = null;
        for (let fName in FORMATIONS) {
          const f = FORMATIONS[fName];
          if (f.DEF === defC && f.MID === midC && f.FWD === fwdC) {
            matched = fName;
            break;
          }
        }

        if (matched) {
          selectedFormation = matched;
          lineup.DEF = starterObjs.filter(p => p.pos === 'DEF').map(p => p.id);
          lineup.MID = starterObjs.filter(p => p.pos === 'MID').map(p => p.id);
          lineup.FWD = starterObjs.filter(p => p.pos === 'FWD').map(p => p.id);
          bench[starterP.pos] = starterId;
          showToast(`⇄ ¡${benchP.name} entra a la cancha (Nueva formación: ${matched})!`);
        } else {
          alert(`⚠️ Para ingresar a un ${POS_LABEL[benchP.pos]}, tu formación debe quedar en 4-3-3, 3-4-3 o 3-3-4.`);
          cancelPlayerSwap();
          return;
        }
      }
    }
  }
  // Caso 4: Intercambio entre suplentes en la banca
  else if (src.type === 'bench' && target.type === 'bench') {
    const temp = bench[src.pos];
    bench[src.pos] = bench[target.pos];
    bench[target.pos] = temp;
    showToast(`⇄ ¡Banca reorganizada!`);
  }

  swapSource = null;
  saveState();
  renderLineup();
  pambolMarkDirty();
}

    // Helpers de Metadatos de Modificadores Tácticos

function getModTitle(mod) {
  const titles = {
    'HACHERO': '🪓 El Hachero (+5 pts con 4+ faltas)',
    'CHULADA': '✨ La Chulada (+3 pts con 3+ regates)',
    'PARO': '🛡️ El Paro (Anula sanciones)',
    'LEYEX': '🏹 Ley del Ex (Goles dobles vs ex-club)',
    'REVULSIVO': '⚡ El Revulsivo (Puntuación de 90 min para suplente)'
  };
  return titles[mod] || 'Modificador Táctico';
}

function getModIcon(mod) {
  const icons = { 'HACHERO': '🪓', 'CHULADA': '✨', 'PARO': '🛡️', 'LEYEX': '🏹', 'REVULSIVO': '⚡' };
  return icons[mod] || '⚔️';
}
function getModShortName(mod) {
  const names = { 'HACHERO': 'HACHERO', 'CHULADA': 'CHULADA', 'PARO': 'EL PARO', 'LEYEX': 'LEY DEL EX', 'REVULSIVO': 'REVULSIVO' };
  return names[mod] || mod;
}
function getModBonusLabel(mod) {
  const bonuses = { 'HACHERO': '+5 PTS', 'CHULADA': '+3 PTS', 'PARO': 'ESCUDO', 'LEYEX': 'GOL x2', 'REVULSIVO': 'BANCA' };
  return bonuses[mod] || '';
}

    function renderSlot(pos, id, idx) {
  const p = getPlayer(id);
  const posTag = POS_DISPLAY[pos] || pos;
  if (!p) {
    return `
      <div class="player-card slot-card" onclick="handleSlotClick('${pos}', ${idx}, 'pitch')">
        ${getJerseySvg(null, false, true, posTag)}
        <div class="player-info">
          <div class="player-name" style="color: var(--accent-green);">+ Elegir</div>
          <div class="player-cost" style="justify-content: center;">
            <span style="font-size: 9px; font-weight: 900; color: var(--gold);">${POS_LABEL[pos]}</span>
          </div>
        </div>
      </div>
    `;
  }

  const isCaptain = (p.id === captainId);
  const mod = activeModifiers[p.id] || 'NONE';
  const inVeda = isPlayerInVeda(p);
  const vedaBadge = inVeda ? '<div class="badge-veda-lock" title="Partido en juego (Bloqueado por Veda)">🔒</div>' : '';

  // Indicadores de estado de permuta (Swap Mode)
  const isSrc = (swapSource && swapSource.type === 'pitch' && swapSource.pos === pos && swapSource.idx === idx);
  const isEligibleTarget = (swapSource && !isSrc);

  // Distintivo en vivo de Jornada 11
  const ptsVal = pambolLivePoints(p.id);
  const livePtsBadge = (isLiveScoringMode && ptsVal !== null) ? `
    <div class="badge-live-score ${isCaptain ? 'captain-score' : ''}" title="Puntos oficiales de la jornada">
      ${ptsVal >= 0 ? '+' : ''}${ptsVal} pts
    </div>
  ` : '';

  // Corona de Capitán destacada y creativa (Aureola superior)
  const captainCrownHero = isCaptain ? `
    <div class="captain-hero-tag" title="Capitán Designado (Duplica todos sus puntos en la fecha)">
      <span class="captain-crown-glow">👑</span>
      <span>CAPITÁN x2</span>
    </div>
  ` : '';

  // Pin flotante del modificador (Top-Right, NUNCA sobre la tela de la camiseta)
  const modPinBadge = (mod !== 'NONE') ? `
    <div class="mod-pin-badge ${mod.toLowerCase()}" title="${getModTitle(mod)}">
      ${getModIcon(mod)}
    </div>
  ` : '';

  // Franja táctica horizontal integrada debajo del nombre (100% legible, sin letras diminutas)
  const modInfoPill = (mod !== 'NONE') ? `
    <div class="player-mod-strip ${mod.toLowerCase()}">
      <span>${getModIcon(mod)} ${getModShortName(mod)}</span>
      <span class="mod-bonus-val">${getModBonusLabel(mod)}</span>
    </div>
  ` : '';

  // Indicador de permuta flotante
  const swapBadgeHtml = isSrc ? '<div class="badge-swap-status source">⇄ Moviendo</div>' : 
                       (isEligibleTarget ? '<div class="badge-swap-status target">⇄ Cambiar</div>' : '');

  return `
    <div class="player-card slot-card ${isCaptain ? 'is-captain' : ''} ${isSrc ? 'is-swap-source' : ''} ${isEligibleTarget ? 'is-swap-target' : ''} ${inVeda ? 'in-veda' : ''}" 
         onclick="handleSlotClick('${pos}', ${idx}, 'pitch')">
      <div style="position: relative;">
        ${captainCrownHero}
        ${getJerseySvg(p, isCaptain, false, posTag)}
        ${livePtsBadge}
        ${modPinBadge}
        ${vedaBadge}
        ${swapBadgeHtml}
      </div>
      <div class="player-info">
        <div class="player-name">${isCaptain ? '<span style="color:#fef08a">👑</span> ' : ''}${escapeHtml(playerShortName(p))}</div>
        ${modInfoPill}
        <div class="player-cost">
          <span>${p.price.toFixed(1)} V</span>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="pos-tag-mini ${pos.toLowerCase()}">${posTag}</span>
            <button type="button" class="btn-card-swap" onclick="event.stopPropagation(); startPlayerSwap('${pos}', ${idx}, 'pitch', ${p.id})" title="Intercambiar de lugar">⇄</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 2. Banca de Suplentes Interactiva (4 Puestos Específicos)
function renderBench() {
  const posArr = ['GK', 'DEF', 'MID', 'FWD'];
  document.getElementById('benchGrid').innerHTML = posArr.map(pos => {
    const id = bench[pos];
    const p = getPlayer(id);
    const posTag = POS_DISPLAY[pos] || pos;
    if (!p) {
      return `
        <div class="player-card slot-card" onclick="handleSlotClick('${pos}', 0, 'bench')">
          ${getJerseySvg(null, false, true, posTag)}
          <div class="player-info">
            <div class="player-name" style="color: var(--accent-green);">+ Suplente</div>
            <div class="player-cost" style="justify-content: center;">
              <span style="font-size: 9px; font-weight: 900; color: var(--gold);">${POS_LABEL[pos]}</span>
            </div>
          </div>
        </div>
      `;
    }
    const isCap = (p.id === captainId);
    const mod = activeModifiers[p.id] || 'NONE';
    const isSrc = (swapSource && swapSource.type === 'bench' && swapSource.pos === pos);
    const isEligibleTarget = (swapSource && !isSrc);

    const modPinBadge = (mod !== 'NONE') ? `
      <div class="mod-pin-badge ${mod.toLowerCase()}" title="${getModTitle(mod)}">
        ${getModIcon(mod)}
      </div>
    ` : '';

    const modInfoPill = (mod !== 'NONE') ? `
      <div class="player-mod-strip ${mod.toLowerCase()}">
        <span>${getModIcon(mod)} ${getModShortName(mod)}</span>
        <span class="mod-bonus-val">${getModBonusLabel(mod)}</span>
      </div>
    ` : '';

    const swapBadgeHtml = isSrc ? '<div class="badge-swap-status source">⇄ Moviendo</div>' : 
                         (isEligibleTarget ? '<div class="badge-swap-status target">⇄ Cambiar</div>' : '');

    return `
      <div class="player-card slot-card ${isCap ? 'is-captain' : ''} ${isSrc ? 'is-swap-source' : ''} ${isEligibleTarget ? 'is-swap-target' : ''}" 
           onclick="handleSlotClick('${pos}', 0, 'bench')">
        <div style="position: relative;">
          ${getJerseySvg(p, isCap, false, posTag)}
          ${modPinBadge}
          ${swapBadgeHtml}
        </div>
        <div class="player-info">
          <div class="player-name">${isCap ? '<span style="color:#fef08a">👑</span> ' : ''}${escapeHtml(playerShortName(p))}</div>
          ${modInfoPill}
          <div class="player-cost">
            <span>${p.price.toFixed(1)} V</span>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="pos-tag-mini ${pos.toLowerCase()}">${posTag}</span>
              <button type="button" class="btn-card-swap" onclick="event.stopPropagation(); startPlayerSwap('${pos}', 0, 'bench', ${p.id})" title="Intercambiar con titular">⇄</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 3. Manejo de clicks en casillas
    // 3. Manejo de clicks en casillas (Vacía -> Abre Selector // Ocupada -> Abre Menú Táctico)

// ==========================================
// HELPERS DE ACCIONES TÁCTICAS Y EVENTOS
// ==========================================
function startPlayerSwapFromMenu() {
  if (!activeSlotContext) return;
  const { pos, idx, type, playerId } = activeSlotContext;
  closePlayerActionMenu();
  startPlayerSwap(pos, idx, type, playerId);
}

function openBreakdownFromMenu() {
  if (!activeSlotContext) return;
  const { playerId } = activeSlotContext;
  closePlayerActionMenu();
  openPlayerMatchBreakdown(playerId);
}

function closeLeagueDetail(e) {
  if (e && e.target && e.target !== document.getElementById('leagueDetailOverlay') && !e.target.classList.contains('close-btn')) {
    return;
  }
  const el = document.getElementById('leagueDetailOverlay');
  if (el) el.classList.remove('open');
}

function setAsCaptain() {
  toggleCaptainFromMenu();
}

function equipModifier(modType) {
  toggleModFromMenu(modType);
}


function handleSlotClick(pos, idx, type) {
  // Si estamos en modo intercambio de posiciones, seleccionar el destino
  if (swapSource !== null) {
    handleSwapTargetSelected(pos, idx, type);
    return;
  }

  const currentSlotId = (type === 'pitch') ? (pos === 'GK' ? lineup.GK[0] : lineup[pos][idx]) : bench[pos];
  const p = currentSlotId ? getPlayer(currentSlotId) : null;

  if (!p) {
    // Casilla vacía: abrir selector de mercado
    openPlayerPicker(pos, idx, type);
    return;
  }

  if (isPlayerInVeda(p)) {
    alert(`🔒 JUGADOR EN VEDA OFICIAL:\n\nEl partido de ${p.name} (${p.team}) ya dio inicio oficial.\n\nConforme a la Regla 9 de PAMBOL, este futbolista queda bloqueado hasta el término de la jornada.`);
    return;
  }

  // Abrir Menú Táctico Oficial con opciones completas (Capitán, Modificadores, Permuta y Desglose)
  openPlayerActionMenu(pos, idx, type, p.id);
}

// 4. Menú Táctico en Casillas Ocupadas
function openPlayerActionMenu(pos, idx, type, playerId) {
  activeSlotContext = { pos, idx, type, playerId };
  const p = getPlayer(playerId);
  if (!p) return;

  document.getElementById('modalPlayerName').innerText = p.name;
  document.getElementById('modalPlayerMeta').innerText = `${p.pos} · ${p.team} · ${p.price.toFixed(1)} Varos · Forma ⭐${Number(p.form).toFixed(1)}`;

  const grid = document.getElementById('playerActionGrid');
  const isStarter = Object.values(lineup).flat().includes(p.id);
  const isBench = Object.values(bench).includes(p.id);
  const isInTeam = isStarter || isBench;

  if (!isInTeam) {
    // Viene desde el Mercado: ofrecer fichar
    grid.innerHTML = `
      <div class="action-btn" style="border-color: var(--accent-green); background: rgba(34,197,94,0.15);" onclick="signPlayerFromMarket(${p.id})">
        <span>➕ Fichar a Mi Once (${p.pos} · ${p.price.toFixed(1)} V)</span>
        <span style="color: var(--accent-green); font-weight: 900;">Fichar ➔</span>
      </div>
      <div style="font-size: 11px; color: var(--text-muted); padding: 8px; line-height: 1.4;">
        Al ficharlo, ocupará la casilla de <strong>${POS_LABEL[p.pos]}</strong> en tu alineación o banca y se descontará su cotización de tu presupuesto de 100 Varos.
      </div>
    `;
  } else {
    const isCap = (captainId === p.id);
    const curMod = activeModifiers[p.id] || 'NONE';

    grid.innerHTML = `
      <!-- Botón de Permuta / Cambiar de Lugar -->
      <div class="action-btn" style="border-color: #38bdf8; background: rgba(56, 189, 248, 0.12);" onclick="startPlayerSwapFromMenu()">
        <span>⇄ Cambiar de Lugar / Permutar Posición</span>
        <strong style="color: #38bdf8;">Mover ➔</strong>
      </div>

      <div class="action-btn" onclick="toggleCaptainFromMenu()">
        <span>👑 ${isCap ? 'Quitar Capitán' : 'Asignar como Capitán (x2 Puntos)'}</span>
        <strong style="color: var(--gold);">${isCap ? 'Capitán Actual' : 'Elegir'}</strong>
      </div>

      <!-- Ver Desglose Oficial y Acta Arbitral -->
      <div class="action-btn" style="border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.08);" onclick="openBreakdownFromMenu()">
        <span>📊 Ver Desglose Oficial de Puntos en Vivo</span>
        <strong style="color: #4ade80;">Acta ➔</strong>
      </div>
      <div class="action-btn" onclick="toggleModFromMenu('HACHERO')">
        <span>🪓 Equipar "El Hachero" (+5 pts con 4+ faltas)</span>
        <small style="color: var(--gold);">${curMod === 'HACHERO' ? 'Equipado (Toca p/ quitar)' : 'Equipar'}</small>
      </div>
      <div class="action-btn" onclick="toggleModFromMenu('CHULADA')">
        <span>✨ Equipar "La Chulada" (+3 pts con 3+ regates)</span>
        <small style="color: var(--gold);">${curMod === 'CHULADA' ? 'Equipado (Toca p/ quitar)' : 'Equipar'}</small>
      </div>
      <div class="action-btn" onclick="toggleModFromMenu('PARO')">
        <span>🛡️ Equipar "El Paro" (Neutraliza rojas/penales)</span>
        <small style="color: var(--gold);">${curMod === 'PARO' ? 'Equipado (Toca p/ quitar)' : 'Equipar'}</small>
      </div>
      ${isBench ? `
      <div class="action-btn" onclick="toggleModFromMenu('REVULSIVO')">
        <span>⚡ Equipar "El Revulsivo" (Computa 90' al entrar)</span>
        <small style="color: var(--gold);">${curMod === 'REVULSIVO' ? 'Equipado (Toca p/ quitar)' : 'Equipar'}</small>
      </div>
      ` : ''}
      <div class="action-btn" style="border-color: var(--accent-green);" onclick="openReplacementPickerFromMenu()">
        <span>🔄 Cambiar futbolista por otro de ${p.pos}</span>
        <span style="color: var(--accent-green); font-weight: 800;">Buscar ➔</span>
      </div>
      <div class="action-btn" style="border-color: rgba(239,68,68,0.3); color: var(--accent-red);" onclick="emptySlotFromMenu()">
        <span>❌ Quitar del equipo (Vaciar casilla)</span>
        <span>Vaciar</span>
      </div>
    `;
  }

  document.getElementById('drawerOverlay').classList.add('open');
}

function signPlayerFromMarket(playerId) {
  const p = getPlayer(playerId);
  if (!p) return;
  if (!pambolCanPlace(p.id, null)) return;

  const pos = p.pos;
  // Buscar primer slot vacio en lineup
  let placed = false;
  if (pos === 'GK') {
    if (!lineup.GK[0]) { lineup.GK[0] = p.id; placed = true; }
  } else {
    const emptyIdx = lineup[pos].findIndex(x => !x);
    if (emptyIdx !== -1) {
      lineup[pos][emptyIdx] = p.id;
      placed = true;
    }
  }

  // Si no hay vacio en titulares, buscar en banca
  if (!placed) {
    if (!bench[pos]) {
      bench[pos] = p.id;
      placed = true;
    }
  }

  // Si sigue sin haber slot vacio, sustituir al primer titular de esa posicion
  if (!placed) {
    if (pos === 'GK') {
      lineup.GK[0] = p.id;
    } else {
      lineup[pos][0] = p.id;
    }
  }

  closeDrawer();
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  renderBench();
  updateBudget();
  saveState();
  alert(`¡${p.name} fichado exitosamente en tu equipo!`);
}

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('open');
  activeSlotContext = null;
}

function toggleCaptainFromMenu() {
  if (!activeSlotContext) return;
  const pid = activeSlotContext.playerId;
  hapticFeedback([30]);
  captainId = (captainId === pid) ? null : pid;
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  closeDrawer();
  saveState();
}

function toggleModFromMenu(modType) {
  if (!activeSlotContext) return;
  const pid = activeSlotContext.playerId;
  if (activeModifiers[pid] === modType) {
    delete activeModifiers[pid];
  } else {
    const count = Object.keys(activeModifiers).filter(k => Number(k) !== pid).length;
    if (count >= 2) {
      alert("Límite alcanzado: solo puedes equipar un máximo de 2 modificadores tácticos por fecha.");
      return;
    }
    hapticFeedback([25]);
    activeModifiers[pid] = modType;
  }
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  closeDrawer();
  saveState();
}

function emptySlotFromMenu() {
  if (!activeSlotContext) return;
  const { pos, idx, type, playerId } = activeSlotContext;
  if (type === 'pitch') {
    if (pos === 'GK') lineup.GK[0] = null;
    else lineup[pos][idx] = null;
  } else {
    bench[pos] = null;
  }
  if (captainId === playerId) captainId = null;
  delete activeModifiers[playerId];
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  closeDrawer();
  saveState();
}

function openReplacementPickerFromMenu() {
  const ctx = activeSlotContext;
  closeDrawer();
  if (ctx) openPlayerPicker(ctx.pos, ctx.idx, ctx.type);
}

// 5. Selector de Jugadores con Buscador
// Catálogo directo por posición (Accesos Directos en Mi Once)
function openPositionCatalog(pos) {
  // Buscar primera casilla vacía para esta posición
  let targetIdx = 0;
  let targetType = 'pitch';
  if (pos === 'GK') {
    if (lineup.GK[0]) targetIdx = 0;
  } else {
    const emptyIdx = lineup[pos].indexOf(null);
    if (emptyIdx !== -1) {
      targetIdx = emptyIdx;
    } else if (!bench[pos]) {
      targetType = 'bench';
      targetIdx = 0;
    } else {
      targetIdx = 0; // reemplaza el primero si están todos ocupados
    }
  }
  openPlayerPicker(pos, targetIdx, targetType);
}

function openPlayerPicker(pos, idx, type = 'pitch') {
  pickerPosition = { pos, idx, type };
  pickerContext = { pos, idx, type };

  const posLabel = POS_LABEL[pos] || pos;
  const posPlural = POS_PLURAL[pos] || pos;
  const count = DB.players.filter(p => p.pos === pos).length;

  document.getElementById('playerPickerTitle').innerText = `Elegir ${posLabel} (${type === 'pitch' ? 'Titular' : 'Banca'})`;
  document.getElementById('playerPickerSubtitle').innerText = `${count} ${posPlural.toLowerCase()} disponibles en Liga MX · Ordenados por proyección y precio`;
  document.getElementById('lineupPlayerSearch').value = '';
  document.getElementById('playerPickerOverlay').classList.add('open');
  renderPlayerPicker();
}

function closePlayerPicker() {
  document.getElementById('playerPickerOverlay').classList.remove('open');
  pickerPosition = null;
  pickerContext = null;
}

function renderPlayerPicker() {
  if (!pickerPosition && !pickerContext) return;
  const ctx = pickerPosition || pickerContext;
  const { pos, idx, type } = ctx;
  const search = (document.getElementById('lineupPlayerSearch')?.value || '').toLowerCase().trim();

  // Jugador actual ocupando la casilla
  const currentSlotId = (type === 'pitch') ? (pos === 'GK' ? lineup.GK[0] : lineup[pos][idx]) : bench[pos];
  const curPlayer = currentSlotId ? getPlayer(currentSlotId) : null;

  // Obtener todos los IDs actualmente usados
  const currentSelectedIds = new Set(
    Object.values(lineup).flat().concat(Object.values(bench)).filter(Boolean)
  );
  if (currentSlotId) currentSelectedIds.delete(currentSlotId);

  let currentHtml = '';
  if (curPlayer) {
    const isCap = (captainId === curPlayer.id);
    const curMod = activeModifiers[curPlayer.id] || 'NONE';
    currentHtml = `
      <div class="current-slot-compact">
        <div class="current-slot-compact-info">
          <span class="pos-tag-small">${POS_DISPLAY[curPlayer.pos] || curPlayer.pos}</span>
          <div style="min-width: 0; flex: 1;">
            <div style="color: #fff; font-weight: 800; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(curPlayer.name)} ${isCap ? '👑' : ''}
            </div>
            <div style="font-size: 10.5px; color: var(--text-muted);">
              ${escapeHtml(curPlayer.team)} · ${curPlayer.price.toFixed(1)} V · Forma ⭐${Number(curPlayer.form).toFixed(1)}
            </div>
          </div>
        </div>
        <div class="current-slot-compact-actions">
          <button class="mini-act-btn ${isCap ? 'active' : ''}" onclick="toggleCaptainFromPicker(${curPlayer.id})" title="Hacer Capitán">
            👑 ${isCap ? 'Capitán Activo' : 'Hacer Capitán'}
          </button>
          <button class="mini-act-btn danger" onclick="emptyCurrentSlotFromPicker()" title="Quitar de la casilla">
            ❌ Quitar
          </button>
        </div>
      </div>
      <div style="font-size: 11px; font-weight: 800; color: var(--gold); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
        O elegir entre los ${POS_PLURAL[pos].toLowerCase()} de Liga MX:
      </div>
    `;
  }

  const list = DB.players
    .filter(p => p.pos === pos && (
      !search || p.name.toLowerCase().includes(search) || p.team.toLowerCase().includes(search)
    ))
    .sort((a,b) => (b.fantasy?.projection||0)-(a.fantasy?.projection||0) || b.price-a.price);

  const itemsHtml = list.map(p => {
    const taken = currentSelectedIds.has(p.id);
    const isCurrent = (p.id === currentSlotId);
    const f = p.fantasy || {};
    const statusClass = f.role==='probable_starter'?'fb-green':(f.role==='questionable'?'fb-yellow':(f.role==='out'||f.role==='suspended'?'fb-red':'fb-gray'));

    return `
      <div class="picker-player-card ${taken ? 'taken' : ''} ${isCurrent ? 'selected-slot-item' : ''}">
        <div class="picker-player-left">
          <div class="mini-jersey ${jerseyClass(p)}">${POS_DISPLAY[p.pos] || p.pos}</div>
          <div class="picker-player-meta">
            <div class="picker-player-name">${escapeHtml(p.name)} ${isCurrent ? '✓ (En casilla)' : ''}</div>
            <div class="picker-player-sub">${escapeHtml(p.team)} · Forma ⭐ ${Number(p.form).toFixed(1)} · ${escapeHtml(f.opponent || p.rival || 'A confirmar')}</div>
            <div class="picker-metrics" style="margin-top: 4px;">
              <span class="fantasy-badge ${statusClass}">${escapeHtml(f.availability || 'Sin confirmación')}</span>
              <span class="picker-metric">Proy <strong>${f.projection ?? '—'}</strong></span>
              <span class="picker-metric">Valor <strong>${f.valueScore ?? '—'}</strong></span>
            </div>
          </div>
        </div>
        <div class="picker-player-right">
          <div class="picker-price" style="font-size: 14px; font-weight: 900; color: #fff;">${Number(p.price).toFixed(1)} V</div>
          ${isCurrent ? 
            `<span class="badge-assigned">ASIGNADO</span>` :
            (taken ? 
              `<span class="badge-taken">EN EQUIPO</span>` :
              `<button class="btn-assign-player" onclick="selectLineupPlayer(${p.id})">
                <span>Alinear</span> <span>➔</span>
               </button>`
            )
          }
        </div>
      </div>
    `;
  }).join('') || `<div style="padding:30px 20px;text-align:center;color:var(--text-muted);font-size:13px;">No se encontraron futbolistas con ese nombre en la Liga MX.</div>`;

  document.getElementById('playerPickerList').innerHTML = currentHtml + itemsHtml;
}

function toggleCaptainFromPicker(playerId) {
  hapticFeedback([30]);
  captainId = (captainId === playerId) ? null : playerId;
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  renderBench();
  renderPlayerPicker();
  saveState();
}

function toggleModFromPicker(playerId, modType) {
  if (activeModifiers[playerId] === modType) {
    delete activeModifiers[playerId];
  } else {
    const count = Object.keys(activeModifiers).filter(k => Number(k) !== playerId).length;
    if (count >= 2) {
      alert("Límite alcanzado: máximo 2 modificadores tácticos por jornada.");
      return;
    }
    hapticFeedback([25]);
    activeModifiers[playerId] = modType;
  }
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  renderBench();
  renderPlayerPicker();
  saveState();
}

function emptyCurrentSlotFromPicker() {
  if (!pickerPosition && !pickerContext) return;
  const ctx = pickerPosition || pickerContext;
  const { pos, idx, type } = ctx;

  const currentSlotId = (type === 'pitch') ? (pos === 'GK' ? lineup.GK[0] : lineup[pos][idx]) : bench[pos];
  if (currentSlotId) {
    if (captainId === currentSlotId) captainId = null;
    delete activeModifiers[currentSlotId];
  }

  if (type === 'pitch') {
    if (pos === 'GK') lineup.GK[0] = null;
    else lineup[pos][idx] = null;
  } else {
    bench[pos] = null;
  }

  closePlayerPicker();
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  renderBench();
  saveState();
}

function selectLineupPlayer(id) {
  if (!pickerContext) return;
  const { pos, idx, type } = pickerContext;
  if (!pambolCanPlace(id, type === 'bench' ? bench[pos] : (pos === 'GK' ? lineup.GK[0] : lineup[pos][idx]))) return;

  // Remover si estaba en otro slot
  Object.keys(lineup).forEach(k => {
    lineup[k] = lineup[k].map(x => (x === id ? null : x));
  });
  Object.keys(bench).forEach(k => {
    if (bench[k] === id) bench[k] = null;
  });

  if (type === 'pitch') {
    if (pos === 'GK') lineup.GK[0] = id;
    else lineup[pos][idx] = id;
  } else {
    bench[pos] = id;
  }

  closePlayerPicker();
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  renderBench();
  updateBudget();
  saveState();
}

// 6. Presupuesto Reactivo en Tiempo Real
function updateBudget() {
  const startersCost = Object.values(lineup).flat()
    .map(id => getPlayer(id)?.price || 0)
    .reduce((a, b) => a + b, 0);
  const benchCost = Object.values(bench)
    .map(id => getPlayer(id)?.price || 0)
    .reduce((a, b) => a + b, 0);
  
  const coachCost = getCoach() ? getCoach().price : 0;
  const totalSpent = startersCost + benchCost + coachCost;
  const remaining = 100.0 - totalSpent;

  const pill = document.getElementById('budgetPill');
  const label = document.getElementById('budgetLabel');
  const val = document.getElementById('budgetDisplay');

  if (pill && label && val) {
    if (remaining < 0) {
      pill.classList.add('overbudget');
      label.innerText = 'Excedido por';
      val.innerText = `${Math.abs(remaining).toFixed(1)} V`;
    } else {
      pill.classList.remove('overbudget');
      label.innerText = 'Presupuesto';
      val.innerText = `${remaining.toFixed(1)} V`;
    }
  }

  // Actualizar contador de modificadores
  const modCount = Object.keys(activeModifiers).length;
  const modEl = document.getElementById('modCounter');
  if (modEl) modEl.innerText = `${modCount} / 2`;

  // Actualizar checklist de validacion
  const filledStarters = Object.values(lineup).flat().filter(Boolean).length;
  const filledBench = Object.values(bench).filter(Boolean).length;
  const capPlayer = getPlayer(captainId);

  const elStarters = document.getElementById('valStarters');
  const elBench = document.getElementById('valBench');
  const elCap = document.getElementById('valCaptain');

  if (elStarters) {
    elStarters.innerHTML = `Titulares: <strong>${filledStarters}/11</strong>`;
    elStarters.classList.toggle('error', filledStarters < 11);
  }
  if (elBench) {
    elBench.innerHTML = `Banca: <strong>${filledBench}/4</strong>`;
    elBench.classList.toggle('error', filledBench < 4);
  }
  if (elCap) {
    elCap.innerHTML = `Capitán: <strong>${capPlayer ? escapeHtml(capPlayer.name.split(' ')[0]) : 'Sin Asignar'}</strong>`;
    elCap.classList.toggle('error', !capPlayer);
  }
}

// 7. Validación y Guardado de Plantilla
/* saveTeamValidation: ver js/cloud.js */

function renderLineupAnalytics() {
  const el=document.getElementById('lineupFantasyStrip');
  if(!el) return;
  const starterIds = Object.values(lineup).flat().filter(Boolean);
  const benchIds = Object.values(bench).filter(Boolean);
  const ps = starterIds.map(getPlayer).filter(Boolean);
  const allPs = starterIds.concat(benchIds).map(getPlayer).filter(Boolean);
  const total = ps.reduce((a,p)=>a+(p.fantasy?.projection||0),0);
  const spend = allPs.reduce((a,p)=>a+(Number(p.price)||0),0) + (getCoach() ? getCoach().price : 0);
  const remaining = 100 - spend;
  const alerts=ps.filter(p=>['out','suspended'].includes(p.fantasy?.role)).length;
  const uncertain=ps.filter(p=>p.fantasy?.role==='questionable').length;
  const clubs={}; ps.forEach(p=>clubs[p.team]=(clubs[p.team]||0)+1);
  const maxClub=Math.max(0,...Object.values(clubs));
  const value=ps.reduce((a,p)=>a+(p.fantasy?.valueScore||0),0);
  const budgetClass=remaining<0?'fb-red':remaining<10?'fb-yellow':'fb-green';
  el.innerHTML=`<div class="fantasy-stat"><b>${total.toFixed(1)}</b><span>Proyección XI</span></div><div class="fantasy-stat"><b>${spend.toFixed(1)} V</b><span>Invertido · <i class="fantasy-badge ${budgetClass}">${remaining.toFixed(1)} V libres</i></span></div><div class="fantasy-stat"><b>${value.toFixed(1)}</b><span>Value total</span></div><div class="fantasy-stat"><b>${alerts?alerts+' 🚨':uncertain?uncertain+' ⚠️':'OK ✓'}</b><span>Alertas · Máx club ${maxClub}</span></div>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

/* openPlayerModal: ver js/cloud.js */
  
function openCoachModal() {
  const input = document.getElementById('coachSearch');
  if (input) input.value = '';
  document.getElementById('coachPickerOverlay').classList.add('open');
  renderCoachPicker();
  setTimeout(() => { if (input) input.focus(); }, 50);
}

function closeCoachModal() {
  document.getElementById('coachPickerOverlay').classList.remove('open');
}

function renderCoachPicker() {
  const q = (document.getElementById('coachSearch')?.value || '').toLowerCase().trim();
  const coaches = COACHES.filter(c => !q || c.name.toLowerCase().includes(q) || c.team.toLowerCase().includes(q));
  document.getElementById('coachPickerList').innerHTML = coaches.map(c => `
    <button class="coach-card ${c.id === selectedCoachId ? 'selected' : ''}" onclick="selectCoach(${c.id})">
      <div class="coach-top">
        <div class="coach-avatar">👔</div>
        <div>
          <div class="coach-name">${escapeHtml(c.name)}</div>
          <div class="coach-team">${escapeHtml(c.team)}</div>
        </div>
      </div>
      <div class="coach-info">
        <div>Nacionalidad: <strong>${escapeHtml(c.nat)}</strong></div>
        <div>Sistema: <strong>${escapeHtml(c.formation)}</strong></div>
      </div>
      <div class="coach-profile">${escapeHtml(c.profile)}</div>
    </button>
  `).join('') || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;">No se encontraron técnicos.</div>`;
}

function selectCoach(id) {
  selectedCoachId = id;
  renderSelectedCoach();
  updateBudget();
  closeCoachModal();
  saveState();
}

function renderSelectedCoach() {
  const c = COACHES.find(x => x.id === selectedCoachId) || COACHES[0];
  const nameEl = document.getElementById('selectedCoachName');
  const metaEl = document.getElementById('selectedCoachMeta');
  if (nameEl) nameEl.innerText = c.name;
  if (metaEl) metaEl.innerText = `${c.team} · ${c.formation} (Toca para cambiar)`;
}

  
// ==========================================
// MÓDULO DE LIGAS PRIVADAS Y COMUNIDAD
// ==========================================
/* userLeagues: ver js/cloud.js */

let currentSelectedLeagueIcon = '⚽';

function switchLigasView(view, el) {
  document.querySelectorAll('.ligas-subnav-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('viewLigasPrivadas').style.display = (view === 'privadas') ? 'block' : 'none';
  document.getElementById('viewLigasGeneral').style.display = (view === 'general') ? 'block' : 'none';
  document.getElementById('viewLigasReglas').style.display = (view === 'reglas') ? 'block' : 'none';
  document.getElementById('viewLigasLogros').style.display = (view === 'logros') ? 'block' : 'none';
  document.getElementById('viewLigasPenas').style.display = (view === 'penas') ? 'block' : 'none';
  if (view === 'privadas') renderUserLeagues();
  if (view === 'general') renderGeneralLeaderboard();
  if (view === 'logros') renderAchievements();
  if (view === 'penas') renderPenasList();
}

/* renderUserLeagues: ver js/cloud.js */

/* renderGeneralLeaderboard: ver js/cloud.js */

function openCreateLeagueModal() {
  document.getElementById('newLeagueName').value = '';
  document.getElementById('createLeagueOverlay').classList.add('open');
}
function closeCreateLeagueModal(e) {
  document.getElementById('createLeagueOverlay').classList.remove('open');
}

function selectLeagueIcon(icon, btn) {
  currentSelectedLeagueIcon = icon;
  document.querySelectorAll('#leagueIconSelector .quick-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* confirmCreateLeague: ver js/cloud.js */

function openJoinLeagueModal() {
  document.getElementById('joinLeagueCode').value = '';
  document.getElementById('joinLeagueOverlay').classList.add('open');
}
function closeJoinLeagueModal(e) {
  document.getElementById('joinLeagueOverlay').classList.remove('open');
}

/* confirmJoinLeague: ver js/cloud.js */

// ==========================================
// SISTEMA ÓPTIMO DE LIGAS PRIVADAS
// ==========================================
let currentDetailLeagueId = 1;
let currentLeagueSubTab = 'clasica'; // 'clasica', 'h2h', 'muro'

// Mensajes iniciales del Muro de Rivalidad (El Vestuario)
/* leagueWallMessages: ver js/cloud.js */

function openLeagueDetail(leagueId) {
  currentDetailLeagueId = leagueId;
  currentLeagueSubTab = 'clasica';
  renderLeagueDetailModal();
  document.getElementById('leagueDetailOverlay').classList.add('open');
}

function switchLeagueSubTab(subTab) {
  currentLeagueSubTab = subTab;
  renderLeagueDetailModal();
}

/* renderLeagueDetailModal: ver js/cloud.js */

/* postLockerMessage: ver js/cloud.js */

/* shareLeagueCode: ver js/cloud.js */

// ==========================================
// SIMULADOR DE JORNADA 11 EN VIVO
// ==========================================
// ==========================================
// CENTRO DE PARTIDOS OFICIALES Y CÓMPUTO REAL
// ==========================================
// Marcadores y actas oficiales de los 9 partidos de la Jornada 11
/* OFFICIAL_J11_RESULTS: ver js/cloud.js */

/* openOfficialScoreCenter: ver js/cloud.js */

function closeOfficialScoreCenter(e) {
  document.getElementById('simModalOverlay').classList.remove('open');
}

/* openShareModal: ver js/cloud.js */

function closeShareModal(e) {
  document.getElementById('shareModalOverlay').classList.remove('open');
}

function copyShareText() {
  const text = document.getElementById('shareTextPreview').innerText;
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    alert("📋 ¡Once copiado al portapapeles!\n\nYa puedes pegarlo en WhatsApp o en tus redes sociales.");
  } else {
    alert(text);
  }
}

  
// ==========================================
// COMODINES DE TEMPORADA (CHIPS)
// ==========================================
/* activeSeasonChip: ver js/cloud.js */ // 'NONE', 'TRIPLE_CAP', 'FREE_HIT', 'BENCH_BOOST'
/* usedSeasonChips: ver js/cloud.js */

/* toggleSeasonChip: ver js/cloud.js */

/* renderSeasonChips: ver js/cloud.js */

// ==========================================
// FICHA TÉCNICA DETALLADA DE FUTBOLISTA
// ==========================================
/* openPlayerDetail: ver js/cloud.js */

function closePlayerDetail(e) {
  document.getElementById('playerDetailOverlay').classList.remove('open');
}

function signPlayerFromDetail(playerId, targetType) {
  const p = getPlayer(playerId);
  if (!p) return;
  const replaced = targetType === 'bench' ? bench[p.pos] : (p.pos === 'GK' ? lineup.GK[0] : (lineup[p.pos].indexOf(null) !== -1 ? null : lineup[p.pos][0]));
  if (!pambolCanPlace(p.id, replaced)) return;
  if (targetType === 'bench') {
    bench[p.pos] = p.id;
  } else {
    if (p.pos === 'GK') {
      lineup.GK[0] = p.id;
    } else {
      const emptyIdx = lineup[p.pos].indexOf(null);
      const idx = emptyIdx !== -1 ? emptyIdx : 0;
      lineup[p.pos][idx] = p.id;
    }
  }
  closePlayerDetail();
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  saveState();
  alert(`✅ ¡${p.name} alineado con éxito en tu equipo!`);
}

function toggleCaptainFromDetail(playerId) {
  hapticFeedback([30]);
  captainId = (captainId === playerId) ? null : playerId;
  closePlayerDetail();
  renderLineup();
  startDeadlineCountdown();
  updateTransferDisplay();
  renderSeasonChips();
  updateUserAuthPill();
  renderAchievements();
  saveState();
}

// ==========================================
// AUTENTICACIÓN Y PERSISTENCIA CLOUD (SUPABASE)
// ==========================================
var currentUser = window.currentUser = {
  isLoggedIn: false,
  fullName: '',
  name: '',
  username: '',
  email: '',
  favoriteClub: 'Club América',
  clubShort: 'AME',
  clubIcon: '🦅',
  syncedWithCloud: false
};

function openAuthModal() {
  renderAuthModal();
  document.getElementById('authModalOverlay').classList.add('open');
}

function closeAuthModal(e) {
  document.getElementById('authModalOverlay').classList.remove('open');
}

    /* renderAuthModal: ver js/cloud.js */

/* switchAuthTab: ver js/cloud.js */

/* getSupabaseConfigHtml: ver js/cloud.js */

/* getRegisterFormHtml: ver js/cloud.js */

/* getLoginFormHtml: ver js/cloud.js */

/* selectRegisterClub: ver js/cloud.js */

/* handleUserRegistration: ver js/cloud.js */

/* handleUserLogin: ver js/cloud.js */

/* loginWithGoogle: ver js/cloud.js */

/* saveUserProfile: ver js/cloud.js */

/* logoutUser: ver js/cloud.js */

/* openClubSelectorOnly: ver js/cloud.js */


function updateUserAuthPill() {
  if (typeof updateUserAuthDisplay === 'function') {
    updateUserAuthDisplay();
  }
}

function updateUserAuthDisplay() {
  const icon = document.getElementById('userAuthIcon');
  const name = document.getElementById('userAuthName');
  const userAuthBtn = document.getElementById('userAuthBtn');
  if (icon && name) {
    if (currentUser.isLoggedIn) {
      icon.innerText = currentUser.clubIcon || '👑';
      name.innerText = currentUser.username || currentUser.name || 'Mi DT';
      if (userAuthBtn) {
        userAuthBtn.style.borderColor = 'rgba(34, 197, 94, 0.55)';
        userAuthBtn.style.background = 'rgba(34, 197, 94, 0.15)';
      }
    } else {
      icon.innerText = '👤';
      name.innerText = 'Entrar';
      if (userAuthBtn) {
        userAuthBtn.style.borderColor = 'rgba(251, 191, 36, 0.4)';
        userAuthBtn.style.background = 'rgba(251, 191, 36, 0.1)';
      }
    }
  }

  // Actualizar tarjeta en la pestaña de Ligas
  const userClubPill = document.getElementById('userCustomTeamTitle');
  if (userClubPill && currentUser.isLoggedIn) {
    userClubPill.textContent = `${currentUser.name || currentUser.username} (${currentUser.clubIcon || ''})`;
  }
}

// ==========================================
// SISTEMA DE LOGROS E INSIGNIAS (BADGES)
// ==========================================
/* ACHIEVEMENTS: ver js/cloud.js */

/* renderAchievements: ver js/cloud.js */



  
// ==========================================
// CUENTA REGRESIVA Y NOTIFICACIONES DE FECHA
// ==========================================
/* startDeadlineCountdown: ver js/cloud.js */

/* requestGameNotification: ver js/cloud.js */

// ==========================================
// MÓDULO CARA A CARA (COMPARADOR HEAD TO HEAD)
// ==========================================
function populateCompareSelects() {
  const s1 = document.getElementById('compareSelect1');
  const s2 = document.getElementById('compareSelect2');
  if (!s1 || !s2) return;

  const sorted = [...DB.players].sort((a,b) => b.price - a.price);
  const optionsHtml = sorted.map(p => `
    <option value="${p.id}">${escapeHtml(p.name)} (${p.team} · ${POS_DISPLAY[p.pos] || p.pos} · ${p.price.toFixed(1)}V)</option>
  `).join('');

  s1.innerHTML = optionsHtml;
  s2.innerHTML = optionsHtml;

  // Valores iniciales por defecto: Alexis Vega (10157) vs Henry Martín (10032)
  s1.value = 10157;
  s2.value = 10032;
}

function openCompareModal(preSelectedId1, preSelectedId2) {
  populateCompareSelects();
  const s1 = document.getElementById('compareSelect1');
  const s2 = document.getElementById('compareSelect2');
  if (preSelectedId1 && s1) s1.value = preSelectedId1;
  if (preSelectedId2 && s2) s2.value = preSelectedId2;

  updateCompareView();
  document.getElementById('compareModalOverlay').classList.add('open');
}

function closeCompareModal(e) {
  document.getElementById('compareModalOverlay').classList.remove('open');
}

function updateCompareView() {
  const id1 = Number(document.getElementById('compareSelect1')?.value || 10157);
  const id2 = Number(document.getElementById('compareSelect2')?.value || 10032);
  const p1 = getPlayer(id1) || DB.players[0];
  const p2 = getPlayer(id2) || DB.players[1];

  const f1 = p1.fantasy || {};
  const f2 = p2.fantasy || {};

  // Métricas
  const statKeys = [
    { label: 'Precio en Varos', v1: p1.price, v2: p2.price, unit: 'V', lowerBetter: true },
    { label: 'Forma Reciente', v1: Number(p1.form || 5), v2: Number(p2.form || 5), unit: '★' },
    { label: 'Proyección', v1: Number(f1.projection || 6.5), v2: Number(f2.projection || 6.5), unit: 'pts' },
    { label: 'Eficiencia (Pts / Varo)', v1: Number(f1.valueScore || 1.1), v2: Number(f2.valueScore || 1.1), unit: '' },
    { label: 'Goles Estimados', v1: (p1.pos === 'FWD' ? 6 : (p1.pos === 'MID' ? 3 : 0)), v2: (p2.pos === 'FWD' ? 7 : (p2.pos === 'MID' ? 2 : 0)), unit: 'goles' },
    { label: 'Asistencias', v1: (p1.pos === 'MID' ? 5 : 3), v2: (p2.pos === 'MID' ? 4 : 2), unit: 'asist' },
    { label: 'Faltas Cometidas (Hachero)', v1: 14, v2: 9, unit: 'faltas' },
    { label: 'Regates Exitosos (Chulada)', v1: 24, v2: 15, unit: 'regates' }
  ];

  document.getElementById('compareCardsContent').innerHTML = `
    <div class="compare-vs-row">
      <!-- Jugador 1 -->
      <div class="compare-player-card">
        <div class="mini-jersey ${jerseyClass(p1)}" style="width: 44px; height: 44px; font-size: 14px;">${POS_DISPLAY[p1.pos] || p1.pos}</div>
        <strong style="color: #fff; font-size: 13.5px; line-height: 1.2;">${escapeHtml(p1.name)}</strong>
        <span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(p1.team)}</span>
        <span style="font-size: 14px; font-weight: 900; color: #38bdf8; margin-top: 2px;">${p1.price.toFixed(1)} V</span>
        <button class="btn-assign-player" style="margin-top: 6px; font-size: 10.5px; padding: 4px 8px;" onclick="signPlayerFromDetail(${p1.id}, 'pitch'); closeCompareModal();">
          ➕ Alinear
        </button>
      </div>

      <div style="font-size: 16px; font-weight: 950; color: var(--gold);">VS</div>

      <!-- Jugador 2 -->
      <div class="compare-player-card">
        <div class="mini-jersey ${jerseyClass(p2)}" style="width: 44px; height: 44px; font-size: 14px;">${POS_DISPLAY[p2.pos] || p2.pos}</div>
        <strong style="color: #fff; font-size: 13.5px; line-height: 1.2;">${escapeHtml(p2.name)}</strong>
        <span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(p2.team)}</span>
        <span style="font-size: 14px; font-weight: 900; color: #f59e0b; margin-top: 2px;">${p2.price.toFixed(1)} V</span>
        <button class="btn-assign-player" style="margin-top: 6px; font-size: 10.5px; padding: 4px 8px;" onclick="signPlayerFromDetail(${p2.id}, 'pitch'); closeCompareModal();">
          ➕ Alinear
        </button>
      </div>
    </div>

    <div style="background: #090d16; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 12px;">
      <div style="font-size: 11px; font-weight: 800; color: var(--gold); text-transform: uppercase; margin-bottom: 8px;">
        Comparativa Métrica por Métrica:
      </div>
      ${statKeys.map(s => {
        const isW1 = s.lowerBetter ? (s.v1 < s.v2) : (s.v1 > s.v2);
        const isW2 = s.lowerBetter ? (s.v2 < s.v1) : (s.v2 > s.v1);
        const total = s.v1 + s.v2 || 1;
        const pct1 = Math.round((s.v1 / total) * 100);
        const pct2 = 100 - pct1;

        return `
          <div class="compare-stat-row">
            <div class="compare-stat-header">
              <strong class="${isW1 ? 'winner' : ''}">${isW1 ? '👑 ' : ''}${s.v1} ${s.unit}</strong>
              <span>${s.label}</span>
              <strong class="${isW2 ? 'winner' : ''}">${s.v2} ${s.unit}${isW2 ? ' 👑' : ''}</strong>
            </div>
            <div class="compare-bars">
              <div class="c-bar-1" style="width: ${pct1}%;"></div>
              <div class="c-bar-2" style="width: ${pct2}%;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ==========================================
// CUADRO DE LIGUILLA DIRECTA (1 AL 8)
// ==========================================
/* predictedLiguillaWinners: ver js/cloud.js */ // { serieId: teamShort }
/* predictedChampion: ver js/cloud.js */

function switchTableSubTab(tab) {
  const btnReg = document.getElementById('btnSubTabStandings');
  const btnLig = document.getElementById('btnSubTabLiguilla');
  const viewReg = document.getElementById('viewTableRegular');
  const viewLig = document.getElementById('viewTableLiguilla');

  if (tab === 'regular') {
    btnReg?.classList.add('active');
    btnLig?.classList.remove('active');
    if (viewReg) viewReg.style.display = 'block';
    if (viewLig) viewLig.style.display = 'none';
  } else {
    btnLig?.classList.add('active');
    btnReg?.classList.remove('active');
    if (viewReg) viewReg.style.display = 'none';
    if (viewLig) viewLig.style.display = 'block';
    renderLiguillaBracket();
  }
}

/* renderLiguillaBracket: ver js/cloud.js */

/* pickSeriesWinner: ver js/cloud.js */

/* saveLiguillaPrediction: ver js/cloud.js */

  
// ==========================================
// SISTEMA DE TRANSFERENCIAS Y PENALIZACIONES
// ==========================================
/* freeTransfersTotal: ver js/cloud.js */
/* transfersUsedThisGw: ver js/cloud.js */
/* transferPenaltiesAccumulated: ver js/cloud.js */ // -4 pts cada transferencia extra

/* recordTransferMade: ver js/cloud.js */

/* updateTransferDisplay: ver js/cloud.js */

// ==========================================
// GENERADOR VISUAL DE ONCE (STORY 9:16 CANVAS)
// ==========================================
function openStoryModal() {
  renderStoryCanvas();
  document.getElementById('storyModalOverlay').classList.add('open');
}

function closeStoryModal(e) {
  document.getElementById('storyModalOverlay').classList.remove('open');
}

function renderStoryCanvas() {
  const canvas = document.getElementById('storyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 1. Fondo Oscuro Estadio
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#070a13');
  bgGrad.addColorStop(0.3, '#0b1329');
  bgGrad.addColorStop(0.7, '#070a13');
  bgGrad.addColorStop(1, '#030712');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Borde dorado de lujo
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  // 2. Encabezado de la Historia
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 24px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAMBOL · MI ONCE IDEAL', W / 2, 54);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 13px -apple-system, sans-serif';
  ctx.fillText(((typeof Pambol !== 'undefined' && Pambol.editGw) ? gwLabel(Pambol.editGw).toUpperCase() + ' · ' : '') + 'FANTASY LIGA MX' + ((typeof Pambol !== 'undefined' && Pambol.tournament) ? ' · ' + Pambol.tournament.name.toUpperCase() : ''), W / 2, 76);

  // 3. Mini Cancha de Fútbol
  const pitchX = 30;
  const pitchY = 96;
  const pitchW = W - 60;
  const pitchH = 650;

  // Césped con franjas alternadas
  ctx.fillStyle = '#15803d';
  ctx.fillRect(pitchX, pitchY, pitchW, pitchH);
  for (let y = pitchY; y < pitchY + pitchH; y += 50) {
    ctx.fillStyle = '#14532d';
    ctx.fillRect(pitchX, y, pitchW, 25);
  }

  // Líneas de cancha
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(pitchX, pitchY, pitchW, pitchH);

  // Círculo central y línea media
  const midY = pitchY + pitchH / 2;
  ctx.beginPath();
  ctx.moveTo(pitchX, midY);
  ctx.lineTo(pitchX + pitchW, midY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pitchX + pitchW / 2, midY, 50, 0, Math.PI * 2);
  ctx.stroke();

  // Áreas
  ctx.strokeRect(pitchX + pitchW / 2 - 90, pitchY, 180, 70);
  ctx.strokeRect(pitchX + pitchW / 2 - 90, pitchY + pitchH - 70, 180, 70);

  // 4. Dibujar Jugadores Titulares
  const starters = Object.values(lineup).flat().map(id => getPlayer(id)).filter(Boolean);
  const rows = [
    { pos: 'FWD', y: pitchY + 75, players: starters.filter(p => p.pos === 'FWD') },
    { pos: 'MID', y: pitchY + 220, players: starters.filter(p => p.pos === 'MID') },
    { pos: 'DEF', y: pitchY + 390, players: starters.filter(p => p.pos === 'DEF') },
    { pos: 'GK', y: pitchY + 560, players: starters.filter(p => p.pos === 'GK') }
  ];

  rows.forEach(r => {
    const count = r.players.length;
    if (count === 0) return;
    const spacing = pitchW / (count + 1);

    r.players.forEach((p, i) => {
      const px = pitchX + spacing * (i + 1);
      const py = r.y;

      const isCap = (p.id === captainId);

      // Círculo de Camiseta
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.fillStyle = p.pos === 'GK' ? '#f59e0b' : (p.pos === 'DEF' ? '#1e3a8a' : (p.pos === 'MID' ? '#047857' : '#dc2626'));
      ctx.fill();
      ctx.strokeStyle = isCap ? '#fbbf24' : '#ffffff';
      ctx.lineWidth = isCap ? 3.5 : 2;
      ctx.stroke();

      // Texto de posición
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(POS_DISPLAY[p.pos] || p.pos, px, py + 4);

      // Corona de Capitán
      if (isCap) {
        ctx.font = '14px sans-serif';
        ctx.fillText('👑', px, py - 23);
      }

      // Nombre del futbolista
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12px sans-serif';
      const shortN = playerShortName(p);
      ctx.fillText(shortN, px, py + 34);

      // Precio
      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 10.5px sans-serif';
      ctx.fillText(`${p.price.toFixed(1)} V`, px, py + 46);
    });
  });

  // 5. Pie de la Historia: DT y Datos del Plantel
  const coach = COACHES.find(c => c.id === selectedCoachId);
  const bottomY = pitchY + pitchH + 24;

  ctx.fillStyle = 'rgba(21, 29, 48, 0.9)';
  ctx.fillRect(pitchX, bottomY, pitchW, 70);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeRect(pitchX, bottomY, pitchW, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`👔 DT: ${coach ? coach.name : 'Guillermo Almada'} (${coach ? coach.team : 'América'})`, pitchX + 12, bottomY + 24);

  const budgetVal = document.getElementById('budgetDisplay')?.innerText || '100.0 V';
  ctx.fillStyle = '#fde047';
  ctx.font = '800 11.5px sans-serif';
  ctx.fillText(`💰 Presupuesto Usado: ${budgetVal}`, pitchX + 12, bottomY + 44);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('#PambolFantasy · Liga MX 🇲🇽', pitchX + pitchW - 12, bottomY + 44);

  // Marca de agua inferior
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(PAMBOL_CONFIG.SITE_URL.replace(/^https?:\/\//, '') + ' · Fantasy & Quiniela de Liga MX', W / 2, H - 24);
}

/* downloadStoryImage: ver js/cloud.js */

/* shareStoryWhatsApp: ver js/cloud.js */

  
// ==========================================
// DORSALES Y GENERADOR DE CAMISETAS OFICIALES
// ==========================================
const PLAYER_SQUAD_NUMBERS = {
  10004: 1,  // Malagón
  10009: 3,  // Israel Reyes
  10010: 5,  // Kevin Álvarez
  10029: 8,  // Álvaro Fidalgo
  10032: 21, // Henry Martín
  10041: 1,  // Rangel (Tala)
  10043: 2,  // Alan Mozo
  10048: 50, // Mateo Chávez
  10055: 25, // Roberto Alvarado
  10070: 33, // Gonzalo Piovi
  10074: 19, // Amaury Morales
  10083: 11, // Giakoumakis
  10136: 8,  // Óliver Torres
  10139: 9,  // Roberto de la Rosa
  10145: 17, // Jesús Gallardo
  10157: 25  // Alexis Vega
};

function getPlayerSquadNumber(p) {
  if (!p) return 10;
  if (PLAYER_SQUAD_NUMBERS[p.id]) return PLAYER_SQUAD_NUMBERS[p.id];
  // Si no está explícito, asignar un dorsal realista según posición
  if (p.pos === 'GK') return 1;
  const numMap = { DEF: [2, 3, 4, 5, 13, 14, 15, 23], MID: [6, 7, 8, 10, 16, 17, 20], FWD: [9, 11, 18, 19, 21, 22] };
  const arr = numMap[p.pos] || [10];
  return arr[p.id % arr.length];
}

function getJerseySvg(p, isCaptain = false, isEmpty = false, emptyPos = 'DEL') {
  // Silueta atlética moderna de alta definición (viewBox 0 0 74 78)
  const bodyShape = "M27,8 Q37,16 47,8 L53,10 C58,12 65,16 68,21 L64,33 L54,27 C53,40 53,52 55,71 Q37,75 19,71 C21,52 21,40 20,27 L10,33 L6,21 C9,16 16,12 21,10 Z";

  if (isEmpty || !p) {
    return `
      <div class="pitch-jersey-wrap">
        <svg class="pitch-jersey-svg empty" viewBox="0 0 74 78" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="emptyGlow_${emptyPos}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#22c55e" flood-opacity="0.6"/>
            </filter>
          </defs>
          <path d="${bodyShape}" 
                fill="rgba(15, 23, 42, 0.65)" stroke="rgba(34, 197, 94, 0.85)" stroke-width="2.2" stroke-dasharray="4,4" filter="url(#emptyGlow_${emptyPos})"/>
          <path d="M26,8 Q37,17 48,8" fill="none" stroke="rgba(34, 197, 94, 0.85)" stroke-width="2"/>
          <text x="37" y="44" font-family="-apple-system, sans-serif" font-size="28" font-weight="900" fill="#22c55e" text-anchor="middle" dominant-baseline="central">+</text>
        </svg>
      </div>
    `;
  }

  const teamShort = (DB.teams.find(x => x.id === p?.tId)?.short || 'AME').toUpperCase();
  const num = getPlayerSquadNumber(p);

  // Paletas y patrones oficiales Liga MX 2026 de alta fidelidad
  const styles = {
    'AME': { base: '#fef08a', acc: '#1e3a8a', col: '#dc2626', cuff: '#1e3a8a', num: '#1e3a8a', numStr: '#ffffff', pat: 'ame' },
    'CHI': { base: '#ef4444', acc: '#ffffff', col: '#1e3a8a', cuff: '#1e3a8a', num: '#1e3a8a', numStr: '#ffffff', pat: 'stripes_v' },
    'CAZ': { base: '#1d4ed8', acc: '#ffffff', col: '#ffffff', cuff: '#ffffff', num: '#ffffff', numStr: '#1e3a8a', pat: 'caz' },
    'TIG': { base: '#f59e0b', acc: '#1e3a8a', col: '#1e3a8a', cuff: '#1e3a8a', num: '#1e3a8a', numStr: '#fef08a', pat: 'band' },
    'MTY': { base: '#1e3a8a', acc: '#ffffff', col: '#ffffff', cuff: '#ffffff', num: '#ef4444', numStr: '#ffffff', pat: 'stripes_v' },
    'TOL': { base: '#dc2626', acc: '#991b1b', col: '#ffffff', cuff: '#ffffff', num: '#ffffff', numStr: '#000000', pat: 'solid' },
    'PUM': { base: '#0f172a', acc: '#fbbf24', col: '#fbbf24', cuff: '#fbbf24', num: '#fbbf24', numStr: '#000000', pat: 'pumas' },
    'PAC': { base: '#ffffff', acc: '#0284c7', col: '#0284c7', cuff: '#0284c7', num: '#0284c7', numStr: '#ffffff', pat: 'stripes_v' },
    'SAN': { base: '#16a34a', acc: '#ffffff', col: '#ffffff', cuff: '#ffffff', num: '#ffffff', numStr: '#14532d', pat: 'stripes_h' },
    'LEO': { base: '#15803d', acc: '#facc15', col: '#facc15', cuff: '#facc15', num: '#ffffff', numStr: '#14532d', pat: 'solid' },
    'ATS': { base: '#dc2626', acc: '#0f172a', col: '#ffffff', cuff: '#0f172a', num: '#ffffff', numStr: '#000000', pat: 'half' },
    'NEC': { base: '#ffffff', acc: '#dc2626', col: '#dc2626', cuff: '#dc2626', num: '#dc2626', numStr: '#ffffff', pat: 'stripes_v' },
    'ADSL': { base: '#b91c1c', acc: '#ffffff', col: '#1e3a8a', cuff: '#1e3a8a', num: '#1e3a8a', numStr: '#ffffff', pat: 'stripes_v' },
    'TIJ': { base: '#991b1b', acc: '#0f172a', col: '#ffffff', cuff: '#0f172a', num: '#ffffff', numStr: '#000000', pat: 'solid' },
    'JUA': { base: '#16a34a', acc: '#dc2626', col: '#dc2626', cuff: '#dc2626', num: '#ffffff', numStr: '#14532d', pat: 'chevron' },
    'PUE': { base: '#ffffff', acc: '#2563eb', col: '#2563eb', cuff: '#2563eb', num: '#2563eb', numStr: '#ffffff', pat: 'sash' },
    'QRO': { base: '#2563eb', acc: '#0f172a', col: '#ffffff', cuff: '#0f172a', num: '#ffffff', numStr: '#000000', pat: 'stripes_v' },
    'MAZ': { base: '#7e22ce', acc: '#0f172a', col: '#ffffff', cuff: '#0f172a', num: '#ffffff', numStr: '#000000', pat: 'solid' }
  };

  const s = styles[teamShort] || { base: '#1e293b', acc: '#38bdf8', col: '#ffffff', cuff: '#ffffff', num: '#ffffff', numStr: '#000000', pat: 'solid' };

  let baseColor = s.base;
  let accColor = s.acc;
  let collarColor = s.col;
  let cuffColor = s.cuff;
  let numColor = s.num;
  let numStroke = s.numStr || '#000000';
  let patSvg = '';

  if (p.pos === 'GK') {
    baseColor = '#0284c7';
    accColor = '#38bdf8';
    collarColor = '#facc15';
    cuffColor = '#facc15';
    numColor = '#ffffff';
    numStroke = '#0369a1';
    patSvg = `
      <path d="M21,10 L37,24 L53,10 L47,8 Q37,16 27,8 Z" fill="#0369a1" opacity="0.6"/>
      <circle cx="37" cy="48" r="18" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="3,3" opacity="0.45"/>
    `;
  } else if (s.pat === 'stripes_v') {
    patSvg = `
      <g clip-path="url(#bodyClip_${p.id})">
        <rect x="23" y="10" width="5" height="65" fill="${accColor}"/>
        <rect x="34.5" y="10" width="5" height="65" fill="${accColor}"/>
        <rect x="46" y="10" width="5" height="65" fill="${accColor}"/>
      </g>
    `;
  } else if (s.pat === 'stripes_h') {
    patSvg = `
      <g clip-path="url(#bodyClip_${p.id})">
        <rect x="18" y="24" width="38" height="7" fill="${accColor}"/>
        <rect x="18" y="38" width="38" height="7" fill="${accColor}"/>
        <rect x="18" y="52" width="38" height="7" fill="${accColor}"/>
      </g>
    `;
  } else if (s.pat === 'band') {
    patSvg = `
      <g clip-path="url(#bodyClip_${p.id})">
        <rect x="18" y="26" width="38" height="13" fill="${accColor}"/>
        <rect x="18" y="24" width="38" height="1.8" fill="#ffffff" opacity="0.8"/>
        <rect x="18" y="39.5" width="38" height="1.8" fill="#ffffff" opacity="0.8"/>
      </g>
    `;
  } else if (s.pat === 'ame') {
    patSvg = `
      <g clip-path="url(#bodyClip_${p.id})">
        <polygon points="10,12 37,34 64,12 68,21 37,42 6,21" fill="${accColor}"/>
        <polygon points="10,12 37,28 64,12 37,22" fill="${collarColor}" opacity="0.9"/>
      </g>
    `;
  } else if (s.pat === 'pumas') {
    patSvg = `
      <g transform="translate(25, 23) scale(0.68)">
        <polygon points="17,3 23,17 33,17 26,24 29,38 17,29 5,38 8,24 1,17 11,17" fill="${accColor}" stroke="#ffffff" stroke-width="1.2"/>
      </g>
    `;
  } else if (s.pat === 'half') {
    patSvg = `
      <g clip-path="url(#bodyClip_${p.id})">
        <rect x="37" y="8" width="35" height="70" fill="${accColor}"/>
      </g>
    `;
  } else if (s.pat === 'sash') {
    patSvg = `
      <g clip-path="url(#bodyClip_${p.id})">
        <polygon points="18,12 28,12 56,66 46,66" fill="${accColor}"/>
      </g>
    `;
  } else if (s.pat === 'chevron') {
    patSvg = `
      <g clip-path="url(#bodyClip_${p.id})">
        <polyline points="18,28 37,42 56,28" fill="none" stroke="${accColor}" stroke-width="5"/>
      </g>
    `;
  }

  const captainCrownSvg = isCaptain ? `
    <g class="captain-crown-glow" transform="translate(26, -9)">
      <defs>
        <linearGradient id="crownGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="45%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
        <filter id="crownFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#fbbf24" flood-opacity="0.95"/>
        </filter>
      </defs>
      <path d="M2,14 L6,2 L11,9 L16,2 L20,14 Z" fill="url(#crownGrad)" stroke="#78350f" stroke-width="1.1" filter="url(#crownFilter)"/>
      <circle cx="6" cy="2" r="1.5" fill="#ffffff"/>
      <circle cx="11" cy="8.5" r="1.5" fill="#ef4444"/>
      <circle cx="16" cy="2" r="1.5" fill="#ffffff"/>
      <rect x="2" y="14" width="18" height="2.5" rx="1.2" fill="#d97706" stroke="#78350f" stroke-width="0.8"/>
    </g>
  ` : '';

  return `
    <div class="pitch-jersey-wrap">
      <svg class="pitch-jersey-svg" viewBox="0 0 74 78" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="bodyClip_${p.id}">
            <path d="${bodyShape}"/>
          </clipPath>
          <linearGradient id="fabricShading_${p.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
            <stop offset="35%" stop-color="#ffffff" stop-opacity="0.04"/>
            <stop offset="70%" stop-color="#000000" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.38"/>
          </linearGradient>
          <filter id="jerseyDropShadow" x="-20%" y="-15%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.85"/>
          </filter>
        </defs>

        <path d="${bodyShape}" fill="${baseColor}" stroke="rgba(0,0,0,0.45)" stroke-width="1.2" filter="url(#jerseyDropShadow)"/>
        ${patSvg}
        <path d="${bodyShape}" fill="url(#fabricShading_${p.id})"/>
        <path d="M6,21 L10,33" stroke="${cuffColor}" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M68,21 L64,33" stroke="${cuffColor}" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M26,8 Q37,18 48,8" fill="none" stroke="${collarColor}" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M29,9 Q37,15 45,9" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.8"/>

        <text x="37" y="50" 
              font-family="'Impact', 'Arial Black', -apple-system, sans-serif" 
              font-size="25" 
              font-weight="950" 
              fill="${numColor}" 
              stroke="${numStroke}" 
              stroke-width="1.3" 
              text-anchor="middle" 
              dominant-baseline="central"
              style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.85));">
          ${num}
        </text>

        
        <!-- Brazalete Oficial de Capitán (Manga Izquierda) -->
        ${isCaptain ? `
          <g class="captain-armband-wrap">
            <defs>
              <filter id="armbandGlow_${p.id}" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#fbbf24" flood-opacity="0.9"/>
              </filter>
            </defs>
            <path d="M7,23 L10,32" stroke="#fbbf24" stroke-width="4.8" stroke-linecap="round" filter="url(#armbandGlow_${p.id})"/>
            <path d="M7,23 L10,32" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
            <text x="8.5" y="27.5" font-family="'Impact', Arial, sans-serif" font-size="5.5" font-weight="950" fill="#000000" text-anchor="middle" dominant-baseline="central">C</text>
          </g>
        ` : ''}

        ${captainCrownSvg}
      </svg>
    </div>
  `;
}

// ==========================================
// EFECTOS DE SONIDO SINTETIZADOS (WEB AUDIO)
// ==========================================
let soundEnabled = true;
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playStadiumSound(type) {
  if (type === 'click') hapticFeedback([12]);
  else if (type === 'whistle') hapticFeedback([40, 50, 40]);
  else if (type === 'goal') hapticFeedback([35, 45, 35, 45, 60]);
  else if (type === 'trumpet') hapticFeedback([30, 40, 50]);
  else hapticFeedback([18]);
  if (!soundEnabled) return;
  try {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    if (type === "trumpet") {
      // Fanfarria de Trompeta de Tribuna Mexicana ("¡Sí se puede!" / Toque de Barra)
      // Melodía: G4, C5, E5, G5, E5, G5 con armónicos de metal y bombo de fondo
      const notes = [
        { f: 392.00, t: 0.00, d: 0.14 }, // G4
        { f: 523.25, t: 0.14, d: 0.14 }, // C5
        { f: 659.25, t: 0.28, d: 0.14 }, // E5
        { f: 783.99, t: 0.42, d: 0.28 }, // G5 (sostenida)
        { f: 659.25, t: 0.72, d: 0.14 }, // E5
        { f: 783.99, t: 0.88, d: 0.50 }  // G5 (final triunfal)
      ];
      notes.forEach(n => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth'; // brillo de trompeta
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.18, now + n.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
      // Bombo de estadio rítmico de acompañamiento
      [0.00, 0.28, 0.42, 0.88].forEach(bt => {
        const bOsc = audioCtx.createOscillator();
        const bGain = audioCtx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(110, now + bt);
        bOsc.frequency.exponentialRampToValueAtTime(42, now + bt + 0.2);
        bGain.gain.setValueAtTime(0.3, now + bt);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + bt + 0.24);
        bOsc.connect(bGain);
        bGain.connect(audioCtx.destination);
        bOsc.start(now + bt);
        bOsc.stop(now + bt + 0.24);
      });
    } else if (type === 'whistle') {
      // Silbatazo Oficial de Árbitro Liga MX (Acme Thunderer / Fox 40 Classic)
      // 1. Dos osciladores con frecuencias batientes (interferencia acústica)
      // 2. Modulador LFO (vibrato de bolilla / turbulencia interna a 28 Hz)
      // 3. Ráfaga de ruido de aire presurizado por filtro pasa-banda
      // 4. Cadencia de partido: Toque inicial seco + Ráfaga potente extendida

      function createWhistleBlast(startTime, duration, volume) {
        // Oscilador 1 (tono principal)
        const osc1 = audioCtx.createOscillator();
        // Oscilador 2 (segundo armónico para batimiento metálico ~280 Hz)
        const osc2 = audioCtx.createOscillator();

        // LFO para el aleteo / vibrato del aire de la bolilla
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.setValueAtTime(28, startTime);
        lfoGain.gain.setValueAtTime(65, startTime);
        lfo.connect(osc1.frequency);
        lfo.connect(osc2.frequency);

        osc1.type = 'triangle';
        osc2.type = 'sine';

        // Frecuencias Fox 40: 2880 Hz y 3160 Hz (diferencia = 280 Hz de estridencia pura)
        osc1.frequency.setValueAtTime(2880, startTime);
        osc2.frequency.setValueAtTime(3160, startTime);

        // Caída de frecuencia al soltar el silbato (pitch drop)
        osc1.frequency.setValueAtTime(2880, startTime + duration * 0.7);
        osc1.frequency.exponentialRampToValueAtTime(2450, startTime + duration);
        osc2.frequency.setValueAtTime(3160, startTime + duration * 0.7);
        osc2.frequency.exponentialRampToValueAtTime(2700, startTime + duration);

        // Envolvente de ganancia del silbato
        const toneGain = audioCtx.createGain();
        toneGain.gain.setValueAtTime(0.0001, startTime);
        toneGain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
        toneGain.gain.setValueAtTime(volume * 0.95, startTime + duration * 0.75);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc1.connect(toneGain);
        osc2.connect(toneGain);

        // Soplido de aire presurizado (White Noise con Bandpass Filter)
        const bufferSize = Math.floor(audioCtx.sampleRate * duration);
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.45;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(3100, startTime);
        bandpass.Q.setValueAtTime(3.8, startTime);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, startTime);
        noiseGain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.02);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        whiteNoise.connect(bandpass);
        bandpass.connect(noiseGain);

        toneGain.connect(audioCtx.destination);
        noiseGain.connect(audioCtx.destination);

        lfo.start(startTime);
        osc1.start(startTime);
        osc2.start(startTime);
        whiteNoise.start(startTime);

        lfo.stop(startTime + duration);
        osc1.stop(startTime + duration);
        osc2.stop(startTime + duration);
        whiteNoise.stop(startTime + duration);
      }

      // Doble toque reglamentario de árbitro
      createWhistleBlast(now, 0.09, 0.22);
      createWhistleBlast(now + 0.14, 0.42, 0.26);
    } else if (type === 'boom') {
      // Impacto de Sub-bajo de Estadio Azteca
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.5);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'goal') {
      // Celebración / Acorde de Gol
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + 0.6);
      });
    } else if (type === 'click') {
      // Clic táctil sutil
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    console.log('Audio feedback:', e);
  }
}

function toggleSoundEffects() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('btnSoundToggle');
  if (btn) btn.innerText = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playStadiumSound('whistle');
}

// ==========================================
// MODO DÍA / NOCHE (TEMA CLARO Y OSCURO)
// ==========================================
let isLightTheme = false;

function toggleColorTheme() {
  isLightTheme = !isLightTheme;
  document.body.classList.toggle('theme-light', isLightTheme);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) btn.innerText = isLightTheme ? '🌙' : '☀️';
  saveState();
}

// ==========================================
// FILTRO DE MERCADO POR PRESUPUESTO
// ==========================================
let filterOnlyAffordable = false;

function toggleAffordFilter() {
  filterOnlyAffordable = document.getElementById('affordToggle')?.checked || false;
  renderMarket();
}

// ==========================================
// JUGADOR DEL PARTIDO (FIGURA / MVP +3 PTS)
// ==========================================
/* MATCH_MVPS_J11: ver js/cloud.js */

  
// ==========================================
// HISTORIAL FRENTE A FRENTE (H2H) ENTRE CLUBES
// ==========================================
/* CLUB_H2H_HISTORY_J11: ver js/cloud.js */

let selectedFixtureDay = 'ALL';

function setFixtureDayFilter(day, el) {
  selectedFixtureDay = day;
  document.querySelectorAll('.day-filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderFixtures();
}

// ==========================================
// EFECTOS VISUALES DE CONFETI Y CELEBRACIÓN
// ==========================================
function triggerConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');

  const particles = [];
  const colors = ['#22c55e', '#fbbf24', '#ef4444', '#3b82f6', '#ffffff', '#a855f7'];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4,
      w: Math.random() * 8 + 4,
      h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -10 - 4,
      gravity: 0.35,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  let frame = 0;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.opacity -= 0.012;

      if (p.opacity > 0) {
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    frame++;
    if (alive > 0 && frame < 120) {
      requestAnimationFrame(render);
    } else {
      canvas.style.display = 'none';
    }
  }

  render();
}

// ==========================================
// EXPORTAR TABLA DE LIGA PRIVADA A WHATSAPP
// ==========================================
/* exportLeagueTableWhatsApp: ver js/cloud.js */

  
// ==========================================
// VEDA INDIVIDUAL POR PARTIDO (REGLA 9)
// ==========================================
// Simulación de partidos que ya iniciaron para comprobar la veda individual (Puebla vs León ya inició a las 19:00)
/* CLUBS_IN_VEDA_J11: ver js/cloud.js */

/* isPlayerInVeda: ver js/cloud.js */

// ==========================================
// HISTORIAL DE FECHAS EN MI ONCE
// ==========================================
/* currentOnceViewingGw: ver js/cloud.js */
/* HISTORICAL_ONCES: ver js/cloud.js */

/* switchOnceGameweek: ver js/cloud.js */

// ==========================================
// PEÑAS OFICIALES Y COMUNIDADES ABIERTAS
// ==========================================
/* userJoinedPenas: ver js/cloud.js */




// ==========================================
// RANKING EXCLUSIVO DE AFICIONES (LIGA MX)
// ==========================================
/* FANBASE_STANDINGS_J11: ver js/cloud.js */

/* renderFanbaseRankings: ver js/cloud.js */

// ==========================================
// PERSONALIZACIÓN DEL ESTADIO SEGÚN TU CLUB (INTRO)
// ==========================================
function applyUserClubStadiumLighting() {
  if (!currentUser.isLoggedIn || !currentUser.clubShort) return;

  const clubLights = {
    'PUM': { l: 'rgba(30, 58, 138, 0.40)', r: 'rgba(251, 191, 36, 0.40)', glow: 'rgba(251, 191, 36, 0.35)' },
    'CHI': { l: 'rgba(239, 68, 68, 0.40)', r: 'rgba(255, 255, 255, 0.40)', glow: 'rgba(239, 68, 68, 0.35)' },
    'AME': { l: 'rgba(254, 240, 138, 0.45)', r: 'rgba(30, 58, 138, 0.40)', glow: 'rgba(254, 240, 138, 0.35)' },
    'CAZ': { l: 'rgba(37, 99, 235, 0.45)', r: 'rgba(255, 255, 255, 0.40)', glow: 'rgba(37, 99, 235, 0.35)' },
    'TIG': { l: 'rgba(245, 158, 11, 0.45)', r: 'rgba(30, 58, 138, 0.40)', glow: 'rgba(245, 158, 11, 0.35)' },
    'MTY': { l: 'rgba(30, 58, 138, 0.45)', r: 'rgba(255, 255, 255, 0.40)', glow: 'rgba(30, 58, 138, 0.35)' },
    'TOL': { l: 'rgba(220, 38, 38, 0.45)', r: 'rgba(255, 255, 255, 0.40)', glow: 'rgba(220, 38, 38, 0.35)' },
    'ATS': { l: 'rgba(220, 38, 38, 0.45)', r: 'rgba(15, 23, 42, 0.60)', glow: 'rgba(220, 38, 38, 0.35)' },
    'SAN': { l: 'rgba(22, 163, 74, 0.45)', r: 'rgba(255, 255, 255, 0.40)', glow: 'rgba(22, 163, 74, 0.35)' },
    'LEO': { l: 'rgba(21, 128, 61, 0.45)', r: 'rgba(250, 204, 21, 0.40)', glow: 'rgba(21, 128, 61, 0.35)' },
    'PAC': { l: 'rgba(255, 255, 255, 0.45)', r: 'rgba(2, 132, 199, 0.40)', glow: 'rgba(2, 132, 199, 0.35)' }
  };

  const c = clubLights[currentUser.clubShort];
  if (!c) return;

  const bLeft = document.querySelector('.splash-light-beam-left');
  const bRight = document.querySelector('.splash-light-beam-right');
  const glow = document.querySelector('.splash-sunburst-glow');

  if (bLeft) bLeft.style.background = `linear-gradient(135deg, ${c.l} 0%, transparent 70%)`;
  if (bRight) bRight.style.background = `linear-gradient(225deg, ${c.r} 0%, transparent 70%)`;
  if (glow) glow.style.background = `radial-gradient(circle, ${c.glow} 0%, transparent 75%)`;
}

// ==========================================
// ALERTA DE PARTIDO DE TU CLUB (MI ONCE Y QUINIELA)
// ==========================================
/* updateUserClubMatchAlert: ver js/cloud.js */

/* renderPenasList: ver js/cloud.js */

/* toggleJoinPena: ver js/cloud.js */

// ==========================================
// MODAL DE DESAFÍO 1 A 1
// ==========================================
function openChallengeModal() {
  document.getElementById('challengeModalOverlay').classList.add('open');
}

function closeChallengeModal(e) {
  document.getElementById('challengeModalOverlay').classList.remove('open');
}

/* send1v1WhatsAppChallenge: ver js/cloud.js */

  
    // ==========================================
// SECUENCIA CINEMATOGRÁFICA DE APERTURA ÉPICA (SPLASH INTRO)
// ==========================================
let splashDismissed = false;
let splashProgress = 0;
let splashProgressTimer = null;
let splashParticlesAnim = null;
let splashParticles = [];

// Sistema de Partículas en Canvas para el Splash
    // Modo de sonido de entrada: 'whistle' (default), 'trumpet', o 'mute'
let introSoundMode = localStorage.getItem('pambol_intro_sound_mode') || 'whistle';

function setIntroSoundMode(mode) {
  introSoundMode = mode;
  localStorage.setItem('pambol_intro_sound_mode', mode);

  // Actualizar estilo visual de las pastillas
  ['whistle', 'trumpet', 'mute'].forEach(m => {
    const btn = document.getElementById(`soundPill${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (btn) btn.classList.toggle('active', m === mode);
  });

  // Muestra previa del sonido al seleccionar
  if (mode === 'trumpet') {
    playStadiumSound('trumpet');
  } else if (mode === 'whistle') {
    playStadiumSound('whistle');
  }
}

// Inicializar visualmente pastilla guardada
setTimeout(() => {
  setIntroSoundMode(introSoundMode);
}, 150);

// Sistema de Partículas, Niebla de Césped y Fuegos Artificiales en Canvas
function initSplashParticles() {
  const canvas = document.getElementById('splashParticleCanvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Pre-renderizado de sprite de niebla suave en offscreen canvas (100x más rápido, 60fps)
  const fogSprite = document.createElement('canvas');
  fogSprite.width = 160;
  fogSprite.height = 160;
  const fCtx = fogSprite.getContext('2d');
  const fGrad = fCtx.createRadialGradient(80, 80, 0, 80, 80, 80);
  fGrad.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
  fGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.04)');
  fGrad.addColorStop(1, 'transparent');
  fCtx.fillStyle = fGrad;
  fCtx.beginPath();
  fCtx.arc(80, 80, 80, 0, Math.PI * 2);
  fCtx.fill();

  const colors = ['#fbbf24', '#fef08a', '#34d399', '#10b981', '#38bdf8', '#ffffff'];
  splashParticles = [];
  const particleCount = Math.min(45, Math.floor(window.innerWidth / 18));

  // 1. Chispas y Polvo de Estadio
  for (let i = 0; i < particleCount; i++) {
    splashParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.2 + 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(Math.random() * 1.0 + 0.3),
      alpha: Math.random() * 0.7 + 0.2,
      alphaSpeed: Math.random() * 0.012 + 0.004,
      pulse: Math.random() * Math.PI
    });
  }

  // 2. Niebla de Césped optimizada con sprites pre-renderizados
  const fogParticles = [];
  const fogCount = Math.min(10, Math.floor(window.innerWidth / 50));
  for (let i = 0; i < fogCount; i++) {
    fogParticles.push({
      x: Math.random() * (canvas.width + 100) - 50,
      y: canvas.height - (Math.random() * 90 + 30),
      size: Math.random() * 80 + 120,
      vx: Math.random() * 0.35 + 0.15,
      alpha: Math.random() * 0.7 + 0.3
    });
  }

  // 3. Sistema de Fuegos Artificiales / Cohetes de Estadio
  let fireworksRockets = [];
  let fireworkParticles = [];

  function launchFirework(targetX, targetY, customColors) {
    fireworksRockets.push({
      x: targetX + (Math.random() - 0.5) * 50,
      y: canvas.height + 15,
      targetY: targetY || (Math.random() * (canvas.height * 0.32) + 50),
      vy: -(Math.random() * 3.5 + 8.0),
      vx: (Math.random() - 0.5) * 1.2,
      colors: customColors || ['#16a34a', '#ffffff', '#dc2626', '#fbbf24', '#fef08a']
    });
  }

  function explodeFirework(x, y, palette) {
    const count = 32;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = Math.random() * 3.8 + 1.6;
      fireworkParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2.2 + 1.0,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 1,
        decay: Math.random() * 0.025 + 0.018,
        gravity: 0.06
      });
    }
  }

  function addSparks(px, py, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      splashParticles.push({
        x: px,
        y: py,
        radius: Math.random() * 2.4 + 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        alphaSpeed: 0.035,
        pulse: 0,
        spark: true
      });
    }
  }

  // Interacción de mouse / touch para emitir chispas
  const splashOverlay = document.getElementById('introSplashOverlay');
  if (splashOverlay) {
    let lastMove = 0;
    splashOverlay.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMove < 35) return;
      lastMove = now;
      addSparks(e.clientX, e.clientY, 2);

      const shieldBox = document.getElementById('splashShieldBox');
      if (shieldBox) {
        const rect = shieldBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const tiltX = (e.clientY - centerY) / 16;
        const tiltY = -(e.clientX - centerX) / 16;
        shieldBox.style.transform = `perspective(800px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg) scale(1.02)`;
      }
    }, { passive: true });

    splashOverlay.addEventListener('mouseleave', () => {
      const shieldBox = document.getElementById('splashShieldBox');
      if (shieldBox) shieldBox.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  }

  function animate() {
    if (splashDismissed) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // A. Renderizar Niebla de Césped por Sprites pre-renderizados
    for (let i = 0; i < fogParticles.length; i++) {
      const f = fogParticles[i];
      f.x += f.vx;
      if (f.x > canvas.width + f.size) {
        f.x = -f.size;
      }
      ctx.globalAlpha = f.alpha;
      ctx.drawImage(fogSprite, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
    }

    // B. Renderizar Chispas y Polvo de Estadio (Rápido, sin shadowBlur)
    for (let i = splashParticles.length - 1; i >= 0; i--) {
      const p = splashParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.03;

      if (p.spark) {
        p.vy += 0.08;
        p.alpha -= p.alphaSpeed;
        if (p.alpha <= 0) {
          splashParticles.splice(i, 1);
          continue;
        }
      } else {
        p.alpha = 0.35 + Math.sin(p.pulse) * 0.35;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // C. Renderizar Cohetes de Fuegos Artificiales
    for (let i = fireworksRockets.length - 1; i >= 0; i--) {
      const r = fireworksRockets[i];
      r.x += r.vx;
      r.y += r.vy;

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (r.y <= r.targetY) {
        explodeFirework(r.x, r.y, r.colors);
        fireworksRockets.splice(i, 1);
      }
    }

    // D. Renderizar Explosiones de Fuegos Artificiales
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
      const fp = fireworkParticles[i];
      fp.x += fp.vx;
      fp.y += fp.vy;
      fp.vy += fp.gravity;
      fp.vx *= 0.98;
      fp.alpha -= fp.decay;

      if (fp.alpha <= 0) {
        fireworkParticles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = fp.alpha;
      ctx.fillStyle = fp.color;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, fp.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    splashParticlesAnim = requestAnimationFrame(animate);
  }
  animate();

  window._splashAddSparks = addSparks;
  window._splashLaunchFirework = launchFirework;
}

// Progreso dinámico de apertura broadcast (3.4 segundos)
function startSplashProgress() {
  const progressBar = document.getElementById('splashProgressBar');
  const progressLabel = document.getElementById('splashProgressLabel');
  splashProgress = 0;
  clearInterval(splashProgressTimer);

  const totalDuration = 3400; // ms
  const stepInterval = 50; // ms
  const totalSteps = totalDuration / stepInterval;
  let currentStep = 0;

  splashProgressTimer = setInterval(() => {
    if (splashDismissed) {
      clearInterval(splashProgressTimer);
      return;
    }
    currentStep++;
    splashProgress = Math.min(100, Math.round((currentStep / totalSteps) * 100));

    if (progressBar) {
      progressBar.style.setProperty('--splash-progress', `${splashProgress}%`);
    }
    if (progressLabel) {
      if (splashProgress < 30) {
        progressLabel.textContent = `CONECTANDO CON EL ESTADIO AZTECA · ${splashProgress}%`;
      } else if (splashProgress < 70) {
        progressLabel.textContent = `CALIBRANDO SISTEMA LIGA MX · ${splashProgress}%`;
      } else if (splashProgress < 95) {
        progressLabel.textContent = `LISTO PARA EL SILBATAZO INICIAL · ${splashProgress}%`;
      } else {
        progressLabel.textContent = `¡TODO LISTO! SALTANDO AL CAMPO · 100%`;
      }
    }

    if (currentStep >= totalSteps * 0.82 && currentStep <= totalSteps * 0.85) {
      if (window._splashLaunchFirework) {
        window._splashLaunchFirework(window.innerWidth * 0.35, window.innerHeight * 0.22);
        setTimeout(() => {
          if (window._splashLaunchFirework) window._splashLaunchFirework(window.innerWidth * 0.65, window.innerHeight * 0.25);
        }, 250);
      }
    }
    if (currentStep >= totalSteps) {
      clearInterval(splashProgressTimer);
      enterAppFromSplash();
    }
  }, stepInterval);
}

function handleSplashBgClick(e) {
  if (window._splashAddSparks && e) {
    window._splashAddSparks(e.clientX, e.clientY, 25);
  }
  enterAppFromSplash();
}

    function enterAppFromSplash() {
  if (splashDismissed) return;
  splashDismissed = true;
  clearInterval(splashProgressTimer);
  if (splashParticlesAnim) cancelAnimationFrame(splashParticlesAnim);

  // Lanzar cohete final de celebración
  if (window._splashLaunchFirework) {
    window._splashLaunchFirework(window.innerWidth * 0.5, window.innerHeight * 0.18, ['#fbbf24', '#fef08a', '#10b981', '#ffffff']);
  }

  // Audio según la preferencia del usuario
  if (introSoundMode === 'trumpet') {
    playStadiumSound('trumpet');
  } else if (introSoundMode === 'whistle') {
    playStadiumSound('whistle');
    setTimeout(() => playStadiumSound('boom'), 120);
    setTimeout(() => playStadiumSound('goal'), 340);
  } // Si es 'mute', no reproduce sonido

  // Salida con efecto de túnel de estadio (Warp Zoom)
  const splash = document.getElementById('introSplashOverlay');
  if (splash) {
    splash.classList.add('tunnel-exit');
    setTimeout(() => {
      splash.style.display = 'none';
      splash.classList.remove('tunnel-exit');
    }, 800);
  }

  // Animación de entrada de la cancha
  const container = document.querySelector('.mobile-container');
  if (container) {
    container.classList.remove('entering-pitch');
    void container.offsetWidth;
    container.classList.add('entering-pitch');
  }

  // Animación en cascada de los 11 jugadores en la cancha
  triggerStaggeredLineupReveal();

  // Si el usuario ya está autenticado, desplegar la ficha holográfica del DT
  if (currentUser.isLoggedIn) {
    setTimeout(() => {
      showHolographicDtCard();
    }, 750);
  } else {
    // Si es un nuevo visitante no registrado, abrir directamente el onboarding y elección de club
    setTimeout(() => {
      // Solo una vez por dispositivo, y solo si hay servidor (ver js/cloud.js)
      let seen = false; try { seen = localStorage.getItem('pambol_onboarded') === '1'; localStorage.setItem('pambol_onboarded', '1'); } catch (e) {}
      if (!seen && typeof Pambol !== 'undefined' && Pambol.online && !PambolCloud.isLoggedIn() && !new URLSearchParams(location.search).get('liga')) { activeAuthTab = 'register'; openAuthModal(); }
    }, 1500);
  }
}

// Control de la Tarjeta Holográfica del DT (Option 3)
let holoTimer = null;
let holoPinned = false;

function showHolographicDtCard() {
  const card = document.getElementById('holographicDtCard');
  if (!card) return;

  // Obtener datos actuales del DT y escuadra
  const coach = COACHES.find(c => c.id === selectedCoachId) || COACHES[0];
  const captain = DB.players.find(p => p.id === captainId);

  const flagMap = {
    'Uruguay': '🇺🇾', 'México': '🇲🇽', 'Argentina': '🇦🇷',
    'España': '🇪🇸', 'Brasil': '🇧🇷', 'Colombia': '🇨🇴'
  };

  const dtNameEl = document.getElementById('holoDtName');
  const dtClubEl = document.getElementById('holoDtClub');
  const dtFlagEl = document.getElementById('holoDtFlag');
  const dtProfileEl = document.getElementById('holoDtProfile');
  const formationTagEl = document.getElementById('holoFormationTag');
  const captainTagEl = document.getElementById('holoCaptainTag');
  const budgetTagEl = document.getElementById('holoBudgetTag');

  if (dtNameEl) dtNameEl.textContent = coach.name;
  if (dtClubEl) dtClubEl.textContent = `${coach.team} · Director Técnico Oficial`;
  if (dtFlagEl) dtFlagEl.textContent = flagMap[coach.nat] || '🇲🇽';
  if (dtProfileEl) dtProfileEl.textContent = `«${coach.profile || 'Estrategia y equilibrio'}»`;

  const flexCount = { DEF: (lineup.DEF || []).length, MID: (lineup.MID || []).length, FWD: (lineup.FWD || []).length };
  const flexPos = flexCount.DEF > 3 ? 'DEF' : (flexCount.MID > 3 ? 'MED' : 'DEL');
  if (formationTagEl) formationTagEl.textContent = `📐 ${selectedFormation} (FLEX: ${flexPos})`;
  if (captainTagEl && captain) captainTagEl.textContent = `👑 ${captain.name.split(' ')[0]} (C x2)`;

  const totalCost = calculateTotalSquadCost();
  if (budgetTagEl) budgetTagEl.textContent = `💰 ${totalCost.toFixed(1)} V`;

  // Mostrar tarjeta
  card.classList.remove('hide');
  card.classList.add('show');
  holoPinned = false;

  // Iniciar vaciado de barra de progreso y auto-cierre tras 4.5s
  const barFill = document.getElementById('holoDtBarFill');
  if (barFill) {
    barFill.style.transition = 'none';
    barFill.style.width = '100%';
    void barFill.offsetWidth;
    barFill.style.transition = 'width 4.5s linear';
    barFill.style.width = '0%';
  }

  clearTimeout(holoTimer);
  holoTimer = setTimeout(() => {
    if (!holoPinned) {
      closeHoloDtCard();
    }
  }, 4700);
}

function closeHoloDtCard() {
  const card = document.getElementById('holographicDtCard');
  if (card) {
    card.classList.remove('show');
    card.classList.add('hide');
  }
  clearTimeout(holoTimer);
}

function toggleHoloCardPin() {
  holoPinned = !holoPinned;
  const barFill = document.getElementById('holoDtBarFill');
  if (holoPinned && barFill) {
    barFill.style.transition = 'none';
    barFill.style.width = '100%';
  }
}

function triggerStaggeredLineupReveal() {
  const cards = document.querySelectorAll('.pitch-row .player-card');
  cards.forEach((card, index) => {
    card.classList.remove('drop-in');
    void card.offsetWidth; // Forzar reflow
    card.style.animationDelay = `${index * 65}ms`;
    card.classList.add('drop-in');
  });
}

// Función para repetir la presentación cinematográfica cuando el usuario lo desee
function replayIntroAnimation() {
  splashDismissed = false;
  const splash = document.getElementById('introSplashOverlay');
  if (splash) {
    splash.style.display = 'flex';
    splash.classList.remove('tunnel-exit');
    splash.style.opacity = '1';
    splash.style.transform = 'scale(1)';
    initSplashParticles();
    startSplashProgress();
  }
}

// Inicializar partículas y progreso al cargar
setTimeout(() => {
  initSplashParticles();
  startSplashProgress();
}, 100);


// ==========================================
// CREADOR DE ESCUDOS DE BARRIO (Opción 5)
// ==========================================
let customBadgeState = {
  shape: 'azteca',
  icon: '👑',
  primary: '#fbbf24',
  secondary: '#0f172a',
  name: 'Mi Once Pambolero'
};

function loadCustomBadge() {
  try {
    const saved = localStorage.getItem('pambol_custom_badge');
    if (saved) {
      customBadgeState = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error loading custom badge:', e);
  }
  applyCustomBadgeToUI();
}

function applyCustomBadgeToUI() {
  const avatarEl = document.getElementById('userCustomBadgeIcon');
  const titleEl = document.getElementById('userCustomTeamTitle');
  if (avatarEl) avatarEl.textContent = customBadgeState.icon;
  if (titleEl) titleEl.textContent = customBadgeState.name;
}

function openBadgeBuilderModal() {
  document.getElementById('badgeBuilderModalOverlay').classList.add('open');
  const nameInput = document.getElementById('badgeTeamNameInput');
  if (nameInput) nameInput.value = customBadgeState.name;
  updateCustomBadgePreview();
}

function closeBadgeBuilderModal(e) {
  document.getElementById('badgeBuilderModalOverlay').classList.remove('open');
}

function setBadgeShape(shape, el) {
  customBadgeState.shape = shape;
  document.querySelectorAll('[data-shape]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  updateCustomBadgePreview();
}

function setBadgeIcon(icon, el) {
  customBadgeState.icon = icon;
  document.querySelectorAll('[data-icon]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  updateCustomBadgePreview();
}

function setBadgePalette(prim, sec, el) {
  customBadgeState.primary = prim;
  customBadgeState.secondary = sec;
  document.querySelectorAll('[data-palette]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  updateCustomBadgePreview();
}

function updateCustomBadgePreview() {
  const container = document.getElementById('badgePreviewContainer');
  if (!container) return;
  const nameInput = document.getElementById('badgeTeamNameInput');
  if (nameInput) customBadgeState.name = nameInput.value || 'Mi Once Pambolero';

  const s = customBadgeState;
  let pathD = '';
  if (s.shape === 'azteca') {
    pathD = 'M50,8 L85,18 L92,52 Q92,85 50,96 Q8,85 8,52 L15,18 Z';
  } else if (s.shape === 'clasico') {
    pathD = 'M14,10 L86,10 L86,55 Q86,92 50,96 Q14,92 14,55 Z';
  } else if (s.shape === 'diamante') {
    pathD = 'M50,6 L94,50 L50,96 L6,50 Z';
  } else {
    pathD = 'M50,8 A42,42 0 1,1 49.9,8 Z';
  }

  container.innerHTML = `
    <svg viewBox="0 0 100 105" width="120" height="126" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
        <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${s.primary}"/>
          <stop offset="100%" stop-color="${s.secondary}"/>
        </linearGradient>
      </defs>
      <g filter="url(#badgeShadow)">
        <path d="${pathD}" fill="url(#badgeGrad)" stroke="#ffffff" stroke-width="2.5"/>
        <path d="${pathD}" fill="none" stroke="${s.primary}" stroke-width="1.2" transform="scale(0.88) translate(6.8, 6.5)"/>
        <text x="50" y="55" font-size="34" text-anchor="middle" dominant-baseline="central">${s.icon}</text>
        <path d="M20,78 Q50,84 80,78" fill="none" stroke="#ffffff" stroke-width="1"/>
        <text x="50" y="86" font-family="-apple-system, sans-serif" font-size="7.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${escapeHtml(s.name).substring(0, 16).toUpperCase()}</text>
      </g>
    </svg>
  `;
}

function saveCustomBadge() {
  try {
    const nameInput = document.getElementById('badgeTeamNameInput');
    if (nameInput) customBadgeState.name = nameInput.value || 'Mi Once Pambolero';
    localStorage.setItem('pambol_custom_badge', JSON.stringify(customBadgeState));
  } catch (e) {
    console.warn('Error saving custom badge:', e);
  }
  applyCustomBadgeToUI();
  closeBadgeBuilderModal();
  playStadiumSound('goal');
  alert(`🎉 ¡Escudo de "${customBadgeState.name}" guardado con éxito! Tu emblema oficial ya está activo.`);
}

// ==========================================
// BOLSA DE VALORES PAMBOLERA (Opción 4)
// ==========================================
/* STOCK_MOVERS_UP: ver js/cloud.js */

/* STOCK_MOVERS_DOWN: ver js/cloud.js */

function switchMarketSubTab(tabName) {
  const catalogEl = document.getElementById('marketCatalogView');
  const stocksEl = document.getElementById('marketStocksView');
  const btnCatalog = document.getElementById('btnMarketCatalog');
  const btnStocks = document.getElementById('btnMarketStocks');

  if (tabName === 'catalog') {
    if (catalogEl) catalogEl.style.display = 'block';
    if (stocksEl) stocksEl.style.display = 'none';
    if (btnCatalog) btnCatalog.classList.add('active');
    if (btnStocks) btnStocks.classList.remove('active');
  } else {
    if (catalogEl) catalogEl.style.display = 'none';
    if (stocksEl) stocksEl.style.display = 'block';
    if (btnCatalog) btnCatalog.classList.remove('active');
    if (btnStocks) btnStocks.classList.add('active');
    renderStockMovers();
  }
}

/* renderStockMovers: ver js/cloud.js */

// Inicializar carga de escudo personalizado al arrancar
setTimeout(() => {
  loadCustomBadge();
}, 200);

