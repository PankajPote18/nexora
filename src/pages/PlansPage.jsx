import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { plansApi, paymentsApi } from '../services/api';

// Polling cadence/timeout for checking payment status after the user is sent
// to their UPI app — a browser redirect back isn't reliable for intent-based
// mobile flows, so the backend-confirmed status is polled instead.
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes

const PlansPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment flow state
  const [paymentPhase, setPaymentPhase] = useState('idle'); // idle | need_details | creating | awaiting_upi | success | failed | cancelled | timeout | error
  const [txnid, setTxnid] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    // Fetch only active plans from backend
    plansApi
      .getAll(true)
      .then((data) => {
        setPlans(data);
        // Pre-select the recommended plan, or fall back to the first active plan
        const recommended = data.find((p) => p.is_recommended);
        setSelectedPlan(recommended?.id ?? data[0]?.id ?? null);
      })
      .catch((err) => console.error('Plans fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  // Pre-fill whatever contact info we already have (the app only ever
  // collects a phone number today, via the mocked OTP login).
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (storedUser?.phone) setCustomerPhone(storedUser.phone);
    } catch {
      // ignore malformed localStorage value
    }
  }, []);

  // If we've just been redirected back from a PayU surl/furl callback, resume
  // tracking that transaction. The txnid is just an identifier — the actual
  // status is always re-verified against the backend, never read from the URL.
  useEffect(() => {
    const returnedTxnid = searchParams.get('txnid');
    if (returnedTxnid) {
      setTxnid(returnedTxnid);
      setPaymentPhase('awaiting_upi');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the backend for the authoritative payment status while a UPI
  // transaction is in flight. Stops on a final status or after MAX_POLLS.
  useEffect(() => {
    if (paymentPhase !== 'awaiting_upi' || !txnid) return undefined;

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount += 1;
      try {
        const res = await paymentsApi.getStatus(txnid);
        if (res.status === 'success' || res.status === 'failed' || res.status === 'cancelled') {
          clearInterval(interval);
          setPaymentPhase(res.status);
          return;
        }
      } catch (err) {
        console.error('Payment status poll failed:', err);
      }
      if (pollCount >= MAX_POLLS) {
        clearInterval(interval);
        setPaymentPhase('timeout');
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [paymentPhase, txnid]);

  // Compute discount percentage for display
  const discountPercent = (plan) => {
    if (!plan.original_price || plan.original_price === 0) return '0 %';
    const pct = ((plan.original_price - plan.discounted_price) / plan.original_price) * 100;
    return `${Math.round(pct)} %`;
  };

  const handlePayNow = async () => {
    if (!selectedPlan) return;

    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setPaymentPhase('need_details');
      return;
    }

    setErrorMsg('');
    setPaymentPhase('creating');
    try {
      const res = await paymentsApi.create({
        plan_id: selectedPlan,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim(),
      });
      setTxnid(res.txnid);
      setPaymentPhase('awaiting_upi');
      // Hands off to whichever UPI app is installed; this is a custom URI
      // scheme so the page itself keeps running (polling continues below).
      window.location.href = res.upiIntentUrl;
    } catch (err) {
      console.error('Payment creation failed:', err);
      setErrorMsg(err.message || 'Something went wrong while starting your payment. Please try again.');
      setPaymentPhase('error');
    }
  };

  const handleCheckStatusNow = async () => {
    if (!txnid) return;
    try {
      const res = await paymentsApi.getStatus(txnid);
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
    setErrorMsg('');
  };

  return (
    <div className="w-full bg-bg-dark pt-24 pb-12 flex flex-col items-center px-4 min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md bg-black border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden mt-8">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-white text-2xl font-bold text-center mb-8 tracking-wide">
          EXPLORE PLANS
        </h1>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-[#00A8E1]" size={28} />
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {plans.map((plan) => (
                <div className="relative" key={plan.id}>
                  {/* Recommended Badge */}
                  {plan.is_recommended && (
                    <div className="absolute -top-3 left-6 bg-[#1a1d24] border border-gray-700 text-[#00A8E1] text-[10px] font-bold px-3 py-1 rounded-full z-10">
                      Recommended
                    </div>
                  )}

                  <div
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative overflow-hidden flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedPlan === plan.id
                        ? 'border-[#00A8E1] bg-[#00A8E1]/5'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {/* Left: Radio & Title */}
                    <div className="flex items-center space-x-3 md:space-x-4 z-10">
                      <div
                        className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedPlan === plan.id ? 'border-[#00A8E1]' : 'border-gray-500'
                        }`}
                      >
                        {selectedPlan === plan.id && (
                          <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#00A8E1]"></div>
                        )}
                      </div>
                      <span className="text-white font-bold text-base md:text-lg">{plan.name}</span>
                    </div>

                    {/* Middle: Pricing */}
                    <div className="flex items-center space-x-1 md:space-x-2 z-10 mr-12 md:mr-16">
                      <span className="text-white font-bold text-base md:text-lg">
                        ₹ {plan.discounted_price}
                      </span>
                      <span className="text-gray-500 line-through text-xs md:text-sm">
                        ₹{plan.original_price}
                      </span>
                    </div>

                    {/* Right: Discount Graphic */}
                    <div className="absolute right-0 top-0 bottom-0 w-20 md:w-24 bg-[#7a8b86] rounded-l-[40px] flex flex-col items-center justify-center text-white">
                      <span className="font-bold text-base md:text-lg leading-tight">
                        {discountPercent(plan)}
                      </span>
                      <span className="text-[10px] uppercase font-semibold">Off</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment status card — success/failed/cancelled/timeout */}
            {(paymentPhase === 'success' || paymentPhase === 'failed' || paymentPhase === 'cancelled' || paymentPhase === 'timeout') && (
              <div className="mb-6 p-4 rounded-xl border border-gray-800 bg-[#0f1115] flex flex-col items-center text-center gap-2">
                {paymentPhase === 'success' && (
                  <>
                    <CheckCircle2 className="text-green-500" size={32} />
                    <p className="text-white font-bold">Payment successful</p>
                    <p className="text-gray-400 text-sm">Your subscription is now active.</p>
                  </>
                )}
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
                    <p className="text-gray-400 text-sm">You cancelled the payment in your UPI app.</p>
                  </>
                )}
                {paymentPhase === 'timeout' && (
                  <>
                    <AlertTriangle className="text-yellow-500" size={32} />
                    <p className="text-white font-bold">Still confirming your payment</p>
                    <p className="text-gray-400 text-sm">This is taking longer than usual. Check back in a few minutes, or check now.</p>
                    <button
                      onClick={handleCheckStatusNow}
                      className="mt-2 text-[#00A8E1] text-sm font-semibold hover:underline cursor-pointer"
                    >
                      Check status now
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Inline contact details — only shown if we don't already have them */}
            {paymentPhase === 'need_details' && (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  placeholder="Full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#252833] border border-gray-600 rounded-xl px-4 py-3 text-white outline-none placeholder-gray-500 focus:border-[#00A8E1] transition-colors"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-[#252833] border border-gray-600 rounded-xl px-4 py-3 text-white outline-none placeholder-gray-500 focus:border-[#00A8E1] transition-colors"
                />
                <input
                  type="tel"
                  placeholder="Mobile number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength="10"
                  className="w-full bg-[#252833] border border-gray-600 rounded-xl px-4 py-3 text-white outline-none placeholder-gray-500 focus:border-[#00A8E1] transition-colors"
                />
              </div>
            )}

            {errorMsg && (
              <p className="text-red-500 text-sm text-center mb-4">{errorMsg}</p>
            )}

            {/* Pay Now / status button */}
            {paymentPhase === 'awaiting_upi' ? (
              <div className="flex flex-col items-center gap-3">
                <button
                  disabled
                  className="w-full py-4 bg-[#00A8E1]/60 text-white font-bold text-lg rounded-full shadow-lg flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Loader2 className="animate-spin" size={20} />
                  Waiting for UPI confirmation…
                </button>
                <button
                  onClick={handleCheckStatusNow}
                  className="text-[#00A8E1] text-sm font-semibold hover:underline cursor-pointer"
                >
                  I've completed the payment — check status
                </button>
              </div>
            ) : (paymentPhase === 'failed' || paymentPhase === 'cancelled' || paymentPhase === 'timeout' || paymentPhase === 'error') ? (
              <button
                onClick={resetPaymentFlow}
                className="w-full py-4 bg-[#00A8E1] hover:bg-[#008bc0] text-white font-bold text-lg rounded-full shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              >
                Try Again
              </button>
            ) : paymentPhase !== 'success' && (
              <button
                onClick={handlePayNow}
                disabled={paymentPhase === 'creating'}
                className="w-full py-4 bg-[#00A8E1] hover:bg-[#008bc0] text-white font-bold text-lg rounded-full shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {paymentPhase === 'creating' && <Loader2 className="animate-spin" size={20} />}
                {paymentPhase === 'creating' ? 'Starting payment…' : paymentPhase === 'need_details' ? 'Continue to Pay' : 'Pay Now'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlansPage;
