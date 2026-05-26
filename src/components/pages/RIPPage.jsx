import { useState, useEffect } from 'react';
import { fetchRIP, saveRIPMeeting, updateRIPEntry } from '../../services/graphService';

const LS_KEY = 'gqm_rip';

function getMondayStr(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().split('T')[0];
}

function prevMondayStr(mondayStr) {
  const d = new Date(mondayStr + 'T12:00:00');
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function fmtWeek(isoStr) {
  if (!isoStr) return '';
  const [y, m, dd] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function groupByFecha(entries) {
  const map = new Map();
  entries.forEach(e => {
    if (!map.has(e.fecha)) map.set(e.fecha, []);
    map.get(e.fecha).push(e);
  });
  return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function StatusBadge({ estado }) {
  const styles = {
    Hecho:     { color: 'var(--ok)',  bg: 'var(--ok-soft)' },
    'No hecho':{ color: 'var(--bad)', bg: 'var(--bad-soft)' },
    Pendiente: { color: 'var(--warn)', bg: 'oklch(0.95 0.03 80)' },
  };
  const s = styles[estado] ?? styles.Pendiente;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
      background: s.bg, color: s.color, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {estado}
    </span>
  );
}

function EntryRow({ entry }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '9px 12px', borderRadius: 8, background: 'oklch(0.97 0.003 250)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)', minWidth: 68, paddingTop: 2 }}>
        {entry.proyecto}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13 }}>{entry.objetivo}</div>
        {entry.comentarios && (
          <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 3 }}>{entry.comentarios}</div>
        )}
      </div>
      <StatusBadge estado={entry.estado} />
    </div>
  );
}

export function RIPPage({ projects }) {
  const today      = new Date();
  const isMonday   = today.getDay() === 1;
  const thisMonday = getMondayStr(today);
  const lastMonday = prevMondayStr(thisMonday);

  const activeProjects = projects.filter(p =>
    p.estado && p.estado !== 'Entregado' && p.estado !== 'Cancelado'
  );

  // --- datos ---
  const [entries,   setEntries]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [useLocal,  setUseLocal]  = useState(false);

  // --- form de planificación ---
  const [objectives,    setObjectives]    = useState({});
  const [extras,        setExtras]        = useState([]);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingError,  setMeetingError]  = useState(null);

  // --- form de revisión (lunes) ---
  const [reviews,      setReviews]      = useState({});
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError,  setReviewError]  = useState(null);
  const [reviewSaved,  setReviewSaved]  = useState(false);

  // --- historial ---
  const [openWeeks, setOpenWeeks] = useState(new Set());

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await fetchRIP();
      setEntries(data);
      setUseLocal(false);
    } catch {
      const raw = localStorage.getItem(LS_KEY);
      setEntries(raw ? JSON.parse(raw) : []);
      setUseLocal(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEntries(); }, []);

  // Datos derivados
  const grouped          = groupByFecha(entries);
  const thisWeekEntries  = entries.filter(e => e.fecha === thisMonday);
  const lastWeekEntries  = entries.filter(e => e.fecha === lastMonday);
  const pendingReview    = lastWeekEntries.filter(e => e.estado === 'Pendiente');
  const hasThisWeek      = thisWeekEntries.length > 0;

  // Inicializa el estado de revisión cuando cambian los pendientes
  useEffect(() => {
    const init = {};
    pendingReview.forEach(e => { init[e._rowIdx ?? e._localId] = { estado: '', comentarios: '' }; });
    setReviews(init);
  }, [entries]);

  // Guardar reunión nueva
  async function handleSaveMeeting() {
    const toSave = [];
    activeProjects.forEach(p => {
      const obj = objectives[p.id]?.trim();
      if (obj) toSave.push({ fecha: thisMonday, proyecto: p.id, objetivo: obj });
    });
    extras.forEach(ex => {
      if (ex.text?.trim()) toSave.push({ fecha: thisMonday, proyecto: 'GENERAL', objetivo: ex.text.trim() });
    });
    if (!toSave.length) return;

    setSavingMeeting(true);
    setMeetingError(null);
    try {
      if (useLocal) {
        const existing = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        const base     = existing.length;
        const newRows  = toSave.map((e, i) => ({ ...e, estado: 'Pendiente', comentarios: '', _localId: base + i }));
        const updated  = [...existing, ...newRows];
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
        setEntries(updated);
      } else {
        await saveRIPMeeting(toSave);
        await loadEntries();
      }
      setObjectives({});
      setExtras([]);
    } catch (err) {
      setMeetingError(err.message);
    } finally {
      setSavingMeeting(false);
    }
  }

  // Guardar revisión
  async function handleSaveReview() {
    setSavingReview(true);
    setReviewError(null);
    try {
      const updates = pendingReview.map(e => {
        const key = e._rowIdx ?? e._localId;
        const r   = reviews[key] ?? {};
        return { entry: e, estado: r.estado || 'No hecho', comentarios: r.comentarios || '' };
      });

      if (useLocal) {
        const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        updates.forEach(({ entry, estado, comentarios }) => {
          const idx = stored.findIndex(e => e._localId === entry._localId);
          if (idx !== -1) { stored[idx].estado = estado; stored[idx].comentarios = comentarios; }
        });
        localStorage.setItem(LS_KEY, JSON.stringify(stored));
        setEntries(stored);
      } else {
        await Promise.all(updates.map(({ entry, estado, comentarios }) =>
          updateRIPEntry(entry._rowIdx, estado, comentarios)
        ));
        await loadEntries();
      }
      setReviewSaved(true);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSavingReview(false);
    }
  }

  function toggleWeek(fecha) {
    setOpenWeeks(prev => {
      const next = new Set(prev);
      next.has(fecha) ? next.delete(fecha) : next.add(fecha);
      return next;
    });
  }

  if (loading) return (
    <div className="page-body">
      <div style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 24 }}>
        Cargando reuniones…
      </div>
    </div>
  );

  const historyWeeks = grouped.filter(([fecha]) => fecha !== thisMonday);

  return (
    <div className="page-body">
      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Indicador de fuente */}
        {useLocal && (
          <div style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 11,
            background: 'oklch(0.95 0.04 80)', color: 'var(--warn)',
            fontFamily: 'var(--font-mono)', border: '1px solid oklch(0.88 0.06 80)',
          }}>
            Guardando en localStorage — SharePoint no disponible
          </div>
        )}

        {/* Revisión de semana anterior (solo lunes con pendientes) */}
        {isMonday && pendingReview.length > 0 && !reviewSaved && (
          <div className="card">
            <div className="card-h">
              <span className="card-t">Revisar semana anterior</span>
              <span className="card-sub">Semana del {fmtWeek(lastMonday)}</span>
            </div>
            <div className="card-b">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingReview.map(e => {
                  const key = e._rowIdx ?? e._localId;
                  const rev = reviews[key] ?? {};
                  return (
                    <div key={key} style={{
                      display: 'flex', flexDirection: 'column', gap: 8,
                      padding: '12px 14px', borderRadius: 8,
                      background: 'oklch(0.97 0.003 250)', border: '1px solid oklch(0.91 0.005 250)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                            {e.proyecto}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{e.objetivo}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {['Hecho', 'No hecho'].map(opt => (
                            <button
                              key={opt}
                              onClick={() => setReviews(r => ({ ...r, [key]: { ...r[key], estado: opt } }))}
                              style={{
                                padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', border: '1.5px solid',
                                borderColor: rev.estado === opt
                                  ? (opt === 'Hecho' ? 'var(--ok)' : 'var(--bad)')
                                  : 'oklch(0.82 0.01 250)',
                                background: rev.estado === opt
                                  ? (opt === 'Hecho' ? 'var(--ok-soft)' : 'var(--bad-soft)')
                                  : 'transparent',
                                color: rev.estado === opt
                                  ? (opt === 'Hecho' ? 'var(--ok)' : 'var(--bad)')
                                  : 'var(--ink-2)',
                              }}
                            >{opt}</button>
                          ))}
                        </div>
                      </div>
                      <input
                        className="input"
                        placeholder="Comentario (opcional)"
                        value={rev.comentarios ?? ''}
                        onChange={ev => setReviews(r => ({ ...r, [key]: { ...r[key], comentarios: ev.target.value } }))}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  );
                })}
              </div>
              {reviewError && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 12 }}>
                  {reviewError}
                </div>
              )}
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-accent" onClick={handleSaveReview} disabled={savingReview}>
                  {savingReview ? 'Guardando…' : 'Guardar revisión'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Planificación de esta semana */}
        {!hasThisWeek ? (
          <div className="card">
            <div className="card-h">
              <span className="card-t">Planificar esta semana</span>
              <span className="card-sub">Semana del {fmtWeek(thisMonday)}</span>
            </div>
            <div className="card-b">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeProjects.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No hay proyectos activos.</div>
                )}
                {activeProjects.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)', whiteSpace: 'nowrap', minWidth: 68 }}>
                      {p.id}
                    </span>
                    <input
                      className="input"
                      placeholder="Objetivo para esta semana"
                      value={objectives[p.id] ?? ''}
                      onChange={e => setObjectives(o => ({ ...o, [p.id]: e.target.value }))}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                  </div>
                ))}
                {extras.map((ex, i) => (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)', minWidth: 68 }}>
                      GENERAL
                    </span>
                    <input
                      className="input"
                      placeholder="Objetivo general"
                      value={ex.text}
                      onChange={e => setExtras(prev => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                    <button
                      onClick={() => setExtras(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                    >×</button>
                  </div>
                ))}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setExtras(prev => [...prev, { id: Date.now(), text: '' }])}
                  style={{ alignSelf: 'flex-start', marginTop: 2 }}
                >
                  + Agregar objetivo general
                </button>
              </div>

              {meetingError && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 12 }}>
                  {meetingError}
                </div>
              )}
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-accent"
                  onClick={handleSaveMeeting}
                  disabled={
                    savingMeeting ||
                    (!Object.values(objectives).some(v => v?.trim()) && !extras.some(e => e.text?.trim()))
                  }
                >
                  {savingMeeting ? 'Guardando…' : 'Guardar reunión'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Resumen de la semana actual */
          <div className="card">
            <div className="card-h">
              <span className="card-t">Esta semana</span>
              <span className="card-sub">Semana del {fmtWeek(thisMonday)}</span>
            </div>
            <div className="card-b">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {thisWeekEntries.map((e, i) => <EntryRow key={i} entry={e} />)}
              </div>
            </div>
          </div>
        )}

        {/* Historial */}
        {historyWeeks.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-h" style={{ padding: '14px 20px' }}>
              <span className="card-t">Historial</span>
              <span className="card-sub">{historyWeeks.length} {historyWeeks.length === 1 ? 'semana' : 'semanas'} anteriores</span>
            </div>
            <div>
              {historyWeeks.map(([fecha, items], wIdx) => {
                const done  = items.filter(e => e.estado === 'Hecho').length;
                const total = items.length;
                const pend  = items.filter(e => e.estado === 'Pendiente').length;
                const isOpen = openWeeks.has(fecha);
                const allDone = done === total && pend === 0;
                return (
                  <div key={fecha} style={{ borderTop: wIdx === 0 ? '1px solid oklch(0.91 0.005 250)' : 'none', borderBottom: '1px solid oklch(0.91 0.005 250)' }}>
                    <button
                      onClick={() => toggleWeek(fecha)}
                      style={{
                        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      }}
                    >
                      <span style={{
                        fontSize: 10, color: 'var(--ink-3)',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s', display: 'inline-block', flexShrink: 0,
                      }}>▶</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                        Semana del {fmtWeek(fecha)}
                      </span>
                      {pend > 0 ? (
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--warn)' }}>
                          {pend} sin revisar
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: allDone ? 'var(--ok)' : 'var(--ink-2)' }}>
                          {done}/{total} cumplidos
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map((e, i) => <EntryRow key={i} entry={e} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {entries.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            No hay reuniones registradas. Planificá la primera semana arriba.
          </div>
        )}
      </div>
    </div>
  );
}
