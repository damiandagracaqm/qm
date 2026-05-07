import { useState, useMemo } from 'react';

const ESTADOS_EXCLUIDOS = new Set(['Cancelado', 'Entregado', 'Entregado a NQN', 'Stand by', 'Sin empezar']);
const ESTADOS_ENTREGADO  = ['Entregado', 'Entregado a NQN'];

function desvioColor(desvio) {
  if (desvio == null) return 'var(--ink-3)';
  if (desvio > 30)    return 'var(--bad)';
  if (desvio > 0)     return 'var(--warn)';
  return 'var(--ok)';
}

function ChevIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function StatusDot({ desvio }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: desvioColor(desvio),
      flexShrink: 0, display: 'inline-block',
    }} />
  );
}

function DesvioTag({ desvio }) {
  if (desvio == null) return <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>—</span>;
  const color = desvioColor(desvio);
  const softVar = desvio > 30 ? 'var(--bad-soft)' : desvio > 0 ? 'var(--warn-soft)' : 'var(--ok-soft)';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: desvio > 30 ? 600 : 400,
      color, background: softVar, padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
    }}>
      {desvio === 0 ? 'En tiempo' : `+${desvio} días`}
    </span>
  );
}

function ProjectRow({ p, onOpenDetail }) {
  return (
    <div className="meet-row" onClick={() => onOpenDetail?.(p.id)}>
      <StatusDot desvio={p.desvio} />
      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{p.id}</span>
      <span style={{ fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.desc}</span>
      <span className="chip mono" style={{ whiteSpace: 'nowrap', fontSize: 10.5, justifySelf: 'start' }}>{p.estado}</span>
      <span className="mono" style={{ fontSize: 11, color: p.desvio > 0 ? desvioColor(p.desvio) : 'var(--ink-2)', whiteSpace: 'nowrap' }}>
        {p.finEst && p.finEst !== '—' ? p.finEst : '—'}
      </span>
      <DesvioTag desvio={p.desvio} />
      <span style={{ color: 'var(--ink-3)' }}><ChevIcon /></span>
    </div>
  );
}

function LdpGroup({ ldp, projects, onOpenDetail, isLast }) {
  const criticals = projects.filter(p => p.desvio > 30).length;
  const warns     = projects.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const sorted    = [...projects].sort((a, b) => (b.desvio ?? 0) - (a.desvio ?? 0));

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>
      <div className="ldp-h">
        <span className="ldp-name">{ldp}</span>
        <span className="ldp-count">{projects.length} proy.</span>
        {criticals > 0 && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--bad)',
            background: 'var(--bad-soft)', padding: '1px 6px', borderRadius: 3,
          }}>
            {criticals} crítico{criticals > 1 ? 's' : ''}
          </span>
        )}
        {warns > 0 && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'oklch(0.5 0.13 75)',
            background: 'var(--warn-soft)', padding: '1px 6px', borderRadius: 3,
          }}>
            {warns} con desvío
          </span>
        )}
      </div>
      {sorted.map((p, i) => (
        <ProjectRow
          key={p.id}
          p={p}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}

export function KpiPage({ projects, onOpenDetail }) {
  const [clienteSel, setClienteSel] = useState('Todos');

  const activos    = useMemo(() => projects.filter(p => !ESTADOS_EXCLUIDOS.has(p.estado)), [projects]);
  const entregados = useMemo(() => projects.filter(p => ESTADOS_ENTREGADO.includes(p.estado)), [projects]);

  const clientes = useMemo(() => {
    const set = new Set(activos.map(p => p.cliente).filter(Boolean));
    return ['Todos', ...Array.from(set).sort()];
  }, [activos]);

  const proyFiltrados = useMemo(() =>
    clienteSel === 'Todos' ? activos : activos.filter(p => p.cliente === clienteSel),
    [activos, clienteSel]
  );

  const entregadosFiltrados = useMemo(() =>
    clienteSel === 'Todos' ? entregados : entregados.filter(p => p.cliente === clienteSel),
    [entregados, clienteSel]
  );

  const TODAY = new Date().toISOString().split('T')[0];
  const enTiempo  = proyFiltrados.filter(p => p.finEst && p.finEst !== '—' && p.finEst >= TODAY).length;
  const conDesvio = proyFiltrados.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const criticos  = proyFiltrados.filter(p => p.desvio > 30).length;

  const ldpGroups = useMemo(() => {
    const map = {};
    proyFiltrados.forEach(p => {
      const ldp = p.ldp || 'Sin asignar';
      if (!map[ldp]) map[ldp] = [];
      map[ldp].push(p);
    });
    return Object.entries(map).sort(([, a], [, b]) => {
      const critA = a.filter(p => p.desvio > 30).length;
      const critB = b.filter(p => p.desvio > 30).length;
      if (critB !== critA) return critB - critA;
      const warnA = a.filter(p => p.desvio > 0).length;
      const warnB = b.filter(p => p.desvio > 0).length;
      return warnB - warnA;
    });
  }, [proyFiltrados]);

  function clientStats(c) {
    const proys = c === 'Todos' ? activos : activos.filter(p => p.cliente === c);
    return { count: proys.length, hasCritical: proys.some(p => p.desvio > 30) };
  }

  return (
    <div className="page-body">

      {/* ── Summary bar ───────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-cell">
          <span className="kpi-label">Activos</span>
          <span className="kpi-value">{proyFiltrados.length}</span>
          <span className="kpi-trend">{clienteSel === 'Todos' ? 'En planta' : clienteSel}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">En tiempo</span>
          <span className="kpi-value ok">{enTiempo}</span>
          <span className="kpi-trend">
            {proyFiltrados.length > 0 ? Math.round(enTiempo / proyFiltrados.length * 100) : 0}% del activo
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
          <span className="kpi-value">{entregadosFiltrados.length}</span>
          <span className="kpi-trend">{clienteSel === 'Todos' ? 'total histórico' : clienteSel}</span>
        </div>
      </div>

      {/* ── Client tabs ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {clientes.map(c => {
          const { count, hasCritical } = clientStats(c);
          const isActive = clienteSel === c;
          return (
            <button
              key={c}
              className={`filter-btn${isActive ? ' active' : ''}`}
              onClick={() => setClienteSel(c)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {c}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                background: isActive ? 'oklch(0.35 0.015 250)' : 'var(--surface-2)',
                color: isActive ? 'oklch(0.82 0.005 80)' : 'var(--ink-3)',
                padding: '1px 5px', borderRadius: 3,
              }}>{count}</span>
              {hasCritical && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isActive ? 'oklch(0.72 0.18 25)' : 'var(--bad)',
                  display: 'inline-block', flexShrink: 0,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Projects by LDP ───────────────────────────── */}
      <div className="card">
        <div className="meet-row meet-head">
          <span />
          <span>ID</span>
          <span>Proyecto</span>
          <span>Estado</span>
          <span>Entrega est.</span>
          <span>Desvío</span>
          <span />
        </div>
        {ldpGroups.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
            Sin proyectos activos{clienteSel !== 'Todos' ? ` para ${clienteSel}` : ''}.
          </div>
        ) : (
          ldpGroups.map(([ldp, proyectos], i) => (
            <LdpGroup
              key={ldp}
              ldp={ldp}
              projects={proyectos}
              onOpenDetail={onOpenDetail}
              isLast={i === ldpGroups.length - 1}
            />
          ))
        )}
      </div>

    </div>
  );
}
