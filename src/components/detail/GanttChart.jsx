import { Fragment } from 'react';
import { AREAS } from '../../data/areas';

const TODAY = new Date('2026-04-22');
const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function parseDate(s) {
  if (!s || s === '—') return null;
  return new Date(s + 'T00:00');
}

export function GanttChart({ gantt }) {
  const dates = gantt.flatMap(g => [parseDate(g.start), parseDate(g.end)]).filter(Boolean);
  if (!dates.length) return null;

  const minD = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxD = new Date(Math.max(...dates.map(d => d.getTime())));
  minD.setDate(minD.getDate() - 3);
  maxD.setDate(maxD.getDate() + 3);
  const span = maxD.getTime() - minD.getTime();

  const weeks = [];
  const cursor = new Date(minD);
  cursor.setDate(cursor.getDate() - cursor.getDay() + 1);
  while (cursor <= maxD) {
    weeks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  const todayPct = ((TODAY - minD) / span) * 100;
  function pct(d) { return ((parseDate(d) - minD) / span) * 100; }

  return (
    <div className="gantt">
      <div className="gantt-grid" style={{ minWidth: Math.max(720, weeks.length * 50) }}>
        <div />
        <div className="gantt-weeks">
          {weeks.map((w, i) => {
            const isMonthStart = w.getDate() <= 7;
            return (
              <div key={i} className={`gantt-week${isMonthStart ? ' month-start' : ''}`}>
                {isMonthStart ? MES[w.getMonth()] : w.getDate()}
              </div>
            );
          })}
        </div>

        {gantt.map((g, i) => {
          const area = AREAS.find(a => a.l === g.area || a.k === g.ak) ?? AREAS[0];
          const left = pct(g.start);
          const width = pct(g.end) - left;
          return (
            <Fragment key={i}>
              <div className="gantt-label">
                <i className="a-swatch" style={{ background: area.c }} />{g.area}
              </div>
              <div className="gantt-track">
                <div
                  className="gantt-bar"
                  style={{ left: `${left}%`, width: `${width}%`, '--bar-color': area.c }}
                >
                  <div
                    className="gantt-bar-fill"
                    style={{ width: `${g.pct}%`, background: area.c }}
                  />
                </div>
                {todayPct >= 0 && todayPct <= 100 && i === 0 && (
                  <div className="gantt-today" style={{ left: `${todayPct}%` }} />
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
