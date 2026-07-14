const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

router.post('/create', paymentController.createPayment);
router.get('/status/:txnid', paymentController.getPaymentStatus);

// PayU calls these directly (S2S) — not user-facing routes.
router.post('/callback/success', paymentController.handleSuccessCallback);
router.post('/callback/failure', paymentController.handleFailureCallback);
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
