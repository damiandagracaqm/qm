import { useState, useMemo } from 'react';
import { ESTADIOS, ESTADO_A_PASO } from '../../data/areas';
import { StatusTag } from '../common/StatusTag';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function projProgress(p) {
  const plan = Object.values(p.hhPlan || {}).reduce((a, b) => a + b, 0);
  const real = Object.values(p.hhReal || {}).reduce((a, b) => a + b, 0);
  return plan > 0 ? Math.min(100, Math.round(real / plan * 100)) : 0;
}

function desvioKind(d) {
  if (d === 0) return 'zero';
  if (d <= 30) return 'low';
  return 'high';
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
    </svg>
  );
}

function ChevIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

function ChevDownIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s' }}
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  );
}

function Pipeline({ estadio }) {
  const paso = ESTADO_A_PASO[estadio] ?? -1;
  const isFinished = paso >= 8;
  return (
    <div className="pipeline">
      {ESTADIOS.map((e, i) => {
        let cls = '';
        if (isFinished)   cls = 'done';
        else if (i < paso) cls = 'done';
        else if (i === paso) cls = 'active';
        return <div key={e} className={`pipe-step ${cls}`} title={e} />;
      })}
    </div>
  );
}

function ProjectCard({ p, onClick }) {
  const pr = projProgress(p);
  let kind = '';
  if (p.estado === 'Stand by' || p.estado === 'Cancelado') kind = 'is-pause';
  else if (p.desvio > 30) kind = 'is-critical';
  else if (p.desvio > 0) kind = 'is-warn';
  else if (p.estado === 'Entregado' || p.estado === 'Entregado a NQN') kind = 'is-ok';

  const desvioLabel = p.desvio === 0 ? 'En tiempo' : `+${p.desvio}d`;

  return (
    <div className={`pcard ${kind}`} onClick={onClick}>
      <div className="pcard-tip">
        {p.desc}
        <small>{p.cliente} · LDP {p.ldp}</small>
      </div>
      <div className="pcard-h">
        <div>
          <div className="pcard-id">{p.id}</div>
          <div className="pcard-cli">{p.cliente}</div>
        </div>
        <StatusTag estado={p.estado} />
      </div>

      <Pipeline estadio={p.estado} />

      <div className="pcard-stage">
        <span>{p.estado}</span>
        {p.prox && p.prox !== '—' && <span className="next">→ {p.prox}</span>}
      </div>

      <div className="pcard-foot">
        <div>
          <span className="l">Avance</span>
          <div className="pcard-pct">
            <div className="pcard-pct-bar"><i style={{ width: `${pr}%` }} /></div>
            <span className="v">{pr}%</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="l">Desvío</span>
          <span className={`p-desv ${desvioKind(p.desvio)}`} style={{ fontSize: 11.5 }}>{desvioLabel}</span>
        </div>
      </div>
    </div>
  );
}

const FILTERS = ['Todos', 'En proceso', 'Críticos', 'Entregados', 'Stand by'];
const ESTADOS_EXCLUIDOS = new Set(['Cancelado', 'Entregado', 'Entregado a NQN', 'Entregado parcialmente', 'Stand by', 'Sin empezar']);
const GROUP_OPTIONS = [['cliente', 'Cliente'], ['ldp', 'LDP'], ['none', 'Ninguno']];

export function ProyectosPage({ projects, onOpenDetail }) {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [groupBy, setGroupBy] = useState('cliente');
  const [view, setView] = useState('grid');
  const [expanded, setExpanded] = useState(new Set());

  function toggleExpanded(key) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isEntregados = filterEstado === 'Entregados';

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const q = search.toLowerCase();
      const m = !q || p.id.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q) ||
        (p.cliente || '').toLowerCase().includes(q) || (p.ldp || '').toLowerCase().includes(q);
      const e = filterEstado === 'Todos'
        || (filterEstado === 'En proceso' && !ESTADOS_EXCLUIDOS.has(p.estado))
        || (filterEstado === 'Críticos' && p.desvio > 30)
        || (filterEstado === 'Entregados' && (p.estado === 'Entregado' || p.estado === 'Entregado a NQN'))
        || (filterEstado === 'Stand by' && p.estado === 'Stand by');
      return m && e;
    });
  }, [projects, search, filterEstado]);

  const grouped = useMemo(() => {
    if (isEntregados) return null;
    if (groupBy === 'none') return [['Todos', filtered]];
    const m = {};
    filtered.forEach(p => { (m[p[groupBy]] ||= []).push(p); });
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length);
  }, [filtered, groupBy, isEntregados]);

  const deliveryGroups = useMemo(() => {
    if (!isEntregados) return null;
    const byYearMonth = {};
    filtered.forEach(p => {
      const date = p.finEst || p.finPlan || '';
      const parts = date.split('-');
      const year = parts[0];
      const monthIdx = parts[1] ? parseInt(parts[1], 10) - 1 : null;
      if (!year || monthIdx === null) return;
      if (!byYearMonth[year]) byYearMonth[year] = {};
      const monthKey = parts[1];
      if (!byYearMonth[year][monthKey]) byYearMonth[year][monthKey] = { idx: monthIdx, items: [] };
      byYearMonth[year][monthKey].items.push(p);
    });
    return Object.entries(byYearMonth)
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        months: Object.entries(months)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([key, { idx, items }]) => ({ key, idx, items })),
      }));
  }, [filtered, isEntregados]);

  return (
    <div className="page-body">
      <div className="toolbar">
        <div className="search">
          <SearchIcon />
          <input
            placeholder="Buscar por ID, descripción, cliente, LDP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-btn ${filterEstado === f ? 'active' : ''}`}
            onClick={() => setFilterEstado(f)}
          >
            {f}
          </button>
        ))}
        {!isEntregados && (
          <>
            <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Agrupar
            </span>
            {GROUP_OPTIONS.map(([k, l]) => (
              <button
                key={k}
                className={`filter-btn ${groupBy === k ? 'active' : ''}`}
                onClick={() => setGroupBy(k)}
              >
                {l}
              </button>
            ))}
          </>
        )}
        <div className="view-toggle">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>
            <GridIcon /> Grilla
          </button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            <ListIcon /> Lista
          </button>
        </div>
      </div>

      {isEntregados && deliveryGroups && deliveryGroups.map(({ year, months }) => {
        const yearOpen = expanded.has(year);
        const yearTotal = months.reduce((a, m) => a + m.items.length, 0);
        return (
          <div className="year-group" key={year}>
            <button className="year-header" onClick={() => toggleExpanded(year)}>
              <ChevDownIcon open={yearOpen} />
              <span className="year-label">{year}</span>
              <span className="year-count mono">{yearTotal} {yearTotal === 1 ? 'proyecto' : 'proyectos'}</span>
            </button>

            {yearOpen && months.map(({ key, idx, items }) => {
              const monthKey = `${year}-${key}`;
              const monthOpen = expanded.has(monthKey);
              return (
                <div className="month-group" key={key}>
                  <button className="month-header" onClick={() => toggleExpanded(monthKey)}>
                    <ChevDownIcon open={monthOpen} />
                    <span className="month-label">{MESES[idx]}</span>
                    <span className="month-count mono">{items.length} {items.length === 1 ? 'proyecto' : 'proyectos'}</span>
                  </button>

                  {monthOpen && (
                    view === 'grid' ? (
                      <div className="proj-grid">
                        {items.map(p => (
                          <ProjectCard key={p.id} p={p} onClick={() => onOpenDetail(p.id)} />
                        ))}
                      </div>
                    ) : (
                      <div className="proj-table">
                        <div className="proj-row head">
                          <span>ID</span><span>Descripción</span><span>Cliente</span><span>LDP</span>
                          <span>Avance</span><span style={{ textAlign: 'right' }}>Desvío</span><span>Estadío</span><span />
                        </div>
                        {items.map(p => {
                          const pr = projProgress(p);
                          return (
                            <div className="proj-row" key={p.id} onClick={() => onOpenDetail(p.id)}>
                              <span className="p-id mono">{p.id}</span>
                              <span className="p-desc">
                                {p.desc}
                                <small>Inicio {p.inicio} · Entrega {p.finEst}</small>
                              </span>
                              <span className="p-cli">{p.cliente}</span>
                              <span className="p-ldp">{p.ldp}</span>
                              <div className="p-progress">
                                <div className="p-bar"><div className="p-fill" style={{ width: `${pr}%` }} /></div>
                                <span className="p-pct">{pr}%</span>
                              </div>
                              <span className={`p-desv ${desvioKind(p.desvio)}`}>
                                {p.desvio === 0 ? '—' : `+${p.desvio}d`}
                              </span>
                              <span><span className="chip mono">{p.estado}</span></span>
                              <span className="chev"><ChevIcon /></span>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {!isEntregados && grouped && grouped.map(([key, items]) => {
        const totalHHReal = items.reduce((a, p) => a + Object.values(p.hhReal || {}).reduce((x, y) => x + y, 0), 0);
        const totalHHPlan = items.reduce((a, p) => a + Object.values(p.hhPlan || {}).reduce((x, y) => x + y, 0), 0);
        const atrasados = items.filter(p => p.desvio > 0).length;
        const groupOpen = groupBy === 'none' || expanded.has(key);

        return (
          <div className="client-group" key={key}>
            {groupBy !== 'none' && (
              <button className="client-h" onClick={() => toggleExpanded(key)}>
                <ChevDownIcon open={groupOpen} />
                <span className="c-name">{key}</span>
                <span className="c-count mono">{items.length} proy.</span>
                <div className="client-h-meta">
                  <span>HH <b className="mono">{totalHHReal.toLocaleString()}</b>/{totalHHPlan.toLocaleString()}</span>
                  <span>Atrasados <b className="mono">{atrasados}</b></span>
                </div>
              </button>
            )}

            {groupOpen && (view === 'grid' ? (
              <div className="proj-grid">
                {items.map(p => (
                  <ProjectCard key={p.id} p={p} onClick={() => onOpenDetail(p.id)} />
                ))}
                {items.length === 0 && (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)', gridColumn: '1/-1' }}>Sin resultados.</div>
                )}
              </div>
            ) : (
              <div className="proj-table">
                <div className="proj-row head">
                  <span>ID</span>
                  <span>Descripción</span>
                  <span>Cliente</span>
                  <span>LDP</span>
                  <span>Avance</span>
                  <span style={{ textAlign: 'right' }}>Desvío</span>
                  <span>Estadío</span>
                  <span />
                </div>
                {items.map(p => {
                  const pr = projProgress(p);
                  return (
                    <div className="proj-row" key={p.id} onClick={() => onOpenDetail(p.id)}>
                      <span className="p-id mono">{p.id}</span>
                      <span className="p-desc">
                        {p.desc}
                        <small>Inicio {p.inicio} · Entrega {p.finEst}</small>
                      </span>
                      <span className="p-cli">{p.cliente}</span>
                      <span className="p-ldp">{p.ldp}</span>
                      <div className="p-progress">
                        <div className="p-bar"><div className="p-fill" style={{ width: `${pr}%` }} /></div>
                        <span className="p-pct">{pr}%</span>
                      </div>
                      <span className={`p-desv ${desvioKind(p.desvio)}`}>
                        {p.desvio === 0 ? '—' : `+${p.desvio}d`}
                      </span>
                      <span><span className="chip mono">{p.estado}</span></span>
                      <span className="chev"><ChevIcon /></span>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>Sin resultados.</div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
