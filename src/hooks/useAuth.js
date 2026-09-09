import { useState } from 'react';

const STORAGE_KEY = 'clickbuz_demo_session';

// Legacy fixed demo accounts. No longer used by the live login flow
// (LoginPage.jsx now accepts any valid phone number and skips OTP
// verification entirely — see setDemoSession below) — kept here only so the
// still-present, no-longer-linked OtpPage.jsx keeps working/compiling if
// ever navigated to directly with router state.
export const DEMO_ACCOUNTS = [
  { phone: '+919999999999', otp: '1234', type: 'default' },
  { phone: '+918888888888', otp: '4567', type: 'explore_plans' },
  { phone: '+917777777777', otp: '6789', type: 'premium' },
];

const readSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// No backend call, no real session — just a localStorage flag. Any phone
// number that passes LoginPage's format check is accepted; `type` only
// resolves to something other than 'default' if the number happens to match
// one of the legacy DEMO_ACCOUNTS above (kept for OtpPage.jsx, see there).
export const setDemoSession = (phoneNumber) => {
  const account = DEMO_ACCOUNTS.find((a) => a.phone === phoneNumber);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ phoneNumber, type: account?.type ?? 'default' }));
};

export const clearDemoSession = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const useAuth = () => {
  const [session] = useState(readSession);

  return {
    phoneNumber: session?.phoneNumber ?? null,
    isAuthenticated: Boolean(session),
    accountType: session?.type ?? null,
    isPremium: session?.type === 'premium',
  };
};
