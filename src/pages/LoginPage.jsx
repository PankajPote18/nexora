import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth, setDemoSession, markPaid } from '../hooks/useAuth';
import { paymentsApi } from '../services/api';

// India-only — any 10-digit number is accepted, no leading-digit restriction.
const COUNTRY_CODE = '+91';

const isValidPhone = (digits) => /^\d{10}$/.test(digits);

const LoginPage = () => {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const valid = isValidPhone(phoneDigits);

  const handleContinue = async (e) => {
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
    try {
      const result = await paymentsApi.getSubscriptionStatus(phoneDigits);
      if (result.active) {
        markPaid();
        setLoading(false);
        navigate('/');
        return;
      }
    } catch (err) {
      console.error('Subscription status check failed:', err);
      // Fail safe to the paywall rather than silently granting access if the
      // check itself errors out.
    }

    setLoading(false);
    navigate('/plans');
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

        <form onSubmit={handleContinue} className="space-y-5">
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
                Signing in…
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>

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
