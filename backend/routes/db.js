const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function saveUser({ email, birthData, freeResult }){
  const { error } = await supabase.from('users').upsert({
    email,
    birth_data: birthData,
    free_result: freeResult,
    created_at: new Date().toISOString()
  }, { onConflict: 'email' });
  if(error) throw error;
}

async function saveReading({ email, paymentIntentId, birthData, result }){
  const { error } = await supabase.from('readings').insert({
    email,
    payment_intent_id: paymentIntentId,
    birth_data: birthData,
    result,
    created_at: new Date().toISOString()
  });
  if(error) throw error;
}

async function getReading({ email }){
  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if(error) throw error;
  return data;
}

// ── GIFT CODES ──
function generateCode(prefix){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix + '-';
  for(let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createGiftCodes({ email, paymentIntentId, count }){
  const codes = [];
  for(let i = 0; i < count; i++){
    codes.push({
      code: generateCode('GIFT'),
      created_by_email: email,
      payment_intent_id: paymentIntentId,
      created_at: new Date().toISOString()
    });
  }
  const { data, error } = await supabase
    .from('gift_codes')
    .insert(codes)
    .select();
  if(error) throw error;
  return data.map(r => r.code);
}

async function validateGiftCode(code){
  console.log('Validating gift code:', code.toUpperCase().trim());
  const { data, error } = await supabase
    .from('gift_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .is('redeemed_at', null)
    .single();
  console.log('Gift code result - data:', JSON.stringify(data), 'error:', JSON.stringify(error));
  if(error || !data) return null;
  return data;
}

async function redeemGiftCode(code, email){
  const { error } = await supabase
    .from('gift_codes')
    .update({
      redeemed_by_email: email,
      redeemed_at: new Date().toISOString()
    })
    .eq('code', code.toUpperCase().trim());
  if(error) throw error;
}

// ── REFERRALS ──
function generateRefCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'REF-';
  for(let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createReferralCode(email){
  // Check if already has one
  const { data: existing } = await supabase
    .from('referrals')
    .select('ref_code')
    .eq('owner_email', email)
    .single();
  if(existing) return existing.ref_code;

  const refCode = generateRefCode();
  await supabase.from('referrals').insert({
    ref_code: refCode,
    owner_email: email,
    created_at: new Date().toISOString()
  });
  return refCode;
}

async function trackReferral(refCode, referredEmail){
  const { data } = await supabase
    .from('referrals')
    .select('*')
    .eq('ref_code', refCode)
    .single();
  if(!data) return null;

  // Add credit to referrer
  await supabase.from('credits').insert({
    email: data.owner_email,
    amount: 1,
    reason: 'referral',
    created_at: new Date().toISOString()
  });

  // Update referral record
  await supabase.from('referrals').update({
    referred_email: referredEmail,
    credited_at: new Date().toISOString()
  }).eq('ref_code', refCode);

  return data.owner_email;
}

async function checkCredit(email){
  const { data } = await supabase
    .from('credits')
    .select('*')
    .eq('email', email)
    .eq('used', 0)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  return data || null;
}

async function useCredit(email){
  const credit = await checkCredit(email);
  if(!credit) return false;
  await supabase.from('credits').update({ used: 1 }).eq('id', credit.id);
  return true;
}

module.exports = {
  saveUser, saveReading, getReading,
  createGiftCodes, validateGiftCode, redeemGiftCode,
  createReferralCode, trackReferral, checkCredit, useCredit
};
