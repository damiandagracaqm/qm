export const AREAS = [
  { k: 'ing', l: 'Ingeniería', c: '#8b5cf6' },
  { k: 'cyp', l: 'Corte y plegado', c: '#0ea5e9' },
  { k: 'metneg', l: 'Met. negro', c: '#f59e0b' },
  { k: 'metinox', l: 'Met. inox', c: '#d97706' },
  { k: 'gyp', l: 'Granalla/pintura', c: '#10b981' },
  { k: 'mongral', l: 'Montaje gral', c: '#3b82f6' },
  { k: 'monelec', l: 'Montaje elec', c: '#6366f1' },
  { k: 'testeo', l: 'Testeo', c: '#ec4899' },
];

export const ESTADIOS = [
  'Ingeniería y diseño',
  'Corte y plegado',
  'Metalurgia negro',
  'Metalurgia inox',
  'Granalla y pintura',
  'Montaje general',
  'Montaje eléctrico',
  'Testeo',
];

// Mapea el estado del Excel al índice del pipeline (0-7, 8 = completado)
export const ESTADO_A_PASO = {
  'Ingeniería':             0,
  'Corte y Plegado':        1,
  'Metalurgia':             2,
  'Metalurgia Tigre':       2,
  'Inoxidable':             3,
  'Pintura':                4,
  'Montaje':                5,
  'Testeo':                 7,
  'Próximo a terminar':     8,
  'Próximo a entregar':     8,
  'Entregado':              8,
  'Entregado parcialmente': 8,
  'Entregado a NQN':        8,
};
