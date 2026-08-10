const { sequelize } = require('../config/db.config');
const User = require('./User');
const Movie = require('./Movie');
const SubscriptionPlan = require('./SubscriptionPlan');
const SettingsPage = require('./SettingsPage');
const SettingsMenu = require('./SettingsMenu');
const Category = require('./Category');
const HeroBanner = require('./HeroBanner');

const Genre = require('./Genre');
const Language = require('./Language');
const AgeCertificate = require('./AgeCertificate');
const MatureTheme = require('./MatureTheme');
const Badge = require('./Badge');
const Vendor = require('./Vendor');
const Tray = require('./Tray');
const Payment = require('./Payment');
const Subscription = require('./Subscription');

// Analytics module (see CLAUDE.md §23) — isolated tables, own subfolder.
// Associations are informational only (no admin/consumer model references
// these), used by controllers/analytics/* for eager-loading in the visitor
// detail view.
const Visitor = require('./analytics/Visitor');
const Session = require('./analytics/Session');
const PageView = require('./analytics/PageView');
const VisitorEvent = require('./analytics/VisitorEvent');
const AnalyticsSummary = require('./analytics/AnalyticsSummary');

// Define Relationships here if needed in the future
HeroBanner.belongsTo(Movie, { foreignKey: 'show_id', as: 'show' });
Movie.hasMany(HeroBanner, { foreignKey: 'show_id' });

Payment.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });
SubscriptionPlan.hasMany(Payment, { foreignKey: 'plan_id' });
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Payment, { foreignKey: 'user_id' });

// Autopay billing (see CLAUDE.md §9/§22, backend/services/autopayBilling.service.js)
// — soft references only, same convention as the associations above.
Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });
Subscription.belongsTo(Payment, { foreignKey: 'last_payment_id', as: 'lastPayment' });
Payment.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
Subscription.hasMany(Payment, { foreignKey: 'subscription_id' });

// constraints: false — deliberately no DB-level foreign keys, consistent
// with this project's existing convention for high-volume/soft-referenced
// data (see CLAUDE.md §7: everything except HeroBanner->Movie is a soft
// reference). A real FK here would add a constraint check to every single
// pageview/event insert, which is exactly the write path the "must never
// slow down the site" / "handle high traffic efficiently" requirements care
// about most.
const softRef = { constraints: false };
Visitor.hasMany(Session, { foreignKey: 'visitor_id', sourceKey: 'visitor_id', as: 'sessions', ...softRef });
Session.belongsTo(Visitor, { foreignKey: 'visitor_id', targetKey: 'visitor_id', as: 'visitor', ...softRef });
Session.hasMany(PageView, { foreignKey: 'session_id', sourceKey: 'session_id', as: 'pageViews', ...softRef });
PageView.belongsTo(Session, { foreignKey: 'session_id', targetKey: 'session_id', as: 'session', ...softRef });
Session.hasMany(VisitorEvent, { foreignKey: 'session_id', sourceKey: 'session_id', as: 'events', ...softRef });
VisitorEvent.belongsTo(Session, { foreignKey: 'session_id', targetKey: 'session_id', as: 'session', ...softRef });

module.exports = {
    sequelize,
    User,
    Movie,
    SubscriptionPlan,
    SettingsPage,
    SettingsMenu,
    Category,
    Genre,
    Language,
    AgeCertificate,
    MatureTheme,
    Badge,
    Vendor,
    HeroBanner,
    Tray,
    Payment,
    Subscription,
    Visitor,
    Session,
    PageView,
    VisitorEvent,
    AnalyticsSummary
};
