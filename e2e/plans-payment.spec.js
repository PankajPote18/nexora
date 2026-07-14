import { test, expect } from '@playwright/test';

// Mocked end-to-end coverage for the PayU UPI Intent S2S flow on /plans.
// Every /api/payments/* and /api/subscription-plans call is intercepted here
// — a real UPI app can't be driven from a browser test, so "success" /
// "failed" / "cancelled" can only be reached by controlling what the backend
// is made to say. The one test that talks to the real backend + PayU sandbox
// lives in plans-payment.live.spec.js and is excluded from this suite.

const FIXTURE_PLANS = [
  { id: 1, name: 'Basic', original_price: '9.99', discounted_price: '7.99', billing_cycle: 'Monthly', is_recommended: false, status: true },
  { id: 2, name: 'Standard', original_price: '15.99', discounted_price: '12.99', billing_cycle: 'Monthly', is_recommended: true, status: true },
];

const INTENT_URL = 'upi://pay?pa=test@payu&pn=Test&tr=TESTTXN&am=7.99&cu=INR&tn=UPIIntent';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/subscription-plans**', (route) => route.fulfill({ json: FIXTURE_PLANS }));
});

function mockCreate(page, overrides = {}) {
  return page.route('**/api/payments/create', (route) =>
    route.fulfill({
      status: 201,
      json: {
        paymentId: 1,
        txnid: 'TESTTXN',
        amount: '7.99',
        upiIntentUrl: INTENT_URL,
        status: 'pending',
        ...overrides,
      },
    })
  );
}

function mockStatus(page, status, txnid = 'TESTTXN') {
  return page.route('**/api/payments/status/**', (route) =>
    route.fulfill({ json: { txnid, status, amount: '7.99', planId: 1, paymentMethod: 'UPI' } })
  );
}

async function fillContactDetails(page) {
  await page.getByTestId('contact-name-input').fill('Test User');
  await page.getByTestId('contact-email-input').fill('test@example.com');
  await page.getByTestId('contact-phone-input').fill('9999999999');
}

test('loads plans and pre-selects the recommended one', async ({ page }) => {
  await page.goto('/plans');

  await expect(page.getByTestId('plan-option-2')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('plan-option-1')).toHaveAttribute('data-selected', 'false');
  await expect(page.getByTestId('pay-now-button')).toHaveText('Pay Now');
});

test('prompts for name/email before creating a payment when they are not already known', async ({ page }) => {
  await page.goto('/plans');

  await page.getByTestId('pay-now-button').click();

  await expect(page.getByTestId('contact-name-input')).toBeVisible();
  await expect(page.getByTestId('contact-email-input')).toBeVisible();
  await expect(page.getByTestId('contact-phone-input')).toBeVisible();
  await expect(page.getByTestId('pay-now-button')).toHaveText('Continue to Pay');
});

test('pre-fills phone from the existing mocked-login localStorage user', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({ phone: '9998887777', isSubscribed: false }));
  });
  await page.goto('/plans');

  // Phone is known but name/email are not, so we should still land on the
  // contact-details step, with the phone field already filled.
  await page.getByTestId('pay-now-button').click();
  await expect(page.getByTestId('contact-phone-input')).toHaveValue('9998887777');
});

test('shows a loading state while creating the payment, then awaits UPI confirmation', async ({ page }) => {
  await page.route('**/api/payments/create', async (route) => {
    // Small artificial delay so the loading state is actually observable.
    await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({
      status: 201,
      json: { paymentId: 1, txnid: 'TESTTXN', amount: '7.99', upiIntentUrl: INTENT_URL, status: 'pending' },
    });
  });
  await mockStatus(page, 'pending');

  await page.goto('/plans');
  await page.getByTestId('pay-now-button').click();
  await fillContactDetails(page);
  await page.getByTestId('pay-now-button').click();

  await expect(page.getByTestId('pay-now-button')).toHaveText('Starting payment…');
  await expect(page.getByTestId('pay-now-button')).toBeDisabled();

  await expect(page.getByTestId('awaiting-upi-indicator')).toBeVisible();
});

test('shows the backend validation error and allows retrying after a failed create call', async ({ page }) => {
  await page.route('**/api/payments/create', (route) =>
    route.fulfill({ status: 400, json: { message: 'Invalid email address' } })
  );

  await page.goto('/plans');
  await page.getByTestId('pay-now-button').click();
  await fillContactDetails(page);
  await page.getByTestId('pay-now-button').click();

  await expect(page.getByTestId('payment-error-message')).toHaveText('Invalid email address');
  await expect(page.getByTestId('try-again-button')).toBeVisible();

  await page.getByTestId('try-again-button').click();
  await expect(page.getByTestId('pay-now-button')).toBeVisible();
});

test('polling shows success once PayU confirms the payment', async ({ page }) => {
  await mockCreate(page);
  await mockStatus(page, 'success');

  await page.goto('/plans');
  await page.getByTestId('pay-now-button').click();
  await fillContactDetails(page);
  await page.getByTestId('pay-now-button').click();

  await expect(page.getByTestId('payment-status-card')).toHaveAttribute('data-status', 'success', { timeout: 8000 });
  await expect(page.getByText('Payment successful')).toBeVisible();
});

test('polling shows failed when PayU reports a failure', async ({ page }) => {
  await mockStatus(page, 'failed');
  await page.goto('/plans?txnid=TESTTXN');

  await expect(page.getByTestId('payment-status-card')).toHaveAttribute('data-status', 'failed', { timeout: 8000 });
  await expect(page.getByText('Payment failed')).toBeVisible();
});

test('polling shows cancelled when PayU reports the UPI app payment was dropped', async ({ page }) => {
  await mockStatus(page, 'cancelled');
  await page.goto('/plans?txnid=TESTTXN');

  await expect(page.getByTestId('payment-status-card')).toHaveAttribute('data-status', 'cancelled', { timeout: 8000 });
  await expect(page.getByText('Payment cancelled')).toBeVisible();
});

test('resuming via ?txnid= (simulating a surl/furl redirect back) starts polling immediately', async ({ page }) => {
  await mockStatus(page, 'success');
  await page.goto('/plans?txnid=RETURNED_TXN');

  // No click needed — arriving with a txnid in the URL should resume tracking on its own.
  await expect(page.getByTestId('payment-status-card')).toHaveAttribute('data-status', 'success', { timeout: 8000 });
});

test('the manual "check status" button resolves immediately, without waiting for the next poll tick', async ({ page }) => {
  await mockStatus(page, 'success');
  await page.goto('/plans?txnid=TESTTXN');

  await page.getByTestId('check-status-button').click();

  // Well under the 4s poll interval — proves the manual check isn't just
  // waiting for the automatic interval to fire.
  await expect(page.getByTestId('payment-status-card')).toHaveAttribute('data-status', 'success', { timeout: 3000 });
});

test('stops polling and shows a timeout state if PayU never resolves the payment', async ({ page }) => {
  await page.clock.install();
  await mockStatus(page, 'pending');

  await page.goto('/plans?txnid=TESTTXN');
  await expect(page.getByTestId('awaiting-upi-indicator')).toBeVisible();

  // Fast-forward through the ~3 minute polling window (45 polls * 4s),
  // firing every interval tick along the way (unlike fastForward, which
  // only fires each due timer once).
  await page.clock.runFor('03:05');

  await expect(page.getByTestId('payment-status-card')).toHaveAttribute('data-status', 'timeout');
});
