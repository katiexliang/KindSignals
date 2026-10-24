import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendSeries } from "../lib/types";
import { fmtDate } from "../lib/format";

interface TrendChartProps {
  series: TrendSeries;
}

export function TrendChart({ series }: TrendChartProps) {
  // Recharts renders a gap wherever the value is null (connectNulls=false),
  // so missing days appear as breaks in the line, not as zeros.
  const data = series.points.map((p) => ({
    date: p.date,
    value: p.value,
  }));

  return (
    <div className="card">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{series.label}</h3>
        {series.baseline !== null && (
          <span className="text-xs text-slate-400">
            baseline {series.baseline}
            {series.unit === "%" ? "%" : ""}
          </span>
        )}
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#eef2f4" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              minTickGap={24}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={40}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(d) => fmtDate(String(d))}
              formatter={(v: number) => [
                `${v}${series.unit && series.unit !== "min" ? ` ${series.unit}` : ""}`,
                series.label,
              ]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            />
            {series.baseline !== null && (
              <ReferenceLine
                y={series.baseline}
                stroke="#a596e6"
                strokeDasharray="4 4"
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2aa8ad"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
