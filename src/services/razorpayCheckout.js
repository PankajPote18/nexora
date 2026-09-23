// Loads Razorpay's Checkout.js on demand, cached module-wide (a single
// script tag / in-flight promise shared by every caller) so it's never
// injected twice. Extracted out of PlansPage.jsx so LoginPage.jsx can start
// this load the moment the login screen mounts — by the time a user types
// their number and taps "Proceed to Pay", the script is very likely already
// loaded, removing that network round trip from the critical path to
// opening Razorpay Checkout.
const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// A slow/blocked network can leave the <script> tag's onload/onerror never
// firing at all (as opposed to a definite failure like a 404, which onerror
// does catch) — without a bound on that, a caller's `await` never settles,
// leaving the UI stuck on its loading state indefinitely with no error and
// no retry path. This timeout guarantees the promise always eventually
// settles one way or the other.
const LOAD_TIMEOUT_MS = 15000;

let checkoutScriptPromise = null;

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;

    const timeoutId = setTimeout(() => {
      checkoutScriptPromise = null;
      reject(new Error('Loading the payment form is taking too long. Please check your connection and try again.'));
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      checkoutScriptPromise = null;
      reject(new Error('Failed to load the payment form. Please check your connection and try again.'));
    };
    document.body.appendChild(script);
  });
  return checkoutScriptPromise;
}
