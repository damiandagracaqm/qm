export function StatusTag({ estado }) {
  const map = {
    'En proceso':        'info',
    'Sin empezar':       'pause',
    'Stand by':          'pause',
    'Cancelado':         'bad',
    'Entregado':         'ok',
    'Entregado a NQN':   'ok',
    'Próximo a terminar':'warn',
    'Próximo a entregar':'warn',
    // estadio-level values from Excel imports
    'Ingeniería':        'info',
    'Corte y Plegado':   'info',
    'Metalurgia':        'info',
    'Metalurgia Tigre':  'info',
    'Inoxidable':        'info',
    'Pintura':           'info',
    'Montaje':           'info',
  };
  return <span className={`tag ${map[estado] ?? 'pause'}`}>{estado}</span>;
}

export function DesvioTag({ desvio }) {
  if (desvio === 0) return <span className="tag ok">En tiempo</span>;
  if (desvio <= 30) return <span className="tag warn">+{desvio}d</span>;
  return <span className="tag bad">+{desvio}d crítico</span>;
}
