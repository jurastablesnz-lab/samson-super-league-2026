export function Arena() {
  // Schematic 20 × 60 with A at the bottom (entry). Long axis compressed to fit a phone.
  const letters: { id: string; x: number; y: number }[] = [
    { id: "C", x: 110, y: 14 },
    { id: "H", x: 36, y: 48 },
    { id: "M", x: 184, y: 48 },
    { id: "S", x: 36, y: 72 },
    { id: "R", x: 184, y: 72 },
    { id: "I", x: 110, y: 72 },
    { id: "E", x: 36, y: 134 },
    { id: "B", x: 184, y: 134 },
    { id: "G", x: 110, y: 48 },
    { id: "X", x: 110, y: 134 },
    { id: "V", x: 36, y: 196 },
    { id: "P", x: 184, y: 196 },
    { id: "L", x: 110, y: 196 },
    { id: "K", x: 36, y: 220 },
    { id: "F", x: 184, y: 220 },
    { id: "D", x: 110, y: 220 },
    { id: "A", x: 110, y: 256 },
  ];

  return (
    <svg
      viewBox="0 0 220 272"
      className="h-auto w-full"
      role="img"
      aria-label="Dressage arena 60 by 20 metres, A at the bottom"
    >
      <rect x="50" y="28" width="120" height="216" rx="22" ry="13.5" fill="var(--color-sunken)" stroke="var(--color-accent)" strokeWidth="1.6" />
      <line x1="110" y1="28" x2="110" y2="244" stroke="var(--color-line)" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="50" y1="134" x2="170" y2="134" stroke="var(--color-line)" strokeWidth="0.8" strokeDasharray="3 3" />
      {letters.map((l) => (
        <g key={l.id}>
          <circle cx={l.x} cy={l.y} r="9" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="1" />
          <text
            x={l.x}
            y={l.y + 3.5}
            textAnchor="middle"
            fontSize="9"
            fontFamily="var(--font-sans)"
            fontWeight="600"
            fill="var(--color-fg)"
          >
            {l.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
