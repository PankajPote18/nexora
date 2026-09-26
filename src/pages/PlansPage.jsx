import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { plansApi, paymentsApi, siteSettingsApi } from '../services/api';
import { useAuth, markPaid } from '../hooks/useAuth';
import { trackCompleteRegistration } from '../analytics/metaEvents';
import { getStoredFbc, getFbpCookie } from '../analytics/metaClickIds';
import { getStoredClickId } from '../analytics/affiliateClickId';
import { loadRazorpayCheckout } from '../services/razorpayCheckout';
import defaultBanner from '../assets/explore-plans-banner.png';

// Short fallback poll — only kicks in if the backend's own /verify call
// (fired the instant Razorpay Checkout's in-browser `handler` confirms a
// payment) somehow still reports 'pending' (e.g. a webhook/verify race).
// Much shorter than the old UPI-intent flow's polling window ever needed to
// be, since Checkout.js already means the charge attempt is complete from
// the user's point of view by the time this could even run.
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10; // ~30 seconds

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CADENCE_LABEL = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' };

// "199.00" -> "199", "9.99" -> "9.99"
const formatPrice = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const PAY_BUTTON_CLASS =
  'w-full py-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xl uppercase tracking-wide ' +
  'shadow-lg transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2';

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

  // Admin-managed background (Admin → Plans → Explore Plans Background):
  // separate desktop/mobile images; either one alone is used everywhere.
  const [background, setBackground] = useState({ desktop: null, mobile: null });
  useEffect(() => {
    siteSettingsApi
      .getAll()
      .then((settings) => setBackground({
        desktop: settings.explore_plans_bg_desktop || null,
        mobile: settings.explore_plans_bg_mobile || null,
      }))
      .catch((err) => console.error('Background settings fetch failed:', err));
  }, []);

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

  const priceLabel = plan ? formatPrice(plan.original_price) : '';
  const cadence = plan ? (CADENCE_LABEL[(plan.billing_cycle || '').toUpperCase()] || 'month') : 'month';
  // Admin-uploaded banner if set (mobile/desktop art direction), otherwise the
  // built-in default banner.
  const bannerSrc = background.desktop || background.mobile || defaultBanner;

  return (
    <div className="w-full bg-black min-h-[calc(100vh-80px)] flex flex-col items-center pt-16 md:pt-20 pb-12">
      <h1 className="sr-only">Explore Plans</h1>
      <div className="w-full max-w-md md:max-w-lg flex flex-col">
        {/* Banner — full column width, natural height, so it's never cropped
            on any screen size. */}
        <picture className="block w-full">
          {background.mobile && <source media="(max-width: 767px)" srcSet={background.mobile} />}
          {background.desktop && <source media="(min-width: 768px)" srcSet={background.desktop} />}
          <img
            src={bannerSrc}
            alt=""
            data-testid="plans-banner"
            className="w-full h-auto select-none"
            draggable={false}
            decoding="async"
          />
        </picture>

        <div className="px-5 pt-8 flex flex-col items-center">
          {paymentPhase === 'success' ? (
            // Success: tick mark, then the effect above redirects home.
            <div
              data-testid="payment-status-card"
              data-status="success"
              className="flex flex-col items-center justify-center text-center py-8 gap-3 auth-pop-in"
            >
              <CheckCircle2 className="text-green-500" size={64} />
              <p className="text-white text-xl font-bold">Payment successful</p>
              <p className="text-gray-400 text-sm">Your subscription is now active. Taking you home…</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-brand" size={28} />
            </div>
          ) : noPlanAvailable ? (
            <div data-testid="plans-load-error" className="w-full flex flex-col items-center text-center gap-4 py-4">
              <AlertTriangle className="text-yellow-500" size={32} />
              <p className="text-white font-bold">Couldn&apos;t load payment details</p>
              <p className="text-gray-400 text-sm">Please check your connection and try again.</p>
              <button onClick={fetchPlans} data-testid="retry-plans-button" className={PAY_BUTTON_CLASS}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              {plan && (
                <div
                  data-testid={`plan-option-${plan.id}`}
                  data-selected="true"
                  className="flex flex-col items-center text-center mb-8"
                >
                  <p className="text-brand font-bold text-2xl underline decoration-2 underline-offset-8">
                    {plan.name} Plan at ₹{priceLabel}
                  </p>
                  <p className="text-gray-300 text-base mt-4">Billed as ₹{priceLabel}/{cadence}</p>
                </div>
              )}

              {/* Payment status card — failed/cancelled/timeout */}
              {(paymentPhase === 'failed' || paymentPhase === 'cancelled' || paymentPhase === 'timeout') && (
                <div
                  data-testid="payment-status-card"
                  data-status={paymentPhase}
                  className="w-full mb-6 p-4 rounded-xl border border-gray-800 bg-[#0f1115] flex flex-col items-center text-center gap-2"
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
                        className="mt-2 text-brand text-sm font-semibold hover:underline cursor-pointer"
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
                <button disabled data-testid="awaiting-confirmation-indicator" className={PAY_BUTTON_CLASS}>
                  <Loader2 className="animate-spin" size={20} />
                  {paymentPhase === 'checkout_open' ? 'Waiting for payment…' : 'Confirming payment…'}
                </button>
              ) : (paymentPhase === 'failed' || paymentPhase === 'cancelled' || paymentPhase === 'timeout' || paymentPhase === 'error') ? (
                <button onClick={resetPaymentFlow} data-testid="try-again-button" className={PAY_BUTTON_CLASS}>
                  Try Again
                </button>
              ) : (
                <button
                  onClick={handlePayNow}
                  disabled={paymentPhase === 'creating' || !selectedPlan}
                  data-testid="pay-now-button"
                  className={PAY_BUTTON_CLASS}
                >
                  {paymentPhase === 'creating' && <Loader2 className="animate-spin" size={20} />}
                  {paymentPhase === 'creating' ? 'Starting payment…' : 'Pay Now'}
                </button>
              )}

              <p className="text-gray-500 text-xs text-center mt-5 leading-relaxed">
                Renews automatically via UPI Autopay on your plan&apos;s cycle. You can cancel the mandate anytime from your UPI app.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
