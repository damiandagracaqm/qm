const STAGES = [
  { key: 'ing',     label: 'Ingeniería',       color: '#8b5cf6', areas: ['ing'] },
  { key: 'met',     label: 'Metalurgia',        color: '#f59e0b', areas: ['metneg', 'metinox'] },
  { key: 'gyp',     label: 'Pintura',           color: '#10b981', areas: ['gyp'] },
  { key: 'mongral', label: 'Montaje Mecánico',  color: '#3b82f6', areas: ['mongral'] },
  { key: 'monelec', label: 'Montaje Eléctrico', color: '#6366f1', areas: ['monelec'] },
];

function Ring({ pct, label, color, size = 'sm' }) {
  const r  = size === 'lg' ? 54 : 36;
  const sw = size === 'lg' ? 9  : 6;
  const C  = 2 * Math.PI * r;
  const hasPlan  = pct !== null;
  const safePct  = hasPlan ? Math.min(pct, 100) : 0;
  const filled   = safePct / 100 * C;
  const ringColor = !hasPlan        ? 'var(--line-2)'
                  : pct > 100       ? 'var(--bad)'
                  : pct > 85        ? 'var(--warn)'
                  : color;
  const dim = (r + sw) * 2 + 8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle
          cx={dim / 2} cy={dim / 2} r={r}
          fill="none" stroke="var(--line-2)" strokeWidth={sw}
        />
        {hasPlan && (
          <circle
            cx={dim / 2} cy={dim / 2} r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={sw}
            strokeDasharray={`${filled} ${C}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          />
        )}
        <text
          x={dim / 2} y={dim / 2}
          textAnchor="middle" dominantBaseline="middle"
          fill={hasPlan ? 'var(--ink)' : 'var(--ink-3)'}
          fontSize={size === 'lg' ? 20 : 13}
          fontWeight="700"
          fontFamily="var(--font-mono)"
        >
          {hasPlan ? `${pct}%` : '—'}
        </text>
      </svg>
      <div style={{
        fontSize: size === 'lg' ? 13 : 11,
        color: 'var(--ink-2)',
        textAlign: 'center',
        fontWeight: 600,
        lineHeight: 1.35,
        maxWidth: size === 'lg' ? 110 : 72,
      }}>
        {label}
      </div>
    </div>
  );
}

export function ProgressRings({ hhPlan, hhReal }) {
  const sum = (obj, keys) => keys.reduce((acc, k) => acc + (obj?.[k] ?? 0), 0);

  const allKeys   = ['ing', 'cyp', 'metneg', 'metinox', 'gyp', 'mongral', 'monelec', 'testeo'];
  const totalPlan = sum(hhPlan, allKeys);
  const totalReal = sum(hhReal, allKeys);
  const globalPct = totalPlan > 0 ? Math.round(totalReal / totalPlan * 100) : null;

  const stages = STAGES.map(s => {
    const plan = sum(hhPlan, s.areas);
    const real = sum(hhReal, s.areas);
    const pct  = plan > 0 ? Math.min(999, Math.round(real / plan * 100)) : null;
    return { ...s, pct };
  });

  const LINE = 'var(--line-2)';

  return (
    <div style={{ padding: '28px 24px 16px' }}>
      {/* Círculo principal */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Ring pct={globalPct} label="Avance global" color="var(--accent)" size="lg" />
      </div>

      {/* Conector en árbol */}
      <div style={{ position: 'relative', height: 32, margin: '2px 0' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 18, background: LINE }} />
        <div style={{ position: 'absolute', left: '10%', right: '10%', top: 18, height: 1, background: LINE }} />
        {[10, 30, 50, 70, 90].map(pos => (
          <div key={pos} style={{ position: 'absolute', left: `${pos}%`, top: 18, width: 1, height: 14, background: LINE }} />
        ))}
      </div>

      {/* Círculos por etapa */}
      <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'flex-start' }}>
        {stages.map(s => (
          <Ring key={s.key} pct={s.pct} label={s.label} color={s.color} size="sm" />
        ))}
      </div>
    </div>
  );
}
