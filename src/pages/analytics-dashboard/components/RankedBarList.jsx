import { SEQUENTIAL_HUE } from '../vizTheme';

// Every breakdown in this dashboard (traffic sources, devices, browsers, OS,
// countries, states, cities, top pages, top referrers) is one metric
// ("sessions") ranked across labels — a magnitude encoding, so it's one hue
// throughout rather than a categorical palette (see vizTheme.js). The
// native `title` attribute gives a hover value without pulling in a full
// tooltip layer for what's otherwise a plain HTML list.
const RankedBarList = ({ data, emptyLabel = 'No data yet', formatLabel }) => {
  if (!data || data.length === 0) {
    return <div className="text-sm text-[#898781] py-8 text-center">{emptyLabel}</div>;
  }

  const max = Math.max(...data.map((row) => row.count), 1);

  return (
    <ul className="space-y-2.5">
      {data.map((row) => (
        <li key={row.label} title={`${row.label}: ${row.count.toLocaleString()}`} className="flex items-center gap-3 text-sm">
          <span className="w-28 sm:w-36 shrink-0 truncate text-[#c3c2b7]">
            {formatLabel ? formatLabel(row.label) : row.label}
          </span>
          <span className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(4, (row.count / max) * 100)}%`, backgroundColor: SEQUENTIAL_HUE }}
            />
          </span>
          <span className="w-12 shrink-0 text-right tabular-nums text-white font-medium">
            {row.count.toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default RankedBarList;
