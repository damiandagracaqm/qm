import { Fragment } from 'react';
import { AREAS } from '../../data/areas';

const TODAY = new Date();
const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Mapping flexible: nombres de taller del Excel → area key
const TALLER_MAP = [
  { keys: ['ingenieria', 'ing'], ak: 'ing' },
  { keys: ['corte', 'plegado', 'cyp'], ak: 'cyp' },
  { keys: ['metalurgia negro', 'met negro', 'met. negro', 'metalurgia neg', 'metneg', 'metalurgia tigre'], ak: 'metneg' },
  { keys: ['metalurgia inox', 'met inox', 'met. inox', 'inoxidable', 'metinox'], ak: 'metinox' },
  { keys: ['granalla', 'pintura', 'gyp'], ak: 'gyp' },
  { keys: ['montaje gral', 'montaje general', 'mongral'], ak: 'mongral' },
  { keys: ['montaje elec', 'montaje electrico', 'electrico', 'monelec'], ak: 'monelec' },
  { keys: ['testeo'], ak: 'testeo' },
];

function norm(s) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function findArea(name, idx) {
  const n = norm(name);
  if (!n) return AREAS[idx % AREAS.length];
  for (const { keys, ak } of TALLER_MAP) {
    if (keys.some(k => n === k || n.includes(k) || k.includes(n))) {
      return AREAS.find(a => a.k === ak) ?? AREAS[idx % AREAS.length];
    }
  }
  return AREAS.find(a => norm(a.l) === n || norm(a.l).includes(n) || n.includes(norm(a.l))) ?? AREAS[idx % AREAS.length];
}

function parseDate(s) {
  if (!s || s === '—') return null;
  return new Date(s + 'T00:00');
}

export function GanttChart({ gantt }) {
  const dates = (gantt ?? []).flatMap(g => [parseDate(g.start), parseDate(g.end)]).filter(Boolean);
  if (!dates.length) {
    return (
      <div style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
        Sin planificación registrada para este proyecto.
      </div>
    );
  }

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
          const area = findArea(g.area ?? g.ak, i);
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
