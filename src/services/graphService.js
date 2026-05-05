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

async function getSheetData() {
  return graphGet(
    `/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/usedRange`
  );
}

function mapRowsToProjects(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => String(h).toLowerCase().trim());

  const col = (...names) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxId      = col('numero', 'n°', 'nro', 'id', 'serie');
  const idxDesc    = col('descripcion', 'descripción', 'desc', 'equipo', 'nombre');
  const idxCliente = col('cliente');
  const idxLdp     = col('ldp', 'lider', 'líder', 'responsable');
  const idxEstado  = col('estado');
  const idxEstadio = col('estadio', 'etapa', 'fase');
  const idxProx    = col('próximo', 'proximo', 'next');
  const idxInicio  = col('inicio', 'start');
  const idxFinPlan = col('fin plan', 'finplan', 'fin planif', 'fecha fin plan');
  const idxFinEst  = col('fin est', 'finest', 'entrega est', 'fecha entrega');
  const idxDesvio  = col('desvio', 'desvío', 'dias', 'días');

  return rows.slice(1)
    .filter(row => idxId !== -1 && row[idxId])
    .map((row, i) => ({
      id:       String(row[idxId] ?? `PROJ-${i}`).trim(),
      desc:     idxDesc !== -1    ? String(row[idxDesc] ?? '').trim()    : '',
      cliente:  idxCliente !== -1 ? String(row[idxCliente] ?? '').trim() : '',
      ldp:      idxLdp !== -1    ? String(row[idxLdp] ?? '').trim()     : '',
      estado:   idxEstado !== -1  ? String(row[idxEstado] ?? 'En proceso').trim() : 'En proceso',
      estadio:  idxEstadio !== -1 ? String(row[idxEstadio] ?? '').trim() : '',
      prox:     idxProx !== -1    ? String(row[idxProx] ?? '—').trim()   : '—',
      inicio:   parseExcelDate(idxInicio !== -1 ? row[idxInicio] : null),
      finPlan:  parseExcelDate(idxFinPlan !== -1 ? row[idxFinPlan] : null),
      finEst:   parseExcelDate(idxFinEst !== -1 ? row[idxFinEst] : null),
      desvio:   idxDesvio !== -1  ? (Number(row[idxDesvio]) || 0) : 0,
      hhPlan:   { ing: 0, cyp: 0, metneg: 0, metinox: 0, gyp: 0, mongral: 0, monelec: 0, testeo: 0 },
      hhReal:   { ing: 0, cyp: 0, metneg: 0, metinox: 0, gyp: 0, mongral: 0, monelec: 0, testeo: 0 },
      budget:   { total: 0, consumido: 0, materiales: 0, manoObra: 0 },
      gantt:    [],
      replans:  [],
    }));
}

function parseExcelDate(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' && value > 1000) {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return String(value).trim() || '—';
}

export async function fetchProjects() {
  const range = await getSheetData();
  const projects = mapRowsToProjects(range.values);
  return { projects, sheetNames: [SHEET_NAME] };
}
