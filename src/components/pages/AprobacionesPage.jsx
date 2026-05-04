import { StatusTag } from '../common/StatusTag';

export function AprobacionesPage({ pendReqs, histReqs, onResolve }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div className="ch"><span className="ct">Solicitudes pendientes</span></div>
        <div style={{ padding: 14 }}>
          {pendReqs.length === 0
            ? <div className="empty">No hay solicitudes pendientes</div>
            : pendReqs.map(r => (
                <div className="req-item" key={r.id}>
                  <div className="ri-h">
                    <span className="ri-t">{r.proy} — {r.campo}</span>
                    <span className="ri-m">{r.sol} · {r.fecha}</span>
                  </div>
                  <div className="ri-b">
                    <b>Actual:</b> {r.actual} → <b>Propuesto:</b> {r.prop}
                    <br /><span style={{ marginTop: 3, display: 'block' }}>{r.just}</span>
                  </div>
                  <div className="ra">
                    <button className="bok" onClick={() => onResolve(r.id, 'aprobado')}>Aprobar</button>
                    <button className="brej" onClick={() => onResolve(r.id, 'rechazado')}>Rechazar</button>
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      <div className="card">
        <div className="ch"><span className="ct">Historial resuelto</span></div>
        <div style={{ padding: 14 }}>
          {histReqs.length === 0
            ? <div className="empty">Sin historial</div>
            : histReqs.map(r => (
                <div key={r.id} style={{ padding: '9px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 500 }}>{r.proy} — {r.campo}</span>
                    <StatusTag estado={r.estado} />
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {r.actual} → {r.prop} · {r.sol} · Resuelto: {r.res} ({r.fechaRes})
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
