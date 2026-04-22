const { saveUser } = require('./db');

async function register({ email, birthData, freeResult }){
  if(!email || !email.includes('@')) return { success: false, error: 'Invalid email' };
  try {
    await saveUser({ email, birthData, freeResult });
    return { success: true };
  } catch(e){
    console.error('User register error:', e.message);
    return { success: true };
  }
}

module.exports = { register };