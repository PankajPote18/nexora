// Loads Razorpay's Checkout.js on demand, cached module-wide (a single
// script tag / in-flight promise shared by every caller) so it's never
// injected twice. Extracted out of PlansPage.jsx so LoginPage.jsx can start
// this load the moment the login screen mounts — by the time a user types
// their number and taps "Proceed to Pay", the script is very likely already
// loaded, removing that network round trip from the critical path to
// opening Razorpay Checkout.
const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let checkoutScriptPromise = null;

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScriptPromise = null;
      reject(new Error('Failed to load the payment form. Please check your connection and try again.'));
    };
    document.body.appendChild(script);
  });
  return checkoutScriptPromise;
}
