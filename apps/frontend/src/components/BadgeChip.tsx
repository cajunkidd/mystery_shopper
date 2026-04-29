import type { BadgeDef } from "../types";

interface Props {
  badge: BadgeDef;
  earned: boolean;
}

const colors: Record<string, string> = {
  absolute: "#0a4d8c",
  improvement: "#117a3d",
  tenure: "#7c3a13",
  special: "#7c2d8c",
};

export function BadgeChip({ badge, earned }: Props) {
  const c = colors[badge.category] ?? "#444";
  return (
    <div
      title={badge.description}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid var(--c-border)",
        background: earned ? "#fff" : "var(--c-surface-2)",
        opacity: earned ? 1 : 0.55,
        minWidth: 200,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: earned ? c : "#bbb",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {badge.icon}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{badge.name}</div>
        <div className="muted" style={{ fontSize: 11 }}>
          {earned ? "Earned" : badge.description}
        </div>
      </div>
    </div>
  );
}
