"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Risk distribution chart (PRD 9.2 #8).
 *
 * Fills come from the same `--color-risk-*` tokens the RiskBadge uses, and the
 * level name is printed on the axis with its count above each bar — colour is
 * never the only thing distinguishing a level (PRD 4.3).
 */
export function RiskDistributionChart({
  byLevel,
}: {
  byLevel: { low: number; medium: number; high: number; critical: number };
}) {
  const data = [
    { level: "Low", count: byLevel.low, fill: "var(--color-risk-low)" },
    {
      level: "Medium",
      count: byLevel.medium,
      fill: "var(--color-risk-medium)",
    },
    { level: "High", count: byLevel.high, fill: "var(--color-risk-high)" },
    {
      level: "Critical",
      count: byLevel.critical,
      fill: "var(--color-risk-critical)",
    },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="level"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-background)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              fontSize: 12,
            }}
            formatter={(value) => [`${value ?? 0} insiden`, "Jumlah"]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={72}>
            {data.map((entry) => (
              <Cell key={entry.level} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              fill="var(--color-text-primary)"
              fontSize={12}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
