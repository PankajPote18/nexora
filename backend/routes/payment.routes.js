const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const razorpayUtil = require('../utils/razorpay.util');

router.post('/create', paymentController.createPayment);
router.post('/verify', paymentController.verifyPayment);
router.get('/status/:txnid', paymentController.getPaymentStatus);

// Razorpay calls this directly (server-to-server) — not a user-facing route.
// Verifies X-Razorpay-Signature against the raw request bytes (see
// app.js's express.json({ verify }) for where req.rawBody comes from) before
// the controller ever sees the payload — an unsigned/forged request is
// rejected here, not inside the controller.
router.post('/webhook', (req, res, next) => {
    const signature = req.headers['x-razorpay-signature'];
    const valid = razorpayUtil.verifyWebhookSignature({
        rawBody: req.rawBody ? req.rawBody.toString('utf8') : '',
        signature
    });
    if (!valid) {
        console.warn('Rejected Razorpay webhook with invalid signature');
        return res.status(400).json({ status: 'invalid signature' });
    }
    return next();
}, paymentController.handleWebhook);

module.exports = router;
