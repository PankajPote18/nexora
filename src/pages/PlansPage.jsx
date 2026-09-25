import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { plansApi, paymentsApi } from '../services/api';
import { useAuth, markPaid } from '../hooks/useAuth';
import { trackCompleteRegistration } from '../analytics/metaEvents';
import { getStoredFbc, getFbpCookie } from '../analytics/metaClickIds';
import { getStoredClickId } from '../analytics/affiliateClickId';
import { loadRazorpayCheckout } from '../services/razorpayCheckout';

// Short fallback poll — only kicks in if the backend's own /verify call
// (fired the instant Razorpay Checkout's in-browser `handler` confirms a
// payment) somehow still reports 'pending' (e.g. a webhook/verify race).
// Much shorter than the old UPI-intent flow's polling window ever needed to
// be, since Checkout.js already means the charge attempt is complete from
// the user's point of view by the time this could even run.
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10; // ~30 seconds

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PlansPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // LoginPage.jsx prefetches the plan list in parallel with its
  // subscription-status check and hands it over here via navigation state,
  // so this page can skip its own /api/subscription-plans round trip.
  const prefetchedPlans = location.state?.plans;
  const [plans, setPlans] = useState(prefetchedPlans || []);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(!(prefetchedPlans && prefetchedPlans.length > 0));

  // Payment flow state
  const [paymentPhase, setPaymentPhase] = useState('idle'); // idle | creating | checkout_open | confirming | success | failed | cancelled | timeout | error
  const [txnid, setTxnid] = useState(null);
  // Shared with the client-side Pixel's CompleteRegistration call so Meta
  // can dedupe it against the server-side Conversions API mirror sent from
  // the backend once this payment succeeds — see metaEvents.js.
  const [metaEventId, setMetaEventId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Explore Plans shows a single plan — the Monthly one — falling back to the
  // recommended plan, then the first active plan, if no Monthly plan exists.
  const selectPlan = (data) => {
    const monthly = data.find((p) => (p.billing_cycle || '').toUpperCase() === 'MONTHLY');
    const recommended = data.find((p) => p.is_recommended);
    setSelectedPlan(monthly?.id ?? recommended?.id ?? data[0]?.id ?? null);
  };

  const fetchPlans = () => {
    setLoading(true);
    plansApi
      .getAll(true)
      .then((data) => {
        setPlans(data);
        selectPlan(data);
      })
      .catch((err) => console.error('Plans fetch failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (prefetchedPlans && prefetchedPlans.length > 0) {
      selectPlan(prefetchedPlans);
      return;
    }
    // No usable prefetch (direct /plans visit, or LoginPage's own prefetch
    // failed) — fetch it ourselves, same as always.
    fetchPlans();
    // prefetchedPlans is read once from the navigation state this
    // component was mounted with and never change for the lifetime of this
    // page view — intentionally not re-running this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { phoneNumber: sessionPhoneNumber } = useAuth();

  // Pre-fill the phone field from the authenticated session — this checkout
  // form expects a plain 10-digit Indian mobile number (see the input's
  // maxLength below). Strip every non-digit char (not just a leading
  // "+<country code>" match) and take the last 10 digits: country codes
  // vary in length (+91 is 2 digits, +971 is 3), and a fixed-width prefix
  // match silently ate one digit of the real number for any 1-2 digit code.
  useEffect(() => {
    if (sessionPhoneNumber) setCustomerPhone(sessionPhoneNumber.replace(/\D/g, '').slice(-10));
  }, [sessionPhoneNumber]);

  // Fires exactly once per successful payment.
  const registrationTracked = useRef(false);
  useEffect(() => {
    if (paymentPhase === 'success' && !registrationTracked.current) {
      registrationTracked.current = true;
      const plan = plans.find((p) => p.id === selectedPlan);
      trackCompleteRegistration({ status: true, value: plan?.original_price, currency: 'INR', eventId: metaEventId });
    }
    if (paymentPhase === 'idle') {
      registrationTracked.current = false;
    }
  }, [paymentPhase, plans, selectedPlan, metaEventId]);

  // Successful payment is the only thing that unlocks the rest of the app
  // (see ProtectedRoute.jsx) — mark the session paid, then hand off to the
  // home page after a beat so the "Payment successful" card is still seen.
  useEffect(() => {
    if (paymentPhase !== 'success') return undefined;
    markPaid();
    const timer = setTimeout(() => navigate('/', { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [paymentPhase, navigate]);

  // Short fallback poll for the rare case where /verify's own response still
  // reports 'pending' right after Razorpay's handler fired.
  const pollUntilResolved = async (txnid) => {
    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const res = await paymentsApi.getStatus(txnid);
        if (res.metaEventId) setMetaEventId(res.metaEventId);
        if (res.status === 'success' || res.status === 'failed' || res.status === 'cancelled') {
          setPaymentPhase(res.status);
          return;
        }
      } catch (err) {
        console.error('Payment status poll failed:', err);
      }
    }
    setPaymentPhase('timeout');
  };

  const handleCheckoutSuccess = async (txnid, razorpayResponse) => {
    setPaymentPhase('confirming');
    try {
      const verifyBody = {
        txnid,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
      };
      if (razorpayResponse.razorpay_subscription_id) {
        verifyBody.razorpay_subscription_id = razorpayResponse.razorpay_subscription_id;
      } else {
        verifyBody.razorpay_order_id = razorpayResponse.razorpay_order_id;
      }

      const result = await paymentsApi.verify(verifyBody);
      if (result.metaEventId) setMetaEventId(result.metaEventId);

      if (result.status === 'success' || result.status === 'failed' || result.status === 'cancelled') {
        setPaymentPhase(result.status);
      } else {
        await pollUntilResolved(txnid);
      }
    } catch (err) {
      console.error('Payment verification failed:', err);
      await pollUntilResolved(txnid);
    }
  };

  const handlePayNow = async () => {
    if (!selectedPlan) return;

    setErrorMsg('');
    setPaymentPhase('creating');
    try {
      await loadRazorpayCheckout();

      // No contact-detail form — Razorpay Checkout still wants a name/email
      // per transaction, so a demo placeholder is derived from the session
      // phone number instead of asking the user to type them in.
      const customerEmail = `user${customerPhone}@clickbuz-demo.local`;
      const res = await paymentsApi.create({
        plan_id: selectedPlan,
        customer_name: 'ClickBuz User',
        customer_email: customerEmail,
        customer_phone: customerPhone.trim(),
        fbc: getStoredFbc(),
        fbp: getFbpCookie(),
        // Affiliate/marketing partner attribution (TrafficMedia24) — null
        // when this visitor never arrived with a ?click_id=... URL param.
        // See src/analytics/affiliateClickId.js and CLAUDE.md §26.
        click_id: getStoredClickId(),
        // Every plan (weekly/monthly/annual) bills via a Razorpay Subscription
        // rather than a one-time order, so it auto-renews on that plan's own
        // cadence — see BILLING_CYCLE_TO_RAZORPAY in payment.controller.js.
        // The resulting UPI Autopay mandate can always be cancelled by the
        // customer directly from their UPI app/bank at any time — that's a
        // property of UPI Autopay itself, not something this app gates.
        enable_autopay: true,
      });

      setTxnid(res.txnid);
      setMetaEventId(res.metaEventId || null);

      const options = {
        key: res.razorpayKeyId,
        name: 'ClickBuz',
        description: 'ClickBuz Subscription',
        // Both contact AND email need to be prefilled for Razorpay Checkout
        // to skip/streamline its own Contact Details step — prefilling only
        // one still leaves it prompting for the other.
        prefill: { contact: customerPhone, email: customerEmail },
        theme: { color: '#00A8E1' },
        handler: (razorpayResponse) => handleCheckoutSuccess(res.txnid, razorpayResponse),
        modal: {
          // The only way we learn the user backed out of Checkout without
          // paying — Razorpay itself reports this, no more guessing at a
          // "cancelled" status the way the old gateway integration had to.
          ondismiss: () => setPaymentPhase('cancelled'),
        },
      };

      if (res.subscriptionId) {
        options.subscription_id = res.subscriptionId;
        options.recurring = true;
      } else {
        options.order_id = res.orderId;
        options.amount = Math.round(Number(res.amount) * 100);
        options.currency = 'INR';
      }

      const checkout = new window.Razorpay(options);
      // Fires when a payment attempt inside the modal is declined (e.g. a
      // failed card charge) — Checkout itself may keep the modal open for a
      // retry with another method, so this only surfaces the error message;
      // if the user then closes the modal, `modal.ondismiss` above still
      // fires afterward and is treated as the more specific "cancelled".
      checkout.on('payment.failed', (failure) => {
        setErrorMsg(failure?.error?.description || 'Payment failed. Please try again.');
        setPaymentPhase('failed');
      });
      setPaymentPhase('checkout_open');
      checkout.open();
    } catch (err) {
      console.error('Payment creation failed:', err);
      setErrorMsg(err.message || 'Something went wrong while starting your payment. Please try again.');
      setPaymentPhase('error');
    }
  };

  // Lets the user resolve a 'timeout' state immediately instead of waiting
  // for pollUntilResolved's next tick — same manual escape hatch the old
  // polling-based flow had.
  const handleCheckStatusNow = async (txnid) => {
    try {
      const res = await paymentsApi.getStatus(txnid);
      if (res.metaEventId) setMetaEventId(res.metaEventId);
      if (res.status === 'success' || res.status === 'failed' || res.status === 'cancelled') {
        setPaymentPhase(res.status);
      }
    } catch (err) {
      console.error('Manual status check failed:', err);
    }
  };

  const resetPaymentFlow = () => {
    setPaymentPhase('idle');
    setTxnid(null);
    setMetaEventId(null);
    setErrorMsg('');
  };

  // Plan list failed to load (or came back empty): nothing to pay for, so
  // show the "couldn't load" state with a retry instead.
  const noPlanAvailable = !loading && !selectedPlan;
  const plan = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="w-full bg-bg-dark pt-24 pb-12 flex flex-col items-center px-4 min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md bg-black border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden mt-8">
        {paymentPhase !== 'success' && (
          <button
            onClick={() => navigate(-1)}
            className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
        )}

        {paymentPhase === 'success' ? (
          // Success: tick mark, then the effect above redirects home.
          <div
            data-testid="payment-status-card"
            data-status="success"
            className="flex flex-col items-center justify-center text-center py-16 gap-3 auth-pop-in"
          >
            <CheckCircle2 className="text-green-500" size={64} />
            <p className="text-white text-xl font-bold">Payment successful</p>
            <p className="text-gray-400 text-sm">Your subscription is now active. Taking you home…</p>
          </div>
        ) : (
        <>
        <h1 className="text-white text-2xl font-bold text-center mb-8 tracking-wide">
          EXPLORE PLANS
        </h1>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-[#00A8E1]" size={28} />
          </div>
        ) : noPlanAvailable ? (
          <div data-testid="plans-load-error" className="flex flex-col items-center text-center gap-4 py-6">
            <AlertTriangle className="text-yellow-500" size={32} />
            <p className="text-white font-bold">Couldn't load payment details</p>
            <p className="text-gray-400 text-sm">Please check your connection and try again.</p>
            <button
              onClick={fetchPlans}
              data-testid="retry-plans-button"
              className="w-full py-4 bg-[#00A8E1] hover:bg-[#008bc0] text-white font-bold text-lg rounded-full shadow-lg transition-all duration-200 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {plan && (
              <div
                data-testid={`plan-option-${plan.id}`}
                data-selected="true"
                className="relative overflow-hidden flex items-center justify-between p-4 rounded-xl border-2 border-[#00A8E1] bg-[#00A8E1]/5 mb-8"
              >
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-[#00A8E1] flex items-center justify-center">
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#00A8E1]"></div>
                  </div>
                  <span className="text-white font-bold text-base md:text-lg">{plan.name}</span>
                </div>
                <span className="text-white font-bold text-base md:text-lg">₹ {plan.original_price}</span>
              </div>
            )}

            <p className="text-gray-500 text-xs text-center -mt-4 mb-6 leading-relaxed">
              Renews automatically via UPI Autopay on your plan's cycle. You can cancel the mandate anytime from your UPI app.
            </p>

            {/* Payment status card — failed/cancelled/timeout */}
            {(paymentPhase === 'failed' || paymentPhase === 'cancelled' || paymentPhase === 'timeout') && (
              <div
                data-testid="payment-status-card"
                data-status={paymentPhase}
                className="mb-6 p-4 rounded-xl border border-gray-800 bg-[#0f1115] flex flex-col items-center text-center gap-2"
              >
                {paymentPhase === 'failed' && (
                  <>
                    <XCircle className="text-red-500" size={32} />
                    <p className="text-white font-bold">Payment failed</p>
                    <p className="text-gray-400 text-sm">Your payment could not be completed. You have not been charged.</p>
                  </>
                )}
                {paymentPhase === 'cancelled' && (
                  <>
                    <XCircle className="text-yellow-500" size={32} />
                    <p className="text-white font-bold">Payment cancelled</p>
                    <p className="text-gray-400 text-sm">You closed the payment window before completing payment.</p>
                  </>
                )}
                {paymentPhase === 'timeout' && (
                  <>
                    <AlertTriangle className="text-yellow-500" size={32} />
                    <p className="text-white font-bold">Still confirming your payment</p>
                    <p className="text-gray-400 text-sm">This is taking longer than usual. Check back in a few minutes, or check now.</p>
                    <button
                      onClick={() => handleCheckStatusNow(txnid)}
                      data-testid="check-status-button"
                      className="mt-2 text-[#00A8E1] text-sm font-semibold hover:underline cursor-pointer"
                    >
                      Check status now
                    </button>
                  </>
                )}
              </div>
            )}

            {errorMsg && (
              <p data-testid="payment-error-message" className="text-red-500 text-sm text-center mb-4">{errorMsg}</p>
            )}

            {/* Pay Now / status button */}
            {(paymentPhase === 'checkout_open' || paymentPhase === 'confirming') ? (
              <button
                disabled
                data-testid="awaiting-confirmation-indicator"
                className="w-full py-4 bg-[#00A8E1]/60 text-white font-bold text-lg rounded-full shadow-lg flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Loader2 className="animate-spin" size={20} />
                {paymentPhase === 'checkout_open' ? 'Waiting for payment…' : 'Confirming payment…'}
              </button>
            ) : (paymentPhase === 'failed' || paymentPhase === 'cancelled' || paymentPhase === 'timeout' || paymentPhase === 'error') ? (
              <button
                onClick={resetPaymentFlow}
                data-testid="try-again-button"
                className="w-full py-4 bg-[#00A8E1] hover:bg-[#008bc0] text-white font-bold text-lg rounded-full shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              >
                Try Again
              </button>
            ) : (
              <button
                onClick={handlePayNow}
                disabled={paymentPhase === 'creating' || !selectedPlan}
                data-testid="pay-now-button"
                className="w-full py-4 bg-[#00A8E1] hover:bg-[#008bc0] text-white font-bold text-lg rounded-full shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {paymentPhase === 'creating' && <Loader2 className="animate-spin" size={20} />}
                {paymentPhase === 'creating' ? 'Starting payment…' : 'Pay Now'}
              </button>
            )}
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default PlansPage;
