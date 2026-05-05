import { useState, useMemo } from 'react';
import { StatusTag } from '../common/StatusTag';
import { MultiSelect } from '../common/MultiSelect';

const ESTADO_GROUPS = [
  { label: 'En producción', options: ['Ingeniería', 'Corte y Plegado', 'Metalurgia', 'Metalurgia Tigre', 'Inoxidable', 'Pintura', 'Montaje'] },
  { label: 'Cierre', options: ['Próximo a terminar', 'Próximo a entregar', 'Entregado', 'Entregado a NQN'] },
  { label: 'Otros', options: ['Sin empezar', 'Stand by', 'Cancelado'] },
];

function ClientGroup({ cliente, projs, onOpenDetail }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="client-group" style={{ marginBottom: 10 }}>
      <div className="cg-header" onClick={() => setOpen(o => !o)}>
        <span className="cg-name">
          <span style={{ width: 28, height: 28, borderRadius: 6, background: '#dbeafe', color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            {cliente.slice(0, 2)}
          </span>
          {cliente}
          <span className="cg-count">{projs.length} proyecto{projs.length > 1 ? 's' : ''}</span>
        </span>
        <span className="cg-arrow" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', fontSize: 11, color: 'var(--color-text-secondary)', transition: 'transform .2s' }}>›</span>
      </div>
      {open && (
        <div className="cg-body">
          {projs.map(p => (
            <div className="proj-chip" key={p.id} onClick={() => onOpenDetail(p.id)}>
              <div className="pc-id">{p.id}</div>
              <div className="pc-st" style={{ marginTop: 4 }}><StatusTag estado={p.estado} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProyectosPage({ projects, onOpenDetail }) {
  const [search, setSearch] = useState('');
  const [fst, setFst] = useState([]);
  const [fldp, setFldp] = useState([]);

  const ldpOptions = useMemo(() => [...new Set(projects.map(p => p.ldp).filter(Boolean))].sort(), [projects]);

  const byClient = useMemo(() => {
    const s = search.toLowerCase();
    const filtered = projects.filter(p =>
      (!s || (p.id + p.desc + p.cliente).toLowerCase().includes(s)) &&
      (fst.length === 0 || fst.includes(p.estado)) &&
      (fldp.length === 0 || fldp.includes(p.ldp))
    );
    const map = {};
    filtered.forEach(p => { if (!map[p.cliente]) map[p.cliente] = []; map[p.cliente].push(p); });
    return map;
  }, [projects, search, fst, fldp]);

  const entries = Object.entries(byClient);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="toolbar">
        <input
          className="si" type="text" placeholder="Buscar serie, descripción..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <MultiSelect
          label="Todos los estados"
          optgroups={ESTADO_GROUPS}
          selected={fst}
          onChange={setFst}
        />
        <MultiSelect
          label="Todos los LDP"
          options={ldpOptions}
          selected={fldp}
          onChange={setFldp}
        />
      </div>
      {entries.length === 0
        ? <div className="empty">Sin resultados</div>
        : entries.map(([cli, projs]) => (
            <ClientGroup key={cli} cliente={cli} projs={projs} onOpenDetail={onOpenDetail} />
          ))
      }
    </div>
  );
}
