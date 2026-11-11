// Illustration vectorielle générée selon le type de feuillage (ou photo si fournie).

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  const r = c(n >> 16);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const STYLES = {
  spiky: {
    count: 9,
    spread: 84,
    len: 50,
    taper: 0.45,
    leaf: (l, fill) => <path d={`M0 0 Q3 ${-l / 2} 0 ${-l} Q-3 ${-l / 2} 0 0Z`} fill={fill} />,
  },
  palm: {
    count: 7,
    spread: 120,
    len: 46,
    taper: 0.3,
    leaf: (l, fill, _d, angle) => {
      const s = angle >= 0 ? 1 : -1;
      return (
        <>
          <path d={`M0 0 Q${s * 6} ${-l * 0.55} ${s * 15} ${-l} Q${s * 1} ${-l * 0.6} 0 0Z`} fill={fill} />
          <path d={`M0 0 Q${s * 4} ${-l * 0.55} ${s * 15} ${-l}`} stroke="rgba(255,255,255,.28)" strokeWidth=".7" fill="none" />
        </>
      );
    },
  },
  broad: {
    count: 5,
    spread: 72,
    len: 52,
    taper: 0.2,
    leaf: (l, fill, dark) => (
      <>
        <path d={`M0 0 L0 ${-l * 0.45}`} stroke={dark} strokeWidth="2.2" strokeLinecap="round" />
        <path d={`M0 ${-l * 0.42} Q10 ${-l * 0.7} 0 ${-l} Q-10 ${-l * 0.7} 0 ${-l * 0.42}Z`} fill={fill} />
        <path d={`M0 ${-l * 0.44} L0 ${-l * 0.97}`} stroke="rgba(255,255,255,.3)" strokeWidth=".8" />
      </>
    ),
  },
  monstera: {
    count: 5,
    spread: 96,
    len: 42,
    taper: 0.2,
    leaf: (l, fill, dark, _a, bg) => (
      <>
        <path d={`M0 0 L0 ${-l * 0.5}`} stroke={dark} strokeWidth="1.8" strokeLinecap="round" />
        <path
          d={`M0 ${-l * 0.45} C15 ${-l * 0.48} 15 ${-l * 1.02} 0 ${-l * 1.04} C-15 ${-l * 1.02} -15 ${-l * 0.48} 0 ${-l * 0.45}Z`}
          fill={fill}
        />
        <g stroke={bg} strokeWidth="1.6" strokeLinecap="round">
          <path d={`M3 ${-l * 0.62} L10 ${-l * 0.6}`} />
          <path d={`M3 ${-l * 0.8} L10 ${-l * 0.83}`} />
          <path d={`M-3 ${-l * 0.68} L-10 ${-l * 0.68}`} />
          <path d={`M-3 ${-l * 0.86} L-9 ${-l * 0.92}`} />
        </g>
      </>
    ),
  },
  fern: {
    count: 7,
    spread: 104,
    len: 44,
    taper: 0.25,
    leaf: (l, fill) => (
      <>
        <path d={`M0 0 Q11 ${-l * 0.45} 3 ${-l} Q0 ${-l * 1.05} -3 ${-l} Q-11 ${-l * 0.45} 0 0Z`} fill={fill} />
        <path d={`M0 0 L0 ${-l * 0.98}`} stroke="rgba(0,0,0,.18)" strokeWidth=".9" />
      </>
    ),
  },
};

/** Plante grasse en colonnes (cactus, euphorbe) : un tronc et deux bras. */
function Cactus({ base, dark, light }) {
  const spines = [
    [44, 26], [56, 30], [44, 40], [56, 46], [44, 56], [56, 60],
    [32, 38], [40, 46], [64, 30], [68, 40],
  ];
  return (
    <g>
      <rect x="29" y="34" width="9" height="24" rx="4.5" fill={light} />
      <rect x="29" y="51" width="18" height="8" rx="4" fill={light} />
      <rect x="62" y="26" width="9" height="26" rx="4.5" fill={base} />
      <rect x="53" y="45" width="18" height="8" rx="4" fill={base} />
      <rect x="42" y="16" width="16" height="54" rx="8" fill={base} />
      <path d="M50 20 V68" stroke={dark} strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
      <path d="M33.5 38 V54 M66.5 30 V48" stroke={dark} strokeWidth="1" strokeLinecap="round" opacity=".45" />
      {spines.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#f1ead2" />
      ))}
    </g>
  );
}

export default function PlantAvatar({ plant, size = 120, bg = '#eef1e6' }) {
  if (plant.photo) {
    return (
      <img
        className="plant-photo"
        src={plant.photo}
        alt={plant.name}
        style={{ width: size, height: size }}
      />
    );
  }

  const cfg = STYLES[plant.avatar] ?? STYLES.monstera;
  const base = plant.color || '#4f7a52';
  const dark = shade(base, -28);
  const light = shade(base, 22);

  const leaves = Array.from({ length: cfg.count }, (_, i) => {
    const t = cfg.count === 1 ? 0.5 : i / (cfg.count - 1);
    const angle = -cfg.spread / 2 + t * cfg.spread;
    const len = cfg.len * (1 - (Math.abs(angle) / cfg.spread) * cfg.taper);
    return { i, angle, len, fill: i % 2 ? base : light };
  }).sort((a, b) => Math.abs(b.angle) - Math.abs(a.angle));

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={plant.variety || plant.name}>
      <ellipse cx="50" cy="96" rx="22" ry="2.5" fill="rgba(47,74,53,.12)" />
      {plant.avatar === 'cactus' ? (
        <Cactus base={base} dark={dark} light={light} />
      ) : (
        leaves.map(({ i, angle, len, fill }) => (
          <g key={i} transform={`translate(50 69) rotate(${angle})`}>
            {cfg.leaf(len, fill, dark, angle, bg)}
          </g>
        ))
      )}
      <path d="M33 72 H67 L63 94 Q62.5 96 60 96 H40 Q37.5 96 37 94 Z" fill="#c8734f" />
      <rect x="30" y="66" width="40" height="8" rx="2.5" fill="#b4623f" />
      <path d="M36 78 H64" stroke="rgba(255,255,255,.18)" strokeWidth="1.2" />
    </svg>
  );
}
