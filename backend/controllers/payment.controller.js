const crypto = require('crypto');
const { Payment, Subscription, SubscriptionPlan } = require('../models');
const {
    generateTxnId,
    buildRequestHash,
    buildSiDetails,
    verifyResponseHash,
    initiateUpiIntentPayment
} = require('../utils/payu.util');
const { getClientIp } = require('../utils/analytics/ipHash.util');
const { FINAL_STATUSES, VERIFY_THROTTLE_MS, reconcileWithPayu } = require('../services/payuReconcile.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;

// A UPI Autopay mandate needs its own validity window (how long the mandate
// itself can be charged against), separate from the Subscription's own
// expires_at (which drives *when* the next charge is due). A long window
// avoids re-registering the mandate every billing cycle — this app's own
// autopay billing cron (services/autopayBilling.service.js) is what actually
// decides when to charge within that window.
const MANDATE_VALIDITY_YEARS = 3;
const toPayuDate = (date) => date.toISOString().slice(0, 10); // YYYY-MM-DD

// Creates a Payment record and initiates a PayU UPI Intent S2S transaction.
exports.createPayment = async (req, res) => {
    try {
        const { plan_id, customer_name, customer_email, customer_phone, fbc, fbp, enable_autopay } = req.body;

        if (!plan_id || !customer_name || !customer_email || !customer_phone) {
            return res.status(400).json({ message: 'plan_id, customer_name, customer_email and customer_phone are required' });
        }
        if (!EMAIL_RE.test(customer_email)) {
            return res.status(400).json({ message: 'Invalid email address' });
        }
        if (!PHONE_RE.test(customer_phone)) {
            return res.status(400).json({ message: 'Invalid phone number' });
        }

        const plan = await SubscriptionPlan.findByPk(plan_id);
        if (!plan || !plan.status) {
            return res.status(404).json({ message: 'Subscription plan not found or inactive' });
        }

        const key = process.env.PAYU_MERCHANT_KEY;
        const salt = process.env.PAYU_SALT;
        if (!key || !salt) {
            console.error('PayU credentials are not configured (PAYU_MERCHANT_KEY / PAYU_SALT missing)');
            return res.status(500).json({ message: 'Payment gateway is not configured' });
        }

        const txnid = generateTxnId();
        const amount = Number(plan.discounted_price).toFixed(2);
        const productinfo = `ClickBuz ${plan.name} Subscription`;
        const backendUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '');

        // Shared with the client-side Meta Pixel's CompleteRegistration call
        // (once payment succeeds) so Meta can dedupe the two events — see
        // trackCompleteRegistration in src/analytics/metaEvents.js. Generated
        // now because this is the only point with real browser context
        // (fbc/fbp/ip/ua); reconcileWithPayu (where 'success' is written)
        // can be reached from PayU's S2S webhook, which has none of that.
        const metaEventId = crypto.randomUUID();

        // Create the pending record first so we have an audit trail even if the
        // call to PayU below fails outright.
        const payment = await Payment.create({
            txnid,
            plan_id: plan.id,
            customer_name,
            customer_email,
            customer_phone,
            amount,
            payment_method: 'UPI',
            status: 'pending',
            fbc: typeof fbc === 'string' ? fbc.slice(0, 255) : null,
            fbp: typeof fbp === 'string' ? fbp.slice(0, 255) : null,
            client_ip: getClientIp(req),
            client_user_agent: (req.headers['user-agent'] || '').toString().slice(0, 512),
            meta_event_id: metaEventId
        });

        // UPI Autopay mandate registration piggybacks on this same initiate
        // call — si_details describes the recurring billing terms PayU asks
        // the customer to consent to alongside this first payment. See
        // buildSiDetails/buildRequestHash in payu.util.js for the exact
        // field names/hash formula (confirmed against PayU's own docs).
        const siDetails = enable_autopay
            ? buildSiDetails({
                billingAmount: amount,
                billingCycle: 'MONTHLY',
                billingInterval: 1,
                paymentStartDate: toPayuDate(new Date()),
                paymentEndDate: toPayuDate(new Date(Date.now() + MANDATE_VALIDITY_YEARS * 365 * 86400000))
            })
            : null;

        // si_details does NOT affect this hash (see buildRequestHash's
        // comment) — only the separate si_details POST param below.
        const hash = buildRequestHash({ key, txnid, amount, productinfo, firstname: customer_name, email: customer_email, salt });

        const payuParams = {
            key,
            txnid,
            amount,
            productinfo,
            firstname: customer_name,
            lastname: '',
            email: customer_email,
            phone: customer_phone,
            zipcode: '',
            pg: 'UPI',
            bankcode: 'INTENT',
            txn_s2s_flow: '4',
            s2s_client_ip: (req.ip || req.headers['x-forwarded-for'] || '').toString(),
            s2s_device_info: (req.headers['user-agent'] || '').toString(),
            surl: `${backendUrl}/api/payments/callback/success`,
            furl: `${backendUrl}/api/payments/callback/failure`,
            hash
        };
        if (siDetails) {
            payuParams.si = '1';
            payuParams.si_details = JSON.stringify(siDetails);
        }

        let payuData;
        try {
            payuData = await initiateUpiIntentPayment(payuParams);
        } catch (err) {
            console.error(`PayU initiate call failed for txnid=${txnid}:`, err.message);
            await payment.update({ status: 'failed', error_message: `PayU initiate call failed: ${err.message}` });
            return res.status(502).json({ message: 'Failed to initiate payment with PayU' });
        }

        const intentUriData = payuData?.result?.intentURIData;
        if (!intentUriData) {
            console.error(`PayU initiate response missing intentURIData for txnid=${txnid}:`, JSON.stringify(payuData));
            await payment.update({
                status: 'failed',
                error_message: 'PayU did not return UPI intent data',
                payu_response: JSON.stringify(payuData)
            });
            return res.status(502).json({ message: 'PayU did not return UPI intent data' });
        }

        await payment.update({
            payu_reference_id: payuData?.metaData?.referenceId || null,
            payu_mihpayid: payuData?.metaData?.txnId || payuData?.result?.paymentId || null,
            payu_response: JSON.stringify(payuData)
        });

        // Create the Subscription row now (mandate_status:'pending') so it
        // exists for the frontend to reference and for reconcileWithPayu to
        // find and confirm once this payment's status is verified — don't
        // wait for that reconciliation to create it. See
        // payuReconcile.service.js's pendingMandateSub lookup.
        if (siDetails) {
            await Subscription.create({
                customer_phone,
                customer_email,
                plan_id: plan.id,
                status: 'active',
                expires_at: new Date(Date.now() + plan.number_of_days * 86400000),
                autopay_enabled: true,
                mandate_status: 'pending',
                last_payment_id: payment.id
            });
        }

        const upiIntentUrl = `upi://pay?${intentUriData}`;

        console.log(`Payment created: txnid=${txnid}, plan=${plan.id}, amount=${amount}`);

        return res.status(201).json({
            paymentId: payment.id,
            txnid,
            amount,
            upiIntentUrl,
            status: 'pending',
            metaEventId
        });
    } catch (err) {
        console.error('Error creating payment:', err);
        return res.status(500).json({ message: 'Server error creating payment' });
    }
};

// Re-checks a payment's status against PayU (throttled) and returns the
// backend-confirmed status. Never trusts anything other than the DB / PayU.
exports.getPaymentStatus = async (req, res) => {
    try {
        const { txnid } = req.params;
        const payment = await Payment.findOne({ where: { txnid } });
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (!FINAL_STATUSES.includes(payment.status)) {
            const lastVerified = payment.last_verified_at ? new Date(payment.last_verified_at).getTime() : 0;
            if (Date.now() - lastVerified > VERIFY_THROTTLE_MS) {
                await reconcileWithPayu(payment.txnid);
                await payment.reload();
            }
        }

        return res.json({
            txnid: payment.txnid,
            status: payment.status,
            amount: payment.amount,
            planId: payment.plan_id,
            paymentMethod: payment.payment_method,
            updatedAt: payment.updated_at,
            // Lets the frontend recover the id for a payment resumed via
            // ?txnid= on a fresh page load (no createPayment call in that
            // tab), so its Pixel CompleteRegistration call can still dedupe
            // against the server-side CAPI mirror sent below.
            metaEventId: payment.meta_event_id
        });
    } catch (err) {
        console.error('Error fetching payment status:', err);
        return res.status(500).json({ message: 'Server error fetching payment status' });
    }
};

// PayU redirects here (surl) after the user completes the UPI flow.
exports.handleSuccessCallback = async (req, res) => {
    try {
        await processCallback(req.body);
    } catch (err) {
        console.error('Error processing PayU success callback:', err);
    }
    return redirectToFrontend(res, req.body?.txnid);
};

// PayU redirects here (furl) after a failed/declined UPI flow.
exports.handleFailureCallback = async (req, res) => {
    try {
        await processCallback(req.body);
    } catch (err) {
        console.error('Error processing PayU failure callback:', err);
    }
    return redirectToFrontend(res, req.body?.txnid);
};

// Dashboard-configured webhook — server-to-server only, no browser involved.
exports.handleWebhook = async (req, res) => {
    try {
        await processCallback(req.body);
        return res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Error processing PayU webhook:', err);
        // Non-2xx so PayU's retry mechanism can recover from transient failures
        return res.status(500).json({ status: 'error' });
    }
};

function redirectToFrontend(res, txnid) {
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const target = `${frontendUrl}/plans${txnid ? `?txnid=${encodeURIComponent(txnid)}` : ''}`;
    return res.redirect(302, target);
}

// Shared idempotent handler for surl/furl/webhook payloads. Verifies the
// payload's hash for tamper-detection/logging, but the actual status written
// to the DB always comes from an authoritative call to PayU's Verify Payment
// API — never from the posted `status` field alone (per requirement to never
// trust a single unverified signal).
async function processCallback(payload) {
    const txnid = payload?.txnid;
    if (!txnid) {
        console.warn('PayU callback received without a txnid, ignoring:', JSON.stringify(payload));
        return;
    }

    const hashValid = verifyResponseHash(payload);
    if (!hashValid) {
        console.warn(`PayU callback hash mismatch for txnid=${txnid} — proceeding to verify directly with PayU instead of trusting this payload`);
    }

    await reconcileWithPayu(txnid);
}
