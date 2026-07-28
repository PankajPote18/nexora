import { useState } from 'react';

const STORAGE_KEY = 'clickbuz_demo_session';

const readSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Demo-only auth: a single hardcoded account (mobile 9999999999, OTP 1234,
// see LoginPage.jsx / OtpPage.jsx) — no backend call, no real session, just a
// localStorage flag set after OTP verification succeeds.
export const setDemoSession = (phoneNumber) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ phoneNumber }));
};

export const clearDemoSession = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const useAuth = () => {
  const [session] = useState(readSession);

  return {
    phoneNumber: session?.phoneNumber ?? null,
    isAuthenticated: Boolean(session),
  };
};
