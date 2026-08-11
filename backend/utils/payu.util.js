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
//
// NOTE: PayU's docs page embeds a "hash tester" JS snippet that folds
// JSON.stringify(si_details) into this hash for UPI Autopay mandate
// registration — that turned out to be wrong for the live test endpoint.
// Confirmed empirically: PayU's own EX087 hash-mismatch error message
// (received when following that snippet) states the correct hash for a live
// si:'1' transaction uses this exact plain formula, with si_details having
// no effect on the hash at all — only on the separate si_details request
// param. Left un-parameterized on purpose; do not reintroduce si_details
// here without re-confirming against a live PayU response first.
const buildRequestHash = ({ key, txnid, amount, productinfo, firstname, email, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '', salt }) => {
    const parts = [key, txnid, amount, productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5, '', '', '', '', '', salt];
    return sha512(parts.join('|'));
};

// Builds the si_details object PayU's UPI Autopay mandate-registration flow
// expects (sent as a JSON-stringified request param alongside si:'1', and
// folded into buildRequestHash above) — field names/shape confirmed against
// PayU's own docs page. paymentStartDate/paymentEndDate must be 'YYYY-MM-DD'.
const buildSiDetails = ({ billingAmount, billingCycle = 'MONTHLY', billingInterval = 1, paymentStartDate, paymentEndDate, billingCurrency = 'INR' }) => ({
    billingAmount: String(billingAmount),
    billingCurrency,
    billingCycle,
    billingInterval,
    paymentStartDate,
    paymentEndDate
});

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
    } catch {
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
    } catch {
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

// PayU/NPCI requires a pre-debit notification to the customer before every
// UPI Autopay recurring charge (command=pre_debit_SI, same base URL as
// verify_payment/si_transaction — see docs.payu.in/reference/
// pre_debit_notification_api). Confirmed empirically: si_transaction
// rejects with error_code E1702 ("Notifying consumer is mandatory. Please
// initiate Notification API") if this hasn't been called first. In
// production this should be sent well ahead of the actual debit (PayU
// requires 48h notice for most UPI billing cycles, 24h for
// daily/adhoc) via its own schedule — this test-focused implementation
// calls it immediately before triggerRecurringCharge for simplicity, since
// the goal here is validating the pipeline mechanics end-to-end, not real
// production NPCI compliance timing.
const triggerPreDebitNotification = async ({ key, authpayuid, amount, debitDate, salt }) => {
    const env = getPayuEnv();
    const command = 'pre_debit_SI';
    const var1 = JSON.stringify({ authpayuid, requestId: crypto.randomUUID(), debitDate, amount });
    const hash = buildVerifyHash({ key, command, var1, salt });

    const body = new URLSearchParams({ key, command, var1, hash }).toString();

    const response = await fetch(VERIFY_URL[env], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`PayU pre_debit_SI response was not valid JSON: ${text.slice(0, 500)}`);
    }

    if (!response.ok) {
        throw new Error(`PayU pre_debit_SI call failed with status ${response.status}: ${text.slice(0, 500)}`);
    }

    return data;
};

// Triggers a recurring debit against an already-registered UPI Autopay
// mandate (command=si_transaction, same base URL as verify_payment — see
// docs.payu.in/reference/recurring_payment_api). authpayuid must be the
// payu_mihpayid captured from the original mandate-registration payment.
// Returns PayU's raw parsed response — callers must NOT treat this as the
// final word on success; re-verify via verifyPaymentWithPayu(txnid)
// afterward, same "never trust a single unverified signal" rule
// payment.controller.js's processCallback already documents.
const triggerRecurringCharge = async ({ key, authpayuid, amount, txnid, phone, email, salt }) => {
    const env = getPayuEnv();
    const command = 'si_transaction';
    const var1 = JSON.stringify({ authpayuid, amount, txnid, phone, email });
    const hash = buildVerifyHash({ key, command, var1, salt });

    const body = new URLSearchParams({ key, command, var1, hash }).toString();

    const response = await fetch(VERIFY_URL[env], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`PayU si_transaction response was not valid JSON: ${text.slice(0, 500)}`);
    }

    if (!response.ok) {
        throw new Error(`PayU si_transaction call failed with status ${response.status}: ${text.slice(0, 500)}`);
    }

    return data;
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
    buildSiDetails,
    buildResponseHash,
    verifyResponseHash,
    buildVerifyHash,
    initiateUpiIntentPayment,
    verifyPaymentWithPayu,
    triggerPreDebitNotification,
    triggerRecurringCharge,
    mapPayuStatus
};
