export function StatusTag({ estado }) {
  const map = { 'En proceso': 'tblue', 'Stand by': 'tpause', 'Entregado': 'tok', 'Cancelado': 'tbad' };
  return <span className={`tag ${map[estado] || 'tpause'}`}>{estado}</span>;
}

export function DesvioTag({ desvio }) {
  if (desvio === 0) return <span className="tag tok">En tiempo</span>;
  if (desvio <= 14) return <span className="tag twarn">+{desvio}d</span>;
  return <span className="tag tbad">+{desvio}d</span>;
}
