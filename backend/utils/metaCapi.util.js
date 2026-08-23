const crypto = require('crypto');

// Meta Conversions API (server-side event mirror of the client Pixel — see
// src/analytics/metaEvents.js). Fixed Graph API host/version, not a secret —
// see https://developers.facebook.com/docs/marketing-api/conversions-api
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_URL = (pixelId) => `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`;

const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

// Meta's user_data.ph wants a SHA-256 hash of the phone in E.164 digits-only
// form (no leading '+'). This app's customer_phone is always a bare 10-digit
// Indian number (see PHONE_RE in payment.controller.js), so the country code
// isn't stored — assume India (91) here; revisit if non-Indian numbers are
// ever supported.
const hashPhoneForCapi = (phone) => {
    const digitsOnly = String(phone || '').replace(/\D/g, '');
    if (!digitsOnly) return null;
    const e164 = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
    return sha256(e164);
};

// Sends a CompleteRegistration event to Meta's Conversions API. Never throws
// — a failed/misconfigured CAPI send must not break the payment flow that
// triggers it (paymentReconcile.service.js calls this fire-and-forget).
// Returns { ok, status?, body? } for the caller to log.
const sendCompleteRegistrationEvent = async ({
    eventId,
    eventTime,
    eventSourceUrl,
    phone,
    valueAmount,
    currency,
    clientIp,
    userAgent,
    fbc,
    fbp
}) => {
    try {
        const pixelId = process.env.META_PIXEL_ID;
        const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
        if (!pixelId || !accessToken) {
            console.warn('Meta CAPI not configured (META_PIXEL_ID / META_CAPI_ACCESS_TOKEN missing) — skipping CompleteRegistration send');
            return { ok: false };
        }

        const hashedPhone = hashPhoneForCapi(phone);

        const userData = {
            ...(hashedPhone && { ph: [hashedPhone] }),
            ...(clientIp && { client_ip_address: clientIp }),
            ...(userAgent && { client_user_agent: userAgent }),
            ...(fbc && { fbc }),
            ...(fbp && { fbp })
        };

        const payload = {
            data: [{
                event_name: 'CompleteRegistration',
                event_time: eventTime,
                event_id: eventId,
                action_source: 'website',
                event_source_url: eventSourceUrl,
                user_data: userData,
                custom_data: {
                    ...(valueAmount !== undefined && valueAmount !== null && { value: Number(valueAmount) }),
                    ...(currency && { currency })
                }
            }],
            ...(process.env.META_CAPI_TEST_EVENT_CODE && { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE })
        };

        const response = await fetch(`${GRAPH_API_URL(pixelId)}?access_token=${encodeURIComponent(accessToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        if (!response.ok) {
            console.error(`Meta CAPI send failed with status ${response.status}: ${text.slice(0, 500)}`);
            return { ok: false, status: response.status, body: text };
        }

        return { ok: true, status: response.status, body: text };
    } catch (err) {
        console.error('Meta CAPI send threw an error:', err.message);
        return { ok: false };
    }
};

module.exports = {
    hashPhoneForCapi,
    sendCompleteRegistrationEvent
};
