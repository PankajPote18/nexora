import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SEQUENTIAL_HUE, CHART_GRIDLINE, CHART_INK_MUTED } from '../vizTheme';

// Single-metric trend line — deliberately one series/one hue (see
// vizTheme.js's note on why ranked/magnitude charts in this dashboard never
// need a categorical palette) with a hover crosshair + tooltip, per the
// dataviz skill's interaction rules for line/area forms.
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0d0f16] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-[#898781] mb-1">{label}</div>
      <div className="text-white font-medium tabular-nums">{Number(payload[0].value).toLocaleString()}</div>
    </div>
  );
};

const TrendChart = ({ data, height = 280 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="analyticsTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SEQUENTIAL_HUE} stopOpacity={0.35} />
          <stop offset="100%" stopColor={SEQUENTIAL_HUE} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke={CHART_GRIDLINE} strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="label"
        stroke={CHART_INK_MUTED}
        tick={{ fill: CHART_INK_MUTED, fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: CHART_GRIDLINE }}
        minTickGap={24}
      />
      <YAxis
        stroke={CHART_INK_MUTED}
        tick={{ fill: CHART_INK_MUTED, fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={40}
        allowDecimals={false}
      />
      <Tooltip content={<CustomTooltip />} cursor={{ stroke: CHART_GRIDLINE }} />
      <Area
        type="monotone"
        dataKey="value"
        stroke={SEQUENTIAL_HUE}
        strokeWidth={2}
        fill="url(#analyticsTrendFill)"
        dot={false}
        activeDot={{ r: 4, fill: SEQUENTIAL_HUE, stroke: '#0d0f16', strokeWidth: 2 }}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default TrendChart;
