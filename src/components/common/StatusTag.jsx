export function StatusTag({ estado }) {
  const map = {
    // En producción activa → azul
    'Ingeniería':       'tblue',
    'Corte y Plegado':  'tblue',
    'Metalurgia':       'tblue',
    'Metalurgia Tigre': 'tblue',
    'Inoxidable':       'tblue',
    'Pintura':          'tblue',
    'Montaje':          'tblue',
    // Próximos a cerrar → amarillo
    'Próximo a terminar': 'twarn',
    'Próximo a entregar': 'twarn',
    // Entregados → verde
    'Entregado':       'tok',
    'Entregado a NQN': 'tok',
    // Sin actividad → gris
    'Stand by':     'tpause',
    'Sin empezar':  'tpause',
    // Cancelado → rojo
    'Cancelado': 'tbad',
  };
  return <span className={`tag ${map[estado] || 'tpause'}`}>{estado}</span>;
}

export function DesvioTag({ desvio }) {
  if (desvio === 0) return <span className="tag tok">En tiempo</span>;
  if (desvio <= 14) return <span className="tag twarn">+{desvio}d</span>;
  return <span className="tag tbad">+{desvio}d</span>;
}
