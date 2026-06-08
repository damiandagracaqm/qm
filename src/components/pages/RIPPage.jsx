import { useState, useEffect } from 'react';
import { fetchRIP, saveRIPMeeting, updateRIPEntry, updateRIPEntryFecha } from '../../services/graphService';

const LS_KEY     = 'gqm_rip';
const LS_LDP_KEY = 'gqm_rip_ldp';

const CLIENT_COLORS = ['#10069F','#ef5c43','#009bd9','#00A440','#ff801d','#7c3aed','#e11d48','#0891b2'];
const CLIENT_SOFT   = [
  'rgba(16,6,159,0.07)','rgba(239,92,67,0.07)','rgba(0,155,217,0.07)','rgba(0,164,64,0.07)',
  'rgba(255,128,29,0.07)','rgba(124,58,237,0.07)','rgba(225,29,72,0.07)','rgba(8,145,178,0.07)',
];
const SECTION_LABEL = {
  fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: 'var(--ink-3)',
  textTransform: 'uppercase', marginBottom: 8,
};

function toLocalISO(date) {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function getMondayStr(d = new Date()) {
  const date = new Date(d);
  const day  = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return toLocalISO(date);
}
function prevMondayStr(s) {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() - 7);
  return toLocalISO(d);
}
function addDaysStr(s, days) {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}
function fmtWeek(isoStr) {
  if (!isoStr) return '';
  const str = String(isoStr).trim();
  // Extraer YYYY-MM-DD aunque venga con timestamp
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d)) return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const d = new Date(str);
  if (!isNaN(d)) return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  return str;
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
      : (e.cliente?.trim() || projectMap[e.proyecto]?.cliente?.trim() || 'Sin cliente');
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

function ClientSection({ cliente, colorIdx, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen);
  const color = CLIENT_COLORS[colorIdx % CLIENT_COLORS.length];
  const soft  = CLIENT_SOFT[colorIdx % CLIENT_SOFT.length];
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 6, marginBottom: open ? 10 : 0,
          background: soft, border: 'none', borderLeft: `3px solid ${color}`,
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 9, color, flexShrink: 0,
          display: 'inline-block', transition: 'transform 0.15s',
          transform: open ? 'rotate(90deg)' : 'none',
        }}>▶</span>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {cliente}
        </span>
        {count != null && (
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color, opacity: 0.7 }}>{count}</span>
        )}
      </button>
      {open && (
        <div style={{ paddingLeft: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function EditableObjectiveRow({ proyecto, objetivo, estado, comentarios, onEstado, onComentario, extra }) {
  const done = estado === 'Hecho';
  const nope = estado === 'No hecho';
  return (
    <div style={{
      marginBottom: 10, padding: '10px 14px', borderRadius: 8,
      background: done ? 'rgba(0,164,64,0.06)' : nope ? 'rgba(239,92,67,0.06)' : 'oklch(0.975 0.002 250)',
      border: `1px solid ${done ? 'rgba(0,164,64,0.2)' : nope ? 'rgba(239,92,67,0.2)' : 'oklch(0.91 0.005 250)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{proyecto}</span>
          <span style={{ fontSize: 13, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--ink-3)' : 'var(--ink)' }}>
            {objetivo}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {['Hecho', 'No hecho', 'Pendiente'].map(opt => (
            <button key={opt} onClick={() => onEstado(opt)}
              style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: '2px solid',
                borderColor: estado === opt
                  ? (opt === 'Hecho' ? '#00A440' : opt === 'No hecho' ? '#ef5c43' : '#d97706')
                  : 'oklch(0.85 0.01 250)',
                background: estado === opt
                  ? (opt === 'Hecho' ? '#00A440' : opt === 'No hecho' ? '#ef5c43' : '#fde68a')
                  : 'transparent',
                color: estado === opt
                  ? (opt === 'Pendiente' ? '#92400e' : '#fff')
                  : 'var(--ink-2)',
                transition: 'all 0.15s',
              }}>{opt === 'Hecho' ? '✓ Hecho' : opt === 'No hecho' ? '✗ No hecho' : '○ Pendiente'}</button>
          ))}
        </div>
      </div>
      <input className="input" placeholder="Comentario (opcional)"
        value={comentarios ?? ''}
        onChange={ev => onComentario(ev.target.value)}
        style={{ fontSize: 12 }}
      />
      {extra && <div style={{ marginTop: 8 }}>{extra}</div>}
    </div>
  );
}

export function RIPPage({ projects }) {
  const today      = new Date();
  const thisMonday = getMondayStr(today);
  const lastMonday = prevMondayStr(thisMonday);
  const nextMonday = addDaysStr(thisMonday, 7);

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

  // --- objetivos nuevos para esta semana: { [pid]: [{ id, text }] } ---
  const [objectives, setObjectives] = useState({});
  const [extras,     setExtras]     = useState([]);

  // --- ediciones de estado/comentario (semana pasada y esta semana) ---
  const [reviews,   setReviews]   = useState({});
  const [weekEdits, setWeekEdits] = useState({});

  // --- guardado ---
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedAt,   setSavedAt]   = useState(null);

  // --- mover objetivo de la semana pasada a otra fecha ---
  const [moveDrafts, setMoveDrafts] = useState({});
  const [movingKey,  setMovingKey]  = useState(null);
  const [moveError,  setMoveError]  = useState(null);

  // --- LDP por semana ---
  const [ldpByWeek,    setLdpByWeekState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_LDP_KEY) ?? '{}'); }
    catch { return {}; }
  });
  const [editingLdpWeek, setEditingLdpWeek] = useState(null);

  // --- historial ---
  const [openWeeks, setOpenWeeks] = useState(new Set());

  function setWeekLdp(mondayStr, value) {
    const updated = { ...ldpByWeek, [mondayStr]: value };
    setLdpByWeekState(updated);
    localStorage.setItem(LS_LDP_KEY, JSON.stringify(updated));
  }

  const ldpOptions = [...new Set(activeProjects.map(p => p.ldp).filter(Boolean))].sort();

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

  // sembrar ediciones para entradas nuevas sin pisar las que el usuario ya está editando
  useEffect(() => {
    setReviews(prev => {
      const next = { ...prev };
      lastWeekEntries.forEach(e => {
        const key = e._rowIdx ?? e._localId;
        if (!(key in next)) next[key] = { estado: e.estado, comentarios: e.comentarios };
      });
      return next;
    });
    setWeekEdits(prev => {
      const next = { ...prev };
      thisWeekEntries.forEach(e => {
        const key = e._rowIdx ?? e._localId;
        if (!(key in next)) next[key] = { estado: e.estado, comentarios: e.comentarios };
      });
      return next;
    });
  }, [entries]);

  // helpers objectives
  function getObjs(pid) { return objectives[pid] ?? [{ id: `${pid}_0`, text: '' }]; }
  function setObjs(pid, fn) { setObjectives(o => ({ ...o, [pid]: fn(getObjs(pid)) })); }
  function addObj(pid) { setObjs(pid, arr => [...arr, { id: `${pid}_${Date.now()}`, text: '' }]); }
  function updObj(pid, id, text) { setObjs(pid, arr => arr.map(o => o.id === id ? { ...o, text } : o)); }
  function remObj(pid, id) { setObjs(pid, arr => arr.length > 1 ? arr.filter(o => o.id !== id) : arr); }

  // guardar todo: objetivos nuevos + ediciones de semana pasada y actual
  async function handleSave() {
    setSaving(true); setSaveError(null);
    try {
      const toCreate = [];
      activeProjects.forEach(p => {
        getObjs(p.id).forEach(obj => {
          if (obj.text?.trim()) toCreate.push({ fecha: thisMonday, proyecto: p.id, objetivo: obj.text.trim(), cliente: p.cliente?.trim() || 'Sin cliente' });
        });
      });
      extras.forEach(ex => {
        if (ex.text?.trim()) toCreate.push({ fecha: thisMonday, proyecto: 'GENERAL', objetivo: ex.text.trim(), cliente: 'General' });
      });

      const toUpdate = [
        ...lastWeekEntries.map(e => ({ entry: e, edit: reviews[e._rowIdx ?? e._localId] })),
        ...thisWeekEntries.map(e => ({ entry: e, edit: weekEdits[e._rowIdx ?? e._localId] })),
      ].map(({ entry, edit }) => ({
        entry,
        estado:      edit?.estado || entry.estado,
        comentarios: edit?.comentarios ?? entry.comentarios ?? '',
      }));

      if (useLocal) {
        let stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        if (toCreate.length) {
          const base    = stored.length;
          const newRows = toCreate.map((e, i) => ({ ...e, estado: 'Pendiente', comentarios: '', cliente: e.cliente ?? '', _localId: base + i }));
          stored = [...stored, ...newRows];
        }
        toUpdate.forEach(({ entry, estado, comentarios }) => {
          const idx = stored.findIndex(s => s._localId === entry._localId);
          if (idx !== -1) { stored[idx].estado = estado; stored[idx].comentarios = comentarios; }
        });
        localStorage.setItem(LS_KEY, JSON.stringify(stored));
        setEntries(stored);
      } else {
        if (toCreate.length) await saveRIPMeeting(toCreate);
        await Promise.all(toUpdate.map(({ entry, estado, comentarios }) =>
          updateRIPEntry(entry._rowIdx, estado, comentarios)
        ));
        await loadEntries();
      }
      setObjectives({}); setExtras([]);
      setSavedAt(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) { setSaveError(err.message); }
    finally { setSaving(false); }
  }

  // mover un objetivo de la semana pasada a otra fecha (cambia su semana)
  async function handleMove(entry) {
    const key   = entry._rowIdx ?? entry._localId;
    const draft = moveDrafts[key];
    if (!draft) return;
    const targetMonday = getMondayStr(new Date(draft + 'T12:00:00'));
    setMovingKey(key); setMoveError(null);
    try {
      if (useLocal) {
        const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        const idx = stored.findIndex(s => s._localId === entry._localId);
        if (idx !== -1) stored[idx].fecha = targetMonday;
        localStorage.setItem(LS_KEY, JSON.stringify(stored));
        setEntries(stored);
      } else {
        await updateRIPEntryFecha(entry._rowIdx, targetMonday);
        await loadEntries();
      }
      setMoveDrafts(d => { const n = { ...d }; delete n[key]; return n; });
    } catch (err) { setMoveError(err.message); }
    finally { setMovingKey(null); }
  }

  function toggleWeek(fecha) {
    setOpenWeeks(prev => { const n = new Set(prev); n.has(fecha) ? n.delete(fecha) : n.add(fecha); return n; });
  }

  function renderMoveControl(entry, key) {
    const draft = moveDrafts[key];
    if (draft == null) {
      return (
        <button onClick={() => setMoveDrafts(d => ({ ...d, [key]: nextMonday }))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, padding: 0 }}>
          ↪ mover a otra semana
        </button>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input type="date" className="input" value={draft}
          onChange={ev => setMoveDrafts(d => ({ ...d, [key]: ev.target.value }))}
          style={{ fontSize: 11, padding: '3px 8px', width: 150 }}
        />
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          → semana del {fmtWeek(getMondayStr(new Date(draft + 'T12:00:00')))}
        </span>
        <button className="btn btn-accent" disabled={movingKey === key}
          onClick={() => handleMove(entry)}
          style={{ fontSize: 11, padding: '3px 12px' }}>
          {movingKey === key ? 'Moviendo…' : 'Mover'}
        </button>
        <button onClick={() => setMoveDrafts(d => { const n = { ...d }; delete n[key]; return n; })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 11 }}>
          Cancelar
        </button>
      </div>
    );
  }

  function renderLastWeekRow(e) {
    const key = e._rowIdx ?? e._localId;
    const rev = reviews[key] ?? { estado: e.estado, comentarios: e.comentarios };
    return (
      <EditableObjectiveRow key={key}
        proyecto={e.proyecto} objetivo={e.objetivo}
        estado={rev.estado} comentarios={rev.comentarios}
        onEstado={opt => setReviews(r => ({ ...r, [key]: { ...r[key], estado: opt } }))}
        onComentario={val => setReviews(r => ({ ...r, [key]: { ...r[key], comentarios: val } }))}
        extra={renderMoveControl(e, key)}
      />
    );
  }

  function renderThisWeekRow(e) {
    const key  = e._rowIdx ?? e._localId;
    const edit = weekEdits[key] ?? { estado: e.estado, comentarios: e.comentarios };
    return (
      <EditableObjectiveRow key={key}
        proyecto={e.proyecto} objetivo={e.objetivo}
        estado={edit.estado} comentarios={edit.comentarios}
        onEstado={opt => setWeekEdits(w => ({ ...w, [key]: { ...w[key], estado: opt } }))}
        onComentario={val => setWeekEdits(w => ({ ...w, [key]: { ...w[key], comentarios: val } }))}
      />
    );
  }

  if (loading) return (
    <div className="page-body">
      <div style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 24 }}>
        Cargando reuniones…
      </div>
    </div>
  );

  const lastWeekByCliente = new Map(groupEntriesByCliente(lastWeekEntries.filter(e => e.proyecto !== 'GENERAL'), projectMap));
  const thisWeekByCliente = new Map(groupEntriesByCliente(thisWeekEntries.filter(e => e.proyecto !== 'GENERAL'), projectMap));
  const lastWeekGeneral   = lastWeekEntries.filter(e => e.proyecto === 'GENERAL');
  const thisWeekGeneral   = thisWeekEntries.filter(e => e.proyecto === 'GENERAL');

  const clientNames = [...new Set([
    ...clientGroups.map(([c]) => c),
    ...lastWeekByCliente.keys(),
    ...thisWeekByCliente.keys(),
  ])].sort((a, b) => a.localeCompare(b, 'es'));

  const hasGeneral = clientNames.length > 0 || extras.length > 0 || lastWeekGeneral.length > 0 || thisWeekGeneral.length > 0;

  const historyWeeks = grouped.filter(([fecha]) => fecha !== thisMonday && fecha !== lastMonday);

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

        {/* ── Reunión semanal: semana pasada + esta semana, todo junto por cliente ── */}
        <div className="card">
          <div className="card-h">
            <span className="card-t">Reunión semanal</span>
            <span className="card-sub">Pasada: {fmtWeek(lastMonday)} · Actual: {fmtWeek(thisMonday)}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Responsable</span>
              {editingLdpWeek === thisMonday ? (
                <>
                  <input
                    list="ldp-list-edit"
                    className="input"
                    autoFocus
                    value={ldpByWeek[thisMonday] ?? ''}
                    onChange={e => setWeekLdp(thisMonday, e.target.value)}
                    onBlur={() => setEditingLdpWeek(null)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingLdpWeek(null); }}
                    style={{ fontSize: 11, padding: '3px 8px', width: 160 }}
                  />
                  <datalist id="ldp-list-edit">
                    {ldpOptions.map(l => <option key={l} value={l} />)}
                  </datalist>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: ldpByWeek[thisMonday] ? 'var(--ink-2)' : 'var(--ink-3)', fontWeight: ldpByWeek[thisMonday] ? 500 : 400 }}>
                    {ldpByWeek[thisMonday] || 'Sin responsable'}
                  </span>
                  <button
                    onClick={() => setEditingLdpWeek(thisMonday)}
                    title="Editar responsable"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 12, padding: '2px 4px', lineHeight: 1 }}
                  >✏</button>
                </>
              )}
            </div>
          </div>
          <div className="card-b">
            {clientNames.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>No hay proyectos activos.</div>
            )}

            {clientNames.map((cliente, ci) => {
              const projs          = clientGroups.find(([c]) => c === cliente)?.[1] ?? [];
              const lastWeekItems  = lastWeekByCliente.get(cliente) ?? [];
              const thisWeekItems  = thisWeekByCliente.get(cliente) ?? [];
              const projIds        = new Set(projs.map(p => p.id));
              const orphanItems    = thisWeekItems.filter(e => !projIds.has(e.proyecto));
              const colorIdx       = clientIndexOf(cliente) >= 0 ? clientIndexOf(cliente) : ci;
              return (
                <ClientSection key={cliente} cliente={cliente} colorIdx={colorIdx} defaultOpen={false}
                  count={(lastWeekItems.length + thisWeekItems.length) || null}>
                  {lastWeekItems.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={SECTION_LABEL}>Semana pasada · {fmtWeek(lastMonday)}</div>
                      {lastWeekItems.map(renderLastWeekRow)}
                    </div>
                  )}
                  <div>
                    <div style={SECTION_LABEL}>Esta semana · {fmtWeek(thisMonday)}</div>
                    {projs.map(p => {
                      const existing = thisWeekItems.filter(e => e.proyecto === p.id);
                      return (
                        <div key={p.id} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{p.id}</span>
                            {p.desc && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>— {p.desc}</span>}
                          </div>
                          {existing.map(renderThisWeekRow)}
                          {getObjs(p.id).map(obj => (
                            <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ color: 'var(--ink-3)', fontSize: 13, flexShrink: 0 }}>○</span>
                              <input className="input"
                                placeholder="Objetivo nuevo"
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
                      );
                    })}
                    {orphanItems.length > 0 && orphanItems.map(renderThisWeekRow)}
                  </div>
                </ClientSection>
              );
            })}

            {hasGeneral && (
              <ClientSection cliente="General" colorIdx={clientNames.length} defaultOpen={false}
                count={(lastWeekGeneral.length + thisWeekGeneral.length) || null}>
                {lastWeekGeneral.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={SECTION_LABEL}>Semana pasada · {fmtWeek(lastMonday)}</div>
                    {lastWeekGeneral.map(renderLastWeekRow)}
                  </div>
                )}
                <div>
                  <div style={SECTION_LABEL}>Esta semana · {fmtWeek(thisMonday)}</div>
                  {thisWeekGeneral.map(renderThisWeekRow)}
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
                </div>
              </ClientSection>
            )}

            {(saveError || moveError) && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 12 }}>
                {saveError || moveError}
              </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
              {savedAt && (
                <span style={{ fontSize: 11, color: '#00A440', fontFamily: 'var(--font-mono)' }}>✓ Guardado {savedAt}</span>
              )}
              <button className="btn btn-accent" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Historial ── */}
        {historyWeeks.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-h" style={{ padding: '14px 20px' }}>
              <span className="card-t">Historial</span>
              <span className="card-sub">{historyWeeks.length} {historyWeeks.length === 1 ? 'semana' : 'semanas'} anteriores</span>
            </div>
            {historyWeeks.map(([fecha, items]) => {
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
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Reunión del {fmtWeek(fecha)}</span>
                    {ldpByWeek[fecha] && (
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginRight: 4 }}>
                        {ldpByWeek[fecha]}
                      </span>
                    )}
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
                        <ClientSection key={cliente} cliente={cliente} colorIdx={ci} defaultOpen={false} count={centries.length}>
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
