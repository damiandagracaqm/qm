import { useMemo } from 'react';
import { AREAS } from '../../data/areas';
import { PROJS } from '../../data/projects';

function KpiHHBars() {
  const { hhP, hhR, max } = useMemo(() => {
    const hhP = {}, hhR = {};
    AREAS.forEach(a => { hhP[a.k] = 0; hhR[a.k] = 0; });
    PROJS.filter(p => p.estado === 'En proceso').forEach(p => {
      AREAS.forEach(a => { hhP[a.k] += (p.hhPlan[a.k] || 0); hhR[a.k] += (p.hhReal[a.k] || 0); });
    });
    const max = Math.max(...AREAS.map(a => hhP[a.k]));
    return { hhP, hhR, max };
  }, []);

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

function KpiEstadios() {
  const { cnt, tot } = useMemo(() => {
    const cnt = {};
    PROJS.filter(p => p.estado === 'En proceso' || p.estado === 'Stand by').forEach(p => {
      cnt[p.estadio] = (cnt[p.estadio] || 0) + 1;
    });
    const tot = Object.values(cnt).reduce((a, b) => a + b, 0) || 1;
    return { cnt, tot };
  }, []);

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

function KpiCauses() {
  const sorted = useMemo(() => {
    const cnt = {};
    PROJS.forEach(p => p.replans.forEach(r => { cnt[r.causa] = (cnt[r.causa] || 0) + 1; }));
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, []);
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

function KpiClients() {
  const sorted = useMemo(() => {
    const cnt = {};
    PROJS.filter(p => p.estado === 'En proceso' || p.estado === 'Stand by').forEach(p => {
      cnt[p.cliente] = (cnt[p.cliente] || 0) + 1;
    });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  }, []);
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

export function KpiPage() {
  return (
    <div className="pg on" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Actualizado: 28/04/2026</span>
        <button className="exp-btn" onClick={() => alert('En la versión real: se genera un PDF con los KPIs globales.')}>↓ Exportar reporte PDF</button>
      </div>

      <div className="krow">
        <div className="kc"><div className="kl">Proyectos activos</div><div className="kv">23</div><div className="ks">+4 vs mes anterior</div></div>
        <div className="kc"><div className="kl">En tiempo</div><div className="kv ok">14</div><div className="ks">61% del total</div></div>
        <div className="kc"><div className="kl">Con desvío</div><div className="kv warn">7</div><div className="ks">≤30 días</div></div>
        <div className="kc"><div className="kl">Críticos</div><div className="kv bad">2</div><div className="ks">&gt;30 días retraso</div></div>
        <div className="kc"><div className="kl">HH consumidas</div><div className="kv">18.420</div><div className="ks">de 22.100 planif.</div></div>
        <div className="kc"><div className="kl">Entregados YTD</div><div className="kv">181</div><div className="ks">desde enero 2026</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="ch"><span className="ct">HH planificadas vs consumidas por área</span></div>
          <div className="cp"><KpiHHBars /></div>
        </div>
        <div className="card">
          <div className="ch"><span className="ct">Proyectos activos por estadío</span></div>
          <div className="cp"><KpiEstadios /></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="ch"><span className="ct">Principales causas de replanificación</span></div>
          <div className="cp"><KpiCauses /></div>
        </div>
        <div className="card">
          <div className="ch"><span className="ct">Distribución por cliente</span></div>
          <div className="cp"><KpiClients /></div>
        </div>
      </div>
    </div>
  );
}
