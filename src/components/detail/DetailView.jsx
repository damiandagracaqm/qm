import { useState } from 'react';
import { AREAS, ESTADIOS } from '../../data/areas';
import { StatusTag, DesvioTag } from '../common/StatusTag';
import { AreaBars } from '../common/AreaBars';
import { GanttChart } from './GanttChart';

function BackIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
    </svg>
  );
}

function BudgetGauge({ budget }) {
  const pct = budget.total > 0 ? Math.round(budget.consumido / budget.total * 100) : 0;
  const color = pct > 100 ? 'var(--bad)' : pct > 85 ? 'var(--warn)' : 'var(--ok)';
  const C = Math.PI * 70;
  const dash = (Math.min(pct, 100) / 100) * C;

  return (
    <div className="gauge">
      <svg className="gauge-svg" viewBox="0 0 180 110">
        <path className="gauge-track" d="M 20 100 A 70 70 0 0 1 160 100" />
        <path
          className="gauge-fill"
          d="M 20 100 A 70 70 0 0 1 160 100"
          strokeDasharray={`${dash} ${C}`}
          stroke={color}
        />
      </svg>
      <div style={{ textAlign: 'center', marginTop: -32 }}>
        <div className="gauge-val" style={{ color }}>{pct}%</div>
        <div className="gauge-cap">
          USD {(budget.consumido / 1000).toFixed(0)}k de {(budget.total / 1000).toFixed(0)}k
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
        <span>Materiales <b style={{ color: 'var(--ink)' }}>USD {(budget.materiales / 1000).toFixed(0)}k</b></span>
        <span>Mano obra <b style={{ color: 'var(--ink)' }}>USD {(budget.manoObra / 1000).toFixed(0)}k</b></span>
      </div>
    </div>
  );
}

function ChangeRequestForm({ proyId, onSubmit }) {
  const [campo, setCampo] = useState('Fecha entrega estimada');
  const [act, setAct] = useState('');
  const [prop, setProp] = useState('');
  const [just, setJust] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!act || !prop || !just) return;
    onSubmit({ campo, actual: act, prop, just, proy: proyId });
    setAct(''); setProp(''); setJust('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3500);
  }

  return (
    <div>
      {submitted && (
        <div style={{
          padding: '10px 14px', background: 'var(--ok-soft)', color: 'var(--ok)',
          borderRadius: 6, fontSize: 12, marginBottom: 12, fontWeight: 500,
        }}>
          Solicitud enviada. Se notificó al admin.
        </div>
      )}
      <div className="form-grid">
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <span className="field-l">Campo a modificar</span>
          <select className="select-field" value={campo} onChange={e => setCampo(e.target.value)}>
            <option>Fecha entrega estimada</option>
            <option>Estadío actual</option>
            <option>% avance área</option>
            <option>Causa replanificación</option>
            <option>Otro</option>
          </select>
        </div>
        <div className="field">
          <span className="field-l">Valor actual</span>
          <input className="input" placeholder="ej. 17/04/2026" value={act} onChange={e => setAct(e.target.value)} />
        </div>
        <div className="field">
          <span className="field-l">Valor propuesto</span>
          <input className="input" placeholder="ej. 30/04/2026" value={prop} onChange={e => setProp(e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <span className="field-l">Justificación</span>
          <textarea className="textarea" placeholder="Describí el motivo del cambio…" value={just} onChange={e => setJust(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-accent" onClick={handleSubmit}>Enviar solicitud</button>
      </div>
    </div>
  );
}

export function DetailView({ project, onBack, onSubmitCR }) {
  if (!project) return null;
  const p = project;
  const si = ESTADIOS.indexOf(p.estadio);
  const totalP = p.hhPlanTotal ?? Object.values(p.hhPlan || {}).reduce((a, b) => a + b, 0);
  const totalR = p.hhRealTotal ?? Object.values(p.hhReal || {}).reduce((a, b) => a + b, 0);
  const pctHH = totalP > 0 ? Math.min(999, Math.round(totalR / totalP * 100)) : 0;

  const desvioColor = p.desvio > 30 ? 'var(--bad)' : p.desvio > 0 ? 'var(--warn)' : 'var(--ink)';

  return (
    <div className="page-body">
      <div className="detail-head">
        <div className="detail-id-line">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <BackIcon /> Volver a Proyectos
          </button>
          <span style={{ flex: 1 }} />
          <StatusTag estado={p.estado} />
          <DesvioTag desvio={p.desvio} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 8 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>{p.id}</div>
            <div className="detail-title">{p.desc}</div>
          </div>
          <button className="btn" onClick={() => alert(`PDF de ${p.id} en producción.`)}>
            <DownloadIcon /> Exportar PDF
          </button>
        </div>
        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="l">Cliente</span><span className="v">{p.cliente}</span>
          </div>
          <div className="detail-meta-item">
            <span className="l">Líder de Proyecto</span><span className="v">{p.ldp}</span>
          </div>
          <div className="detail-meta-item">
            <span className="l">Inicio · KOM</span><span className="v mono">{p.inicio}</span>
          </div>
          <div className="detail-meta-item">
            <span className="l">Fin planificado</span><span className="v mono">{p.finPlan}</span>
          </div>
          <div className="detail-meta-item">
            <span className="l">Fin estimado</span>
            <span className="v mono" style={{ color: desvioColor }}>{p.finEst}</span>
          </div>
          <div className="detail-meta-item">
            <span className="l">Replanificaciones</span>
            <span className="v mono">{(p.replans || []).length}</span>
          </div>
        </div>
        <div className="flow">
          {ESTADIOS.map((e, i) => (
            <span key={e} className={`flow-step ${i < si ? 'done' : i === si ? 'active' : ''}`}>{e}</span>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-h"><span className="card-t">Datos generales</span></div>
          <div className="card-b" style={{ paddingTop: 8, paddingBottom: 8 }}>
            <div className="info-row"><span className="l">Estadío actual</span><span className="v">{p.estadio}</span></div>
            <div className="info-row"><span className="l">Próximo estadío</span><span className="v">{p.prox}</span></div>
            <div className="info-row"><span className="l">HH plan / real</span><span className="v mono">{totalP.toLocaleString()} / {totalR.toLocaleString()}</span></div>
            <div className="info-row"><span className="l">% Avance HH</span><span className="v mono">{pctHH}%</span></div>
            <div className="info-row">
              <span className="l">Desvío</span>
              <span className="v mono" style={{ color: desvioColor }}>
                {p.desvio === 0 ? 'En tiempo' : `+${p.desvio} días`}
              </span>
            </div>
            <div className="info-row"><span className="l">Inicio</span><span className="v mono">{p.inicio}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><span className="card-t">Presupuesto</span><span className="card-sub">USD</span></div>
          <div className="card-b">
            <BudgetGauge budget={p.budget} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="card-t">Cronograma · avance por etapa</span>
          <span className="card-sub">Vista semanal</span>
        </div>
        <GanttChart gantt={p.gantt} />
      </div>

      <div className="card">
        <div className="card-h">
          <span className="card-t">HH por área — planificado vs consumido</span>
          <span className="card-sub">{pctHH}% global</span>
        </div>
        <div className="card-b">
          <AreaBars hhPlan={p.hhPlan} hhReal={p.hhReal} />
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="card-t">Historial de replanificaciones</span>
          <span className="card-sub">{(p.replans || []).length} eventos</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {(p.replans || []).length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>Sin replanificaciones registradas.</div>
          ) : (
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Fecha anterior</th>
                  <th>Nueva fecha</th>
                  <th>Causa</th>
                </tr>
              </thead>
              <tbody>
                {(p.replans || []).map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{r.desde}</td>
                    <td className="mono">{r.hasta}</td>
                    <td>{r.causa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="card-t">Solicitar cambio (Change Request)</span>
          <span className="card-sub">Requiere aprobación de admin</span>
        </div>
        <div className="card-b">
          <ChangeRequestForm proyId={p.id} onSubmit={onSubmitCR} />
        </div>
      </div>
    </div>
  );
}
