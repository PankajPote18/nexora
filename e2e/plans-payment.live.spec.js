import { test, expect } from '@playwright/test';

// Real PayU sandbox smoke test — hits the actual backend (must already be
// running, e.g. `cd backend && npm run dev`) and the actual PayU test
// endpoints using the credentials in backend/.env. Every run here creates a
// real Payment row in the configured database and a real transaction on the
// PayU test merchant account, so this is deliberately excluded from the
// default suite.
//
// Run with:  npm run test:e2e:live
//
// This uses Playwright's `request` fixture (no browser needed) since it's
// verifying backend <-> PayU wiring directly, the same thing the mocked
// browser suite in plans-payment.spec.js can't reach.

const BACKEND_URL = process.env.PLAYWRIGHT_BACKEND_URL || 'http://localhost:5000';

test('creates a real UPI Intent transaction against the PayU test sandbox @live', async ({ request }) => {
  const plansRes = await request.get(`${BACKEND_URL}/api/subscription-plans?active=1`);
  expect(plansRes.ok(), 'backend must be running locally for the @live suite').toBeTruthy();
  const plans = await plansRes.json();
  expect(plans.length).toBeGreaterThan(0);

  const createRes = await request.post(`${BACKEND_URL}/api/payments/create`, {
    data: {
      plan_id: plans[0].id,
      customer_name: 'Playwright Live Test',
      customer_email: 'playwright-live-test@example.com',
      customer_phone: '9999999999',
    },
  });

  expect(createRes.ok()).toBeTruthy();
  const body = await createRes.json();

  expect(body.txnid).toBeTruthy();
  expect(body.status).toBe('pending');
  // Confirms PayU actually accepted our hash/credentials and handed back a
  // real UPI intent — this is the whole point of this test.
  expect(body.upiIntentUrl).toMatch(/^upi:\/\/pay\?/);
  expect(body.upiIntentUrl).toContain('pa='); // payee VPA present
});

test('status endpoint round-trips a live Verify Payment API call @live', async ({ request }) => {
  const plansRes = await request.get(`${BACKEND_URL}/api/subscription-plans?active=1`);
  const plans = await plansRes.json();

  const createRes = await request.post(`${BACKEND_URL}/api/payments/create`, {
    data: {
      plan_id: plans[0].id,
      customer_name: 'Playwright Live Test',
      customer_email: 'playwright-live-test@example.com',
      customer_phone: '9999999999',
    },
  });
  const { txnid } = await createRes.json();

  const statusRes = await request.get(`${BACKEND_URL}/api/payments/status/${txnid}`);
  expect(statusRes.ok()).toBeTruthy();
  const status = await statusRes.json();

  expect(status.txnid).toBe(txnid);
  // No real payment was completed in a UPI app, so PayU should still report
  // pending — this proves the verify_payment round-trip works without
  // asserting a status we can't actually produce from an automated test.
  expect(['pending', 'failed', 'cancelled']).toContain(status.status);
});

test('rejects a payment request for a nonexistent plan @live', async ({ request }) => {
  const res = await request.post(`${BACKEND_URL}/api/payments/create`, {
    data: {
      plan_id: 999999,
      customer_name: 'Playwright Live Test',
      customer_email: 'playwright-live-test@example.com',
      customer_phone: '9999999999',
    },
  });

  expect(res.status()).toBe(404);
});
