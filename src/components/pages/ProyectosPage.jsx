import { useState, useMemo } from 'react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ESTADOS_ENTREGADO = new Set(['Entregado', 'Entregado a NQN', 'Entregado parcialmente']);
const ESTADOS_TERMINALES = new Set(['Cancelado', 'Entregado', 'Entregado a NQN', 'Entregado parcialmente', 'Stand by', 'Sin empezar']);
const ESTADOS_EXCLUIDOS  = ESTADOS_TERMINALES;
const FILTERS = ['Todos', 'En proceso', 'Stand by', 'Sin empezar', 'Entregado', 'Entregado parcialmente', 'Entregado a NQN', 'Cancelado'];

function desvioColor(d) {
  if (d == null) return 'var(--ink-3)';
  if (d > 30)   return 'var(--bad)';
  if (d > 0)    return 'var(--warn)';
  return 'var(--ok)';
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

function ChevDownIcon({ open }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s', flexShrink: 0 }}
    >
      <path d="m6 9 6 6 6-6"/>
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
  const soft  = desvio > 30 ? 'var(--bad-soft)' : desvio > 0 ? 'var(--warn-soft)' : 'var(--ok-soft)';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: desvio > 30 ? 600 : 400,
      color, background: soft, padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
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

function LdpGroup({ ldp, projects, onOpenDetail, isLast, isOpen, onToggle }) {
  const criticals = projects.filter(p => p.desvio > 30).length;
  const warns     = projects.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const sorted    = [...projects].sort((a, b) => (b.desvio ?? 0) - (a.desvio ?? 0));
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>
      <div className="ldp-h" style={{ cursor: 'pointer', paddingLeft: 32 }} onClick={onToggle}>
        <ChevDownIcon open={isOpen} />
        <span className="ldp-name">{ldp}</span>
        <span className="ldp-count">{projects.length} proy.</span>
        {criticals > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--bad)', background: 'var(--bad-soft)', padding: '1px 6px', borderRadius: 3 }}>
            {criticals} crítico{criticals > 1 ? 's' : ''}
          </span>
        )}
        {warns > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'oklch(0.5 0.13 75)', background: 'var(--warn-soft)', padding: '1px 6px', borderRadius: 3 }}>
            {warns} con desvío
          </span>
        )}
      </div>
      {isOpen && sorted.map(p => <ProjectRow key={p.id} p={p} onOpenDetail={onOpenDetail} />)}
    </div>
  );
}

function ClienteGroup({ cliente, ldpMap, onOpenDetail, isLast, expanded, onToggle }) {
  const allProys  = Object.values(ldpMap).flat();
  const criticals = allProys.filter(p => p.desvio > 30).length;
  const warns     = allProys.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const isOpen    = expanded.has(`cli:${cliente}`);
  const ldpEntries = Object.entries(ldpMap).sort(([, a], [, b]) => {
    const cA = a.filter(p => p.desvio > 30).length, cB = b.filter(p => p.desvio > 30).length;
    if (cB !== cA) return cB - cA;
    return b.filter(p => p.desvio > 0).length - a.filter(p => p.desvio > 0).length;
  });

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--line-2)' }}>
      <div
        className="client-h"
        style={{ cursor: 'pointer', borderRadius: 0, border: 'none', borderBottom: '1px solid var(--line)', marginBottom: 0 }}
        onClick={() => onToggle(`cli:${cliente}`)}
      >
        <ChevDownIcon open={isOpen} />
        <span className="c-name">{cliente}</span>
        <span className="c-count mono">{allProys.length} proy.</span>
        {criticals > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--bad)', background: 'var(--bad-soft)', padding: '1px 6px', borderRadius: 3 }}>
            {criticals} crítico{criticals > 1 ? 's' : ''}
          </span>
        )}
        {warns > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'oklch(0.5 0.13 75)', background: 'var(--warn-soft)', padding: '1px 6px', borderRadius: 3 }}>
            {warns} con desvío
          </span>
        )}
      </div>
      {isOpen && ldpEntries.map(([ldp, proys], i) => (
        <LdpGroup
          key={ldp}
          ldp={ldp}
          projects={proys}
          onOpenDetail={onOpenDetail}
          isLast={i === ldpEntries.length - 1}
          isOpen={expanded.has(`ldp:${cliente}:${ldp}`)}
          onToggle={() => onToggle(`ldp:${cliente}:${ldp}`)}
        />
      ))}
    </div>
  );
}

export function ProyectosPage({ projects, onOpenDetail }) {
  const [search, setSearch]             = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [clienteSel, setClienteSel]     = useState('Todos');
  const [expanded, setExpanded]         = useState(new Set());

  function toggleExpanded(key) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const isEntregados = ESTADOS_ENTREGADO.has(filterEstado);

  const activos    = useMemo(() => projects.filter(p => !ESTADOS_EXCLUIDOS.has(p.estado)), [projects]);
  const entregados = useMemo(() => projects.filter(p => ESTADOS_ENTREGADO.has(p.estado)), [projects]);

  const clientes = useMemo(() => {
    const set = new Set(activos.map(p => p.cliente).filter(Boolean));
    return ['Todos', ...Array.from(set).sort()];
  }, [activos]);

  const activosFiltrados = useMemo(() =>
    clienteSel === 'Todos' ? activos : activos.filter(p => p.cliente === clienteSel),
    [activos, clienteSel]
  );
  const entregadosFiltrados = useMemo(() =>
    clienteSel === 'Todos' ? entregados : entregados.filter(p => p.cliente === clienteSel),
    [entregados, clienteSel]
  );

  const TODAY     = new Date().toISOString().split('T')[0];
  const enTiempo  = activosFiltrados.filter(p => p.finEst && p.finEst !== '—' && p.finEst >= TODAY).length;
  const conDesvio = activosFiltrados.filter(p => p.desvio > 0 && p.desvio <= 30).length;
  const criticos  = activosFiltrados.filter(p => p.desvio > 30).length;

  const filtered = useMemo(() => {
    let base = filterEstado === 'Todos'       ? projects
             : filterEstado === 'En proceso'  ? projects.filter(p => !ESTADOS_TERMINALES.has(p.estado))
             : projects.filter(p => p.estado === filterEstado);
    if (clienteSel !== 'Todos') base = base.filter(p => p.cliente === clienteSel);
    if (search) {
      const q = search.toLowerCase();
      base = base.filter(p =>
        p.id.toLowerCase().includes(q) ||
        (p.desc || '').toLowerCase().includes(q) ||
        (p.cliente || '').toLowerCase().includes(q) ||
        (p.ldp || '').toLowerCase().includes(q)
      );
    }
    return base;
  }, [projects, filterEstado, clienteSel, search]);

  // Cliente → LDP grouping
  const clienteGroups = useMemo(() => {
    if (isEntregados) return [];
    const map = {};
    filtered.forEach(p => {
      const cli = p.cliente || 'Sin cliente';
      const ldp = p.ldp || 'Sin asignar';
      if (!map[cli]) map[cli] = {};
      if (!map[cli][ldp]) map[cli][ldp] = [];
      map[cli][ldp].push(p);
    });
    return Object.entries(map).sort(([, aLdps], [, bLdps]) => {
      const aAll = Object.values(aLdps).flat();
      const bAll = Object.values(bLdps).flat();
      const cA = aAll.filter(p => p.desvio > 30).length, cB = bAll.filter(p => p.desvio > 30).length;
      if (cB !== cA) return cB - cA;
      return bAll.filter(p => p.desvio > 0).length - aAll.filter(p => p.desvio > 0).length;
    });
  }, [filtered, isEntregados]);

  // Year/month grouping for Entregados
  const deliveryGroups = useMemo(() => {
    if (!isEntregados) return null;
    const byYM = {};
    filtered.forEach(p => {
      const parts = (p.finEst || p.finPlan || '').split('-');
      const year = parts[0], monthIdx = parts[1] ? parseInt(parts[1], 10) - 1 : null;
      if (!year || monthIdx === null) return;
      if (!byYM[year]) byYM[year] = {};
      const mk = parts[1];
      if (!byYM[year][mk]) byYM[year][mk] = { idx: monthIdx, items: [] };
      byYM[year][mk].items.push(p);
    });
    return Object.entries(byYM)
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        months: Object.entries(months)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([key, { idx, items }]) => ({ key, idx, items })),
      }));
  }, [filtered, isEntregados]);

  function clientStats(c) {
    const proys = c === 'Todos' ? activos : activos.filter(p => p.cliente === c);
    return { count: proys.length, hasCritical: proys.some(p => p.desvio > 30) };
  }

  return (
    <div className="page-body">

      {/* ── KPI cards ─────────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-cell">
          <span className="kpi-label">Activos</span>
          <span className="kpi-value">{activosFiltrados.length}</span>
          <span className="kpi-trend">{clienteSel === 'Todos' ? 'En planta' : clienteSel}</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">En tiempo</span>
          <span className="kpi-value ok">{enTiempo}</span>
          <span className="kpi-trend">
            {activosFiltrados.length > 0 ? Math.round(enTiempo / activosFiltrados.length * 100) : 0}% del activo
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

      {/* ── Toolbar fila 1: búsqueda + clientes ───────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <div className="search">
          <SearchIcon />
          <input
            placeholder="Buscar por ID, descripción, cliente, LDP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
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
                background: isActive ? 'rgba(255,255,255,0.18)' : 'var(--surface-2)',
                color: isActive ? '#fff' : 'var(--ink-3)',
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

      {/* ── Toolbar fila 2: filtro por Estado ─────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 2 }}>
          Estado
        </span>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-btn${filterEstado === f ? ' active' : ''}`}
            onClick={() => setFilterEstado(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Tabla de proyectos ────────────────────────── */}
      <div className="card">
        <div className="meet-row meet-head">
          <span /><span>ID</span><span>Proyecto</span><span>Estado</span>
          <span>Entrega est.</span><span>Desvío</span><span />
        </div>

        {/* Vista entregados: año / mes */}
        {isEntregados && deliveryGroups && deliveryGroups.map(({ year, months }) => {
          const yearOpen  = expanded.has(`year:${year}`);
          const yearTotal = months.reduce((a, m) => a + m.items.length, 0);
          return (
            <div key={year} style={{ borderBottom: '1px solid var(--line)' }}>
              <button className="year-header" onClick={() => toggleExpanded(`year:${year}`)}>
                <ChevDownIcon open={yearOpen} />
                <span className="year-label">{year}</span>
                <span className="year-count mono">{yearTotal} {yearTotal === 1 ? 'proyecto' : 'proyectos'}</span>
              </button>
              {yearOpen && months.map(({ key, idx, items }) => {
                const monthKey  = `month:${year}-${key}`;
                const monthOpen = expanded.has(monthKey);
                return (
                  <div key={key} style={{ marginLeft: 12 }}>
                    <button className="month-header" onClick={() => toggleExpanded(monthKey)}>
                      <ChevDownIcon open={monthOpen} />
                      <span className="month-label">{MESES[idx]}</span>
                      <span className="month-count mono">{items.length} {items.length === 1 ? 'proyecto' : 'proyectos'}</span>
                    </button>
                    {monthOpen && items.map(p => <ProjectRow key={p.id} p={p} onOpenDetail={onOpenDetail} />)}
                  </div>
                );
              })}
            </div>
          );
        })}

        {isEntregados && deliveryGroups?.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>Sin proyectos entregados.</div>
        )}

        {/* Vista normal: cliente → LDP */}
        {!isEntregados && clienteGroups.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>Sin proyectos.</div>
        )}

        {!isEntregados && clienteGroups.map(([cliente, ldpMap], i) => (
          <ClienteGroup
            key={cliente}
            cliente={cliente}
            ldpMap={ldpMap}
            onOpenDetail={onOpenDetail}
            isLast={i === clienteGroups.length - 1}
            expanded={expanded}
            onToggle={toggleExpanded}
          />
        ))}
      </div>

    </div>
  );
}
