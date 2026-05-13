import { useMemo } from 'react';

const ESTADOS_TERMINALES = new Set(['Cancelado', 'Entregado', 'Entregado a NQN', 'Entregado parcialmente', 'Stand by', 'Sin empezar']);
const ESTADOS_ENTREGADO  = new Set(['Entregado', 'Entregado a NQN', 'Entregado parcialmente']);

function buildMonths(around = 10) {
  const now = new Date();
  const result = [];
  for (let i = -1; i < around; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    result.push({
      key: `${d.getFullYear()}-${mm}`,
      label: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
      yearLabel: String(d.getFullYear()).slice(2),
      isCurrent: i === 0,
    });
  }
  return result;
}

function isActiveInMonth(p, monthKey) {
  const inicio = p.inicio || '';
  const fin    = p.finEst || p.finPlan || '';
  if (!inicio || !fin) return false;
  const [y, m] = monthKey.split('-').map(Number);
  const first  = `${y}-${String(m).padStart(2,'0')}-01`;
  const last   = `${y}-${String(m).padStart(2,'0')}-31`;
  return inicio <= last && fin >= first;
}

function loadColor(n) {
  if (n === 0) return { bg: 'var(--surface-2)', color: 'transparent' };
  if (n === 1) return { bg: 'oklch(0.88 0.06 232)', color: 'oklch(0.25 0.15 264)' };
  if (n === 2) return { bg: 'oklch(0.70 0.13 232)', color: '#fff' };
  if (n === 3) return { bg: '#10069F', color: '#fff' };
  return { bg: 'oklch(0.18 0.2 264)', color: '#fff' };
}

function desvioColor(d) {
  if (!d || d === 0) return 'var(--ok)';
  if (d <= 30) return 'var(--warn)';
  return 'var(--bad)';
}

export function KpiPage({ projects }) {
  const activos    = useMemo(() => projects.filter(p => !ESTADOS_TERMINALES.has(p.estado)), [projects]);
  const entregados = useMemo(() => projects.filter(p => ESTADOS_ENTREGADO.has(p.estado)), [projects]);

  const TODAY     = new Date().toISOString().split('T')[0];
  const enTiempo  = activos.filter(p => p.finEst && p.finEst !== '—' && p.finEst >= TODAY).length;
  const conDesvio = activos.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const criticos  = activos.filter(p => p.desvio > 30).length;

  const totalHHPlan = useMemo(() =>
    activos.reduce((a, p) => a + Object.values(p.hhPlan || {}).reduce((x, y) => x + y, 0), 0), [activos]);
  const totalHHReal = useMemo(() =>
    activos.reduce((a, p) => a + Object.values(p.hhReal || {}).reduce((x, y) => x + y, 0), 0), [activos]);

  // ── LDP stats ───────────────────────────────────────────
  const ldpStats = useMemo(() => {
    const map = {};
    activos.forEach(p => {
      const ldp = p.ldp || 'Sin asignar';
      if (!map[ldp]) map[ldp] = { total: 0, criticos: 0, desvioSum: 0 };
      map[ldp].total++;
      if (p.desvio > 30) map[ldp].criticos++;
      map[ldp].desvioSum += p.desvio || 0;
    });
    return Object.entries(map)
      .map(([ldp, s]) => ({ ldp, ...s, desvioAvg: s.total > 0 ? Math.round(s.desvioSum / s.total) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [activos]);

  const maxProjects = Math.max(...ldpStats.map(s => s.total), 1);

  // ── Capacity heatmap ─────────────────────────────────────
  const months = useMemo(() => buildMonths(10), []);
  const ldpNames = ldpStats.map(s => s.ldp);

  const heatmap = useMemo(() =>
    ldpNames.map(ldp => ({
      ldp,
      cells: months.map(m => ({
        ...m,
        load: activos.filter(p => (p.ldp || 'Sin asignar') === ldp && isActiveInMonth(p, m.key)).length,
      })),
    })),
  [ldpNames, months, activos]);

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
          <span className="kpi-value">{entregados.length}</span>
          <span className="kpi-trend">total histórico</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">HH planificadas</span>
          <span className="kpi-value" style={{ fontSize: 28 }}>{totalHHPlan.toLocaleString()}</span>
          <span className="kpi-trend">proyectos activos</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">HH consumidas</span>
          <span className="kpi-value" style={{ fontSize: 28 }}>{totalHHReal.toLocaleString()}</span>
          <span className="kpi-trend">{totalHHPlan > 0 ? Math.round(totalHHReal / totalHHPlan * 100) : 0}% del plan</span>
        </div>
      </div>

      <div className="grid-2">

        {/* ── Tabla LDPs ──────────────────────────────── */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Carga por LDP</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>proyectos activos</span>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
            {ldpStats.length === 0 && (
              <div style={{ padding: '24px 18px', color: 'var(--ink-3)', fontSize: 12 }}>Sin datos</div>
            )}
            {ldpStats.map((s, i) => (
              <div key={s.ldp} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                alignItems: 'center', gap: 12,
                padding: '10px 18px',
                borderBottom: i < ldpStats.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 5 }}>{s.ldp}</div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.round(s.total / maxProjects * 100)}%`,
                      background: s.criticos > 0 ? 'var(--bad)' : '#10069F',
                      transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{s.total}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)', marginTop: 2 }}>proy.</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 52 }}>
                  {s.criticos > 0 ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--bad)', background: 'var(--bad-soft)', padding: '2px 7px', borderRadius: 3 }}>
                      {s.criticos} crítico{s.criticos > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: s.desvioAvg > 0 ? 'var(--warn)' : 'var(--ok)',
                      background: s.desvioAvg > 0 ? 'var(--warn-soft)' : 'var(--ok-soft)',
                      padding: '2px 7px', borderRadius: 3 }}>
                      {s.desvioAvg === 0 ? 'En tiempo' : `+${s.desvioAvg}d`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Heatmap proyección de carga ──────────────── */}
        <div className="card">
          <div className="card-h">
            <span className="card-title">Proyección de carga</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>proyectos activos / mes</span>
          </div>
          <div className="card-b" style={{ overflowX: 'auto' }}>
            {heatmap.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>Sin datos</div>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 10px 8px 0', fontWeight: 500, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 10, whiteSpace: 'nowrap' }}>LDP</th>
                    {months.map(m => (
                      <th key={m.key} style={{
                        padding: '0 2px 8px',
                        fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: m.isCurrent ? 700 : 400,
                        color: m.isCurrent ? 'var(--accent)' : 'var(--ink-3)',
                        textAlign: 'center', whiteSpace: 'nowrap',
                      }}>
                        {m.label}<br />
                        <span style={{ opacity: 0.6 }}>{m.yearLabel}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map(row => (
                    <tr key={row.ldp}>
                      <td style={{ padding: '3px 10px 3px 0', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', fontSize: 11.5 }}>
                        {row.ldp}
                      </td>
                      {row.cells.map(cell => {
                        const { bg, color } = loadColor(cell.load);
                        return (
                          <td key={cell.key} style={{ padding: '3px 2px', textAlign: 'center' }}>
                            <div style={{
                              width: 32, height: 28, borderRadius: 4,
                              background: bg, color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                              margin: '0 auto',
                              outline: cell.isCurrent ? '2px solid var(--accent)' : 'none',
                              outlineOffset: 1,
                            }}>
                              {cell.load > 0 ? cell.load : ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Leyenda */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Carga:</span>
              {[0,1,2,3,4].map(n => {
                const { bg } = loadColor(n);
                return (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: '1px solid var(--line)' }} />
                    <span style={{ fontSize: 9.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{n === 4 ? '4+' : n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
