const PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

const DateRangeFilter = ({ from, to, onChange }) => {
  const applyPreset = (days) => {
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    onChange({ from: toISODate(fromDate), to: toISODate(toDate) });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => applyPreset(preset.days)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-[#c3c2b7] hover:text-white transition-colors"
        >
          {preset.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 text-xs text-[#898781]">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[#c3c2b7]"
        />
        <span>to</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[#c3c2b7]"
        />
      </div>
    </div>
  );
};

export default DateRangeFilter;
