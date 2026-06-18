import { useMemo, useState, useRef } from 'react';

const ESTADOS_TERMINALES = new Set(['Cancelado', 'Entregado', 'Entregado a NQN', 'Entregado parcialmente', 'Stand by', 'Sin empezar']);
const ESTADOS_ENTREGADO  = new Set(['Entregado', 'Entregado a NQN', 'Entregado parcialmente']);

const LDP_COLORS = ['#10069F','#ef5c43','#009bd9','#00A440','#ff801d','#aaa696','#ffb72c','#7c3aed'];

function pctColor(pct) {
  if (pct > 1)    return 'var(--bad)';
  if (pct > 0.8)  return 'var(--warn)';
  return '#10069F';
}
function pctBg(pct) {
  if (pct > 1)   return 'var(--bad-soft)';
  if (pct > 0.8) return 'var(--warn-soft)';
  return 'var(--accent-soft)';
}

// ── Gráfico SVG de líneas ────────────────────────────────────
function CapacidadChart({ ldps, weeks }) {
  const SVG_W = 560, SVG_H = 170;
  const pad = { left: 36, right: 16, top: 14, bottom: 28 };
  const cW  = SVG_W - pad.left - pad.right;
  const cH  = SVG_H - pad.top  - pad.bottom;
  const MAX_PCT = 1.5;

  const TODAY = new Date().toISOString().split('T')[0];
  const visibleWeeks = weeks.filter(w => w.dateStr >= TODAY).slice(0, 14);
  if (!visibleWeeks.length) return null;

  const n = visibleWeeks.length;
  function xPos(i)   { return pad.left + (i / Math.max(n - 1, 1)) * cW; }
  function yPos(pct) { return pad.top  + cH - Math.min(pct, MAX_PCT) / MAX_PCT * cH; }

  const activeLdps = ldps.filter(ldp =>
    visibleWeeks.some(w => (w.ldpLoads[ldp.nombre]?.load ?? 0) > 0)
  );

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>

      {/* Grid lines Y */}
      {[0, 0.5, 1, 1.5].map(v => (
        <g key={v}>
          <line
            x1={pad.left} x2={pad.left + cW}
            y1={yPos(v)} y2={yPos(v)}
            stroke={v === 1 ? 'var(--bad)' : 'var(--line)'}
            strokeWidth={v === 1 ? 1.5 : 1}
            strokeDasharray={v === 1 ? '4 3' : ''}
          />
          <text x={pad.left - 6} y={yPos(v) + 4} textAnchor="end"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: v === 1 ? 'var(--bad)' : 'var(--ink-3)' }}>
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}

      {/* X axis labels (every 2 weeks) */}
      {visibleWeeks.map((w, i) => i % 2 === 0 && (
        <text key={w.dateStr} x={xPos(i)} y={SVG_H - 4} textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fill: 'var(--ink-3)' }}>
          {w.label}
        </text>
      ))}

      {/* Lines per LDP */}
      {activeLdps.map((ldp, li) => {
        const color = LDP_COLORS[li % LDP_COLORS.length];
        const pts = visibleWeeks
          .map((w, i) => `${xPos(i)},${yPos(w.ldpLoads[ldp.nombre]?.pct ?? 0)}`)
          .join(' ');
        return (
          <g key={ldp.nombre}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {visibleWeeks.map((w, i) => {
              const pct = w.ldpLoads[ldp.nombre]?.pct ?? 0;
              if (pct === 0) return null;
              return (
                <circle key={i} cx={xPos(i)} cy={yPos(pct)} r={3}
                  fill={color} stroke="var(--surface)" strokeWidth="1.5" />
              );
            })}
          </g>
        );
      })}

    </svg>
  );
}

function capFirst(s) {
  if (!s || typeof s !== 'string') return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isPctLike(val) {
  return typeof val === 'number' && !Number.isInteger(val) && val > -2 && val < 10;
}

function isPctHeader(header) {
  const h = kpiKey(header);
  return h.includes('kpi1') || h.includes('kpi3') || h.includes('presupuesto') || h.includes('%');
}

function fmtDashVal(val, header, isFirst) {
  if (val === null || val === undefined || val === '') return '—';
  if (isFirst && typeof val === 'string') return capFirst(val);
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString('es-AR');
    if (isPctLike(val) && isPctHeader(header)) return `${(val * 100).toFixed(1)}%`;
    return val.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }
  return String(val);
}

function kpiKey(header) {
  return String(header).toLowerCase().replace(/[\s_\-]/g, '');
}

function ColTip({ tip }) {
  const ref = useRef();
  const [pos, setPos] = useState(null);
  return (
    <span
      ref={ref}
      className="col-tip"
      onMouseEnter={() => {
        const r = ref.current.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      i
      {pos && (
        <div style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translateX(-50%) translateY(-100%)',
          background: 'var(--ink)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 400,
          fontFamily: 'var(--font-sans)',
          whiteSpace: 'pre-line',
          lineHeight: 1.5,
          padding: '7px 10px',
          borderRadius: 6,
          maxWidth: 240,
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {tip}
        </div>
      )}
    </span>
  );
}

const KPI_TOOLTIPS = {
  kpi1: 'Hs consumidas ÷ Hs cotizadas\nVerde si < 90% (ahorro ≥ 10%)\nRojo si ≥ 90%',
  kpi2: 'Días de desvío al momento de entrega\n+ positivo → se retrasó (rojo)\n− negativo → se adelantó (verde)\n0 → entregado en fecha (verde)',
  kpi3: 'Presupuesto ejecutado ÷ Presupuesto aprobado\nVerde si ≤ 100%\nRojo si supera 100%',
};

function colTooltip(header) {
  const h = kpiKey(header);
  for (const [key, tip] of Object.entries(KPI_TOOLTIPS)) {
    if (h.includes(key)) return tip;
  }
  return null;
}

function cellColor(val, header) {
  if (val === null || val === undefined || typeof val !== 'number') return null;
  const h = kpiKey(header);

  // KPI2: días de desvío — positivo = atraso (rojo), negativo/cero = adelanto o en fecha (verde)
  if (h.includes('kpi2')) {
    if (val > 0) return { color: 'var(--bad)', bg: 'var(--bad-soft)' };
    return { color: 'var(--ok)', bg: 'var(--ok-soft)' };
  }

  // El resto solo aplica a valores tipo porcentaje (0.xx)
  if (!isPctLike(val)) return null;

  // KPI1: Hs Cons/Cot — verde si < 90% (ahorro ≥ 10%)
  if (h.includes('kpi1')) {
    if (val < 0.90) return { color: 'var(--ok)',  bg: 'var(--ok-soft)' };
    return { color: 'var(--bad)', bg: 'var(--bad-soft)' };
  }

  // KPI3: presupuesto consumido — rojo solo si supera 100%
  if (h.includes('kpi3')) {
    if (val > 1.0) return { color: 'var(--bad)', bg: 'var(--bad-soft)' };
    return { color: 'var(--ok)', bg: 'var(--ok-soft)' };
  }

  // genérico: mayor es mejor
  if (val >= 0.8) return { color: 'var(--ok)',   bg: 'var(--ok-soft)' };
  if (val >= 0.6) return { color: 'var(--warn)',  bg: 'var(--warn-soft)' };
  return { color: 'var(--bad)', bg: 'var(--bad-soft)' };
}

function DashTable({ title, table }) {
  if (!table?.data?.length) return null;
  const firstCol = table.headers[0];
  const dataRows = table.data.filter(row => !String(row[firstCol] ?? '').toLowerCase().includes('total'));
  const totalRow = table.data.find(row => String(row[firstCol] ?? '').toLowerCase().includes('total'));
  return (
    <div className="card">
      <div className="card-h">
        <span className="card-t">{title}</span>
        <span className="card-sub">{dataRows.length} meses · fuente: Dashboard Excel</span>
      </div>
      <div className="card-b" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {table.headers.map(h => {
                const tip = colTooltip(h);
                return (
                  <th key={h} style={{
                    padding: '8px 16px', textAlign: h === firstCol ? 'left' : 'center',
                    fontSize: 11, fontWeight: 600, color: 'var(--ink-2)',
                    borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap',
                  }}>
                    {h}
                    {tip && <ColTip tip={tip} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < dataRows.length - 1 ? '1px solid var(--line)' : 'none' }}>
                {table.headers.map((h, j) => {
                  const val = row[h];
                  const clr = j > 0 ? cellColor(val, h) : null;
                  return (
                    <td key={h} style={{
                      padding: '9px 16px',
                      textAlign: j === 0 ? 'left' : 'center',
                      fontFamily: j === 0 ? 'inherit' : 'var(--font-mono)',
                      fontSize: j === 0 ? 13 : 12,
                    }}>
                      {clr ? (
                        <span style={{
                          color: clr.color, background: clr.bg,
                          padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        }}>
                          {fmtDashVal(val, h, j === 0)}
                        </span>
                      ) : fmtDashVal(val, h, j === 0)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {totalRow && (
              <tr style={{ background: 'oklch(0.96 0.003 250)', fontWeight: 600, borderTop: '2px solid var(--line)' }}>
                {table.headers.map((h, j) => (
                  <td key={h} style={{
                    padding: '9px 16px',
                    textAlign: j === 0 ? 'left' : 'center',
                    fontFamily: j === 0 ? 'inherit' : 'var(--font-mono)',
                    fontSize: j === 0 ? 13 : 12,
                  }}>
                    {fmtDashVal(totalRow[h], h, j === 0)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KpiPage({ projects, capacidadData, dashboardData }) {
  const activos    = useMemo(() => projects.filter(p => !ESTADOS_TERMINALES.has(p.estado)), [projects]);
  const entregados = useMemo(() => projects.filter(p => ESTADOS_ENTREGADO.has(p.estado)),   [projects]);

  const currentYear = String(new Date().getFullYear());
  const [entYear, setEntYear] = useState(currentYear);

  const yearsDisponibles = useMemo(() => {
    const s = new Set(entregados.map(p => (p.finReal || p.finEst || '').split('-')[0]).filter(y => /^\d{4}$/.test(y)));
    return Array.from(s).sort().reverse();
  }, [entregados]);

  const entregadosAnio = useMemo(() =>
    entYear === 'Histórico'
      ? entregados
      : entregados.filter(p => (p.finReal || p.finEst || '').startsWith(entYear)),
    [entregados, entYear]
  );

  const fracEq = useMemo(() => {
    const hasFeq = entregadosAnio.some(p => p.feq != null);
    if (hasFeq) return entregadosAnio.reduce((a, p) => a + (p.feq ?? 0), 0);
    const totalHH = entregadosAnio.reduce((a, p) => a + (p.hhPlanTotal || 0), 0);
    return totalHH / 2700;
  }, [entregadosAnio]);

  const TODAY     = new Date().toISOString().split('T')[0];
  const enTiempo  = activos.filter(p => p.finEst && p.finEst !== '—' && p.finEst >= TODAY).length;
  const conDesvio = activos.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const criticos  = activos.filter(p => p.desvio > 30).length;

  const totalHHPlan = useMemo(() =>
    activos.reduce((a, p) => a + Object.values(p.hhPlan || {}).reduce((x, y) => x + y, 0), 0), [activos]);
  const totalHHReal = useMemo(() =>
    activos.reduce((a, p) => a + Object.values(p.hhReal || {}).reduce((x, y) => x + y, 0), 0), [activos]);

  // LDP stats: usar datos reales si están disponibles, sino calcular desde proyectos
  const ldpStats = useMemo(() => {
    if (capacidadData?.ldps?.length) return capacidadData.ldps;
    const map = {};
    activos.forEach(p => {
      const ldp = p.ldp || 'Sin asignar';
      if (!map[ldp]) map[ldp] = { nombre: ldp, capacidadMax: null, cargaActual: 0, pctCapacidad: 0 };
      map[ldp].cargaActual++;
    });
    return Object.values(map).sort((a, b) => b.cargaActual - a.cargaActual);
  }, [capacidadData, activos]);

  const maxCarga = Math.max(...ldpStats.map(s => s.cargaActual), 1);

  return (
    <div className="page-body">

      {/* ── KPI cards ─────────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-cell">
          <span className="kpi-label">Activos</span>
          <span className="kpi-value">{activos.length}</span>
          <span className="kpi-trend">En planta</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">En tiempo</span>
          <span className="kpi-value ok">{enTiempo}</span>
          <span className="kpi-trend">{activos.length > 0 ? Math.round(enTiempo / activos.length * 100) : 0}% del activo</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Con desvío</span>
          <span className="kpi-value warn">{conDesvio}</span>
          <span className="kpi-trend">≤ 30 días</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Críticos</span>
          <span className="kpi-value bad">{criticos}</span>
          <span className="kpi-trend">&gt; 30 días</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Entregados</span>
          <span className="kpi-value">{entregadosAnio.length}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <select
              value={entYear}
              onChange={e => setEntYear(e.target.value)}
              style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 0, appearance: 'auto',
              }}
            >
              {yearsDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
              <option value="Histórico">Histórico</option>
            </select>
          </div>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Frac. Equiv.</span>
          <span className="kpi-value" style={{ fontSize: 28 }}>{fracEq.toFixed(1)}</span>
          <span className="kpi-trend">{entYear} · 2700 HH = 1 FE</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
          Proyectos activos — {activos.length} en planta
        </span>
        <div style={{ display: 'flex', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '14px 32px', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 4 }}>HH planificadas</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{totalHHPlan.toLocaleString()}</div>
          </div>
          <div style={{ padding: '14px 32px', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 4 }}>HH consumidas</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{Math.round(totalHHReal).toLocaleString()}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>{totalHHPlan > 0 ? Math.round(totalHHReal / totalHHPlan * 100) : 0}% del plan</div>
          </div>
        </div>
      </div>

      <div className="grid-2">

        {/* ── Tabla capacidad LDP ──────────────────────── */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Capacidad por LDP</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>% capacidad</span>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
            {ldpStats.map((s, i) => {
              const pct     = s.pctCapacidad ?? (s.capacidadMax ? s.cargaActual / s.capacidadMax : null);
              const barPct  = s.capacidadMax
                ? Math.min(s.cargaActual / s.capacidadMax, 1.5) / 1.5
                : s.cargaActual / maxCarga;
              const color   = pct != null ? pctColor(pct) : '#10069F';

              return (
                <div key={s.nombre} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  alignItems: 'center', gap: 12, padding: '10px 18px',
                  borderBottom: i < ldpStats.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: LDP_COLORS[i % LDP_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{s.nombre}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, width: `${Math.round(barPct * 100)}%`,
                        background: color, transition: 'width 0.4s',
                      }} />
                    </div>
                  </div>

                  {s.capacidadMax && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1 }}>
                        {s.cargaActual.toFixed(1)} / {s.capacidadMax}
                      </div>
                    </div>
                  )}

                  {pct != null ? (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600,
                      color, background: pctBg(pct),
                      padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                    }}>
                      {Math.round(pct * 100)}%
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                      {s.cargaActual}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Gráfico proyección semanal ────────────────── */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Proyección de carga semanal</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>% capacidad por LDP · línea roja = 100%</span>
          </div>
          <div className="card-b">
            {capacidadData?.weeks?.length ? (
              <>
                <CapacidadChart ldps={capacidadData.ldps} weeks={capacidadData.weeks} />
                {/* Leyenda */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12 }}>
                  {capacidadData.ldps
                    .filter(ldp => capacidadData.weeks.some(w => (w.ldpLoads[ldp.nombre]?.load ?? 0) > 0))
                    .map((ldp, i) => (
                      <div key={ldp.nombre} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 20, height: 3, borderRadius: 2, background: LDP_COLORS[i % LDP_COLORS.length] }} />
                        <span style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>{ldp.nombre}</span>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--ink-3)', fontSize: 12, paddingTop: 8 }}>
                {capacidadData ? 'Sin datos de proyección.' : 'Disponible al iniciar sesión con Microsoft.'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Tablas del Dashboard Excel ─────────────────── */}
      {dashboardData?.equiposEntregados && (
        <DashTable
          title="Equipos entregados"
          table={dashboardData.equiposEntregados}
        />
      )}

    </div>
  );
}
