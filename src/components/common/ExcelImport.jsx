import { useRef } from 'react';
import * as XLSX from 'xlsx';

function parsePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace('%', ''));
    return isNaN(n) ? null : Math.round(n);
  }
  if (typeof value === 'number') return Math.round(value * 100);
  return null;
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

function mapRowsToProjects(rows) {
  if (!rows || rows.length < 2) return { projects: [], budgetColIdx: -1 };
  const headers = rows[0].map(h => String(h ?? '').toLowerCase().trim());

  console.log('Columnas encontradas:', rows[0]);

  const col = (...names) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxId      = col('numero', 'n°', 'nro', 'id', 'serie', 'qm-', 'proyecto');
  const idxDesc    = col('proyecto', 'descripcion', 'descripción', 'desc', 'equipo', 'nombre');
  const idxCliente = col('cliente');
  const idxLdp     = col('ldp', 'lider', 'líder', 'responsable');
  const idxEstado  = col('estado');
  const idxEstadio = col('estadio', 'etapa', 'fase');
  const idxProx    = col('próximo', 'proximo', 'next', 'prox');
  const idxInicio  = col('inicio', 'start', 'fecha inicio');
  const idxFinPlan = col('fin plan', 'finplan', 'fin planif', 'fecha fin plan', 'fecha plan');
  const idxFinEst  = col('fin est', 'finest', 'entrega est', 'fecha entrega', 'estimada');
  const idxDesvio    = col('desvio', 'desvío', 'dias', 'días', 'delay');
  const idxCotTotal  = col('cotizado total');
  const idxRealTotal = col('reales total');
  const idxKpi1      = col('kpi 1');
  const idxKpi2      = col('kpi 2');
  const idxBudgetPct = col('presupuesto consumido', 'kpi 3');
  const idxFinReal   = col('entrega final');

  const projects = rows.slice(1)
    .map((row, i) => {
      const meaningful = row.filter(cell => cell !== null && cell !== undefined && cell !== '' && cell !== 0 && cell !== '0');
      if (meaningful.length === 0) return null;
      const id = idxId !== -1 ? String(row[idxId] ?? '').trim() : `PROJ-${i + 1}`;
      if (!id || id === '0') return null;
      return {
        id,
        desc:    idxDesc !== -1    ? String(row[idxDesc] ?? '').trim()    : '',
        cliente: idxCliente !== -1 ? String(row[idxCliente] ?? '').trim() : '',
        ldp:     idxLdp !== -1     ? String(row[idxLdp] ?? '').trim()     : '',
        estado:  idxEstado !== -1  ? String(row[idxEstado] ?? 'En proceso').trim() : 'En proceso',
        estadio: idxEstadio !== -1 ? String(row[idxEstadio] ?? '').trim() : '',
        prox:    idxProx !== -1    ? String(row[idxProx] ?? '—').trim()   : '—',
        inicio:  parseExcelDate(idxInicio !== -1 ? row[idxInicio] : null),
        finPlan: parseExcelDate(idxFinPlan !== -1 ? row[idxFinPlan] : null),
        finEst:  parseExcelDate(idxFinEst !== -1 ? row[idxFinEst] : null),
        desvio:      idxDesvio !== -1    ? (Number(row[idxDesvio]) || 0) : 0,
        hhPlanTotal: idxCotTotal !== -1  ? (Number(row[idxCotTotal]) || 0) : 0,
        hhRealTotal: idxRealTotal !== -1 ? (Number(row[idxRealTotal]) || 0) : 0,
        kpi1Pct:     idxKpi1 !== -1      ? parsePercent(row[idxKpi1])      : null,
        kpi2Pct:     idxKpi2 !== -1      ? parsePercent(row[idxKpi2])      : null,
        budgetPct:   idxBudgetPct !== -1 ? parsePercent(row[idxBudgetPct]) : null,
        finReal:     parseExcelDate(idxFinReal !== -1 ? row[idxFinReal] : null),
        _rowIdx: i + 1,  // posición 0-based en rows[] (0 = header), usada para write-back
        hhPlan:  { ing: 0, cyp: 0, metneg: 0, metinox: 0, gyp: 0, mongral: 0, monelec: 0, testeo: 0 },
        hhReal:  { ing: 0, cyp: 0, metneg: 0, metinox: 0, gyp: 0, mongral: 0, monelec: 0, testeo: 0 },
        budget:  { total: 0, consumido: 0, materiales: 0, manoObra: 0 },
        gantt:   [],
        replans: [],
      };
    })
    .filter(Boolean);

  return { projects, budgetColIdx: idxBudgetPct };
}

export function updateWorkbookBudgetPct(workbook, sheetName, rowIdx, colIdx, pct) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;
  const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
  sheet[cellAddr] = { v: pct / 100, t: 'n', z: '0%' };
}

export function downloadWorkbook(workbook, filename = 'Proyectos_actualizado.xlsx') {
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExcelImport({ onImport }) {
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        console.log('Hojas:', workbook.SheetNames);

        const mainSheetName = workbook.SheetNames.find(n =>
          n.toLowerCase().includes('proyect') ||
          n.toLowerCase().includes('lista') ||
          n.toLowerCase().includes('resumen')
        ) ?? workbook.SheetNames[0];

        console.log('Leyendo hoja:', mainSheetName);
        const sheet = workbook.Sheets[mainSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        const { projects, budgetColIdx } = mapRowsToProjects(rows);
        console.log(`Proyectos parseados: ${projects.length}`, projects);
        onImport(projects, workbook.SheetNames, { workbook, sheetName: mainSheetName, budgetColIdx });
      } catch (err) {
        console.error('Error leyendo Excel:', err);
        alert('Error leyendo el archivo: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.xlsx') || file?.name.endsWith('.xls')) {
      handleFile(file);
    } else {
      alert('Seleccioná un archivo .xlsx');
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      style={{
        border: '2px dashed var(--line-2)',
        borderRadius: 10,
        padding: '32px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        color: 'var(--ink-3)',
        fontSize: '0.875rem',
        transition: 'border-color .2s',
        background: 'var(--surface)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line-2)'}
    >
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📂</div>
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>Arrastrá el Excel aquí</div>
      <div>o hacé click para seleccionar el archivo</div>
      <div style={{ marginTop: 8, fontSize: '0.75rem', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>Proyectos 2.0.xlsx</div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  );
}
