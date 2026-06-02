import { msalInstance, loginRequest } from '../auth/msalConfig';

const SHAREPOINT_URL = 'https://qmequipment123.sharepoint.com/:x:/r/sites/Produccin/Documentos%20compartidos/Proyectos/Proyectos%202.0.xlsx?d=wfe883325926f4ea98fc660906c6137c3&csf=1&web=1&e=wbxezq';
const SHEET_NAME = 'Estado de proyectos';
const PLANNING_SHEET = 'Planificacion mensual';
const PLANNING_SITE = 'qmequipment123.sharepoint.com:/sites/Planificacion';

function encodeSharingUrl(url) {
  return 'u!' + btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Resuelve la URL de SharePoint a driveId + itemId (se cachea por sesión)
let _driveItem = null;
async function resolveDriveItem() {
  if (_driveItem) return _driveItem;
  const shareId = encodeSharingUrl(SHAREPOINT_URL);
  const item = await graphGet(`/shares/${shareId}/driveItem`);
  _driveItem = {
    driveId:    item.parentReference.driveId,
    itemId:     item.id,
    parentId:   item.parentReference.id,
    parentPath: item.parentReference.path ?? '',
  };
  return _driveItem;
}

// Resuelve el archivo de planificación desde el sitio Planificacion (se cachea por sesión)
let _planningItem = null;
async function resolvePlanningDriveItem() {
  if (_planningItem) return _planningItem;

  console.log('[Planning] Resolviendo desde sitio:', PLANNING_SITE);
  const site = await graphGet(`/sites/${PLANNING_SITE}`);
  console.log('[Planning] Site ID:', site.id);

  const drive = await graphGet(`/sites/${site.id}/drive`);
  console.log('[Planning] Drive ID:', drive.id);

  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const isPlanningFile = f => norm(f.name).includes('planificaci') || f.name.includes('RC-17');

  // Estrategia 1: búsqueda por nombre
  let found = null;
  try {
    const res = await graphGet(
      `/drives/${drive.id}/root/search(q='RC-17-01')?$select=id,name&$top=10`
    );
    console.log('[Planning] Búsqueda:', res.value?.map(f => f.name));
    found = res.value?.find(isPlanningFile) ?? null;
  } catch (e) {
    console.warn('[Planning] Búsqueda falló:', e.message);
  }

  // Estrategia 2: listar raíz del drive
  if (!found) {
    const root = await graphGet(`/drives/${drive.id}/root/children?$select=id,name&$top=100`);
    console.log('[Planning] Raíz del drive:', root.value?.map(f => f.name));
    found = root.value?.find(isPlanningFile) ?? null;
  }

  if (!found) {
    throw new Error(
      `Archivo de planificación no encontrado en el sitio Planificacion. ` +
      `Revisá la consola del navegador para ver los archivos disponibles.`
    );
  }

  console.log('[Planning] Usando archivo:', found.name, '| ID:', found.id);
  _planningItem = { driveId: drive.id, itemId: found.id };
  return _planningItem;
}

async function getToken() {
  const accounts = msalInstance.getAllAccounts();
  if (!accounts.length) throw new Error('No hay sesión activa');
  const response = await msalInstance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
  return response.accessToken;
}

async function graphGet(path) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Graph error ${res.status}`);
  }
  return res.json();
}

async function graphPost(path, body) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Graph error ${res.status}`);
  }
  return res.json();
}

async function graphPatch(path, body) {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Graph error ${res.status}`);
  }
  return res.json();
}

function colToLetter(idx) {
  let letter = '', n = idx + 1;
  while (n > 0) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function parsePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace('%', ''));
    return isNaN(n) ? null : Math.round(n);
  }
  if (typeof value === 'number') return Math.round(value * 100);
  return null;
}

async function getSheetData() {
  const { driveId, itemId } = await resolveDriveItem();
  return graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/usedRange`
  );
}

function mapRowsToProjects(rows) {
  if (!rows || rows.length < 2) return { projects: [], budgetColIdx: -1 };
  const headers = rows[0].map(h => String(h).toLowerCase().trim());

  const col = (...names) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxId        = col('numero', 'n°', 'nro', 'id', 'serie');
  const idxDesc      = col('proyecto', 'descripcion', 'descripción', 'desc', 'equipo', 'nombre');
  const idxCliente   = col('cliente');
  const idxLdp       = col('ldp', 'lider', 'líder', 'responsable');
  const idxEstado    = col('estado');
  const idxEstadio   = col('estadio', 'etapa', 'fase');
  const idxProx      = col('próximo', 'proximo', 'next');
  const idxInicio    = col('inicio', 'start');
  const idxFinPlan   = col('fin plan', 'finplan', 'fin planif', 'fecha fin plan');
  const idxFinEst    = col('fin est', 'finest', 'entrega est', 'fecha entrega');
  const idxDesvio    = col('desvio', 'desvío', 'dias', 'días');
  const idxCotTotal  = col('cotizado total');
  const idxRealTotal = col('reales total');
  const idxKpi1      = col('kpi 1');
  const idxKpi2      = col('kpi 2');

  // HH por área — cotizado
  const idxPlanIng   = col('cotizado ing');
  const idxPlanMet   = col('cotizado met');
  const idxPlanInox  = col('cotizado inox');
  const idxPlanGyp   = col('cotizado gyp');
  const idxPlanMontE = col('cotizado mont e');
  const idxPlanMont  = col('cotizado mont');

  // HH por área — reales
  const idxRealIng   = col('reales ing');
  const idxRealMet   = col('reales met');
  const idxRealInox  = col('reales inox');
  const idxRealGyp   = col('reales gyp');
  const idxRealMontE = col('reales montaje e', 'reales mont e');
  const idxRealMont  = col('reales montaje', 'reales mont');
  const idxBudgetPct = col('presupuesto consumido', 'kpi 3');
  const idxFinReal   = col('entrega final');
  const idxReplans   = col('reprogramaci');
  const idxCausas    = col('causa');

  const projects = rows.slice(1)
    .map((row, i) => {
      if (idxId === -1 || !row[idxId]) return null;
      return {
        id:          String(row[idxId] ?? `PROJ-${i}`).trim(),
        desc:        idxDesc !== -1    ? String(row[idxDesc] ?? '').trim()    : '',
        cliente:     idxCliente !== -1 ? String(row[idxCliente] ?? '').trim() : '',
        ldp:         idxLdp !== -1     ? String(row[idxLdp] ?? '').trim()     : '',
        estado:      idxEstado !== -1  ? String(row[idxEstado] ?? 'En proceso').trim() : 'En proceso',
        estadio:     idxEstadio !== -1 ? String(row[idxEstadio] ?? '').trim() : '',
        prox:        idxProx !== -1    ? String(row[idxProx] ?? '—').trim()   : '—',
        inicio:      parseExcelDate(idxInicio !== -1 ? row[idxInicio] : null),
        finPlan:     parseExcelDate(idxFinPlan !== -1 ? row[idxFinPlan] : null),
        finEst:      parseExcelDate(idxFinEst !== -1 ? row[idxFinEst] : null),
        finReal:     parseExcelDate(idxFinReal !== -1 ? row[idxFinReal] : null),
        desvio:      idxDesvio !== -1    ? (Number(row[idxDesvio]) || 0) : 0,
        hhPlanTotal: idxCotTotal !== -1  ? (Number(row[idxCotTotal])  || 0) : 0,
        hhRealTotal: idxRealTotal !== -1 ? (Number(row[idxRealTotal]) || 0) : 0,
        kpi1Pct:     idxKpi1 !== -1      ? parsePercent(row[idxKpi1])     : null,
        kpi2Pct:     idxKpi2 !== -1      ? parsePercent(row[idxKpi2])     : null,
        budgetPct:   idxBudgetPct !== -1 ? parsePercent(row[idxBudgetPct]) : null,
        _rowIdx:     i + 1,
        hhPlan: {
          ing:    idxPlanIng   !== -1 ? (Number(row[idxPlanIng])   || 0) : 0,
          metneg: idxPlanMet   !== -1 ? (Number(row[idxPlanMet])   || 0) : 0,
          metinox:idxPlanInox  !== -1 ? (Number(row[idxPlanInox])  || 0) : 0,
          gyp:    idxPlanGyp   !== -1 ? (Number(row[idxPlanGyp])   || 0) : 0,
          mongral:idxPlanMont  !== -1 ? (Number(row[idxPlanMont])  || 0) : 0,
          monelec:idxPlanMontE !== -1 ? (Number(row[idxPlanMontE]) || 0) : 0,
          cyp: 0, testeo: 0,
        },
        hhReal: {
          ing:    idxRealIng   !== -1 ? (Number(row[idxRealIng])   || 0) : 0,
          metneg: idxRealMet   !== -1 ? (Number(row[idxRealMet])   || 0) : 0,
          metinox:idxRealInox  !== -1 ? (Number(row[idxRealInox])  || 0) : 0,
          gyp:    idxRealGyp   !== -1 ? (Number(row[idxRealGyp])   || 0) : 0,
          mongral:idxRealMont  !== -1 ? (Number(row[idxRealMont])  || 0) : 0,
          monelec:idxRealMontE !== -1 ? (Number(row[idxRealMontE]) || 0) : 0,
          cyp: 0, testeo: 0,
        },
        budget:      { total: 0, consumido: 0, materiales: 0, manoObra: 0 },
        gantt:       [],
        replans: (() => {
          const raw  = idxReplans !== -1 ? String(row[idxReplans] ?? '').trim() : '';
          const craw = idxCausas  !== -1 ? String(row[idxCausas]  ?? '').trim() : '';
          if (!raw || raw === '0' || raw === '00/01/1900') return [];
          const dates  = raw.split(';').map(s => s.trim()).filter(Boolean);
          const causes = craw.split(';').map(s => s.trim());
          const orig   = parseExcelDate(idxFinEst !== -1 ? row[idxFinEst] : null);
          return dates.map((d, i) => ({
            desde: i === 0 ? orig : parseExcelDate(dates[i - 1]),
            hasta: parseExcelDate(d),
            causa: causes[i] ?? '',
          }));
        })(),
      };
    })
    .filter(Boolean);

  return { projects, budgetColIdx: idxBudgetPct };
}

function parseExcelDate(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' && value <= 1) return '—';
  if (typeof value === 'number' && value > 1000) {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  if (!str || str === '0' || str === '00/01/1900' || str === '01/01/1900') return '—';
  // Convierte DD/MM/YYYY o D/M/YYYY a ISO YYYY-MM-DD
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return str;
}

function parsePlanningRows(rows) {
  if (!rows || rows.length < 2) return new Map();

  const norm = h => String(h ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const HEADER_KEYS = ['serie', 'n°', 'nro', 'sector', 'taller', 'area', 'inicio', 'comienzo', 'fin', 'start', 'end'];

  // Busca la fila que contiene los encabezados reales (puede no ser la primera)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    if (!rows[i]) continue;
    const normalized = rows[i].map(norm);
    const hits = HEADER_KEYS.filter(kw => normalized.some(h => h.includes(kw)));
    if (hits.length >= 2) { headerRowIdx = i; break; }
  }

  const headers = rows[headerRowIdx].map(norm);
  console.log('[Planning] Header row:', headerRowIdx, '| Headers:', rows[headerRowIdx]);

  const col = (...names) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  const idxId     = col('serie', 'n°', 'nro', 'número', 'numero', 'codigo', 'código', 'id');
  const idxTaller = col('sector', 'taller', 'área', 'area', 'etapa', 'fase', 'proceso');
  const idxStart  = col('comienzo', 'inicio', 'start');
  const idxEnd    = col('fin', 'end', 'término', 'termino');
  const map = new Map();
  rows.slice(headerRowIdx + 1).forEach(row => {
    if (!row || row.every(c => c === null || c === undefined || c === '')) return;
    const id = idxId !== -1 ? String(row[idxId] ?? '').trim() : '';
    if (!id || id === '0') return;
    const taller = idxTaller !== -1 ? String(row[idxTaller] ?? '').trim() : '';
    const start  = parseExcelDate(idxStart !== -1 ? row[idxStart] : null);
    const end    = parseExcelDate(idxEnd   !== -1 ? row[idxEnd]   : null);
    if (!taller || start === '—' || end === '—') return;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push({ area: taller, start, end, pct: 0 });
  });
  return map;
}

export async function fetchProjects() {
  const range = await getSheetData();
  const { projects, budgetColIdx } = mapRowsToProjects(range.values);
  return { projects, sheetNames: [SHEET_NAME], budgetColIdx };
}

export async function fetchPlanning() {
  const { driveId, itemId } = await resolvePlanningDriveItem();

  // Listar hojas para encontrar el nombre exacto (evita error por acento/mayúsculas)
  const { value: sheets } = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets?$select=id,name`
  );

  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Prioriza la hoja que contenga 'mensual' (ej: "Planificacion mensual") sobre otras que solo digan 'planificacion'
  const sheet =
    sheets?.find(s => norm(s.name).includes('mensual')) ??
    sheets?.find(s => norm(s.name).includes('planificacion'));

  if (!sheet) {
    throw new Error(`Hoja de planificación no encontrada. Hojas disponibles: ${sheets?.map(s => s.name).join(', ')}`);
  }
  console.log('[Planning] Usando hoja:', sheet.name);

  const range = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(sheet.name)}')/usedRange`
  );
  return parsePlanningRows(range.values);
}

function parseCapacidadData(rows) {
  if (!rows || rows.length < 10) return null;

  // ── Tabla LDPs (filas 10-15) ─────────────────────────────
  const ldps = [];
  for (let i = 10; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || typeof row[0] !== 'string' || row[0].trim() === '') break;
    ldps.push({
      nombre:       String(row[0]).trim(),
      capacidadMax: Number(row[2]) || 1,
      cargaActual:  Number(row[3]) || 0,
      pctCapacidad: Number(row[4]) || 0,
    });
  }

  // Mapa apellido → LDP (el header semanal usa solo apellidos)
  const ldpByApellido = {};
  ldps.forEach(ldp => {
    const apellido = ldp.nombre.split(' ').pop();
    ldpByApellido[apellido] = ldp;
  });

  // ── Proyección semanal ───────────────────────────────────
  const weeklyHeaderRow = rows.find(r => r[0] === 'Semana');
  if (!weeklyHeaderRow) return { ldps, weeks: [] };

  const colNames    = weeklyHeaderRow.slice(1);
  const headerIdx   = rows.indexOf(weeklyHeaderRow);
  const weeks = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (typeof row[0] !== 'number' || row[0] < 40000) break;
    const date = new Date((row[0] - 25569) * 86400 * 1000);
    const entry = {
      dateStr: date.toISOString().split('T')[0],
      label:   date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.',''),
      ldpLoads: {},
    };
    colNames.forEach((name, idx) => {
      if (!name || name === 'TOTAL' || name === 'Sin asignar') return;
      const ldp  = ldpByApellido[name];
      if (!ldp) return;
      const load = Number(row[idx + 1]) || 0;
      entry.ldpLoads[ldp.nombre] = {
        load,
        pct: ldp.capacidadMax > 0 ? load / ldp.capacidadMax : 0,
      };
    });
    weeks.push(entry);
  }

  return { ldps, weeks };
}

export async function fetchCapacidad() {
  const { driveId, itemId } = await resolveDriveItem();

  const { value: sheets } = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets?$select=id,name`
  );
  console.log('[Capacidad] Hojas disponibles:', sheets.map(s => s.name));

  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sheet = sheets?.find(s => norm(s.name).includes('proyecci') && norm(s.name).includes('capacidad'))
             ?? sheets?.find(s => norm(s.name).includes('capacidad'));

  if (!sheet) {
    throw new Error(`Hoja no encontrada. Hojas disponibles: ${sheets.map(s => s.name).join(', ')}`);
  }
  console.log('[Capacidad] Usando hoja:', sheet.name);

  const range = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(sheet.name)}')/usedRange`
  );
  return parseCapacidadData(range.values);
}

export async function addProject({ id, desc, ldp, finEst }) {
  const { driveId, itemId } = await resolveDriveItem();

  // Obtiene la cantidad de filas usadas para saber dónde agregar
  const range = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/usedRange`
  );

  const newRow = range.rowCount + 1; // fila nueva (1-based, row 1 = encabezados)

  // Convierte fecha YYYY-MM-DD → DD/MM/YYYY para el Excel
  const finEstExcel = finEst
    ? finEst.split('-').reverse().join('/')
    : '';

  // Columnas A–I: N°serie, Proyecto, Cliente, LDP, FinEstimada, EntregaEst, Reprog, Causas, Estado
  const values = [[id, desc, '', ldp, '', finEstExcel, '', '', 'Sin empezar']];

  await graphPatch(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/range(address='A${newRow}:I${newRow}')`,
    { values }
  );
}

const DASHBOARD_SHEET_KEYWORD = 'dashboard';

function parseDashboard(rows) {
  if (!rows || rows.length === 0) return null;
  const norm = v => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  function findTable(keyword) {
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].some(c => norm(c).includes(keyword))) continue;
      // Busca la fila de encabezados (primera fila no vacía luego del título)
      let hi = i + 1;
      while (hi < rows.length && rows[hi].every(c => c === null || c === '' || c === undefined)) hi++;
      if (hi >= rows.length) return null;
      // Columnas con contenido
      const cols = rows[hi]
        .map((h, idx) => ({ idx, label: String(h ?? '').trim() }))
        .filter(({ label }) => label !== '');
      if (cols.length < 2) return null;
      // Filas de datos
      const data = [];
      for (let di = hi + 1; di < rows.length; di++) {
        const row = rows[di];
        if (!row || row.every(c => c === null || c === '' || c === undefined)) break;
        const obj = {};
        let hasData = false;
        cols.forEach(({ idx, label }) => {
          const val = row[idx];
          obj[label] = val;
          if (val !== null && val !== '' && val !== undefined) hasData = true;
        });
        if (hasData) data.push(obj);
      }
      return { headers: cols.map(c => c.label), data };
    }
    return null;
  }

  return {
    equiposEntregados: findTable('equipos entregados'),
    resumenGeneral:    findTable('resumen general'),
  };
}

export async function fetchDashboard() {
  const { driveId, itemId } = await resolveDriveItem();
  const { value: sheets } = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets?$select=id,name`
  );
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sheet = sheets?.find(s => norm(s.name).includes(DASHBOARD_SHEET_KEYWORD));
  if (!sheet) throw new Error(`Hoja Dashboard no encontrada. Hojas: ${sheets?.map(s => s.name).join(', ')}`);
  const range = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(sheet.name)}')/usedRange`
  );
  return parseDashboard(range.values);
}

const RIP_SHEET = 'RIP';

async function ensureRIPSheet(driveId, itemId) {
  const { value: sheets } = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets?$select=id,name`
  );
  if (sheets?.some(s => s.name === RIP_SHEET)) return;
  await graphPost(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets/add`,
    { name: RIP_SHEET }
  );
  await graphPatch(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${RIP_SHEET}')/range(address='A1:F1')`,
    { values: [['Fecha', 'Proyecto', 'Objetivo', 'Estado', 'Comentarios', 'Cliente']] }
  );
}

function parseRIPRows(rows) {
  if (!rows || rows.length < 2) return [];
  return rows.slice(1)
    .map((row, i) => ({
      fecha:       String(row[0] ?? '').trim(),
      proyecto:    String(row[1] ?? '').trim(),
      objetivo:    String(row[2] ?? '').trim(),
      estado:      String(row[3] ?? '').trim() || 'Pendiente',
      comentarios: String(row[4] ?? '').trim(),
      cliente:     String(row[5] ?? '').trim(),
      _rowIdx:     i + 2,
    }))
    .filter(r => r.fecha && r.objetivo);
}

export async function fetchRIP() {
  const { driveId, itemId } = await resolveDriveItem();
  await ensureRIPSheet(driveId, itemId);
  try {
    const range = await graphGet(
      `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(RIP_SHEET)}')/usedRange`
    );
    return parseRIPRows(range.values);
  } catch {
    return [];
  }
}

export async function saveRIPMeeting(entries) {
  const { driveId, itemId } = await resolveDriveItem();
  const range = await graphGet(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(RIP_SHEET)}')/usedRange`
  );
  const startRow = range.rowCount + 1;
  const endRow   = startRow + entries.length - 1;
  const values   = entries.map(e => [e.fecha, e.proyecto, e.objetivo, 'Pendiente', '', e.cliente ?? '']);
  await graphPatch(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(RIP_SHEET)}')/range(address='A${startRow}:F${endRow}')`,
    { values }
  );
}

export async function updateRIPEntry(rowIdx, estado, comentarios) {
  const { driveId, itemId } = await resolveDriveItem();
  await graphPatch(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(RIP_SHEET)}')/range(address='D${rowIdx}:E${rowIdx}')`,
    { values: [[estado, comentarios]] }
  );
}

export async function updateBudgetPct(rowIdx, colIdx, pct) {
  const { driveId, itemId } = await resolveDriveItem();
  const cellAddr = `${colToLetter(colIdx)}${rowIdx + 1}`;
  await graphPatch(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/range(address='${cellAddr}')`,
    { values: [[pct / 100]] }
  );
}
