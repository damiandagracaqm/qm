import { useState, useMemo } from 'react';
import { AREAS, ESTADIOS } from '../../data/areas';
import { AreaBars } from '../common/AreaBars';
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
  const { cnt, tot } = useMemo(() => {
    const cnt = {};
    projects.forEach(p => { cnt[p.estadio] = (cnt[p.estadio] || 0) + 1; });
    const tot = Object.values(cnt).reduce((a, b) => a + b, 0) || 1;
    return { cnt, tot };
  }, [projects]);

  return (
    <div>
      {ESTADIOS.map((e, i) => {
        const n = cnt[e] || 0;
        const pct = Math.round(n / tot * 100);
        const area = AREAS[i % AREAS.length];
        return (
          <div className="area-row" key={e} style={{ '--bar-color': area.c, gridTemplateColumns: '140px 1fr 60px' }}>
            <span className="a-l"><i className="a-swatch" style={{ background: area.c }} />{e}</span>
            <div className="a-track"><div className="a-real" style={{ width: `${pct}%` }} /></div>
            <span className="a-v"><b>{n}</b><span className="a-pct">{pct}%</span></span>
          </div>
        );
      })}
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
  return (
    <div className="card">
      <div className="card-h">
        <span className="card-t">Proyectos entregados por mes</span>
        <span className="card-sub">Cotizado vs Reales · HH · col Z y AF</span>
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
                <th style={{ minWidth: 180 }}>Presupuesto consumido</th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ mes, label, count, cotizado, reales }) => {
                const over     = cotizado > 0 && reales > cotizado;
                const pctNum   = cotizado > 0 ? Math.round(reales / cotizado * 100) : null;
                const barWidth = pctNum != null ? Math.min(pctNum, 100) : 0;
                const barColor = pctNum == null ? 'var(--ink-3)' : over ? 'var(--bad)' : 'var(--ok)';

                return (
                  <tr key={mes}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</td>
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
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                          color: barColor, minWidth: 38, textAlign: 'right',
                        }}>
                          {pctNum != null ? `${pctNum}%` : '—'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
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

      {/* ── KPI cards ─────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-cell">
          <span className="kpi-label">Activos</span>
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
      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <span className="card-t">HH planificadas vs consumidas</span>
            <span className="card-sub">Por área · activos</span>
          </div>
          <div className="card-b"><AreaBars projects={activos} /></div>
        </div>
        <div className="card">
          <div className="card-h">
            <span className="card-t">Distribución por estadío</span>
            <span className="card-sub">{activos.length} activos</span>
          </div>
          <div className="card-b"><KpiEstadios projects={activos} /></div>
        </div>
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
