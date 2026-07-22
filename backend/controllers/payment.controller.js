const { Payment, SubscriptionPlan } = require('../models');
const { sequelize } = require('../config/db.config');
const {
    generateTxnId,
    buildRequestHash,
    verifyResponseHash,
    initiateUpiIntentPayment,
    verifyPaymentWithPayu,
    mapPayuStatus
} = require('../utils/payu.util');

const FINAL_STATUSES = ['success', 'failed', 'cancelled'];
const VERIFY_THROTTLE_MS = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;

// Creates a Payment record and initiates a PayU UPI Intent S2S transaction.
exports.createPayment = async (req, res) => {
    try {
        const { plan_id, customer_name, customer_email, customer_phone } = req.body;

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
            status: 'pending'
        });

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

        const upiIntentUrl = `upi://pay?${intentUriData}`;

        console.log(`Payment created: txnid=${txnid}, plan=${plan.id}, amount=${amount}`);

        return res.status(201).json({
            paymentId: payment.id,
            txnid,
            amount,
            upiIntentUrl,
            status: 'pending'
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
            updatedAt: payment.updated_at
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

// Looks up the authoritative status from PayU and applies it idempotently
// under a row lock, so concurrent callback/webhook/poll requests can't
// double-process the same transaction.
async function reconcileWithPayu(txnid) {
    const t = await sequelize.transaction();
    try {
        const payment = await Payment.findOne({ where: { txnid }, transaction: t, lock: true });
        if (!payment) {
            console.warn(`PayU callback/verify for unknown txnid=${txnid}`);
            await t.commit();
            return;
        }

        if (FINAL_STATUSES.includes(payment.status)) {
            // Already finalized — idempotent no-op for duplicate deliveries.
            await t.commit();
            return;
        }

        let details;
        try {
            details = await verifyPaymentWithPayu(txnid);
        } catch (err) {
            console.error(`PayU verify_payment call failed for txnid=${txnid}:`, err.message);
            await payment.update({ last_verified_at: new Date() }, { transaction: t });
            await t.commit();
            return;
        }

        if (!details) {
            // PayU has no record yet (or the call failed) — leave pending, try again later.
            await payment.update({ last_verified_at: new Date() }, { transaction: t });
            await t.commit();
            return;
        }

        const newStatus = mapPayuStatus(details.status, details.unmappedstatus);

        await payment.update({
            status: newStatus,
            payu_mihpayid: details.mihpayid || payment.payu_mihpayid,
            payu_bank_ref_num: details.bank_ref_num || null,
            payu_mode: details.mode || null,
            payu_response: JSON.stringify(details),
            error_message: newStatus === 'failed' || newStatus === 'cancelled' ? (details.error_Message || details.field9 || null) : null,
            last_verified_at: new Date()
        }, { transaction: t });

        await t.commit();
        console.log(`Payment txnid=${txnid} reconciled with PayU -> status=${newStatus}`);
    } catch (err) {
        await t.rollback();
        console.error(`Error reconciling payment txnid=${txnid} with PayU:`, err);
    }
}
