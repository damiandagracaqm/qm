import { useState, useEffect } from 'react';
import { fetchRIP, saveRIPMeeting, updateRIPEntry, updateRIPEntryFecha } from '../../services/graphService';

const LS_KEY = 'gqm_rip';
const CLIENT_COLORS = ['#10069F','#ef5c43','#009bd9','#00A440','#ff801d','#7c3aed','#e11d48','#0891b2'];
const CLIENT_SOFT = [
  'rgba(16,6,159,0.07)','rgba(239,92,67,0.07)','rgba(0,155,217,0.07)','rgba(0,164,64,0.07)',
  'rgba(255,128,29,0.07)','rgba(124,58,237,0.07)','rgba(225,29,72,0.07)','rgba(8,145,178,0.07)',
];

function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function getMondayStr(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return toLocalISO(date);
}
function addDaysStr(s, days) {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}
function excelSerialToISO(serial) {
  // Excel serial: days since 1900-01-00, with a leap-year bug on 1900-02-29
  const d = new Date((serial - 25569) * 86400 * 1000);
  return toLocalISO(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function normalizeFecha(raw) {
  if (!raw && raw !== 0) return '';
  const n = Number(raw);
  if (!isNaN(n) && n > 40000 && n < 60000) return excelSerialToISO(n); // Excel serial
  const str = String(raw).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(str);
  if (!isNaN(d)) return toLocalISO(d);
  return str;
}
function fmtWeek(isoStr) {
  if (!isoStr) return '';
  const iso = normalizeFecha(isoStr);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const d = new Date(+match[1], +match[2] - 1, +match[3]);
    if (!isNaN(d)) return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return iso || String(isoStr);
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

function ClientSection({ cliente, colorIdx, children, defaultOpen = false, count }) {
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
          fontSize: 9, color, flexShrink: 0, display: 'inline-block',
          transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none',
        }}>▶</span>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {cliente}
        </span>
        {count != null && (
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color, opacity: 0.7 }}>{count} obj.</span>
        )}
      </button>
      {open && <div style={{ paddingLeft: 8 }}>{children}</div>}
    </div>
  );
}

export function RIPPage({ projects }) {
  const today      = new Date();
  const thisMonday = getMondayStr(today);
  const nextMonday = addDaysStr(thisMonday, 7);

  const activeProjects = projects.filter(p =>
    p.estado && p.estado !== 'Entregado' && p.estado !== 'Entregado a NQN' && p.estado !== 'Cancelado'
  );
  const clientGroups = groupProjectsByCliente(activeProjects);

  const [entries,   setEntries]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [useLocal,  setUseLocal]  = useState(false);

  // new objectives to add this week: { [pid]: [{ id, text }] }
  const [objectives, setObjectives] = useState({});
  const [extras,     setExtras]     = useState([]);

  // unified edit map for ALL existing entries
  const [edits, setEdits] = useState({});

  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedAt,   setSavedAt]   = useState(null);

  const [moveDrafts, setMoveDrafts] = useState({});
  const [movingKey,  setMovingKey]  = useState(null);
  const [moveError,  setMoveError]  = useState(null);

  function normalizeEntries(arr) {
    return arr.map(e => ({ ...e, fecha: normalizeFecha(e.fecha) }));
  }

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await fetchRIP();
      setEntries(normalizeEntries(data));
      setUseLocal(false);
    } catch {
      const raw = localStorage.getItem(LS_KEY);
      setEntries(raw ? normalizeEntries(JSON.parse(raw)) : []);
      setUseLocal(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadEntries(); }, []);

  // seed edits without overwriting in-progress changes
  useEffect(() => {
    setEdits(prev => {
      const next = { ...prev };
      entries.forEach(e => {
        const key = e._rowIdx ?? e._localId;
        if (!(key in next)) next[key] = { estado: e.estado, comentarios: e.comentarios ?? '' };
      });
      return next;
    });
  }, [entries]);

  function getObjs(pid) { return objectives[pid] ?? []; }
  function setObjs(pid, fn) { setObjectives(o => ({ ...o, [pid]: fn(getObjs(pid)) })); }
  function addObj(pid) { setObjs(pid, arr => [...arr, { id: `${pid}_${Date.now()}`, text: '' }]); }
  function updObj(pid, id, text) { setObjs(pid, arr => arr.map(o => o.id === id ? { ...o, text } : o)); }
  function remObj(pid, id) { setObjs(pid, arr => arr.filter(o => o.id !== id)); }

  async function handleSave() {
    setSaving(true); setSaveError(null);
    try {
      const toCreate = [];
      activeProjects.forEach(p => {
        getObjs(p.id).forEach(obj => {
          if (obj.text?.trim()) toCreate.push({
            fecha: thisMonday, proyecto: p.id,
            objetivo: obj.text.trim(), cliente: p.cliente?.trim() || 'Sin cliente',
          });
        });
      });
      extras.forEach(ex => {
        if (ex.text?.trim()) toCreate.push({
          fecha: thisMonday, proyecto: 'GENERAL', objetivo: ex.text.trim(), cliente: 'General',
        });
      });

      const toUpdate = entries
        .filter(e => {
          const key = e._rowIdx ?? e._localId;
          const edit = edits[key];
          return edit && (edit.estado !== e.estado || edit.comentarios !== (e.comentarios ?? ''));
        })
        .map(e => {
          const key = e._rowIdx ?? e._localId;
          return { entry: e, estado: edits[key].estado, comentarios: edits[key].comentarios };
        });

      if (useLocal) {
        let stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
        if (toCreate.length) {
          const base    = stored.length;
          const newRows = toCreate.map((e, i) => ({ ...e, estado: 'Pendiente', comentarios: '', _localId: base + i }));
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

  if (loading) return (
    <div className="page-body">
      <div style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 24 }}>
        Cargando objetivos…
      </div>
    </div>
  );

  // group entries by project, sorted newest-first within each
  const entriesByProject = {};
  entries.forEach(e => {
    const pid = e.proyecto ?? 'GENERAL';
    if (!entriesByProject[pid]) entriesByProject[pid] = [];
    entriesByProject[pid].push(e);
  });
  Object.values(entriesByProject).forEach(arr =>
    arr.sort((a, b) => b.fecha.localeCompare(a.fecha))
  );

  const generalEntries = entriesByProject['GENERAL'] ?? [];

  const hasAnyDirty =
    activeProjects.some(p => getObjs(p.id).some(o => o.text?.trim())) ||
    extras.some(ex => ex.text?.trim()) ||
    entries.some(e => {
      const key = e._rowIdx ?? e._localId;
      const edit = edits[key];
      return edit && (edit.estado !== e.estado || edit.comentarios !== (e.comentarios ?? ''));
    });

  function renderObjectiveRow(e) {
    const key  = e._rowIdx ?? e._localId;
    const edit = edits[key] ?? { estado: e.estado, comentarios: e.comentarios ?? '' };
    const done = edit.estado === 'Hecho';
    const nope = edit.estado === 'No hecho';
    const isThisWeek = e.fecha === thisMonday;
    const draft = moveDrafts[key];

    return (
      <div key={key} style={{
        marginBottom: 8, padding: '10px 14px', borderRadius: 8,
        background: done ? 'rgba(0,164,64,0.06)' : nope ? 'rgba(239,92,67,0.06)' : 'oklch(0.975 0.002 250)',
        border: `1px solid ${done ? 'rgba(0,164,64,0.2)' : nope ? 'rgba(239,92,67,0.2)' : 'oklch(0.91 0.005 250)'}`,
      }}>
        {/* fecha + objetivo + botones de estado */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0,
            padding: '2px 8px', borderRadius: 4, marginTop: 1,
            background: isThisWeek ? 'rgba(99,102,241,0.10)' : 'oklch(0.93 0.005 250)',
            color: isThisWeek ? '#6366f1' : 'var(--ink-3)',
            fontWeight: isThisWeek ? 700 : 400,
          }}>
            {isThisWeek ? 'Esta semana' : fmtWeek(e.fecha)}
          </span>
          <span style={{
            flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.4,
            textDecoration: done ? 'line-through' : 'none',
            color: done ? 'var(--ink-3)' : 'var(--ink)',
          }}>{e.objetivo}</span>
        </div>

        {/* botones de revisión */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          {['Hecho', 'No hecho', 'Pendiente'].map(opt => (
            <button key={opt}
              onClick={() => setEdits(ed => ({ ...ed, [key]: { ...ed[key], estado: opt } }))}
              style={{
                padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.12s', border: '2px solid',
                borderColor: edit.estado === opt
                  ? (opt === 'Hecho' ? '#00A440' : opt === 'No hecho' ? '#ef5c43' : '#d97706')
                  : 'oklch(0.85 0.01 250)',
                background: edit.estado === opt
                  ? (opt === 'Hecho' ? '#00A440' : opt === 'No hecho' ? '#ef5c43' : '#fde68a')
                  : 'transparent',
                color: edit.estado === opt
                  ? (opt === 'Pendiente' ? '#92400e' : '#fff')
                  : 'var(--ink-2)',
              }}>
              {opt === 'Hecho' ? '✓ Hecho' : opt === 'No hecho' ? '✗ No hecho' : '○ Pendiente'}
            </button>
          ))}
        </div>

        {/* comentario */}
        <input className="input" placeholder="Comentario (opcional)"
          value={edit.comentarios}
          onChange={ev => setEdits(ed => ({ ...ed, [key]: { ...ed[key], comentarios: ev.target.value } }))}
          style={{ fontSize: 12 }}
        />

        {/* mover a otra semana */}
        {draft == null ? (
          <button
            onClick={() => setMoveDrafts(d => ({ ...d, [key]: nextMonday }))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 11, padding: '4px 0 0', display: 'block' }}>
            ↪ mover a otra semana
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <input type="date" className="input" value={draft}
              onChange={ev => setMoveDrafts(d => ({ ...d, [key]: ev.target.value }))}
              style={{ fontSize: 11, padding: '3px 8px', width: 150 }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              → {fmtWeek(getMondayStr(new Date(draft + 'T12:00:00')))}
            </span>
            <button className="btn btn-accent" disabled={movingKey === key}
              onClick={() => handleMove(e)}
              style={{ fontSize: 11, padding: '3px 12px' }}>
              {movingKey === key ? 'Moviendo…' : 'Mover'}
            </button>
            <button onClick={() => setMoveDrafts(d => { const n = { ...d }; delete n[key]; return n; })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 11 }}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderProjectSection(p) {
    const projEntries = entriesByProject[p.id] ?? [];
    const newObjs = getObjs(p.id);
    const pendCount = projEntries.filter(e => {
      const key = e._rowIdx ?? e._localId;
      return (edits[key]?.estado ?? e.estado) === 'Pendiente';
    }).length;

    return (
      <div key={p.id} style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
          paddingBottom: 5, borderBottom: '1px solid oklch(0.92 0.005 250)',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{p.id}</span>
          {p.desc && <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {p.desc}</span>}
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
            {pendCount > 0 && (
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 10, background: '#fde68a', color: '#92400e', fontWeight: 700 }}>
                {pendCount} pendiente{pendCount !== 1 ? 's' : ''}
              </span>
            )}
            {projEntries.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                {projEntries.length} obj.
              </span>
            )}
          </div>
        </div>

        {projEntries.map(e => renderObjectiveRow(e))}

        {/* nuevos objetivos */}
        {newObjs.map(obj => (
          <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}>+</span>
            <input className="input"
              placeholder={`Nuevo objetivo · esta semana`}
              value={obj.text}
              onChange={e => updObj(p.id, obj.id, e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
              autoFocus={newObjs.length === 1 && obj.id === newObjs[0].id}
            />
            <button onClick={() => remObj(p.id, obj.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        ))}
        <button onClick={() => addObj(p.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', paddingLeft: newObjs.length > 0 ? 22 : 0, marginTop: 2 }}>
          + agregar objetivo para esta semana
        </button>
      </div>
    );
  }

  const totalPendientes = entries.filter(e => {
    const key = e._rowIdx ?? e._localId;
    return (edits[key]?.estado ?? e.estado) === 'Pendiente';
  }).length;

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

        <div className="card">
          <div className="card-h">
            <span className="card-t">Objetivos por proyecto</span>
            <span className="card-sub">Semana del {fmtWeek(thisMonday)}</span>
            {totalPendientes > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)',
                padding: '2px 10px', borderRadius: 20, background: '#fde68a', color: '#92400e', fontWeight: 700,
              }}>
                {totalPendientes} sin revisar
              </span>
            )}
          </div>
          <div className="card-b">
            {clientGroups.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No hay proyectos activos.</div>
            )}

            {clientGroups.map(([cliente, projs], ci) => {
              const totalObj = projs.reduce((s, p) => s + (entriesByProject[p.id]?.length ?? 0), 0);
              return (
                <ClientSection key={cliente} cliente={cliente} colorIdx={ci} defaultOpen={true}
                  count={totalObj || null}>
                  {projs.map(p => renderProjectSection(p))}
                </ClientSection>
              );
            })}

            {/* Objetivos generales */}
            {(generalEntries.length > 0 || extras.length > 0) && (
              <ClientSection cliente="General" colorIdx={clientGroups.length} defaultOpen={true}
                count={generalEntries.length || null}>
                <div style={{ marginBottom: 20 }}>
                  {generalEntries.map(e => renderObjectiveRow(e))}
                  {extras.map((ex, i) => (
                    <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}>+</span>
                      <input className="input" placeholder="Nuevo objetivo general · esta semana"
                        value={ex.text}
                        onChange={e => setExtras(prev => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                        style={{ flex: 1, fontSize: 12 }}
                      />
                      <button onClick={() => setExtras(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setExtras(prev => [...prev, { id: Date.now(), text: '' }])}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                    + agregar objetivo general
                  </button>
                </div>
              </ClientSection>
            )}

            {generalEntries.length === 0 && extras.length === 0 && (
              <button onClick={() => setExtras(prev => [...prev, { id: Date.now(), text: '' }])}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                + agregar objetivo general
              </button>
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
              <button className="btn btn-accent" onClick={handleSave} disabled={saving || !hasAnyDirty}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
