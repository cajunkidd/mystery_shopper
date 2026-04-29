interface Point {
  x: string;
  y: number;
  label?: string;
}

interface Props {
  points: Point[];
  height?: number;
  yMin?: number;
  yMax?: number;
}

export function TrendChart({ points, height = 160, yMin = 0, yMax = 100 }: Props) {
  if (points.length === 0) {
    return <div className="empty">No data yet.</div>;
  }
  const width = 600;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const xs = points.map((_, i) =>
    points.length === 1 ? padL + innerW / 2 : padL + (i / (points.length - 1)) * innerW,
  );
  const yFor = (v: number) =>
    padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xs[i].toFixed(1)} ${yFor(p.y).toFixed(1)}`)
    .join(" ");

  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", maxWidth: 720 }}
      role="img"
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={width - padR}
            y1={yFor(t)}
            y2={yFor(t)}
            stroke="var(--c-border)"
            strokeDasharray="3 4"
          />
          <text x={padL - 4} y={yFor(t) + 3} fontSize={10} fill="var(--c-text-muted)" textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--c-primary)" strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={xs[i]}
            cy={yFor(p.y)}
            r={4}
            fill={p.y >= 85 ? "var(--c-success)" : p.y >= 70 ? "var(--c-warn)" : "var(--c-danger)"}
          />
          <text
            x={xs[i]}
            y={height - padB + 14}
            fontSize={9}
            fill="var(--c-text-muted)"
            textAnchor="middle"
          >
            {p.x.slice(5)}
          </text>
          {p.label && (
            <text
              x={xs[i]}
              y={yFor(p.y) - 8}
              fontSize={10}
              fill="var(--c-text)"
              textAnchor="middle"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
