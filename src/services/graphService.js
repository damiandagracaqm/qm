import { msalInstance, loginRequest } from '../auth/msalConfig';

const DRIVE_ID  = 'b!XSvGwsSdhk2DyJEUWTK75LKhSd4DrAJLpytub4lCmm5TwIt2lXlxRZilY-SR1xxS';
const ITEM_ID   = '015MLLTG7GQGDUPDNEPZDKY6NNUWUMYPV3';
const SHEET_NAME = 'Estado de proyectos';

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
  return graphGet(
    `/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/usedRange`
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
  const idxDesc      = col('descripcion', 'descripción', 'desc', 'equipo', 'nombre');
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
        budgetPct:   idxBudgetPct !== -1 ? parsePercent(row[idxBudgetPct]) : null,
        _rowIdx:     i + 1,
        hhPlan:      { ing: 0, cyp: 0, metneg: 0, metinox: 0, gyp: 0, mongral: 0, monelec: 0, testeo: 0 },
        hhReal:      { ing: 0, cyp: 0, metneg: 0, metinox: 0, gyp: 0, mongral: 0, monelec: 0, testeo: 0 },
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

export async function updateBudgetPct(rowIdx, colIdx, pct) {
  // rowIdx: 0-based en rows[] (1 = primera fila de datos); colIdx: 0-based
  const cellAddr = `${colToLetter(colIdx)}${rowIdx + 1}`;
  await graphPatch(
    `/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/range(address='${cellAddr}')`,
    { values: [[pct / 100]] }
  );
}
