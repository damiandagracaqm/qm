import { useState, useMemo } from 'react';
import { AREAS, ESTADIOS } from '../../data/areas';
import { AreaBars } from '../common/AreaBars';
import { MultiSelect } from '../common/MultiSelect';

const ESTADO_GROUPS = [
  { label: 'En producción', options: ['Ingeniería', 'Corte y Plegado', 'Metalurgia', 'Metalurgia Tigre', 'Inoxidable', 'Pintura', 'Montaje'] },
  { label: 'Cierre', options: ['Próximo a terminar', 'Próximo a entregar', 'Entregado', 'Entregado a NQN'] },
  { label: 'Otros', options: ['Sin empezar', 'Stand by', 'Cancelado', 'En proceso'] },
];

const MES_LABELS = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };

function monthKey(dateStr) {
  if (!dateStr || dateStr === '—') return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}
function monthLabel(key) {
  if (!key) return null;
  const [y, m] = key.split('-');
  return `${MES_LABELS[m]} ${y}`;
}

const ESTADOS_ACTIVOS = [
  'En proceso', 'Ingeniería', 'Corte y Plegado', 'Metalurgia', 'Metalurgia Tigre',
  'Inoxidable', 'Pintura', 'Montaje', 'Próximo a terminar', 'Próximo a entregar', 'Stand by', 'Sin empezar',
];
const ESTADOS_ENTREGADO = ['Entregado', 'Entregado a NQN'];

function desvioKind(d) {
  if (d === 0) return 'zero';
  if (d <= 30) return 'low';
  return 'high';
}

function ChevIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6"/>
    </svg>
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
            <span className="a-l">
              <i className="a-swatch" style={{ background: area.c }} />{e}
            </span>
            <div className="a-track">
              <div className="a-real" style={{ width: `${pct}%` }} />
            </div>
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

export function KpiPage({ projects, onOpenDetail }) {
  const [fEstado, setFEstado] = useState([]);
  const [fMes, setFMes] = useState([]);

  const mesOptions = useMemo(() => {
    const byYear = {};
    projects.forEach(p => {
      const k = monthKey(p.finEst);
      if (!k) return;
      const y = k.slice(0, 4);
      if (!byYear[y]) byYear[y] = new Set();
      byYear[y].add(k);
    });
    return Object.keys(byYear).sort().map(y => ({
      label: y,
      options: [...byYear[y]].sort().map(k => monthLabel(k)),
    }));
  }, [projects]);

  const filtered = useMemo(() => projects.filter(p =>
    (fEstado.length === 0 || fEstado.includes(p.estado)) &&
    (fMes.length === 0 || fMes.includes(monthLabel(monthKey(p.finEst))))
  ), [projects, fEstado, fMes]);

  const activos    = filtered.filter(p => ESTADOS_ACTIVOS.includes(p.estado));
  const enTiempo   = activos.filter(p => p.desvio === 0).length;
  const conDesvio  = activos.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const criticos   = activos.filter(p => p.desvio > 30).length;
  const entregados = filtered.filter(p => ESTADOS_ENTREGADO.includes(p.estado)).length;
  const criticosList = activos.filter(p => p.desvio > 30).sort((a, b) => b.desvio - a.desvio);

  const hayFiltros = fEstado.length > 0 || fMes.length > 0;

  return (
    <div className="page-body">
      {hayFiltros && (
        <div className="toolbar">
          <MultiSelect label="Todos los estados" optgroups={ESTADO_GROUPS} selected={fEstado} onChange={setFEstado} />
          <MultiSelect label="Todos los meses" optgroups={mesOptions} selected={fMes} onChange={setFMes} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}
          </span>
          <button className="filter-btn active" onClick={() => { setFEstado([]); setFMes([]); }}>
            Limpiar filtros
          </button>
        </div>
      )}

      {!hayFiltros && (
        <div className="toolbar">
          <MultiSelect label="Filtrar estados" optgroups={ESTADO_GROUPS} selected={fEstado} onChange={setFEstado} />
          <MultiSelect label="Filtrar por mes" optgroups={mesOptions} selected={fMes} onChange={setFMes} />
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-cell">
          <span className="kpi-label">Activos</span>
          <span className="kpi-value">{activos.length}</span>
          <span className="kpi-trend">Total en planta</span>
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
          <span className="kpi-label">Entregados YTD</span>
          <span className="kpi-value">{entregados}</span>
          <span className="kpi-trend">objetivo Q2: 8</span>
          <Sparkline values={[0,1,1,2,2,3,entregados]} color="var(--ink)" />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <span className="card-t">HH planificadas vs consumidas</span>
            <span className="card-sub">Por área · activos</span>
          </div>
          <div className="card-b">
            <AreaBars projects={activos} />
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <span className="card-t">Distribución por estadío</span>
            <span className="card-sub">{activos.length} proyectos activos</span>
          </div>
          <div className="card-b">
            <KpiEstadios projects={activos} />
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <span className="card-t">Causas de replanificación</span>
            <span className="card-sub">YTD</span>
          </div>
          <div className="card-b">
            <KpiCauses projects={filtered} />
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <span className="card-t">Atención requerida</span>
            <span className="card-sub">{criticosList.length} proyectos críticos</span>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
            {criticosList.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>Sin proyectos críticos.</div>
            )}
            {criticosList.map(p => (
              <div
                key={p.id}
                className="proj-row"
                style={{ gridTemplateColumns: '92px 1fr 110px 90px 24px', padding: '12px 18px' }}
                onClick={() => onOpenDetail?.(p.id)}
              >
                <span className="p-id mono">{p.id}</span>
                <span className="p-desc">{p.desc}<small>{p.cliente} · {p.ldp}</small></span>
                <span className="chip mono">{p.estadio}</span>
                <span className={`p-desv ${desvioKind(p.desvio)}`}>+{p.desvio}d</span>
                <ChevIcon />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
