import { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Loader2, Crown } from 'lucide-react';
import { useAuth, setDemoSession, markPaid } from '../hooks/useAuth';
import { plansApi, paymentsApi } from '../services/api';
import { loadRazorpayCheckout } from '../services/razorpayCheckout';

// India-only — any 10-digit number is accepted, no leading-digit restriction.
const COUNTRY_CODE = '+91';

const isValidPhone = (digits) => /^\d{10}$/.test(digits);

const CADENCE_LABEL = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' };

const LoginPage = () => {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [loading, setLoading] = useState(false);
  // null = still loading; [] = loaded (or failed) with nothing usable.
  // Fetched once here, on mount, so it's both ready to display in the plan
  // summary card below and already available to handleProceedToPay without
  // a second round trip.
  const [plans, setPlans] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Best-effort preload, fired the instant this screen mounts: most people
  // who land here are about to pay, so by the time "Proceed to Pay" is
  // actually tapped, Razorpay's Checkout.js is very likely already loaded —
  // removing that network round trip from the critical path to the modal
  // opening. handlePayNow's own loadRazorpayCheckout() call (in
  // PlansPage.jsx) still runs and will retry/surface a real error if this
  // preload failed or hasn't finished yet.
  useEffect(() => {
    loadRazorpayCheckout().catch(() => {});
    plansApi.getAll(true).then(setPlans).catch((err) => {
      console.error('Plans fetch failed:', err);
      setPlans([]);
    });
  }, []);

  const monthlyPlan = plans?.find((p) => (p.billing_cycle || '').toUpperCase() === 'MONTHLY');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const valid = isValidPhone(phoneDigits);

  const handleProceedToPay = async (e) => {
    e.preventDefault();
    if (!valid || loading) return;

    setLoading(true);
    const fullPhoneNumber = `${COUNTRY_CODE}${phoneDigits}`;

    // Any number that passes the format check above logs in — no OTP step,
    // no fixed account list.
    setDemoSession(fullPhoneNumber);

    // A returning customer who already has an active (paid, unexpired)
    // subscription for this phone number shouldn't be asked to pay again on
    // every login — see backend/controllers/payment.controller.js's
    // getSubscriptionStatus and CLAUDE.md's Payment/Subscription models.
    // This is a real DB lookup, not the localStorage-only demo flag alone.
    //
    // Reuses the plans already fetched on mount (for the plan summary card
    // below) when available; falls back to fetching again here on the off
    // chance that request hasn't resolved yet or failed. Either way this
    // runs in parallel with the subscription-status check, not after it —
    // most logins are NOT already-subscribed, so the plan list is needed
    // almost every time, and fetching it only after learning that would
    // just add a second sequential round trip PlansPage.jsx would otherwise
    // have to make itself before Razorpay can open.
    const plansPromise = plans && plans.length > 0 ? Promise.resolve(plans) : plansApi.getAll(true);
    const [statusResult, plansResult] = await Promise.allSettled([
      paymentsApi.getSubscriptionStatus(phoneDigits),
      plansPromise,
    ]);

    if (statusResult.status === 'fulfilled' && statusResult.value.active) {
      markPaid();
      setLoading(false);
      navigate('/');
      return;
    }
    if (statusResult.status === 'rejected') {
      console.error('Subscription status check failed:', statusResult.reason);
      // Fail safe to the paywall rather than silently granting access if
      // the check itself errored out.
    }

    setLoading(false);
    // autoPay tells PlansPage.jsx to skip manual plan selection and go
    // straight to Razorpay Checkout for the Monthly plan — the rest of that
    // page's payment flow (verify, success -> redirect home, failure -> stay
    // put) is unchanged. Handing over the already-fetched plans (when that
    // succeeded) lets it skip re-fetching them itself.
    navigate('/plans', {
      state: {
        autoPay: true,
        plans: plansResult.status === 'fulfilled' ? plansResult.value : undefined,
      },
    });
  };

  return (
    <div className="min-h-dvh bg-bg-dark flex items-center justify-center px-4 py-10">
      <div className="auth-card-enter w-full max-w-sm bg-[#090d16] border border-brand/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(0,168,225,0.12)]">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center">
            <span className="text-brand text-lg font-black tracking-tight">CB</span>
          </div>
        </div>

        <h1 className="text-center text-white font-bold text-2xl mb-2">Welcome to ClickBuz</h1>
        <p className="text-center text-gray-400 text-sm mb-8 leading-relaxed">
          Enter your mobile number to sign in or create an account.
        </p>

        <form onSubmit={handleProceedToPay} className="space-y-5">
          <div>
            <div className="flex items-center bg-bg-lighter border border-gray-700 focus-within:border-brand rounded-xl overflow-hidden transition-colors">
              <span className="px-4 py-3.5 text-white text-sm font-medium border-r border-gray-700 whitespace-nowrap shrink-0">
                IN {COUNTRY_CODE}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Mobile number"
                className="w-full bg-transparent text-white px-4 py-3.5 outline-none placeholder-gray-500 tracking-wide"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!valid || loading}
            className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              valid && !loading
                ? 'bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20 active:scale-[0.98]'
                : 'bg-gray-700/60 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Please wait…
              </>
            ) : (
              'Proceed to Pay'
            )}
          </button>
        </form>

        {/* What "Proceed to Pay" actually charges — kept in sync with the
            live Monthly SubscriptionPlan so this can never show a stale
            price/name (see subscriptionPlan.controller.js's razorpay_plan_id
            invalidation fix for the matching backend-side guarantee). */}
        {monthlyPlan && (
          <div className="mt-5 flex items-center justify-between gap-3 bg-bg-lighter border border-gray-700 rounded-xl px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <Crown className="text-brand shrink-0" size={20} />
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{monthlyPlan.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="w-px h-8 bg-gray-700" />
              <span className="text-white font-bold text-sm whitespace-nowrap">
                ₹ {monthlyPlan.original_price}/{CADENCE_LABEL[(monthlyPlan.billing_cycle || '').toUpperCase()] || 'month'}
              </span>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-500 leading-relaxed px-2">
          By continuing you agree to our{' '}
          <Link to="/page/terms-and-conditions" className="text-brand hover:underline">Terms and Conditions</Link> and acknowledge that you
          have read our <Link to="/page/privacy-policy" className="text-brand hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
