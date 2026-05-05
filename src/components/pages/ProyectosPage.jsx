import { useState, useMemo } from 'react';
import { ESTADIOS } from '../../data/areas';
import { StatusTag } from '../common/StatusTag';

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

function Pipeline({ estadio, estado }) {
  const idx = ESTADIOS.indexOf(estadio);
  const isFinished = estado === 'Entregado' || estado === 'Entregado a NQN';
  return (
    <div className="pipeline">
      {ESTADIOS.map((e, i) => {
        let cls = '';
        if (isFinished) cls = 'done';
        else if (i < idx) cls = 'done';
        else if (i === idx) cls = 'active';
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

      <Pipeline estadio={p.estadio} estado={p.estado} />

      <div className="pcard-stage">
        <span>{p.estadio}</span>
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

const FILTERS = ['Todos', 'En proceso', 'Atrasados', 'Críticos', 'Entregados', 'Stand by'];
const GROUP_OPTIONS = [['cliente', 'Cliente'], ['ldp', 'LDP'], ['none', 'Ninguno']];

export function ProyectosPage({ projects, onOpenDetail }) {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [groupBy, setGroupBy] = useState('cliente');
  const [view, setView] = useState('grid');

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const q = search.toLowerCase();
      const m = !q || p.id.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q) ||
        (p.cliente || '').toLowerCase().includes(q) || (p.ldp || '').toLowerCase().includes(q);
      const e = filterEstado === 'Todos'
        || (filterEstado === 'En proceso' && p.estado === 'En proceso')
        || (filterEstado === 'Atrasados' && p.desvio > 0)
        || (filterEstado === 'Críticos' && p.desvio > 30)
        || (filterEstado === 'Entregados' && (p.estado === 'Entregado' || p.estado === 'Entregado a NQN'))
        || (filterEstado === 'Stand by' && p.estado === 'Stand by');
      return m && e;
    });
  }, [projects, search, filterEstado]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [['Todos', filtered]];
    const m = {};
    filtered.forEach(p => { (m[p[groupBy]] ||= []).push(p); });
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length);
  }, [filtered, groupBy]);

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
        <div className="view-toggle">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>
            <GridIcon /> Grilla
          </button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            <ListIcon /> Lista
          </button>
        </div>
      </div>

      {grouped.map(([key, items]) => {
        const totalHHReal = items.reduce((a, p) => a + Object.values(p.hhReal || {}).reduce((x, y) => x + y, 0), 0);
        const totalHHPlan = items.reduce((a, p) => a + Object.values(p.hhPlan || {}).reduce((x, y) => x + y, 0), 0);
        const atrasados = items.filter(p => p.desvio > 0).length;

        return (
          <div className="client-group" key={key}>
            {groupBy !== 'none' && (
              <div className="client-h">
                <span className="c-name">{key}</span>
                <span className="c-count mono">{items.length} proy.</span>
                <div className="client-h-meta">
                  <span>HH <b className="mono">{totalHHReal.toLocaleString()}</b>/{totalHHPlan.toLocaleString()}</span>
                  <span>Atrasados <b className="mono">{atrasados}</b></span>
                </div>
              </div>
            )}

            {view === 'grid' ? (
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
                      <span><span className="chip mono">{p.estadio}</span></span>
                      <span className="chev"><ChevIcon /></span>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>Sin resultados.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
