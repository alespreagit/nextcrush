const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

async function verifyTurnstile(token){
  if(!token) return false;
  try {
    const res = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET,
        response: token
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return res.data.success === true;
  } catch(e){
    console.error('Turnstile verify error:', e.message);
    return false;
  }
}

async function createIntent({ amount, currency, email, birthData, turnstileToken }){
  // Verify human
  const isHuman = await verifyTurnstile(turnstileToken);
  if(!isHuman){
    throw new Error('Human verification failed. Please refresh and try again.');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount || 499,
    currency: currency || 'usd',
    payment_method_types: ['card'],
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
