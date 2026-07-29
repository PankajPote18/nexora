import { useState } from 'react';

const STORAGE_KEY = 'clickbuz_demo_session';

// Demo-only accounts (see LoginPage.jsx / OtpPage.jsx) — no backend call, no
// real auth. `type` drives a bit of post-login demo behavior:
//   - 'default'       — normal home page after login.
//   - 'explore_plans' — lands on /plans (Explore Plans) right after login.
//   - 'premium'        — DetailPage's paywall is skipped, "premium" content
//                        plays directly (see DetailPage.jsx's isPremium use).
// This is a frontend-only convenience for demoing different states, not a
// real role/permission system.
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

// Demo-only auth: a small fixed set of hardcoded accounts (see DEMO_ACCOUNTS
// above) — no backend call, no real session, just a localStorage flag set
// after OTP verification succeeds.
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
