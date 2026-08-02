import { useAnalyticsTracker } from './useAnalyticsTracker';

// Renders nothing — exists only so useAnalyticsTracker (which needs
// react-router's useLocation) can be mounted once, inside <Router>, without
// App.jsx needing to know anything about how tracking works internally.
const AnalyticsBoundary = () => {
    useAnalyticsTracker();
    return null;
};

export default AnalyticsBoundary;
