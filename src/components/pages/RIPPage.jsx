import { useState, useEffect } from 'react';
import { fetchRIP, saveRIPMeeting, updateRIPEntry } from '../../services/graphService';

const LS_KEY = 'gqm_rip';

const CLIENT_COLORS = ['#10069F','#ef5c43','#009bd9','#00A440','#ff801d','#7c3aed','#e11d48','#0891b2'];
const CLIENT_SOFT   = [
  'rgba(16,6,159,0.07)','rgba(239,92,67,0.07)','rgba(0,155,217,0.07)','rgba(0,164,64,0.07)',
  'rgba(255,128,29,0.07)','rgba(124,58,237,0.07)','rgba(225,29,72,0.07)','rgba(8,145,178,0.07)',
];

function getMondayStr(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().split('T')[0];
}
function prevMondayStr(s) {
  const d = new Date(s + 'T12:00:00');
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
function groupProjectsByCliente(projects) {
  const map = new Map();
  projects.forEach(p => {
    const c = p.cliente?.trim() || 'Sin cliente';
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(p);
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'));
}
function groupEntriesByCliente(entries, projectMap) {
  const map = new Map();
  entries.forEach(e => {
    const cliente = e.proyecto === 'GENERAL'
      ? 'General'
      : (projectMap[e.proyecto]?.cliente?.trim() || 'Sin cliente');
    if (!map.has(cliente)) map.set(cliente, []);
    map.get(cliente).push(e);
  });
  return [...map.entries()].sort(([a], [b]) => {
    if (a === 'General') return 1;
    if (b === 'General') return -1;
    return a.localeCompare(b, 'es');
  });
}

function StatusBadge({ estado }) {
  const cfg = {
    Hecho:      { color: '#fff', bg: '#00A440', label: '✓ Hecho' },
    'No hecho': { color: '#fff', bg: '#ef5c43', label: '✗ No hecho' },
    Pendiente:  { color: '#92400e', bg: '#fde68a', label: 'Pendiente' },
  };
  const s = cfg[estado] ?? cfg.Pendiente;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
      background: s.bg, color: s.color, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: 0.2,
    }}>{s.label}</span>
  );
}

function ClientSection({ cliente, colorIdx, children }) {
  const color = CLIENT_COLORS[colorIdx % CLIENT_COLORS.length];
  const soft  = CLIENT_SOFT[colorIdx % CLIENT_SOFT.length];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 6, marginBottom: 10,
        background: soft, borderLeft: `3px solid ${color}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {cliente}
        </span>
      </div>
      <div style={{ paddingLeft: 8 }}>
        {children}
      </div>
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
  const projectMap    = Object.fromEntries(projects.map(p => [p.id, p]));
  const clientGroups  = groupProjectsByCliente(activeProjects);
  const clientIndexOf = cliente => clientGroups.findIndex(([c]) => c === cliente);

  // --- datos ---
  const [entries,   setEntries]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [useLocal,  setUseLocal]  = useState(false);

  // --- form planificación: { [pid]: [{ id, text }] } ---
  const [objectives,    setObjectives]    = useState({});
  const [extras,        setExtras]        = useState([]);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingError,  setMeetingError]  = useState(null);

  // --- revisión (lunes) ---
  const [reviews,      setReviews]      = useState({});
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError,  setReviewError]  = useState(null);
  const [reviewSaved,  setReviewSaved]  = useState(false);

  // --- edición semana actual ---
  const [weekEdits,   setWeekEdits]   = useState({});
  const [savingWeek,  setSavingWeek]  = useState(false);
  const [weekError,   setWeekError]   = useState(null);
  const [weekSavedAt, setWeekSavedAt] = useState(null);

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

  // derivados
  const grouped         = groupByFecha(entries);
  const thisWeekEntries = entries.filter(e => e.fecha === thisMonday);
  const lastWeekEntries = entries.filter(e => e.fecha === lastMonday);
  const pendingReview   = lastWeekEntries.filter(e => e.estado === 'Pendiente');
  const hasThisWeek     = entries.some(e => e.fecha === thisMonday);

  // inicializar revisiones
  useEffect(() => {
    const init = {};
    pendingReview.forEach(e => { init[e._rowIdx ?? e._localId] = { estado: '', comentarios: '' }; });
    setReviews(init);
  }, [entries]);

  // inicializar edits semana actual
  useEffect(() => {
    const init = {};
    entries.filter(e => e.fecha === thisMonday).forEach(e => {
      init[e._rowIdx ?? e._localId] = { estado: e.estado, comentarios: e.comentarios };
    });
    setWeekEdits(init);
    setWeekSavedAt(null);
  }, [entries]);

  // helpers objectives
  function getObjs(pid) { return objectives[pid] ?? [{ id: `${pid}_0`, text: '' }]; }
  function setObjs(pid, fn) { setObjectives(o => ({ ...o, [pid]: fn(getObjs(pid)) })); }
  function addObj(pid) { setObjs(pid, arr => [...arr, { id: `${pid}_${Date.now()}`, text: '' }]); }
  function updObj(pid, id, text) { setObjs(pid, arr => arr.map(o => o.id === id ? { ...o, text } : o)); }
  function remObj(pid, id) { setObjs(pid, arr => arr.length > 1 ? arr.filter(o => o.id !== id) : arr); }

  // guardar reunión nueva
  async function handleSaveMeeting() {
    const toSave = [];
    activeProjects.forEach(p => {
      getObjs(p.id).forEach(obj => {
        if (obj.text?.trim()) toSave.push({ fecha: thisMonday, proyecto: p.id, objetivo: obj.text.trim() });
      });
    });
    extras.forEach(ex => {
      if (ex.text?.trim()) toSave.push({ fecha: thisMonday, proyecto: 'GENERAL', objetivo: ex.text.trim() });
    });
    if (!toSave.length) return;
    setSavingMeeting(true); setMeetingError(null);
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
      setObjectives({}); setExtras([]);
    } catch (err) { setMeetingError(err.message); }
    finally { setSavingMeeting(false); }
  }

  // guardar revisión semana anterior
  async function handleSaveReview() {
    setSavingReview(true); setReviewError(null);
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
    } catch (err) { setReviewError(err.message); }
    finally { setSavingReview(false); }
  }

  // guardar ediciones semana actual
  async function handleSaveWeek() {
    const currentWeek = entries.filter(e => e.fecha === thisMonday);
    setSavingWeek(true); setWeekError(null);
    try {
      if (useLocal) {
        const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        currentWeek.forEach(e => {
          const key = e._localId;
          const edit = weekEdits[key];
          if (!edit) return;
          const idx = stored.findIndex(s => s._localId === key);
          if (idx !== -1) { stored[idx].estado = edit.estado; stored[idx].comentarios = edit.comentarios; }
        });
        localStorage.setItem(LS_KEY, JSON.stringify(stored));
        setEntries(stored);
      } else {
        await Promise.all(currentWeek.map(e => {
          const edit = weekEdits[e._rowIdx];
          if (!edit) return Promise.resolve();
          return updateRIPEntry(e._rowIdx, edit.estado, edit.comentarios);
        }));
        await loadEntries();
      }
      setWeekSavedAt(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) { setWeekError(err.message); }
    finally { setSavingWeek(false); }
  }

  function toggleWeek(fecha) {
    setOpenWeeks(prev => { const n = new Set(prev); n.has(fecha) ? n.delete(fecha) : n.add(fecha); return n; });
  }

  const hasAnyObjective = activeProjects.some(p => getObjs(p.id).some(o => o.text?.trim())) ||
                          extras.some(e => e.text?.trim());

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
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {useLocal && (
          <div style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 11,
            background: 'oklch(0.95 0.04 80)', color: 'var(--warn)',
            fontFamily: 'var(--font-mono)', border: '1px solid oklch(0.88 0.06 80)',
          }}>
            Guardando en localStorage — SharePoint no disponible
          </div>
        )}

        {/* ── Revisión semana anterior (solo lunes) ── */}
        {isMonday && pendingReview.length > 0 && !reviewSaved && (() => {
          const byCliente = groupEntriesByCliente(pendingReview, projectMap);
          return (
            <div className="card">
              <div className="card-h" style={{ background: 'oklch(0.97 0.01 250)', borderRadius: '10px 10px 0 0', margin: '-1px -1px 0', padding: '14px 20px' }}>
                <span className="card-t">Revisar semana anterior</span>
                <span className="card-sub">Semana del {fmtWeek(lastMonday)}</span>
              </div>
              <div className="card-b">
                {byCliente.map(([cliente, items], ci) => (
                  <ClientSection key={cliente} cliente={cliente} colorIdx={clientIndexOf(cliente) >= 0 ? clientIndexOf(cliente) : ci}>
                    {items.map(e => {
                      const key = e._rowIdx ?? e._localId;
                      const rev = reviews[key] ?? {};
                      return (
                        <div key={key} style={{
                          marginBottom: 10, padding: '10px 14px', borderRadius: 8,
                          background: 'oklch(0.975 0.002 250)', border: '1px solid oklch(0.91 0.005 250)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{e.proyecto}</span>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{e.objetivo}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              {['Hecho', 'No hecho'].map(opt => (
                                <button key={opt} onClick={() => setReviews(r => ({ ...r, [key]: { ...r[key], estado: opt } }))}
                                  style={{
                                    padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                    cursor: 'pointer', border: '2px solid',
                                    borderColor: rev.estado === opt ? (opt === 'Hecho' ? '#00A440' : '#ef5c43') : 'oklch(0.85 0.01 250)',
                                    background: rev.estado === opt ? (opt === 'Hecho' ? '#00A440' : '#ef5c43') : 'transparent',
                                    color: rev.estado === opt ? '#fff' : 'var(--ink-2)',
                                    transition: 'all 0.15s',
                                  }}>{opt === 'Hecho' ? '✓ Hecho' : '✗ No hecho'}</button>
                              ))}
                            </div>
                          </div>
                          <input className="input" placeholder="Comentario (opcional)"
                            value={rev.comentarios ?? ''}
                            onChange={ev => setReviews(r => ({ ...r, [key]: { ...r[key], comentarios: ev.target.value } }))}
                            style={{ fontSize: 12 }}
                          />
                        </div>
                      );
                    })}
                  </ClientSection>
                ))}
                {reviewError && (
                  <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 12 }}>{reviewError}</div>
                )}
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-accent" onClick={handleSaveReview} disabled={savingReview}>
                    {savingReview ? 'Guardando…' : 'Guardar revisión'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Planificación o resumen semana actual ── */}
        {!hasThisWeek ? (
          <div className="card">
            <div className="card-h">
              <span className="card-t">Planificar esta semana</span>
              <span className="card-sub">Semana del {fmtWeek(thisMonday)}</span>
            </div>
            <div className="card-b">
              {clientGroups.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No hay proyectos activos.</div>
              )}
              {clientGroups.map(([cliente, projs], ci) => (
                <ClientSection key={cliente} cliente={cliente} colorIdx={ci}>
                  {projs.map(p => (
                    <div key={p.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{p.id}</span>
                        {p.desc && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>— {p.desc}</span>}
                      </div>
                      {getObjs(p.id).map((obj, oi) => (
                        <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ color: 'var(--ink-3)', fontSize: 13, flexShrink: 0 }}>○</span>
                          <input className="input"
                            placeholder="Objetivo de la semana"
                            value={obj.text}
                            onChange={e => updObj(p.id, obj.id, e.target.value)}
                            style={{ flex: 1, fontSize: 12 }}
                          />
                          {getObjs(p.id).length > 1 && (
                            <button onClick={() => remObj(p.id, obj.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addObj(p.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', paddingLeft: 22, marginTop: 2 }}>
                        + agregar objetivo
                      </button>
                    </div>
                  ))}
                </ClientSection>
              ))}

              {/* GENERAL */}
              {(extras.length > 0 || clientGroups.length > 0) && (
                <ClientSection cliente="General" colorIdx={clientGroups.length}>
                  {extras.map((ex, i) => (
                    <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: 'var(--ink-3)', fontSize: 13, flexShrink: 0 }}>○</span>
                      <input className="input" placeholder="Objetivo general"
                        value={ex.text}
                        onChange={e => setExtras(prev => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                        style={{ flex: 1, fontSize: 12 }}
                      />
                      <button onClick={() => setExtras(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setExtras(prev => [...prev, { id: Date.now(), text: '' }])}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', paddingLeft: 22, marginTop: 2 }}>
                    + agregar objetivo general
                  </button>
                </ClientSection>
              )}

              {meetingError && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 12 }}>{meetingError}</div>
              )}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-accent" onClick={handleSaveMeeting} disabled={savingMeeting || !hasAnyObjective}>
                  {savingMeeting ? 'Guardando…' : 'Guardar reunión'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Semana actual editable ── */
          <div className="card">
            <div className="card-h">
              <span className="card-t">Esta semana</span>
              <span className="card-sub">Semana del {fmtWeek(thisMonday)}</span>
            </div>
            <div className="card-b">
              {groupEntriesByCliente(thisWeekEntries, projectMap).map(([cliente, items], ci) => (
                <ClientSection key={cliente} cliente={cliente} colorIdx={ci}>
                  {items.map(e => {
                    const key  = e._rowIdx ?? e._localId;
                    const edit = weekEdits[key] ?? { estado: e.estado, comentarios: e.comentarios };
                    const done = edit.estado === 'Hecho';
                    const nope = edit.estado === 'No hecho';
                    return (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                        background: done ? 'rgba(0,164,64,0.06)' : nope ? 'rgba(239,92,67,0.06)' : 'oklch(0.975 0.002 250)',
                        border: `1px solid ${done ? 'rgba(0,164,64,0.25)' : nope ? 'rgba(239,92,67,0.25)' : 'oklch(0.91 0.005 250)'}`,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{e.proyecto}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--ink-3)' : 'var(--ink)' }}>
                              {e.objetivo}
                            </span>
                          </div>
                          <input className="input" placeholder="Comentario (opcional)"
                            value={edit.comentarios ?? ''}
                            onChange={ev => setWeekEdits(w => ({ ...w, [key]: { ...w[key], comentarios: ev.target.value } }))}
                            style={{ fontSize: 11, padding: '4px 8px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                          {['Hecho', 'No hecho', 'Pendiente'].map(opt => (
                            <button key={opt}
                              onClick={() => setWeekEdits(w => ({ ...w, [key]: { ...w[key], estado: opt } }))}
                              style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                cursor: 'pointer', border: '1.5px solid', whiteSpace: 'nowrap',
                                borderColor: edit.estado === opt
                                  ? (opt === 'Hecho' ? '#00A440' : opt === 'No hecho' ? '#ef5c43' : '#d97706')
                                  : 'oklch(0.85 0.01 250)',
                                background: edit.estado === opt
                                  ? (opt === 'Hecho' ? '#00A440' : opt === 'No hecho' ? '#ef5c43' : '#fde68a')
                                  : 'transparent',
                                color: edit.estado === opt
                                  ? (opt === 'Pendiente' ? '#92400e' : '#fff')
                                  : 'var(--ink-3)',
                                transition: 'all 0.15s',
                              }}>
                              {opt === 'Hecho' ? '✓' : opt === 'No hecho' ? '✗' : '○'} {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </ClientSection>
              ))}
              {weekError && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 12 }}>{weekError}</div>
              )}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                {weekSavedAt && (
                  <span style={{ fontSize: 11, color: '#00A440', fontFamily: 'var(--font-mono)' }}>✓ Guardado {weekSavedAt}</span>
                )}
                <button className="btn btn-accent" onClick={handleSaveWeek} disabled={savingWeek}>
                  {savingWeek ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Historial ── */}
        {historyWeeks.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-h" style={{ padding: '14px 20px' }}>
              <span className="card-t">Historial</span>
              <span className="card-sub">{historyWeeks.length} {historyWeeks.length === 1 ? 'semana' : 'semanas'} anteriores</span>
            </div>
            {historyWeeks.map(([fecha, items], wIdx) => {
              const done  = items.filter(e => e.estado === 'Hecho').length;
              const total = items.length;
              const pend  = items.filter(e => e.estado === 'Pendiente').length;
              const isOpen = openWeeks.has(fecha);
              const allDone = done === total && pend === 0;
              const byCliente = groupEntriesByCliente(items, projectMap);
              return (
                <div key={fecha} style={{ borderTop: '1px solid oklch(0.91 0.005 250)' }}>
                  <button onClick={() => toggleWeek(fecha)}
                    style={{
                      width: '100%', background: isOpen ? 'oklch(0.97 0.003 250)' : 'none',
                      border: 'none', cursor: 'pointer',
                      padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      transition: 'background 0.15s',
                    }}>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block', flexShrink: 0 }}>▶</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Semana del {fmtWeek(fecha)}</span>
                    {pend > 0 ? (
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 10px', borderRadius: 20, background: '#fde68a', color: '#92400e', fontWeight: 700 }}>
                        {pend} sin revisar
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 10px', borderRadius: 20, fontWeight: 700,
                        background: allDone ? 'rgba(0,164,64,0.12)' : 'oklch(0.93 0.005 250)',
                        color: allDone ? '#00A440' : 'var(--ink-2)',
                      }}>
                        {done}/{total} cumplidos
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '4px 20px 16px' }}>
                      {byCliente.map(([cliente, centries], ci) => (
                        <ClientSection key={cliente} cliente={cliente} colorIdx={ci}>
                          {centries.map((e, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                              background: e.estado === 'Hecho' ? 'rgba(0,164,64,0.06)' : e.estado === 'No hecho' ? 'rgba(239,92,67,0.06)' : 'oklch(0.975 0.002 250)',
                              border: `1px solid ${e.estado === 'Hecho' ? 'rgba(0,164,64,0.2)' : e.estado === 'No hecho' ? 'rgba(239,92,67,0.2)' : 'oklch(0.91 0.005 250)'}`,
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{e.proyecto}</span>
                                  <span style={{ fontSize: 13, textDecoration: e.estado === 'Hecho' ? 'line-through' : 'none', color: e.estado === 'Hecho' ? 'var(--ink-3)' : 'var(--ink)' }}>
                                    {e.objetivo}
                                  </span>
                                </div>
                                {e.comentarios && <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 3 }}>{e.comentarios}</div>}
                              </div>
                              <StatusBadge estado={e.estado} />
                            </div>
                          ))}
                        </ClientSection>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
