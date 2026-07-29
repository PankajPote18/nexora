import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth, setDemoSession, DEMO_ACCOUNTS } from '../hooks/useAuth';

const OTP_LENGTH = 4; // matches every DEMO_ACCOUNTS otp (see useAuth.js)
const RESEND_COOLDOWN_SEC = 30;

const OtpPage = () => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [timeLeft, setTimeLeft] = useState(RESEND_COOLDOWN_SEC);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const phoneNumber = location.state?.phoneNumber;

  useEffect(() => {
    if (timeLeft === 0) return undefined;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Can't verify a code that was never requested.
  if (!phoneNumber) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (index, rawValue) => {
    const value = rawValue.replace(/\D/g, '');
    if (!value) {
      const next = [...otp];
      next[index] = '';
      setOtp(next);
      return;
    }

    // Support pasting the full code into a single box.
    const digits = value.split('');
    const next = [...otp];
    digits.forEach((digit, i) => {
      if (index + i < OTP_LENGTH) next[index + i] = digit;
    });
    setOtp(next);
    setError('');

    const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH || verifying) return;

    setError('');
    setVerifying(true);
    // Brief artificial delay to keep the existing "Verifying…" UX intact.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const account = DEMO_ACCOUNTS.find((a) => a.phone === phoneNumber);
    if (!account || code !== account.otp) {
      setError('Incorrect OTP for this demo account.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      triggerShake();
      setVerifying(false);
      return;
    }

    setDemoSession(phoneNumber);
    setVerifying(false);
    setSuccess(true);
    // 'explore_plans' demo accounts land on /plans; every other account goes home.
    const destination = account.type === 'explore_plans' ? '/plans' : '/';
    setTimeout(() => navigate(destination), 700);
  };

  const handleResend = async () => {
    if (timeLeft > 0 || resending) return;
    setError('');
    setResending(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setOtp(Array(OTP_LENGTH).fill(''));
    setTimeLeft(RESEND_COOLDOWN_SEC);
    inputRefs.current[0]?.focus();
    setResending(false);
  };

  return (
    <div className="min-h-dvh bg-bg-dark flex items-center justify-center px-4 py-10">
      <div
        className={`auth-card-enter w-full max-w-sm bg-[#090d16] border border-brand/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(0,168,225,0.12)] flex flex-col items-center ${
          shake ? 'auth-shake' : ''
        }`}
      >
        {success ? (
          <div className="py-6 flex flex-col items-center auth-pop-in">
            <CheckCircle2 size={48} className="text-brand mb-4" />
            <p className="text-white font-bold text-lg">Verified! Taking you in…</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center mb-6">
              <span className="text-brand text-lg font-black tracking-tight">CB</span>
            </div>

            <h1 className="text-white font-bold text-xl mb-2">Verify your number</h1>
            <p className="text-gray-400 text-sm mb-8 text-center">
              We've sent a {OTP_LENGTH}-digit code to <span className="text-white font-medium">{phoneNumber}</span>
            </p>

            <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
              <div className="flex justify-center gap-2 sm:gap-3 mb-3 w-full">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={OTP_LENGTH}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={verifying}
                    className={`w-full max-w-11 aspect-square min-w-0 bg-bg-lighter border rounded-lg text-center text-white text-lg font-bold outline-none transition-colors ${
                      error ? 'border-red-500' : 'border-gray-700 focus:border-brand'
                    }`}
                  />
                ))}
              </div>

              <div className="h-5 mb-4">
                {error && <span className="text-red-400 text-xs font-medium">{error}</span>}
              </div>

              <div className="text-center mb-8">
                {timeLeft > 0 ? (
                  <span className="text-gray-500 text-sm">
                    Resend code in <span className="text-brand font-semibold">00:{String(timeLeft).padStart(2, '0')}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-brand text-sm font-semibold hover:underline disabled:opacity-60 inline-flex items-center gap-1.5"
                  >
                    {resending && <Loader2 size={14} className="animate-spin" />}
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={otp.join('').length < OTP_LENGTH || verifying}
                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  otp.join('').length === OTP_LENGTH && !verifying
                    ? 'bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20 active:scale-[0.98]'
                    : 'bg-gray-700/60 text-gray-400 cursor-not-allowed'
                }`}
              >
                {verifying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-5 text-gray-400 text-sm hover:text-white transition-colors"
              >
                Change phone number
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default OtpPage;
