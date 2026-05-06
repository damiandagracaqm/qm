import { useState, useMemo } from 'react';
import { AREAS } from '../../data/areas';
import { MultiSelect } from '../common/MultiSelect';

const MES_LABELS = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };

function monthKey(dateStr) {
  if (!dateStr || dateStr === '—') return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}
function monthLabel(key) {
  if (!key) return null;
  const [y, mo] = key.split('-');
  return `${MES_LABELS[mo]} ${y}`;
}

const ESTADOS_EXCLUIDOS = new Set(['Cancelado', 'Entregado', 'Entregado a NQN', 'Stand by', 'Sin empezar']);
const ESTADOS_ENTREGADO  = ['Entregado', 'Entregado a NQN'];

const ESTADOS_ACTIVOS_ORDEN = [
  'Ingeniería', 'Corte y Plegado', 'Metalurgia', 'Metalurgia Tigre',
  'Inoxidable', 'Pintura', 'Montaje', 'Testeo',
  'Próximo a terminar', 'Próximo a entregar', 'Tercerizado',
];

function ChevIcon({ down }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={down ? 'm6 9 6 6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

function ActivosList({ projects, onOpenDetail }) {
  const sorted = useMemo(() => [...projects].sort((a, b) => {
    if (a.finEst === '—' || !a.finEst) return 1;
    if (b.finEst === '—' || !b.finEst) return -1;
    return a.finEst.localeCompare(b.finEst);
  }), [projects]);

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-h">
        <span className="card-t">Proyectos activos</span>
        <span className="card-sub">{projects.length} en planta · ordenados por fecha estimada</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="rep-table">
          <thead>
            <tr>
              <th>N° de Serie</th>
              <th>Proyecto</th>
              <th>Estado</th>
              <th>LDP</th>
              <th>Entrega estimada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => (
              <tr
                key={p.id}
                onClick={() => onOpenDetail?.(p.id)}
                style={{ cursor: 'pointer' }}
              >
                <td className="mono" style={{ fontWeight: 600 }}>{p.id}</td>
                <td>{p.desc}</td>
                <td><span className="chip mono">{p.estado}</span></td>
                <td>{p.ldp}</td>
                <td className="mono">{p.finEst !== '—' ? p.finEst : '—'}</td>
                <td style={{ color: 'var(--ink-3)', textAlign: 'right' }}>
                  <ChevIcon />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Sparkline({ values, color = 'currentColor', w = 60, h = 20 }) {
  const max = Math.max(...values), min = Math.min(...values);
  const r = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / r) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="kpi-spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KpiEstadios({ projects }) {
  const { cnt, tot, toShow } = useMemo(() => {
    const cnt = {};
    projects.forEach(p => { if (p.estado) cnt[p.estado] = (cnt[p.estado] || 0) + 1; });
    const tot = Object.values(cnt).reduce((a, b) => a + b, 0) || 1;
    const listed  = ESTADOS_ACTIVOS_ORDEN.filter(e => cnt[e]);
    const others  = Object.keys(cnt).filter(e => !ESTADOS_ACTIVOS_ORDEN.includes(e));
    return { cnt, tot, toShow: [...listed, ...others] };
  }, [projects]);

  if (toShow.length === 0) return (
    <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>Sin proyectos activos.</div>
  );

  return (
    <div>
      {toShow.map((e, i) => {
        const n   = cnt[e] || 0;
        const pct = Math.round(n / tot * 100);
        const area = AREAS[i % AREAS.length];
        return (
          <div className="area-row" key={e} style={{ '--bar-color': area.c, gridTemplateColumns: '160px 1fr 60px' }}>
            <span className="a-l"><i className="a-swatch" style={{ background: area.c }} />{e}</span>
            <div className="a-track"><div className="a-real" style={{ width: `${pct}%` }} /></div>
            <span className="a-v"><b>{n}</b><span className="a-pct">{pct}%</span></span>
          </div>
        );
      })}
    </div>
  );
}

function avgKpi(projects, field) {
  const vals = projects.map(p => p[field]).filter(v => v != null && v !== 0);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function KpiMensual({ entregados }) {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const mesesDisponibles = useMemo(() => {
    const keys = new Set();
    entregados.forEach(p => { const k = monthKey(p.finReal); if (k) keys.add(k); });
    if (!keys.has(currentKey)) keys.add(currentKey);
    return [...keys].sort().reverse();
  }, [entregados, currentKey]);

  const [mesSel, setMesSel] = useState(currentKey);

  const proyMes = useMemo(
    () => entregados.filter(p => monthKey(p.finReal) === mesSel),
    [entregados, mesSel]
  );

  const kpi1 = avgKpi(proyMes, 'kpi1Pct');
  const kpi2 = avgKpi(proyMes, 'kpi2Pct');
  const kpi3 = avgKpi(proyMes, 'budgetPct');

  const kpiColor = (val, invertido = false) => {
    if (val == null) return 'var(--ink-3)';
    if (invertido) return val > 0 ? 'var(--bad)' : 'var(--ok)';
    return val > 100 ? 'var(--bad)' : val > 85 ? 'var(--warn)' : 'var(--ok)';
  };

  return (
    <div className="card">
      <div className="card-h">
        <span className="card-t">KPIs de entrega</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          {proyMes.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
              {proyMes.length} equipo{proyMes.length !== 1 ? 's' : ''}
            </span>
          )}
          <select
            className="select-field"
            value={mesSel}
            onChange={e => setMesSel(e.target.value)}
            style={{ fontSize: 11, padding: '3px 8px' }}
          >
            {mesesDisponibles.map(k => (
              <option key={k} value={k}>{monthLabel(k)}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--line)' }}>
        {[
          { label: 'KPI 1 · HH Real vs Planif.', val: kpi1, sub: 'HH consumidas / cotizadas', inv: false },
          { label: 'KPI 2 · Desvío de entrega',  val: kpi2, sub: 'Retraso vs programación',   inv: true  },
          { label: 'KPI 3 · Presupuesto',         val: kpi3, sub: 'Presupuesto consumido',      inv: false },
        ].map(({ label, val, sub, inv }, i) => (
          <div
            key={i}
            style={{
              padding: '20px 24px', textAlign: 'center',
              borderRight: i < 2 ? '1px solid var(--line)' : 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              {label}
            </div>
            <div style={{ fontSize: 38, fontWeight: 700, fontFamily: 'var(--font-mono)', color: kpiColor(val, inv), lineHeight: 1 }}>
              {val != null ? `${val}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>{sub}</div>
            {proyMes.length === 0 && (
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>sin entregas este mes</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCauses({ projects }) {
  const sorted = useMemo(() => {
    const cnt = {};
    projects.forEach(p => (p.replans || []).forEach(r => { cnt[r.causa] = (cnt[r.causa] || 0) + 1; }));
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [projects]);
  const cMax = sorted[0]?.[1] || 1;

  return (
    <div>
      {sorted.map(([c, n]) => (
        <div className="cause-row" key={c}>
          <span className="lbl">{c}</span>
          <div className="bar"><i style={{ width: `${(n / cMax) * 100}%` }} /></div>
          <span className="n">{n}</span>
        </div>
      ))}
      {sorted.length === 0 && (
        <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>Sin replanificaciones.</div>
      )}
    </div>
  );
}

function EntregadosPorMes({ data }) {
  const currentYear = String(new Date().getFullYear());
  const [toggled, setToggled] = useState(new Set());

  const byYear = useMemo(() => {
    const map = {};
    data.forEach(d => {
      const y = d.mes.slice(0, 4);
      if (!map[y]) map[y] = [];
      map[y].push(d);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [data]);

  function isExpanded(year) {
    const t = toggled.has(year);
    return year === currentYear ? !t : t;
  }
  function toggle(year) {
    setToggled(prev => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  }

  return (
    <div className="card">
      <div className="card-h">
        <span className="card-t">Proyectos entregados por mes</span>
        <span className="card-sub">Cotizado vs Reales · HH</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        {data.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>Sin entregados en el período.</div>
        ) : (
          <table className="rep-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th style={{ textAlign: 'center' }}>Equipos</th>
                <th>Cotizado HH</th>
                <th>Reales HH</th>
                <th style={{ minWidth: 180 }}>Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {byYear.flatMap(([year, months]) => {
                const expanded  = isExpanded(year);
                const totCot    = months.reduce((s, m) => s + m.cotizado, 0);
                const totReal   = months.reduce((s, m) => s + m.reales, 0);
                const totCount  = months.reduce((s, m) => s + m.count, 0);
                const yearOver  = totReal > totCot;
                const yearRatio = totCot > 0 ? Math.round(totReal / totCot * 100) : null;
                const yearColor = yearRatio == null ? 'var(--ink-3)' : yearOver ? 'var(--bad)' : 'var(--ok)';

                const yearRow = (
                  <tr
                    key={`y-${year}`}
                    onClick={() => toggle(year)}
                    style={{ cursor: 'pointer', background: 'oklch(0.17 0.005 250)' }}
                  >
                    <td colSpan={2} style={{ fontWeight: 700, fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ChevIcon down={expanded} />
                        {year}
                        <span style={{ fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                          {totCount} equipo{totCount !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </td>
                    <td className="mono">{totCot > 0 ? totCot.toLocaleString() : '—'}</td>
                    <td className="mono" style={{ color: totCot > 0 ? yearColor : undefined }}>
                      {totReal > 0 ? totReal.toLocaleString() : '—'}
                    </td>
                    <td>
                      {yearRatio != null && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: yearColor }}>
                          {yearRatio}%
                        </span>
                      )}
                    </td>
                  </tr>
                );

                if (!expanded) return [yearRow];

                const monthRows = months.map(({ mes, label, count, cotizado, reales }) => {
                  const over     = cotizado > 0 && reales > cotizado;
                  const pctNum   = cotizado > 0 ? Math.round(reales / cotizado * 100) : null;
                  const barWidth = pctNum != null ? Math.min(pctNum, 100) : 0;
                  const barColor = pctNum == null ? 'var(--ink-3)' : over ? 'var(--bad)' : 'var(--ok)';
                  return (
                    <tr key={mes}>
                      <td style={{ paddingLeft: 28, whiteSpace: 'nowrap' }}>{label}</td>
                      <td className="mono" style={{ textAlign: 'center' }}>{count}</td>
                      <td className="mono">{cotizado > 0 ? cotizado.toLocaleString() : '—'}</td>
                      <td className="mono" style={{ color: cotizado > 0 ? barColor : undefined }}>
                        {reales > 0 ? reales.toLocaleString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="pcard-pct-bar" style={{ flex: 1, maxWidth: 110 }}>
                            <i style={{ width: `${barWidth}%`, background: barColor }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: barColor, minWidth: 38, textAlign: 'right' }}>
                            {pctNum != null ? `${pctNum}%` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                });

                return [yearRow, ...monthRows];
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function KpiPage({ projects, onOpenDetail }) {
  const [fEntregadoMes, setFEntregadoMes] = useState([]);
  const [showActivosList, setShowActivosList] = useState(false);

  const activos    = useMemo(() => projects.filter(p => !ESTADOS_EXCLUIDOS.has(p.estado)), [projects]);
  const entregados = useMemo(() => projects.filter(p => ESTADOS_ENTREGADO.includes(p.estado)), [projects]);

  const mesOptions = useMemo(() => {
    const byYear = {};
    entregados.forEach(p => {
      const k = monthKey(p.finReal);
      if (!k) return;
      const y = k.slice(0, 4);
      if (!byYear[y]) byYear[y] = new Set();
      byYear[y].add(k);
    });
    return Object.keys(byYear).sort().reverse().map(y => ({
      label: y,
      options: [...byYear[y]].sort().reverse().map(k => monthLabel(k)),
    }));
  }, [entregados]);

  const entregadosFiltrados = useMemo(() => {
    if (fEntregadoMes.length === 0) return entregados;
    return entregados.filter(p => fEntregadoMes.includes(monthLabel(monthKey(p.finReal))));
  }, [entregados, fEntregadoMes]);

  const porMes = useMemo(() => {
    const map = {};
    entregadosFiltrados.forEach(p => {
      const k = monthKey(p.finReal);
      if (!k) return;
      if (!map[k]) map[k] = { count: 0, cotizado: 0, reales: 0 };
      map[k].count++;
      map[k].cotizado += p.hhPlanTotal || 0;
      map[k].reales   += p.hhRealTotal || 0;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ mes: k, label: monthLabel(k), ...v }));
  }, [entregadosFiltrados]);

  const enTiempo  = activos.filter(p => p.desvio === 0).length;
  const conDesvio = activos.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const criticos  = activos.filter(p => p.desvio > 30).length;

  return (
    <div className="page-body">

      {/* Encabezado solo visible en impresión */}
      <div className="print-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 12, borderBottom: '2px solid var(--ink)', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)' }}>QM Equipment</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>Resumen Operativo</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>
            {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────── */}
      <div className="kpi-grid">
        <div
          className="kpi-cell"
          onClick={() => setShowActivosList(s => !s)}
          style={{ cursor: 'pointer' }}
          title="Ver listado de proyectos activos"
        >
          <span className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Activos <ChevIcon down={showActivosList} />
          </span>
          <span className="kpi-value">{activos.length}</span>
          <span className="kpi-trend">En planta</span>
          <Sparkline values={[6,7,5,6,8,7,activos.length]} color="oklch(0.55 0.13 240)" />
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">En tiempo</span>
          <span className="kpi-value ok">{enTiempo}</span>
          <span className="kpi-trend">{activos.length > 0 ? Math.round(enTiempo / activos.length * 100) : 0}% del activo</span>
          <Sparkline values={[2,3,3,4,3,3,enTiempo]} color="var(--ok)" />
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Con desvío</span>
          <span className="kpi-value warn">{conDesvio}</span>
          <span className="kpi-trend">≤ 30 días</span>
          <Sparkline values={[1,2,2,1,2,2,conDesvio]} color="var(--warn)" />
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Críticos</span>
          <span className="kpi-value bad">{criticos}</span>
          <span className="kpi-trend down">&gt; 30 días</span>
          <Sparkline values={[1,1,2,2,2,2,criticos]} color="var(--bad)" />
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Entregados</span>
          <span className="kpi-value">{entregados.length}</span>
          <span className="kpi-trend">total histórico</span>
          <Sparkline values={[0,1,1,2,2,3,entregados.length]} color="var(--ink-2)" />
        </div>
      </div>

      {/* ── Lista de activos (desplegable) ───────────── */}
      {showActivosList && (
        <ActivosList projects={activos} onOpenDetail={onOpenDetail} />
      )}

      {/* ── KPIs mensuales ────────────────────────── */}
      <KpiMensual entregados={entregados} />

      {/* ── Entregados por mes ─────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Proyectos entregados</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
            {entregados.length} total · {entregadosFiltrados.length} en vista
          </span>
        </div>
        {mesOptions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MultiSelect
              label="Todos los meses"
              optgroups={mesOptions}
              selected={fEntregadoMes}
              onChange={setFEntregadoMes}
            />
            {fEntregadoMes.length > 0 && (
              <button className="filter-btn active" onClick={() => setFEntregadoMes([])}>Limpiar</button>
            )}
          </div>
        )}
      </div>

      <EntregadosPorMes data={porMes} />

      {/* ── Activos — detalle ─────────────────────── */}
      <div className="card">
        <div className="card-h">
          <span className="card-t">Distribución por estado</span>
          <span className="card-sub">{activos.length} activos</span>
        </div>
        <div className="card-b"><KpiEstadios projects={activos} /></div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="card-t">Causas de replanificación</span>
          <span className="card-sub">Activos</span>
        </div>
        <div className="card-b"><KpiCauses projects={activos} /></div>
      </div>

    </div>
  );
}
