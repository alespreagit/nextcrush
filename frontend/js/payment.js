// ═══════════════════════════════════════════
// PAYMENT.JS — Stripe integration
// ═══════════════════════════════════════════

const STRIPE_PUBLISHABLE_KEY = 'pk_live_51TOklHBtnWLVsV60okJRRMv8lkslxxjHyeg3sg4kguC3tZ404Zlst6Ce3jXXJrdmBV3SBiZUH0EIVoZ2RBNf9OYA00fOD4Hsnb';
const API_BASE = 'https://3vpmm532vwxmruchj6dsz6xfhu0sagil.lambda-url.us-east-1.on.aws';

let stripe = null;
let elements = null;
let paymentElement = null;

function initStripe(){
  if(!stripe){
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  }
}

async function createPaymentIntent(){
  const res = await fetch(`${API_BASE}/payment/create`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      amount: 499,
      currency: 'usd',
      email: window.AppState?.email || '',
      birthData: window.AppState?.birthData || {}
    })
  });
  const data = await res.json();
  if(!res.ok){
    console.error('Payment intent error:', data);
    const errMsg = data.message || data.error || 'Payment setup failed';
    // Show permanently in page
    const errDiv = document.getElementById('payment-error');
    if(errDiv) errDiv.textContent = 'Error: ' + errMsg;
    throw new Error(errMsg);
  }
  return data;
}

async function setupPaymentElement(){
  initStripe();
  const container = document.getElementById('payment-element');
  if(!container) return;

  try {
    showToast('Setting up secure payment…');
    const {clientSecret, paymentIntentId} = await createPaymentIntent();
    window.AppState.paymentIntentId = paymentIntentId;

    elements = stripe.elements({
      clientSecret,
      appearance:{
        theme:'night',
        variables:{
          colorPrimary:'#c9a84c',
          colorBackground:'#080616',
          colorText:'#d4c5a9',
          colorDanger:'#c4607f',
          fontFamily:'"Cormorant Garamond", serif',
          borderRadius:'2px',
        }
      }
    });

    paymentElement = elements.create('payment',{
      layout:'tabs'
    });
    paymentElement.mount('#payment-element');

  } catch(e){
    console.error(e);
    document.getElementById('payment-element').innerHTML =
      `<p style="color:var(--text-dim);font-style:italic;text-align:center;padding:20px">
        Payment setup failed. Please refresh and try again.
      </p>`;
  }
}

async function submitPayment(){
  if(!stripe||!elements){
    showToast('Payment not ready yet');
    return;
  }

  const btn = document.getElementById('btn-pay');
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    const {error, paymentIntent} = await stripe.confirmPayment({
      elements,
      redirect:'if_required',
      confirmParams:{
        return_url: 'https://nextcrush.app/success',
        receipt_email: window.AppState?.email || undefined
      }
    });

    if(error){
      showToast(error.message || 'Payment failed');
      btn.disabled = false;
      btn.textContent = '✦ Unlock Now — $4.99 ✦';
      return;
    }

    if(paymentIntent && paymentIntent.status === 'succeeded'){
      showToast('Payment successful! Loading your reading…');
      await loadPaidReading(paymentIntent.id);
    }

  } catch(e){
    console.error(e);
    showToast('Something went wrong. Please try again.');
    btn.disabled = false;
    btn.textContent = '✦ Unlock Now — $4.99 ✦';
  }
}

async function loadPaidReading(paymentIntentId){
  try {
    showStep('step-paid');

    // Show loading state
    document.getElementById('oracle-text').innerHTML = `
      <div class="oracle-loading">
        <span>The oracle is reading your chart</span>
        <div class="oracle-dots"><span></span><span></span><span></span></div>
      </div>`;

    const res = await fetch(`${API_BASE}/reading/create`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        paymentIntentId,
        birthData: window.AppState.birthData,
        email: window.AppState.email || ''
      })
    });

    if(!res.ok) throw new Error('Reading failed');
    const data = await res.json();

    window.AppState.paidResult = data;
    renderPaidResult(data);

  } catch(e){
    console.error(e);
    document.getElementById('oracle-text').innerHTML =
      `<p style="color:var(--text-dim);font-style:italic">
        Your reading is being prepared. Check your email shortly.
      </p>`;
  }
}

async function saveEmail(){
  const email = document.getElementById('email-input')?.value?.trim();
  if(!email || !email.includes('@')){
    showToast('Please enter a valid email');
    return;
  }

  window.AppState.email = email;

  try {
    await fetch(`${API_BASE}/user/register`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        email,
        birthData: window.AppState.birthData,
        freeResult: window.AppState.freeResult
      })
    });
    showToast('Email saved! We\'ll remind you before your window ✨');
    document.getElementById('email-card').style.opacity = '0.5';
    document.getElementById('email-card').style.pointerEvents = 'none';
  } catch(e){
    // Silently fail — don't block UX
    showToast('Saved! ✨');
  }

  // Proceed to payment after short delay
  setTimeout(showPayment, 1200);
}

function showPayment(){
  showStep('step-payment');
  setupPaymentElement();
}

window.Payment = {initStripe, submitPayment, saveEmail, showPayment, loadPaidReading};
