import { AREAS } from '../../data/areas';

export function AreaBars({ hhPlan, hhReal }) {
  const maxHH = Math.max(...AREAS.map(a => hhPlan[a.k] || 0));
  return (
    <div>
      <div className="leg">
        <span><span className="ld" style={{ background: '#bfdbfe' }}></span>Planificadas</span>
        <span><span className="ld" style={{ background: '#2563a8' }}></span>Consumidas</span>
      </div>
      {AREAS.map(a => {
        const pl = hhPlan[a.k] || 0;
        const rl = hhReal[a.k] || 0;
        const wP = maxHH > 0 ? Math.round(pl / maxHH * 100) : 0;
        const wR = pl > 0 ? Math.round(rl / pl * 100) : 0;
        return (
          <div className="abar" key={a.k}>
            <span className="abl">{a.l}</span>
            <div className="abtr">
              <div className="abfp" style={{ width: `${wP}%`, background: a.c }}></div>
              <div className="abfr" style={{ width: `${Math.round(wP * wR / 100)}%`, background: a.c }}></div>
            </div>
            <span className="abv">{rl}/{pl}</span>
          </div>
        );
      })}
    </div>
  );
}
