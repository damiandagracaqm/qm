import { useState } from 'react';
import { addProject } from '../../services/graphService';

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

export function NuevoProyectoPage({ onCreated }) {
  const [form, setForm] = useState({ id: '', desc: '', ldp: '', finEst: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [created, setCreated] = useState(null); // guarda los datos del proyecto creado

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  const valid = form.id.trim() && form.desc.trim() && form.ldp.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      await addProject(form);
      setCreated({ ...form });
      setForm({ id: '', desc: '', ldp: '', finEst: '' });
    } catch (err) {
      setError(err.message || 'Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-body">
      <div style={{ maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Éxito */}
        {created && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '16px 20px', borderRadius: 10,
            background: 'var(--ok-soft)', border: '1px solid var(--ok)',
          }}>
            <span style={{ color: 'var(--ok)', flexShrink: 0, marginTop: 1 }}><CheckIcon /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--ok)', marginBottom: 2 }}>
                Proyecto creado correctamente
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                {created.id} — {created.desc}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm"
                  onClick={onCreated}
                >
                  Ver en proyectos
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCreated(null)}
                >
                  Crear otro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="card">
          <div className="card-h">
            <span className="card-t">Datos del proyecto</span>
            <span className="card-sub">Los campos marcados con * son obligatorios</span>
          </div>
          <div className="card-b">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <span className="field-l">N° de serie *</span>
                  <input
                    className="input"
                    placeholder="ej. QM 3001"
                    value={form.id}
                    onChange={e => set('id', e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <span className="field-l">Proyecto *</span>
                  <input
                    className="input"
                    placeholder="Nombre del proyecto"
                    value={form.desc}
                    onChange={e => set('desc', e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="field">
                  <span className="field-l">LDP *</span>
                  <input
                    className="input"
                    placeholder="Responsable del proyecto"
                    value={form.ldp}
                    onChange={e => set('ldp', e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="field">
                  <span className="field-l">Fecha entrega estimada</span>
                  <input
                    className="input"
                    type="date"
                    value={form.finEst}
                    onChange={e => set('finEst', e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 6,
                  background: 'var(--bad-soft)', color: 'var(--bad)',
                  fontSize: 12, fontWeight: 500,
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-accent"
                  type="submit"
                  disabled={!valid || loading}
                >
                  {loading ? 'Guardando en Excel…' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
          El proyecto se agrega como una nueva fila en la hoja "Estado de proyectos" con estado "Sin empezar".
          El resto de los campos se completan desde el Excel directamente.
        </div>
      </div>
    </div>
  );
}
