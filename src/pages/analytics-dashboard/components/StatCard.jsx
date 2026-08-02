const StatCard = ({ label, value, hint }) => (
  <div className="bg-[#12161f] border border-white/10 rounded-xl p-4 md:p-5">
    <div className="text-[11px] uppercase tracking-wider text-[#898781]">{label}</div>
    <div className="mt-2 text-2xl md:text-3xl font-semibold text-white tabular-nums">{value}</div>
    {hint ? <div className="mt-1 text-xs text-[#c3c2b7]">{hint}</div> : null}
  </div>
);

export default StatCard;
