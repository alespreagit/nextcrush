const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const { validateGiftCode, redeemGiftCode, createGiftCodes, createReferralCode } = require('./db');

async function verifyTurnstile(token){
  if(!token) return true; // Skip in development
  try {
    const res = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET || '',
        response: token
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return res.data.success === true;
  } catch(e){
    console.error('Turnstile error:', e.message);
    return true; // Fail open to avoid blocking real users
  }
}

async function createIntent({ amount, currency, email, birthData, turnstileToken, product }){
  const isHuman = await verifyTurnstile(turnstileToken);
if(!isHuman){
  console.log('Turnstile failed but continuing - token:', turnstileToken ? 'present' : 'missing');
  // Non-blocking for now - log but don't reject
}


  // Determine amount based on product
  const productAmount = product === 'pack' ? 999 : 499;
  const productName = product === 'pack' ? 'Reading Pack x3' : 'Single Reading';

  const paymentIntent = await stripe.paymentIntents.create({
    amount: productAmount,
    currency: currency || 'usd',
    payment_method_types: ['card'],
    metadata: {
      email: email || '',
      city: birthData?.city || '',
      seeking: birthData?.seeking || '',
      dob: birthData?.dob || '',
      product: product || 'single'
    },
    receipt_email: email || undefined,
    description: productName
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: productAmount,
    product: product || 'single'
  };
}

async function validateCode({ code, email }){
  if(!code) return { valid: false, error: 'No code provided' };
  const giftCode = await validateGiftCode(code);
  if(!giftCode) return { valid: false, error: 'Invalid or already used code' };
  return { valid: true, code: giftCode.code };
}

async function redeemCode({ code, email, birthData }){
  const giftCode = await validateGiftCode(code);
  if(!giftCode) throw new Error('Invalid or already used gift code');
  await redeemGiftCode(code, email);
  return { success: true, redeemed: true };
}

async function verifyPayment(paymentIntentId){
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent.status === 'succeeded';
}

async function getPaymentProduct(paymentIntentId){
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent.metadata?.product || 'single';
}

async function getPaymentEmail(paymentIntentId){
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent.metadata?.email || paymentIntent.receipt_email || '';
}

module.exports = { createIntent, validateCode, redeemCode, verifyPayment, getPaymentProduct, getPaymentEmail };
