import { useMemo } from 'react';

const ESTADOS_EXCLUIDOS = new Set(['Cancelado', 'Entregado', 'Entregado a NQN', 'Stand by', 'Sin empezar']);
const ESTADOS_ENTREGADO = ['Entregado', 'Entregado a NQN'];

export function KpiPage({ projects }) {
  const activos    = useMemo(() => projects.filter(p => !ESTADOS_EXCLUIDOS.has(p.estado)), [projects]);
  const entregados = useMemo(() => projects.filter(p => ESTADOS_ENTREGADO.includes(p.estado)), [projects]);

  const TODAY     = new Date().toISOString().split('T')[0];
  const enTiempo  = activos.filter(p => p.finEst && p.finEst !== '—' && p.finEst >= TODAY).length;
  const conDesvio = activos.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const criticos  = activos.filter(p => p.desvio > 30).length;

  const totalHHPlan = useMemo(() =>
    activos.reduce((a, p) => a + Object.values(p.hhPlan || {}).reduce((x, y) => x + y, 0), 0),
    [activos]
  );
  const totalHHReal = useMemo(() =>
    activos.reduce((a, p) => a + Object.values(p.hhReal || {}).reduce((x, y) => x + y, 0), 0),
    [activos]
  );

  return (
    <div className="page-body">
      <div className="kpi-grid">
        <div className="kpi-cell">
          <span className="kpi-label">Activos</span>
          <span className="kpi-value">{activos.length}</span>
          <span className="kpi-trend">En planta</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">En tiempo</span>
          <span className="kpi-value ok">{enTiempo}</span>
          <span className="kpi-trend">
            {activos.length > 0 ? Math.round(enTiempo / activos.length * 100) : 0}% del activo
          </span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Con desvío</span>
          <span className="kpi-value warn">{conDesvio}</span>
          <span className="kpi-trend">≤ 30 días</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Críticos</span>
          <span className="kpi-value bad">{criticos}</span>
          <span className="kpi-trend">&gt; 30 días</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Entregados</span>
          <span className="kpi-value">{entregados.length}</span>
          <span className="kpi-trend">total histórico</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">HH planificadas</span>
          <span className="kpi-value" style={{ fontSize: 28 }}>{totalHHPlan.toLocaleString()}</span>
          <span className="kpi-trend">proyectos activos</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">HH consumidas</span>
          <span className="kpi-value" style={{ fontSize: 28 }}>{totalHHReal.toLocaleString()}</span>
          <span className="kpi-trend">
            {totalHHPlan > 0 ? Math.round(totalHHReal / totalHHPlan * 100) : 0}% del plan
          </span>
        </div>
      </div>
    </div>
  );
}
