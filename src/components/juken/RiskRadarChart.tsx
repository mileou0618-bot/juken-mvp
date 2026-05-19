"use client";

import type { DimensionRisks, RiskDimensionKey } from "@/lib/juken/types";

const DIMENSION_LABELS: Record<RiskDimensionKey, string> = {
  homework_load: "宿題負荷",
  review_retention: "復習・定着不足",
  planning: "計画・優先順位",
  parent_involvement: "親の関与過多",
  autonomy: "自走性不足",
  mental_load: "精神的負荷",
};

const DIMENSIONS: RiskDimensionKey[] = [
  "homework_load",
  "review_retention",
  "planning",
  "parent_involvement",
  "autonomy",
  "mental_load",
];

type Props = {
  dimensionRisks: DimensionRisks;
  className?: string;
  labels?: Partial<Record<RiskDimensionKey, string>>;
  ariaLabel?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toPoint(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

export default function RiskRadarChart({ dimensionRisks, className, labels, ariaLabel }: Props) {
  // Slightly larger canvas + padding so axis labels never clip.
  const size = 360;
  const cx = 180;
  const cy = 180;
  const radius = 120;
  const pad = 42;

  const rings = [1, 2, 3, 4, 5];
  const angles = DIMENSIONS.map((_, idx) => (Math.PI * 2 * idx) / DIMENSIONS.length - Math.PI / 2);

  const axisPoints = angles.map((a) => toPoint(cx, cy, radius, a));

  const polygonPoints = angles
    .map((a, idx) => {
      const dim = DIMENSIONS[idx];
      const v = clamp(Number(dimensionRisks[dim] ?? 1), 1, 5);
      const r = (radius * v) / 5;
      const p = toPoint(cx, cy, r, a);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className={className ? `risk-radar ${className}` : "risk-radar"}>
      <svg
        viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
        role="img"
        aria-label={ariaLabel || "リスクバランス（6指標）"}
      >
        {/* Rings */}
        {rings.map((r) => {
          const rr = (radius * r) / 5;
          return <circle key={r} cx={cx} cy={cy} r={rr} className="risk-radar-ring" />;
        })}

        {/* Axes */}
        {axisPoints.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="risk-radar-axis" />
        ))}

        {/* Polygon */}
        <polygon points={polygonPoints} className="risk-radar-area" />

        {/* Value dots */}
        {angles.map((a, idx) => {
          const dim = DIMENSIONS[idx];
          const v = clamp(Number(dimensionRisks[dim] ?? 1), 1, 5);
          const r = (radius * v) / 5;
          const p = toPoint(cx, cy, r, a);
          return <circle key={dim} cx={p.x} cy={p.y} r={3.5} className="risk-radar-dot" />;
        })}

        {/* Labels */}
        {angles.map((a, idx) => {
          const dim = DIMENSIONS[idx];
          const label = (labels && labels[dim]) || DIMENSION_LABELS[dim];
          const p = toPoint(cx, cy, radius + 36, a);

          const anchor = (() => {
            const cos = Math.cos(a);
            if (cos > 0.35) return "start";
            if (cos < -0.35) return "end";
            return "middle";
          })();

          const baseline = (() => {
            const sin = Math.sin(a);
            if (sin > 0.55) return "hanging";
            if (sin < -0.55) return "alphabetic";
            return "middle";
          })();

          const lines = (() => {
            // Split long labels into two lines to avoid clipping (PC & mobile).
            // Keep label language as-is; no tooltips.
            switch (label) {
              case "復習・定着不足":
                return ["復習・定着", "不足"];
              case "計画・優先順位":
                return ["計画・優先", "順位"];
              case "親の関与過多":
                return ["親の関与", "過多"];
              case "复习・定着不足":
                return ["复习・定着", "不足"];
              case "计划・优先顺位":
                return ["计划・优先", "顺位"];
              case "家长介入过多":
                return ["家长介入", "过多"];
              case "自主性不足":
                return ["自主性", "不足"];
              default:
                return [label];
            }
          })();

          return (
            <text
              key={`${dim}-label`}
              x={p.x}
              y={p.y}
              textAnchor={anchor}
              dominantBaseline={baseline}
              className="risk-radar-label"
            >
              {lines.map((line, i) => (
                <tspan key={`${dim}-tspan-${i}`} x={p.x} dy={i === 0 ? 0 : 12}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
