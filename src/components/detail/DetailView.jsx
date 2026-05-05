import { useState } from 'react';
import { AREAS, ESTADIOS } from '../../data/areas';
import { StatusTag, DesvioTag } from '../common/StatusTag';
import { AreaBars } from '../common/AreaBars';
import { GanttChart } from './GanttChart';

function InfoRow({ label, value, style }) {
  return (
    <div className="ir">
      <span className="il">{label}</span>
      <span className="iv" style={style}>{value}</span>
    </div>
  );
}

function BudgetSection({ pct }) {
  const color = pct > 100 ? '#dc2626' : pct > 85 ? '#d97706' : '#16a34a';
  const bg    = pct > 100 ? '#fee2e2' : pct > 85 ? '#fef3c7' : '#dcfce7';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Presupuesto consumido</div>
      <div style={{ fontSize: 38, fontWeight: 600, color, background: bg, padding: '10px 28px', borderRadius: 12, lineHeight: 1 }}>{pct}%</div>
    </div>
  );
}

function ChangeRequestForm({ proyId, onSubmit }) {
  const [campo, setCampo] = useState('Fecha entrega estimada');
  const [act, setAct] = useState('');
  const [nw, setNw] = useState('');
  const [just, setJust] = useState('');

  function handleSubmit() {
    if (!act || !nw || !just) { alert('Completá todos los campos.'); return; }
    onSubmit({ campo, actual: act, prop: nw, just, proy: proyId });
    setAct(''); setNw(''); setJust('');
    alert('Solicitud enviada. Un administrador la revisará.');
  }

  return (
    <div className="cr-form">
      <div>
        <label className="fl">Campo a modificar</label>
        <select className="fs2" value={campo} onChange={e => setCampo(e.target.value)}>
          <option>Fecha entrega estimada</option>
          <option>Estadío actual</option>
          <option>% avance área</option>
          <option>Causa replanificación</option>
          <option>Otro</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="fl">Valor actual</label>
          <input className="fi2" placeholder="Valor actual..." value={act} onChange={e => setAct(e.target.value)} />
        </div>
        <div>
          <label className="fl">Valor propuesto</label>
          <input className="fi2" placeholder="Nuevo valor..." value={nw} onChange={e => setNw(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="fl">Justificación</label>
        <textarea className="ft2" placeholder="Describí el motivo..." value={just} onChange={e => setJust(e.target.value)} />
      </div>
      <div><button className="btnp" onClick={handleSubmit}>Enviar solicitud</button></div>
    </div>
  );
}

export function DetailView({ project, onBack, onSubmitCR }) {
  if (!project) return null;
  const p = project;
  const si = ESTADIOS.indexOf(p.estadio);
  const totalP = p.hhPlanTotal ?? Object.values(p.hhPlan).reduce((a, b) => a + b, 0);
  const totalR = p.hhRealTotal ?? Object.values(p.hhReal).reduce((a, b) => a + b, 0);
  const pctHH = totalP > 0 ? Math.round(totalR / totalP * 100) : 0;
  const pctBudget = p.budgetPct ?? (p.budget.total > 0 ? Math.round(p.budget.consumido / p.budget.total * 100) : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="back" onClick={onBack}>← Volver</button>
        <button className="exp-btn" onClick={() => alert(`En la versión real: se genera el PDF de ${p.id}.`)}>↓ Exportar PDF proyecto</button>
      </div>

      <div className="dh">
        <div className="dt">{p.id} — {p.desc}</div>
        <div className="dm">
          <StatusTag estado={p.estado} />
          <span>Cliente: <b>{p.cliente}</b></span>
          <span>LDP: <b>{p.ldp}</b></span>
          <span>Entrega est.: <b>{p.finEst}</b></span>
          <DesvioTag desvio={p.desvio} />
        </div>
        <div className="flow">
          {ESTADIOS.map((e, i) => {
            let c = 'fp';
            if (i < si) c = 'fd';
            if (i === si) c = 'fa';
            return (
              <span key={e} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {i > 0 && <span style={{ color: 'var(--color-text-secondary)', fontSize: 10 }}>›</span>}
                <span className={`fi ${c}`}>{e}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="two">
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Datos generales</div>
          <InfoRow label="Estado" value={p.estado} />
          <InfoRow label="Estadío actual" value={p.estadio} />
          <InfoRow label="Próximo estadío" value={p.prox} />
          <InfoRow label="Inicio" value={p.inicio} />
          <InfoRow label="Fin planificado" value={p.finPlan} />
          <InfoRow label="Fin estimado" value={p.finEst} />
          <InfoRow label="Desvío" value={p.desvio === 0 ? 'En tiempo' : `+${p.desvio} días`} />
          <InfoRow label="HH plan / real" value={`${totalP.toLocaleString()} / ${totalR.toLocaleString()} (${pctHH}%)`} />
          <InfoRow label="Replanificaciones" value={p.replans.length} />
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Presupuesto</div>
          <BudgetSection pct={pctBudget} />
        </div>
      </div>

      <div className="card">
        <div className="ch"><span className="ct">Gantt — avance por etapa (semanas)</span></div>
        <GanttChart gantt={p.gantt} />
      </div>

      <div className="card">
        <div className="ch"><span className="ct">HH por área — planificado vs consumido</span></div>
        <div className="cp"><AreaBars hhPlan={p.hhPlan} hhReal={p.hhReal} /></div>
      </div>

      <div className="card">
        <div className="ch"><span className="ct">Historial de replanificaciones</span></div>
        <div style={{ padding: 14, overflowX: 'auto' }}>
          {p.replans.length === 0
            ? <div className="empty">Sin replanificaciones</div>
            : (
              <table className="rt">
                <thead><tr><th>Fecha anterior</th><th>Nueva fecha</th><th>Causa</th></tr></thead>
                <tbody>
                  {p.replans.map((r, i) => (
                    <tr key={i}><td>{r.desde}</td><td>{r.hasta}</td><td>{r.causa}</td></tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 12 }}>Solicitar cambio</div>
        <ChangeRequestForm proyId={p.id} onSubmit={onSubmitCR} />
      </div>
    </div>
  );
}
