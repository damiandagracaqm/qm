import { msalInstance, loginRequest } from '../auth/msalConfig';

const SHAREPOINT_URL = 'https://qmequipment123.sharepoint.com/:x:/r/sites/Produccin/Documentos%20compartidos/Proyectos/Proyectos%202.0.xlsx?d=wfe883325926f4ea98fc660906c6137c3&csf=1&web=1&e=wbxezq';
const SHEET_NAME = 'Estado de proyectos';

function encodeSharingUrl(url) {
  return 'u!' + btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Resuelve la URL de SharePoint a driveId + itemId (se cachea por sesión)
let _driveItem = null;
async function resolveDriveItem() {
  if (_driveItem) return _driveItem;
  const shareId = encodeSharingUrl(SHAREPOINT_URL);
  const item = await graphGet(`/shares/${shareId}/driveItem`);
  _driveItem = { driveId: item.parentReference.driveId, itemId: item.id };
  return _driveItem;
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
        replans:     [],
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

export async function fetchProjects() {
  const range = await getSheetData();
  const { projects, budgetColIdx } = mapRowsToProjects(range.values);
  return { projects, sheetNames: [SHEET_NAME], budgetColIdx };
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

export async function updateBudgetPct(rowIdx, colIdx, pct) {
  const { driveId, itemId } = await resolveDriveItem();
  const cellAddr = `${colToLetter(colIdx)}${rowIdx + 1}`;
  await graphPatch(
    `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/range(address='${cellAddr}')`,
    { values: [[pct / 100]] }
  );
}
