const { Op } = require('sequelize');
const { Visitor, Session, PageView, VisitorEvent } = require('../../models');
const { parseDateRange } = require('../../utils/analytics/dateRange.util');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

function groupBySessionId(rows) {
    const map = new Map();
    for (const row of rows) {
        if (!map.has(row.session_id)) map.set(row.session_id, []);
        map.get(row.session_id).push(row);
    }
    return map;
}

// Shared by getSessions (paginated table) and export.controller.js (CSV) so
// the two never drift apart on what a given filter query string means.
function buildSessionFilters(query, sequelizeRange) {
    const where = { started_at: sequelizeRange };
    if (query.country) where.country = query.country;
    if (query.state) where.region = query.state;
    if (query.city) where.city = query.city;
    if (query.source) where.traffic_source = query.source;
    if (query.campaign) where.utm_campaign = query.campaign;
    if (query.device) where.device_type = query.device;
    if (query.browser) where.browser = query.browser;
    if (query.os) where.os = query.os;
    if (query.converted === '1') where.converted = true;

    if (query.search) {
        const term = `%${query.search}%`;
        where[Op.or] = [
            { visitor_id: { [Op.like]: term } },
            { session_id: { [Op.like]: term } },
            { entry_page: { [Op.like]: term } },
            { referrer_url: { [Op.like]: term } },
            { utm_campaign: { [Op.like]: term } }
        ];
    }

    const visitorInclude = { model: Visitor, as: 'visitor', attributes: ['is_returning'], required: false };
    if (query.returning === '1') {
        visitorInclude.required = true;
        visitorInclude.where = { is_returning: true };
    } else if (query.newVisitors === '1') {
        visitorInclude.required = true;
        visitorInclude.where = { is_returning: false };
    }

    return { where, visitorInclude };
}

function serializeSessionRow(session) {
    return {
        date: session.started_at,
        visitorId: session.visitor_id,
        sessionId: session.session_id,
        source: session.traffic_source,
        medium: session.utm_medium,
        campaign: session.utm_campaign,
        country: session.country,
        state: session.region,
        city: session.city,
        device: session.device_type,
        browser: session.browser,
        os: session.os,
        landingPage: session.entry_page,
        exitPage: session.exit_page,
        sessionDuration: session.duration_seconds,
        pagesViewed: session.pages_viewed,
        conversion: session.converted,
        lastActivity: session.updated_at,
        isReturning: session.visitor ? session.visitor.is_returning : null
    };
}

// The requested "Visitor Table" columns (Session ID, Landing Page, Exit
// Page, Session Duration, Pages Viewed, ...) are all per-session, so this
// list is backed by analytics_sessions with the owning Visitor's
// is_returning flag joined in for the New/Returning filter — one row per
// session, not one row per unique visitor.
//
// GET /api/analytics/visitors?from&to&page&limit&search&country&state&city
//     &source&campaign&device&browser&os&returning=1&newVisitors=1&converted=1
exports.getSessions = async (req, res) => {
    try {
        const { sequelizeRange } = parseDateRange(req.query);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
        const offset = (page - 1) * limit;

        const { where, visitorInclude } = buildSessionFilters(req.query, sequelizeRange);

        const { rows, count } = await Session.findAndCountAll({
            where,
            include: [visitorInclude],
            order: [['started_at', 'DESC']],
            limit,
            offset,
            subQuery: false
        });

        return res.json({
            data: rows.map(serializeSessionRow),
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        });
    } catch (err) {
        console.error('Error fetching analytics visitor sessions:', err);
        return res.status(500).json({ message: 'Server error fetching visitor sessions' });
    }
};

// GET /api/analytics/visitors/filters?from&to — distinct values to populate
// the table's filter dropdowns, so the frontend never hardcodes a country/
// browser/device list.
exports.getFilterOptions = async (req, res) => {
    try {
        const { sequelizeRange } = parseDateRange(req.query);
        const where = { started_at: sequelizeRange };

        const distinctValues = async (column) => {
            const rows = await Session.findAll({
                attributes: [column],
                where: { ...where, [column]: { [Op.ne]: null, [Op.ne]: '' } },
                group: [column],
                order: [[column, 'ASC']],
                limit: 200,
                raw: true
            });
            return rows.map((r) => r[column]).filter(Boolean);
        };

        const [countries, states, cities, sources, campaigns, devices, browsers, operatingSystems] = await Promise.all([
            distinctValues('country'),
            distinctValues('region'),
            distinctValues('city'),
            distinctValues('traffic_source'),
            distinctValues('utm_campaign'),
            distinctValues('device_type'),
            distinctValues('browser'),
            distinctValues('os')
        ]);

        return res.json({ countries, states, cities, sources, campaigns, devices, browsers, operatingSystems });
    } catch (err) {
        console.error('Error fetching analytics filter options:', err);
        return res.status(500).json({ message: 'Server error fetching filter options' });
    }
};

// GET /api/analytics/visitors/:visitorId/detail — full picture for one
// visitor: their profile (device/location/first-touch attribution) plus
// every recent session's complete timeline (pages visited in order, events
// triggered, session stats). Capped to the 20 most recent sessions so a
// long-lived visitor with hundreds of visits doesn't return an unbounded payload.
exports.getVisitorDetail = async (req, res) => {
    try {
        const { visitorId } = req.params;
        const visitor = await Visitor.findByPk(visitorId);
        if (!visitor) {
            return res.status(404).json({ message: 'Visitor not found' });
        }

        const sessions = await Session.findAll({
            where: { visitor_id: visitorId },
            order: [['started_at', 'DESC']],
            limit: 20
        });
        const sessionIds = sessions.map((s) => s.session_id);

        const [pageViews, events] = sessionIds.length > 0 ? await Promise.all([
            PageView.findAll({ where: { session_id: sessionIds }, order: [['entered_at', 'ASC']] }),
            VisitorEvent.findAll({ where: { session_id: sessionIds }, order: [['created_at', 'ASC']] })
        ]) : [[], []];

        const pageViewsBySession = groupBySessionId(pageViews);
        const eventsBySession = groupBySessionId(events);

        const sessionsWithTimeline = sessions.map((session) => ({
            ...serializeSessionRow(session),
            pageViews: (pageViewsBySession.get(session.session_id) || []).map((pv) => ({
                url: pv.url,
                pageTitle: pv.page_title,
                enteredAt: pv.entered_at,
                timeOnPageSeconds: pv.time_on_page_seconds,
                isEntryPage: pv.is_entry_page
            })),
            events: (eventsBySession.get(session.session_id) || []).map((e) => ({
                eventName: e.event_name,
                eventCategory: e.event_category,
                pageUrl: e.page_url,
                metadata: e.metadata ? safeJsonParse(e.metadata) : null,
                isConversion: e.is_conversion,
                createdAt: e.created_at
            }))
        }));

        return res.json({
            visitor: {
                visitorId: visitor.visitor_id,
                firstVisitAt: visitor.first_visit_at,
                lastVisitAt: visitor.last_visit_at,
                totalVisits: visitor.total_visits,
                totalSessions: visitor.total_sessions,
                isReturning: visitor.is_returning,
                country: visitor.country,
                region: visitor.region,
                city: visitor.city,
                timezone: visitor.timezone,
                latitude: visitor.latitude,
                longitude: visitor.longitude,
                isp: visitor.isp,
                deviceType: visitor.device_type,
                deviceModel: visitor.device_model,
                browser: visitor.browser,
                browserVersion: visitor.browser_version,
                os: visitor.os,
                osVersion: visitor.os_version,
                screenResolution: visitor.screen_resolution,
                language: visitor.language,
                firstReferrerUrl: visitor.first_referrer_url,
                firstReferrerDomain: visitor.first_referrer_domain,
                firstLandingPage: visitor.first_landing_page,
                firstTrafficSource: visitor.first_traffic_source,
                firstUtm: {
                    source: visitor.first_utm_source,
                    medium: visitor.first_utm_medium,
                    campaign: visitor.first_utm_campaign,
                    term: visitor.first_utm_term,
                    content: visitor.first_utm_content
                }
            },
            sessions: sessionsWithTimeline
        });
    } catch (err) {
        console.error('Error fetching visitor detail:', err);
        return res.status(500).json({ message: 'Server error fetching visitor detail' });
    }
};

function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
}

module.exports.buildSessionFilters = buildSessionFilters;
module.exports.serializeSessionRow = serializeSessionRow;
