const crypto = require('crypto');

// Fixed PayU endpoints (not secrets, don't vary per merchant) — see
// https://docs.payu.in/docs/upi-intent-server-to-server and
// https://docs.payu.in/reference/verify_payment_api
const INITIATE_URL = {
    test: 'https://test.payu.in/_payment',
    production: 'https://secure.payu.in/_payment'
};

const VERIFY_URL = {
    test: 'https://test.payu.in/merchant/postservice?form=2',
    production: 'https://info.payu.in/merchant/postservice.php?form=2'
};

const getPayuEnv = () => (process.env.PAYU_ENV === 'production' ? 'production' : 'test');

const generateTxnId = () => {
    const ts = Date.now().toString(36);
    const rand = crypto.randomBytes(5).toString('hex');
    return `NX${ts}${rand}`.toUpperCase();
};

const sha512 = (str) => crypto.createHash('sha512').update(str).digest('hex');

// Request hash for initiating a payment:
// sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
const buildRequestHash = ({ key, txnid, amount, productinfo, firstname, email, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '', salt }) => {
    const parts = [key, txnid, amount, productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5, '', '', '', '', '', salt];
    return sha512(parts.join('|'));
};

// Reverse hash for verifying a PayU response (surl/furl/webhook payload):
// sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
const buildResponseHash = ({ salt, status, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '', email, firstname, productinfo, amount, txnid, key }) => {
    const parts = [salt, status, '', '', '', '', '', udf5, udf4, udf3, udf2, udf1, email, firstname, productinfo, amount, txnid, key];
    return sha512(parts.join('|'));
};

const verifyResponseHash = (payload) => {
    if (!payload || !payload.hash) return false;
    // Always use our own configured key, never the (unauthenticated) key field
    // from the payload itself — the payload hasn't been trusted yet at this point.
    const expected = buildResponseHash({
        salt: process.env.PAYU_SALT,
        status: payload.status || '',
        udf1: payload.udf1 || '',
        udf2: payload.udf2 || '',
        udf3: payload.udf3 || '',
        udf4: payload.udf4 || '',
        udf5: payload.udf5 || '',
        email: payload.email || '',
        firstname: payload.firstname || '',
        productinfo: payload.productinfo || '',
        amount: payload.amount || '',
        txnid: payload.txnid || '',
        key: process.env.PAYU_MERCHANT_KEY
    });

    const received = String(payload.hash).toLowerCase();
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

// Verify Payment API hash: sha512(key|command|var1|salt)
const buildVerifyHash = ({ key, command, var1, salt }) => sha512(`${key}|${command}|${var1}|${salt}`);

// Initiates a UPI Intent payment via PayU's S2S `_payment` endpoint.
// Returns the parsed JSON response (metaData/result per PayU docs).
const initiateUpiIntentPayment = async (params) => {
    const env = getPayuEnv();
    const body = new URLSearchParams(params).toString();

    const response = await fetch(INITIATE_URL[env], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`PayU initiate response was not valid JSON: ${text.slice(0, 500)}`);
    }

    if (!response.ok) {
        throw new Error(`PayU initiate call failed with status ${response.status}: ${text.slice(0, 500)}`);
    }

    return data;
};

// Calls PayU's Verify Payment API (command=verify_payment) for a given txnid.
// Returns the transaction_details object for that txnid, or null if not found.
const verifyPaymentWithPayu = async (txnid) => {
    const env = getPayuEnv();
    const key = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_SALT;
    const command = 'verify_payment';

    const hash = buildVerifyHash({ key, command, var1: txnid, salt });

    const body = new URLSearchParams({ key, command, var1: txnid, hash }).toString();

    const response = await fetch(VERIFY_URL[env], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`PayU verify response was not valid JSON: ${text.slice(0, 500)}`);
    }

    if (!response.ok || Number(data.status) !== 1) {
        return null;
    }

    if (!data.transaction_details) return null;
    // Normally keyed by txnid, but fall back to the first entry if PayU ever
    // returns it shaped differently for a single-txnid lookup.
    const details = data.transaction_details[txnid] || Object.values(data.transaction_details)[0];
    return details || null;
};

// Maps PayU's status/unmappedstatus to this app's internal payment status.
// PayU's verify_payment API only documents success|failure|pending — there is no
// separate documented "cancelled" enum, so a failure is treated as "cancelled"
// when unmappedstatus looks like a user-initiated drop/cancel rather than a
// genuine decline. This is a best-effort heuristic, not a documented mapping.
const mapPayuStatus = (status, unmappedstatus = '') => {
    const normalizedStatus = (status || '').toLowerCase();
    const normalizedUnmapped = (unmappedstatus || '').toLowerCase();

    if (normalizedStatus === 'success') return 'success';

    if (normalizedStatus === 'failure' || normalizedStatus === 'failed') {
        const cancelKeywords = ['cancel', 'dropped', 'drop', 'userdropped', 'usercancelled'];
        if (cancelKeywords.some((kw) => normalizedUnmapped.includes(kw))) {
            return 'cancelled';
        }
        return 'failed';
    }

    return 'pending';
};

module.exports = {
    getPayuEnv,
    generateTxnId,
    buildRequestHash,
    buildResponseHash,
    verifyResponseHash,
    buildVerifyHash,
    initiateUpiIntentPayment,
    verifyPaymentWithPayu,
    mapPayuStatus
};
