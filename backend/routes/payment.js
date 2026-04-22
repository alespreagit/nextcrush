// ═══════════════════════════════════════════
// PAYMENT.JS — Stripe payment processing
// ═══════════════════════════════════════════

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createIntent({ amount, currency, email, birthData }){
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount || 499,
    currency: currency || 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
      email: email || '',
      city: birthData?.city || '',
      seeking: birthData?.seeking || '',
      dob: birthData?.dob || ''
    },
    receipt_email: email || undefined
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  };
}

async function verifyPayment(paymentIntentId){
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent.status === 'succeeded';
}

async function getPaymentEmail(paymentIntentId){
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent.metadata?.email || paymentIntent.receipt_email || '';
}

module.exports = { createIntent, verifyPayment, getPaymentEmail };