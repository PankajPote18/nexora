import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Loader2, ChevronDown } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../hooks/useAuth';

// Small curated list, not a full ISO 3166 dump — keeps the selector usable
// on a phone screen. Defaults to +91 per product requirement.
const COUNTRY_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+971', label: 'UAE +971' },
  { code: '+65', label: 'SG +65' },
  { code: '+61', label: 'AU +61' },
];

const isValidPhone = (countryCode, digits) => {
  if (countryCode === '+91') return /^[6-9]\d{9}$/.test(digits);
  return /^\d{7,15}$/.test(digits);
};

const LoginPage = () => {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const valid = isValidPhone(countryCode, phoneDigits);

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!valid || loading) return;

    setError('');
    setLoading(true);
    const fullPhoneNumber = `${countryCode}${phoneDigits}`;

    // Brief artificial delay to keep the existing "Sending OTP…" UX intact.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const account = DEMO_ACCOUNTS.find((a) => a.phone === fullPhoneNumber);
    if (!account) {
      setError('This is a demo build — sign in with 9999999999, 8888888888, or 7777777777.');
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/verify-otp', { state: { phoneNumber: fullPhoneNumber } });
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
            <div
              className={`flex items-center bg-bg-lighter border rounded-xl overflow-hidden transition-colors ${
                error ? 'border-red-500' : 'border-gray-700 focus-within:border-brand'
              }`}
            >
              <div className="relative flex items-center border-r border-gray-700">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="appearance-none bg-transparent text-white text-sm font-medium pl-4 pr-8 py-3.5 outline-none cursor-pointer"
                  aria-label="Country code"
                >
                  {COUNTRY_CODES.map(({ code, label }) => (
                    <option key={code} value={code} className="bg-bg-lighter">
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-gray-500" />
              </div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Mobile number"
                className="w-full bg-transparent text-white px-4 py-3.5 outline-none placeholder-gray-500 tracking-wide"
                value={phoneDigits}
                onChange={(e) => {
                  setError('');
                  setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 15));
                }}
                maxLength={15}
                autoFocus
              />
            </div>
            {error && <p className="mt-2 text-xs text-red-400 auth-card-enter">{error}</p>}
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
                Sending OTP…
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
