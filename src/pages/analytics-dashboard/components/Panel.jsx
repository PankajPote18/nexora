const Panel = ({ title, action, children, className = '' }) => (
  <div className={`bg-[#12161f] border border-white/10 rounded-xl p-4 md:p-5 ${className}`}>
    <div className="flex items-center justify-between mb-4 gap-2">
      <h3 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

export default Panel;
