import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { analyticsApi } from '../../services/analyticsApi';
import Panel from './components/Panel';
import StatCard from './components/StatCard';

function formatDuration(totalSeconds) {
  if (totalSeconds == null) return '—';
  const seconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

const SessionCard = ({ session, expanded, onToggle }) => (
  <div className="border border-white/10 rounded-xl overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        {expanded ? <ChevronDown size={16} className="text-[#898781] shrink-0" /> : <ChevronRight size={16} className="text-[#898781] shrink-0" />}
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">{formatDate(session.date)}</div>
          <div className="text-xs text-[#898781] truncate">
            {session.source || 'direct'} · {session.device || 'unknown device'} · {session.country || 'unknown location'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-[#c3c2b7] shrink-0">
        <span>{session.pagesViewed} pages</span>
        <span>{formatDuration(session.sessionDuration)}</span>
        {session.conversion ? (
          <span className="px-2 py-0.5 rounded-full bg-[#0ca30c]/15 text-[#0ca30c] font-medium">Converted</span>
        ) : null}
      </div>
    </button>

    {expanded ? (
      <div className="px-4 py-4 border-t border-white/10 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><div className="text-[#898781]">Landing Page</div><div className="text-white truncate">{session.landingPage || '—'}</div></div>
          <div><div className="text-[#898781]">Exit Page</div><div className="text-white truncate">{session.exitPage || '—'}</div></div>
          <div><div className="text-[#898781]">Medium / Campaign</div><div className="text-white truncate">{session.medium || '—'} / {session.campaign || '—'}</div></div>
          <div><div className="text-[#898781]">Browser / OS</div><div className="text-white truncate">{session.browser || '—'} / {session.os || '—'}</div></div>
        </div>

        <div>
          <div className="text-xs font-semibold text-[#898781] uppercase tracking-wide mb-2">Navigation Flow</div>
          {session.pageViews.length === 0 ? (
            <div className="text-xs text-[#898781]">No page views recorded</div>
          ) : (
            <ol className="space-y-1.5">
              {session.pageViews.map((pv, i) => (
                <li key={`${pv.url}-${pv.enteredAt}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-[#3987e5]/15 text-[#6fa8f0] flex items-center justify-center shrink-0 font-medium">{i + 1}</span>
                  <span className="text-white truncate flex-1" title={pv.url}>{pv.pageTitle || pv.url}</span>
                  <span className="text-[#898781] shrink-0">{formatDuration(pv.timeOnPageSeconds)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {session.events.length > 0 ? (
          <div>
            <div className="text-xs font-semibold text-[#898781] uppercase tracking-wide mb-2">Events Triggered</div>
            <ul className="space-y-1.5">
              {session.events.map((ev, i) => (
                <li key={`${ev.eventName}-${ev.createdAt}-${i}`} className="flex items-center gap-2 text-xs">
                  <Zap size={12} className={ev.isConversion ? 'text-[#0ca30c]' : 'text-[#898781]'} />
                  <span className="text-white">{ev.eventName}</span>
                  {ev.eventCategory ? <span className="text-[#898781]">· {ev.eventCategory}</span> : null}
                  <span className="text-[#898781] ml-auto">{formatDate(ev.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    ) : null}
  </div>
);

const AnalyticsVisitorDetail = () => {
  const { visitorId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi.getVisitorDetail(visitorId)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setExpandedSessionId(res.sessions[0]?.sessionId || null);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load visitor'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visitorId]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-[#898781]">Loading…</div>;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/analytics/visitors" className="inline-flex items-center gap-1.5 text-xs text-[#6fa8f0] hover:text-white">
          <ArrowLeft size={14} /> Back to visitors
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-4">{error || 'Visitor not found'}</div>
      </div>
    );
  }

  const { visitor, sessions } = data;

  return (
    <div className="space-y-6">
      <Link to="/analytics/visitors" className="inline-flex items-center gap-1.5 text-xs text-[#6fa8f0] hover:text-white">
        <ArrowLeft size={14} /> Back to visitors
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-white font-mono">{visitor.visitorId}</h2>
        {visitor.isReturning ? (
          <span className="px-2 py-0.5 rounded-full bg-[#3987e5]/15 text-[#6fa8f0] text-[10px] font-medium">Returning Visitor</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[#c3c2b7] text-[10px] font-medium">New Visitor</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="First Visit" value={formatDate(visitor.firstVisitAt)} />
        <StatCard label="Last Visit" value={formatDate(visitor.lastVisitAt)} />
        <StatCard label="Total Visits" value={visitor.totalVisits} />
        <StatCard label="Total Sessions" value={visitor.totalSessions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Device &amp; Browser">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-[#898781]">Device</dt><dd className="text-white capitalize">{visitor.deviceType || '—'} {visitor.deviceModel ? `(${visitor.deviceModel})` : ''}</dd></div>
            <div><dt className="text-[#898781]">Browser</dt><dd className="text-white">{visitor.browser || '—'} {visitor.browserVersion || ''}</dd></div>
            <div><dt className="text-[#898781]">OS</dt><dd className="text-white">{visitor.os || '—'} {visitor.osVersion || ''}</dd></div>
            <div><dt className="text-[#898781]">Screen</dt><dd className="text-white">{visitor.screenResolution || '—'}</dd></div>
            <div><dt className="text-[#898781]">Language</dt><dd className="text-white">{visitor.language || '—'}</dd></div>
            <div><dt className="text-[#898781]">Timezone</dt><dd className="text-white">{visitor.timezone || '—'}</dd></div>
          </dl>
        </Panel>

        <Panel title="Location &amp; First-Touch Attribution">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-[#898781]">Location</dt><dd className="text-white">{[visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt className="text-[#898781]">ISP</dt><dd className="text-white truncate">{visitor.isp || '—'}</dd></div>
            <div><dt className="text-[#898781]">First Traffic Source</dt><dd className="text-white capitalize">{visitor.firstTrafficSource || '—'}</dd></div>
            <div><dt className="text-[#898781]">First Landing Page</dt><dd className="text-white truncate" title={visitor.firstLandingPage}>{visitor.firstLandingPage || '—'}</dd></div>
            <div><dt className="text-[#898781]">First Referrer</dt><dd className="text-white truncate" title={visitor.firstReferrerUrl}>{visitor.firstReferrerDomain || '—'}</dd></div>
            <div><dt className="text-[#898781]">First UTM Campaign</dt><dd className="text-white truncate">{visitor.firstUtm.campaign || '—'}</dd></div>
          </dl>
        </Panel>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-3">Session Timeline ({sessions.length})</h3>
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.sessionId}
              session={session}
              expanded={expandedSessionId === session.sessionId}
              onToggle={() => setExpandedSessionId((prev) => (prev === session.sessionId ? null : session.sessionId))}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsVisitorDetail;
