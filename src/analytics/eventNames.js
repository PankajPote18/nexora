// Standard event names for trackEvent() (see tracker.js) — a shared
// vocabulary so the dashboard's event breakdowns are consistent across
// pages, not a hard-coded enum. Any page/component can still call
// trackEvent('something_new') with a name that isn't listed here; it will
// show up in the dashboard exactly the same way.
export const ANALYTICS_EVENTS = {
    CONTACT_FORM_SUBMITTED: 'contact_form_submitted',
    CTA_CLICKED: 'cta_clicked',
    WHATSAPP_CLICK: 'whatsapp_click',
    EMAIL_CLICK: 'email_click',
    PHONE_CLICK: 'phone_click',
    DOWNLOAD_CLICK: 'download_click',
    NEWSLETTER_SIGNUP: 'newsletter_signup',
    QUOTE_REQUEST: 'quote_request'
};
