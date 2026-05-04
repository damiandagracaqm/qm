import { AREAS } from '../../data/areas';

const TODAY = new Date('2026-04-28');
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtWk(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function GanttChart({ gantt }) {
  const allDates = gantt.flatMap(g => [new Date(g.start), new Date(g.end)]);
  const minD = new Date(Math.min(...allDates));
  const maxD = new Date(Math.max(...allDates));
  minD.setDate(minD.getDate() - 3);
  maxD.setDate(maxD.getDate() + 3);
  const totalDays = (maxD - minD) / 86400000;

  const weeks = [];
  let d = new Date(minD);
  while (d <= maxD) { weeks.push(new Date(d)); d.setDate(d.getDate() + 7); }

  const todayPct = Math.round((TODAY - minD) / 86400000 / totalDays * 100);

  return (
    <div className="gantt-wrap">
      <div className="gantt-inner">
        <div className="gantt-header">
          <div className="gantt-label-col"></div>
          <div className="gantt-weeks">
            {weeks.map((w, i) => <div className="gantt-wk" key={i}>{fmtWk(w)}</div>)}
          </div>
        </div>

        {gantt.map((g, i) => {
          const gS = new Date(g.start), gE = new Date(g.end);
          const left = Math.round((gS - minD) / 86400000 / totalDays * 100);
          const width = Math.max(2, Math.round((gE - gS) / 86400000 / totalDays * 100));
          const col = AREAS.find(a => a.l === g.area)?.c || '#3b82f6';
          return (
            <div className="gantt-row" key={i}>
              <div className="gantt-row-label">{g.area}</div>
              <div className="gantt-track" style={{ position: 'relative' }}>
                <div className="gantt-today" style={{ left: `${todayPct}%` }}></div>
                <div className="gantt-bar" style={{ left: `${left}%`, width: `${width}%`, background: col, opacity: 0.25 }}></div>
                <div className="gantt-bar" style={{ left: `${left}%`, width: `${Math.round(width * g.pct / 100)}%`, background: col, opacity: 1 }}></div>
              </div>
            </div>
          );
        })}

        <div className="gantt-legend">
          <span><span className="ld" style={{ background: '#3b82f6', opacity: .25 }}></span>Planificado</span>
          <span><span className="ld" style={{ background: '#3b82f6' }}></span>Ejecutado</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 2, height: 10, background: '#ef4444', display: 'inline-block' }}></span>Hoy
          </span>
        </div>
      </div>
    </div>
  );
}
