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
  const [y, m] = key.split('-');
  return `${MES_LABELS[m]} ${y}`;
}

const ESTADO_GROUPS = [
  { label: 'En producción', options: ['Ingeniería', 'Corte y Plegado', 'Metalurgia', 'Metalurgia Tigre', 'Inoxidable', 'Pintura', 'Montaje'] },
  { label: 'Cierre', options: ['Próximo a terminar', 'Próximo a entregar', 'Entregado', 'Entregado a NQN'] },
  { label: 'Otros', options: ['Sin empezar', 'Stand by', 'Cancelado'] },
];

const ESTADOS_ACTIVOS = ['Ingeniería', 'Corte y Plegado', 'Metalurgia', 'Metalurgia Tigre', 'Inoxidable', 'Pintura', 'Montaje', 'Próximo a terminar', 'Próximo a entregar', 'Stand by', 'Sin empezar'];
const ESTADOS_ENTREGADO = ['Entregado', 'Entregado a NQN'];

function KpiHHBars({ projects }) {
  const { hhP, hhR, max } = useMemo(() => {
    const hhP = {}, hhR = {};
    AREAS.forEach(a => { hhP[a.k] = 0; hhR[a.k] = 0; });
    projects.filter(p => ESTADOS_ACTIVOS.includes(p.estado)).forEach(p => {
      AREAS.forEach(a => { hhP[a.k] += (p.hhPlan?.[a.k] || 0); hhR[a.k] += (p.hhReal?.[a.k] || 0); });
    });
    const max = Math.max(...AREAS.map(a => hhP[a.k]));
    return { hhP, hhR, max };
  }, [projects]);

  return (
    <div>
      <div className="leg">
        <span><span className="ld" style={{ background: '#bfdbfe' }}></span>Planificadas</span>
        <span><span className="ld" style={{ background: '#2563a8' }}></span>Consumidas</span>
      </div>
      {AREAS.map(a => {
        const pl = hhP[a.k], rl = hhR[a.k];
        const wP = max > 0 ? Math.round(pl / max * 100) : 0;
        const wR = pl > 0 ? Math.round(rl / pl * 100) : 0;
        return (
          <div className="abar" key={a.k}>
            <span className="abl">{a.l}</span>
            <div className="abtr">
              <div className="abfp" style={{ width: `${wP}%`, background: a.c }}></div>
              <div className="abfr" style={{ width: `${Math.round(wP * wR / 100)}%`, background: a.c }}></div>
            </div>
            <span className="abv">{rl.toLocaleString()}/{pl.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

const ESTADIOS_LIST = [
  'Ingeniería y diseño', 'Corte y plegado', 'Metalurgia negro', 'Metalurgia inox',
  'Granalla y pintura', 'Montaje general', 'Montaje eléctrico', 'Testeo',
];

function KpiEstadios({ projects }) {
  const { cnt, tot } = useMemo(() => {
    const cnt = {};
    projects.filter(p => ESTADOS_ACTIVOS.includes(p.estado)).forEach(p => {
      cnt[p.estadio] = (cnt[p.estadio] || 0) + 1;
    });
    const tot = Object.values(cnt).reduce((a, b) => a + b, 0) || 1;
    return { cnt, tot };
  }, [projects]);

  return (
    <div>
      {ESTADIOS_LIST.map(e => {
        const n = cnt[e] || 0;
        const pct = Math.round(n / tot * 100);
        const col = AREAS.find(a => a.l.toLowerCase().includes(e.toLowerCase().split(' ')[0])) || AREAS[0];
        return (
          <div className="abar" key={e}>
            <span className="abl">{e}</span>
            <div className="abtr">
              <div className="abfr" style={{ width: `${pct}%`, background: col.c }}></div>
            </div>
            <span className="abv">{n} proy.</span>
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
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="cause-bars">
      {sorted.map(([c, n]) => (
        <div className="cbrow" key={c}>
          <span className="cbl">{c}</span>
          <div className="cbbar"><div className="cbfill" style={{ width: `${Math.round(n / max * 100)}%` }}></div></div>
          <span className="cbn">{n}</span>
        </div>
      ))}
    </div>
  );
}

function KpiClients({ projects }) {
  const sorted = useMemo(() => {
    const cnt = {};
    projects.filter(p => ESTADOS_ACTIVOS.includes(p.estado)).forEach(p => {
      cnt[p.cliente] = (cnt[p.cliente] || 0) + 1;
    });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  }, [projects]);
  const max = sorted[0]?.[1] || 1;
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#6366f1'];

  return (
    <div className="cause-bars">
      {sorted.map(([c, n], i) => (
        <div className="cbrow" key={c}>
          <span className="cbl" style={{ fontWeight: 500 }}>{c}</span>
          <div className="cbbar" style={{ width: 150 }}>
            <div className="cbfill" style={{ width: `${Math.round(n / max * 100)}%`, background: colors[i % colors.length] }}></div>
          </div>
          <span className="cbn">{n}</span>
        </div>
      ))}
    </div>
  );
}

export function KpiPage({ projects }) {
  const [fEstado, setFEstado] = useState([]);
  const [fMes, setFMes]     = useState([]);

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

  const activos    = filtered.filter(p => ESTADOS_ACTIVOS.includes(p.estado)).length;
  const enTiempo   = filtered.filter(p => p.desvio === 0 && ESTADOS_ACTIVOS.includes(p.estado)).length;
  const conDesvio  = filtered.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const criticos   = filtered.filter(p => p.desvio > 30).length;
  const entregados = filtered.filter(p => ESTADOS_ENTREGADO.includes(p.estado)).length;

  const hayFiltros = fEstado.length > 0 || fMes.length > 0;

  return (
    <div className="pg on" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Actualizado: {new Date().toLocaleDateString('es-AR')}</span>
        <button className="exp-btn" onClick={() => alert('En la versión real: se genera un PDF con los KPIs globales.')}>↓ Exportar reporte PDF</button>
      </div>

      <div className="toolbar">
        <MultiSelect
          label="Todos los estados"
          optgroups={ESTADO_GROUPS}
          selected={fEstado}
          onChange={setFEstado}
        />
        <MultiSelect
          label="Todos los meses"
          optgroups={mesOptions}
          selected={fMes}
          onChange={setFMes}
        />
        {hayFiltros && (
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', alignSelf: 'center' }}>
            {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
        {hayFiltros && (
          <button
            className="sf"
            style={{ fontSize: 12, color: '#3b82f6', cursor: 'pointer' }}
            onClick={() => { setFEstado([]); setFMes([]); }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="krow">
        <div className="kc"><div className="kl">Proyectos activos</div><div className="kv">{activos}</div></div>
        <div className="kc"><div className="kl">En tiempo</div><div className="kv ok">{enTiempo}</div><div className="ks">{activos > 0 ? Math.round(enTiempo / activos * 100) : 0}% del total</div></div>
        <div className="kc"><div className="kl">Con desvío</div><div className="kv warn">{conDesvio}</div><div className="ks">≤30 días</div></div>
        <div className="kc"><div className="kl">Críticos</div><div className="kv bad">{criticos}</div><div className="ks">&gt;30 días retraso</div></div>
        <div className="kc"><div className="kl">Entregados YTD</div><div className="kv">{entregados}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="ch"><span className="ct">HH planificadas vs consumidas por área</span></div>
          <div className="cp"><KpiHHBars projects={filtered} /></div>
        </div>
        <div className="card">
          <div className="ch"><span className="ct">Proyectos activos por estadío</span></div>
          <div className="cp"><KpiEstadios projects={filtered} /></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="ch"><span className="ct">Principales causas de replanificación</span></div>
          <div className="cp"><KpiCauses projects={filtered} /></div>
        </div>
        <div className="card">
          <div className="ch"><span className="ct">Distribución por cliente</span></div>
          <div className="cp"><KpiClients projects={filtered} /></div>
        </div>
      </div>
    </div>
  );
}
