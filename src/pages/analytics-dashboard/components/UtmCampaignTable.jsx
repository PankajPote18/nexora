const UtmCampaignTable = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-[#898781] py-8 text-center">No campaign data yet</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[#898781] text-xs uppercase tracking-wide border-b border-white/10">
            <th className="py-2 pr-4 font-medium">Campaign</th>
            <th className="py-2 pr-4 font-medium">Source</th>
            <th className="py-2 pr-4 font-medium">Medium</th>
            <th className="py-2 pr-4 font-medium text-right">Sessions</th>
            <th className="py-2 font-medium text-right">Conversions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.campaign}-${row.source}-${row.medium}-${i}`} className="border-b border-white/5 last:border-0">
              <td className="py-2 pr-4 text-white font-medium whitespace-nowrap">{row.campaign}</td>
              <td className="py-2 pr-4 text-[#c3c2b7] whitespace-nowrap">{row.source || '—'}</td>
              <td className="py-2 pr-4 text-[#c3c2b7] whitespace-nowrap">{row.medium || '—'}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-white">{row.sessions.toLocaleString()}</td>
              <td className="py-2 text-right tabular-nums text-white">{row.conversions.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UtmCampaignTable;
