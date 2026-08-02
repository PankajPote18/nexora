import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../../services/analyticsApi';
import StatCard from './components/StatCard';
import Panel from './components/Panel';
import TrendChart from './components/TrendChart';
import RankedBarList from './components/RankedBarList';
import UtmCampaignTable from './components/UtmCampaignTable';
import DateRangeFilter from './components/DateRangeFilter';

const METRICS = [
  { key: 'totalVisitors', label: 'Visitors' },
  { key: 'newVisitors', label: 'New Visitors' },
  { key: 'returningVisitors', label: 'Returning Visitors' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'pageViews', label: 'Page Views' },
  { key: 'avgSessionDuration', label: 'Avg. Session Duration (s)' },
  { key: 'bounceRate', label: 'Bounce Rate (%)' },
  { key: 'conversions', label: 'Conversions' },
];

const GRANULARITIES = ['day', 'week', 'month'];

// Same generic breakdown endpoint every panel here reads from (see
// backend/controllers/analytics/dashboard.controller.js's DIMENSIONS map) —
// one flexible query instead of ten near-identical ones.
const BREAKDOWN_PANELS = [
  { dimension: 'trafficSource', title: 'Traffic Sources' },
  { dimension: 'device', title: 'Device Breakdown' },
  { dimension: 'browser', title: 'Browser Breakdown' },
  { dimension: 'os', title: 'Operating Systems' },
  { dimension: 'country', title: 'Countries' },
  { dimension: 'region', title: 'States' },
  { dimension: 'city', title: 'Cities' },
  { dimension: 'landingPage', title: 'Top Landing Pages' },
  { dimension: 'exitPage', title: 'Top Exit Pages' },
  { dimension: 'referrer', title: 'Top Referrers' },
];

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from: toISODate(from), to: toISODate(to) };
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDayLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function isoWeekStart(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay() || 7; // Monday = 1 ... Sunday = 7
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

// Buckets the raw daily series (always what the API returns) into
// week/month points for display — the backend maintains one daily rollup
// table, not three separate aggregations (see rollup.service.js).
function bucketTrend(series, granularity, metricKey) {
  if (granularity === 'day') {
    return series.map((point) => ({ label: formatDayLabel(point.date), value: point[metricKey] || 0 }));
  }

  const isAverageMetric = metricKey === 'bounceRate' || metricKey === 'avgSessionDuration';
  const buckets = new Map();
  for (const point of series) {
    const key = granularity === 'week' ? isoWeekStart(point.date) : point.date.slice(0, 7);
    if (!buckets.has(key)) buckets.set(key, { sum: 0, count: 0 });
    const bucket = buckets.get(key);
    bucket.sum += point[metricKey] || 0;
    bucket.count += 1;
  }

  return Array.from(buckets.entries()).map(([key, bucket]) => ({
    label: granularity === 'week' ? `Wk ${formatDayLabel(key)}` : key,
    value: isAverageMetric ? Math.round(bucket.sum / bucket.count) : bucket.sum
  }));
}

const AnalyticsOverview = () => {
  const [range, setRange] = useState(defaultRange);
  const [summary, setSummary] = useState(null);
  const [activeVisitors, setActiveVisitors] = useState(null);
  const [trendSeries, setTrendSeries] = useState([]);
  const [trendMetric, setTrendMetric] = useState('totalVisitors');
  const [granularity, setGranularity] = useState('day');
  const [breakdowns, setBreakdowns] = useState({});
  const [utmCampaigns, setUtmCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      analyticsApi.getSummary(range),
      analyticsApi.getTrend(range),
      analyticsApi.getUtmCampaigns(range),
      ...BREAKDOWN_PANELS.map((panel) => analyticsApi.getBreakdown(panel.dimension, { ...range, limit: 8 }))
    ])
      .then(([summaryRes, trendRes, utmRes, ...breakdownResList]) => {
        if (cancelled) return;
        setSummary(summaryRes);
        setTrendSeries(trendRes.series || []);
        setUtmCampaigns(utmRes.data || []);
        const nextBreakdowns = {};
        BREAKDOWN_PANELS.forEach((panel, i) => {
          nextBreakdowns[panel.dimension] = breakdownResList[i].data || [];
        });
        setBreakdowns(nextBreakdowns);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load analytics data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      analyticsApi.getActive().then((res) => {
        if (!cancelled) setActiveVisitors(res.activeVisitors);
      }).catch(() => { /* non-critical — leave last known value */ });
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const chartData = useMemo(
    () => bucketTrend(trendSeries, granularity, trendMetric),
    [trendSeries, granularity, trendMetric]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
        <Link
          to="/analytics/visitors"
          className="text-xs font-medium text-[#6fa8f0] hover:text-white transition-colors"
        >
          View visitor table &amp; export CSV →
        </Link>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-4">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total Visitors" value={summary ? summary.totalVisitors.toLocaleString() : '—'} />
        <StatCard label="Active Visitors" value={activeVisitors !== null ? activeVisitors.toLocaleString() : '—'} hint="Last 5 minutes" />
        <StatCard label="Unique Visitors" value={summary ? summary.uniqueVisitors.toLocaleString() : '—'} />
        <StatCard label="Returning Visitors" value={summary ? summary.returningVisitors.toLocaleString() : '—'} />
        <StatCard label="Sessions" value={summary ? summary.sessions.toLocaleString() : '—'} />
        <StatCard label="Avg. Session Duration" value={summary ? formatDuration(summary.avgSessionDuration) : '—'} />
        <StatCard label="Bounce Rate" value={summary ? `${summary.bounceRate}%` : '—'} />
        <StatCard label="Conversions" value={summary ? summary.conversions.toLocaleString() : '—'} />
      </div>

      <Panel
        title="Visitors Trend"
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-[#c3c2b7]"
            >
              {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {GRANULARITIES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={`px-2.5 py-1 text-xs capitalize transition-colors ${granularity === g ? 'bg-[#3987e5]/20 text-[#6fa8f0]' : 'text-[#898781] hover:text-white'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
      >
        {loading && trendSeries.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-[#898781]">Loading…</div>
        ) : (
          <TrendChart data={chartData} />
        )}
      </Panel>

      <Panel title="UTM Campaign Performance">
        <UtmCampaignTable rows={utmCampaigns} />
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {BREAKDOWN_PANELS.map((panel) => (
          <Panel key={panel.dimension} title={panel.title}>
            {loading && !breakdowns[panel.dimension] ? (
              <div className="py-8 text-center text-sm text-[#898781]">Loading…</div>
            ) : (
              <RankedBarList data={breakdowns[panel.dimension]} />
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsOverview;
