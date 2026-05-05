import { useMemo } from 'react';
import { AREAS } from '../../data/areas';

export function AreaBars({ projects, hhPlan, hhReal }) {
  const { plan, real, max } = useMemo(() => {
    const plan = {}, real = {};
    AREAS.forEach(a => { plan[a.k] = 0; real[a.k] = 0; });

    if (projects) {
      projects.forEach(p => {
        AREAS.forEach(a => {
          plan[a.k] += p.hhPlan?.[a.k] || 0;
          real[a.k] += p.hhReal?.[a.k] || 0;
        });
      });
    } else {
      AREAS.forEach(a => {
        plan[a.k] = hhPlan?.[a.k] || 0;
        real[a.k] = hhReal?.[a.k] || 0;
      });
    }

    const max = Math.max(...AREAS.map(a => plan[a.k]), 1);
    return { plan, real, max };
  }, [projects, hhPlan, hhReal]);

  const totalReal = Object.values(real).reduce((a, b) => a + b, 0);
  const totalPlan = Object.values(plan).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="legend">
        <span><i style={{ background: 'var(--ink-3)', opacity: 0.3 }} />Planificadas</span>
        <span><i style={{ background: 'var(--ink)' }} />Consumidas</span>
        <span style={{ marginLeft: 'auto' }}>
          Total {totalReal.toLocaleString()} / {totalPlan.toLocaleString()} hh
        </span>
      </div>
      {AREAS.map(a => {
        const wp = max > 0 ? (plan[a.k] / max) * 100 : 0;
        const wr = plan[a.k] > 0 ? (real[a.k] / plan[a.k]) * 100 : 0;
        const consumed = Math.round((wp * wr) / 100);
        const pct = plan[a.k] > 0 ? Math.min(999, Math.round(real[a.k] / plan[a.k] * 100)) : 0;
        return (
          <div className="area-row" key={a.k} style={{ '--bar-color': a.c }}>
            <span className="a-l">
              <i className="a-swatch" style={{ background: a.c }} />
              {a.l}
            </span>
            <div className="a-track">
              <div className="a-plan" style={{ width: `${wp}%` }} />
              <div className="a-real" style={{ width: `${consumed}%` }} />
            </div>
            <span className="a-v">
              <b>{real[a.k].toLocaleString()}</b>/{plan[a.k].toLocaleString()}
              <span className="a-pct">{pct}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
