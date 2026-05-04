import { useState, useMemo } from 'react';
import { PROJS } from '../../data/projects';
import { StatusTag } from '../common/StatusTag';

const LDP_OPTIONS = [
  'Facundo Fernández', 'Santiago Lenzi', 'Agustín Bereilh',
  'Martín Navarro', 'Federico Donatini', 'Lucio Tappi', 'Facundo Quintana',
];

function ClientGroup({ cliente, projs, index, onOpenDetail }) {
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

export function ProyectosPage({ onOpenDetail }) {
  const [search, setSearch] = useState('');
  const [fst, setFst] = useState('');
  const [fldp, setFldp] = useState('');

  const byClient = useMemo(() => {
    const s = search.toLowerCase();
    const filtered = PROJS.filter(p =>
      (!s || (p.id + p.desc + p.cliente).toLowerCase().includes(s)) &&
      (!fst || p.estado === fst) &&
      (!fldp || p.ldp === fldp)
    );
    const map = {};
    filtered.forEach(p => { if (!map[p.cliente]) map[p.cliente] = []; map[p.cliente].push(p); });
    return map;
  }, [search, fst, fldp]);

  const entries = Object.entries(byClient);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="toolbar">
        <input
          className="si" type="text" placeholder="Buscar serie, descripción..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="sf" value={fst} onChange={e => setFst(e.target.value)}>
          <option value="">Todos los estados</option>
          <option>En proceso</option><option>Stand by</option><option>Entregado</option><option>Cancelado</option>
        </select>
        <select className="sf" value={fldp} onChange={e => setFldp(e.target.value)}>
          <option value="">Todos los LDP</option>
          {LDP_OPTIONS.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>
      {entries.length === 0
        ? <div className="empty">Sin resultados</div>
        : entries.map(([cli, projs], i) => (
            <ClientGroup key={cli} cliente={cli} projs={projs} index={i} onOpenDetail={onOpenDetail} />
          ))
      }
    </div>
  );
}
