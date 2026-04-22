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

module.exports = { saveUser, saveReading, getReading };