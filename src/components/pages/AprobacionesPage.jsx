import { useState } from 'react';

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}

export function AprobacionesPage({ pendReqs, histReqs, onResolve }) {
  const [tab, setTab] = useState('pend');

  return (
    <div className="page-body">
      <div className="toolbar">
        <button
          className={`filter-btn ${tab === 'pend' ? 'active' : ''}`}
          onClick={() => setTab('pend')}
        >
          Pendientes
          <span style={{
            marginLeft: 6, background: 'var(--accent)', color: 'oklch(0.18 0.015 250)',
            padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10,
          }}>
            {pendReqs.length}
          </span>
        </button>
        <button
          className={`filter-btn ${tab === 'hist' ? 'active' : ''}`}
          onClick={() => setTab('hist')}
        >
          Historial
          <span style={{ marginLeft: 6, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {histReqs.length}
          </span>
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Rol activo:{' '}
          <span style={{ color: 'var(--accent-ink)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 3, marginLeft: 4 }}>
            Admin
          </span>
        </span>
      </div>

      {tab === 'pend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendReqs.length === 0 && (
            <div className="card card-b" style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 40 }}>
              Sin solicitudes pendientes.
            </div>
          )}
          {pendReqs.map(r => (
            <div key={r.id} className="req">
              <div className="req-l">
                <div className="req-h">
                  <span className="pid mono">{r.proy}</span>
                  <span className="field">{r.campo}</span>
                  <span className="tag accent">Pendiente</span>
                </div>
                <div className="req-change">
                  <span className="from">{r.actual}</span>
                  <span style={{ color: 'var(--ink-3)' }}>→</span>
                  <span className="to">{r.prop}</span>
                </div>
                <div className="req-just">{r.just}</div>
                <div className="req-foot">
                  <span>Solicitó · {r.sol}</span>
                  <span>Fecha · {r.fecha}</span>
                </div>
              </div>
              <div className="req-actions">
                <button className="btn btn-reject" onClick={() => onResolve(r.id, 'rechazado')}>
                  <XIcon /> Rechazar
                </button>
                <button className="btn btn-approve" onClick={() => onResolve(r.id, 'aprobado')}>
                  <CheckIcon /> Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'hist' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="hist-row head">
            <span>Proyecto</span>
            <span>Estado</span>
            <span>Campo</span>
            <span>Cambio</span>
            <span>Solicitante</span>
            <span>Resuelto</span>
          </div>
          {histReqs.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>Sin historial.</div>
          )}
          {histReqs.map(r => (
            <div className="hist-row" key={r.id}>
              <span className="mono" style={{ fontWeight: 600 }}>{r.proy}</span>
              <span>
                <span className={`tag ${r.estado === 'aprobado' ? 'ok' : 'bad'}`}>{r.estado}</span>
              </span>
              <span style={{ color: 'var(--ink-2)' }}>{r.campo}</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                {r.actual} → <span style={{ color: 'var(--ink)' }}>{r.prop}</span>
              </span>
              <span style={{ color: 'var(--ink-2)' }}>
                {r.sol}<br />
                <small style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.fecha}</small>
              </span>
              <span style={{ color: 'var(--ink-2)' }}>
                {r.res}<br />
                <small style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.fechaRes}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
