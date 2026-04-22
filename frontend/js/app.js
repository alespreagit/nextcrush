// ═══════════════════════════════════════════
// APP.JS — Main application logic
// ═══════════════════════════════════════════

// ── GLOBAL STATE ──
window.AppState = {
  birthData: null,
  email: null,
  freeResult: null,
  paidResult: null,
  paymentIntentId: null,
  countdownInterval: null
};

// ── STARFIELD ──
(function(){
  const c=document.getElementById('starfield');
  if(!c) return;
  const ctx=c.getContext('2d');
  let stars=[];
  function resize(){c.width=innerWidth;c.height=innerHeight}
  function init(){
    resize();
    stars=Array.from({length:200},()=>({
      x:Math.random()*c.width,y:Math.random()*c.height,
      r:Math.random()*1.3,sp:Math.random()*.003+.001,
      ph:Math.random()*Math.PI*2
    }));
  }
  function draw(t){
    ctx.clearRect(0,0,c.width,c.height);
    stars.forEach(s=>{
      const a=.25+.6*Math.sin(t*s.sp+s.ph);
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(245,230,184,${a})`;ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  addEventListener('resize',init);
  init();requestAnimationFrame(draw);
})();

// ── STEP NAVIGATION ──
function showStep(id){
  document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el){
    el.classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  }
}

function resetForm(){
  window.AppState={
    birthData:null,email:null,freeResult:null,
    paidResult:null,paymentIntentId:null,countdownInterval:null
  };
  if(window.AppState.countdownInterval) clearInterval(window.AppState.countdownInterval);
  showStep('step-form');
}

function showFreeResult(){
  showStep('step-free');
}

// ── TOAST ──
function showToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// ── MAIN CALCULATION (free tier) ──
function startCalculation(){
  const dobVal=document.getElementById('dob').value;
  const tobVal=document.getElementById('tob').value;
  const gender=document.getElementById('gender').value;
  const seeking=document.getElementById('seeking').value;
  const city=document.getElementById('city').value;

  if(!dobVal){showToast('Please enter your date of birth');return;}
  if(!gender){showToast('Please select your gender');return;}
  if(!seeking){showToast('Please select what you are seeking');return;}

  const dob=new Date(dobVal+'T12:00:00');

  // Store birth data globally
  window.AppState.birthData={
    dob:dobVal, tob:tobVal, gender, seeking, city,
    year:dob.getFullYear(),
    month:dob.getMonth()+1,
    day:dob.getDate(),
    hour:tobVal?parseInt(tobVal.split(':')[0]):12,
    minute:tobVal?parseInt(tobVal.split(':')[1]):0
  };

  // Calculate free fuzzy result
  const result=window.Ephemeris.calcFuzzyWindow(dob,tobVal,gender,seeking);
  window.AppState.freeResult=result;

  renderFreeResult(result);
  showStep('step-free');
}

// ── RENDER FREE RESULT ──
function renderFreeResult(result){
  // Fuzzy window display
  const fuzzEl=document.getElementById('fuzzy-window');
  if(fuzzEl){
    fuzzEl.textContent=`${result.low}–${result.high} days from now`;
  }

  // Tier label
  const tierEl=document.getElementById('free-tier-label');
  if(tierEl) tierEl.textContent=result.tierLabel;

  // Teaser oracle sentence
  const teaserEl=document.getElementById('oracle-teaser');
  if(teaserEl) teaserEl.textContent=result.teaser;
}

// ── RENDER PAID RESULT ──
function renderPaidResult(data){
  const {planets, bazi, windows, oracle, luckPillar} = data;

  // Profile badges
  const badges=[];
  if(planets){
    if(planets.sun) badges.push(planets.sun.sign+' Sun');
    if(planets.venus) badges.push(planets.venus.sign+' Venus');
    if(planets.mars) badges.push(planets.mars.sign+' Mars');
    if(planets.jupiter) badges.push(planets.jupiter.sign+' Jupiter');
  }
  if(bazi?.dayMaster) badges.push(bazi.dayMaster+' Day Master');
  if(luckPillar) badges.push(luckPillar.element+' Luck Era');

  const badgeEl=document.getElementById('profile-badges');
  if(badgeEl){
    badgeEl.innerHTML=badges.map(b=>`<div class="badge">${b}</div>`).join('');
  }

  // Top window clock
  if(windows&&windows.length){
    const top=windows[0];
    const topDate=new Date(top.date);

    document.getElementById('paid-window-type').textContent=
      {1:'❤ Partner Potential',2:'✦ Crush Likely',3:'◈ Encounter'}[top.tier]||'✦ Love Window';

    document.getElementById('paid-clock-transit').textContent=
      top.label+(top.orb?` · Orb ${top.orb}°`:'');

    document.getElementById('paid-target-date').textContent=
      topDate.toLocaleString('en-US',{
        weekday:'long',year:'numeric',month:'long',
        day:'numeric',hour:'2-digit',minute:'2-digit'
      });

    startCountdown(topDate);
  }

  // Oracle streaming
  if(oracle){
    streamOracleText(oracle, document.getElementById('oracle-text'));
  }

  // Windows list
  renderWindows(windows||[]);

  // Planet table
  renderPlanets(planets||{});

  // Bazi
  renderBazi(bazi||{}, luckPillar||{});

  // Venus profile
  renderVenusInfo(planets||{}, bazi||{});
}

// ── COUNTDOWN ──
function startCountdown(target){
  if(window.AppState.countdownInterval){
    clearInterval(window.AppState.countdownInterval);
  }
  function tick(){
    const diff=Math.max(0,target-new Date());
    document.getElementById('cd-days').textContent=
      String(Math.floor(diff/86400000)).padStart(2,'0');
    document.getElementById('cd-hours').textContent=
      String(Math.floor(diff%86400000/3600000)).padStart(2,'0');
    document.getElementById('cd-mins').textContent=
      String(Math.floor(diff%3600000/60000)).padStart(2,'0');
    document.getElementById('cd-secs').textContent=
      String(Math.floor(diff%60000/1000)).padStart(2,'0');
  }
  tick();
  window.AppState.countdownInterval=setInterval(tick,1000);
}

// ── ORACLE STREAM ──
async function streamOracleText(text, el){
  if(!el) return;
  el.innerHTML='';
  const paras=text.split(/\n+/).filter(p=>p.trim());
  for(let pi=0;pi<paras.length;pi++){
    const p=document.createElement('p');
    el.appendChild(p);
    for(let ci=0;ci<paras[pi].length;ci++){
      p.textContent+=paras[pi][ci];
      if(ci%4===0) await new Promise(r=>setTimeout(r,7));
    }
    if(pi<paras.length-1) await new Promise(r=>setTimeout(r,80));
  }
  const cur=document.createElement('span');
  cur.className='cursor';
  if(el.lastChild) el.lastChild.appendChild(cur);
  await new Promise(r=>setTimeout(r,2000));
  cur.remove();
}

// ── RENDER WINDOWS ──
const TIER_LABELS={1:'❤ Partner Potential',2:'✦ Crush Likely',3:'◈ Encounter'};

function renderWindows(windows){
  const el=document.getElementById('windows-list');
  if(!el) return;
  if(!windows.length){
    el.innerHTML=`<p style="text-align:center;color:var(--text-dim);font-style:italic;padding:32px">
      No major transits found in the next year — a quiet season for inner growth.
    </p>`;
    return;
  }
  el.innerHTML=windows.slice(0,5).map((w,i)=>{
    const date=new Date(w.date);
    const dateStr=date.toLocaleString('en-US',{
      weekday:'long',year:'numeric',month:'long',
      day:'numeric',hour:'2-digit',minute:'2-digit'
    });
    return `
    <div class="window-item tier-${w.tier}">
      <div class="window-header">
        <div class="window-date">${dateStr}</div>
        <div class="window-tier">${TIER_LABELS[w.tier]||'✦ Window'}</div>
      </div>
      <div class="window-reason">${w.reason||w.label||''}</div>
      ${w.orb?`<div class="window-orb">Orb: ${w.orb}° · ${w.aspect||''}</div>`:''}
      <button class="window-ai-btn" onclick="revealWindowReading(${i})">
        ✦ Oracle Reading for This Window
      </button>
      <div class="window-ai" id="window-ai-${i}"></div>
    </div>`;
  }).join('');
}

// ── WINDOW ORACLE (on demand) ──
async function revealWindowReading(i){
  const box=document.getElementById(`window-ai-${i}`);
  const btn=document.querySelector(`[onclick="revealWindowReading(${i})"]`);
  if(!box||!btn) return;

  btn.style.display='none';
  box.classList.add('active');
  box.innerHTML=`<div class="oracle-loading">
    <span>The oracle whispers</span>
    <div class="oracle-dots"><span></span><span></span><span></span></div>
  </div>`;

  try {
    const windows=window.AppState.paidResult?.windows||[];
    const w=windows[i];
    if(!w) throw new Error('Window not found');

    const res=await fetch(`${API_BASE}/oracle/window`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        window:w,
        birthData:window.AppState.birthData,
        planets:window.AppState.paidResult?.planets,
        bazi:window.AppState.paidResult?.bazi
      })
    });

    if(!res.ok) throw new Error('Oracle failed');
    const {text}=await res.json();

    box.innerHTML='';
    for(let ci=0;ci<text.length;ci++){
      box.textContent+=text[ci];
      if(ci%4===0) await new Promise(r=>setTimeout(r,10));
    }
  } catch(e){
    box.textContent='Trust the pull you feel during this window. Your instincts know the way.';
  }
}

// ── RENDER PLANETS ──
function renderPlanets(planets){
  const el=document.getElementById('planet-grid');
  if(!el) return;
  const planetList=[
    {key:'sun',label:'☉ Sun'},{key:'moon',label:'☽ Moon'},
    {key:'mercury',label:'☿ Mercury'},{key:'venus',label:'♀ Venus'},
    {key:'mars',label:'♂ Mars'},{key:'jupiter',label:'♃ Jupiter'},
    {key:'saturn',label:'♄ Saturn'},{key:'chiron',label:'⚷ Chiron'}
  ];
  el.innerHTML=planetList.map(p=>{
    const data=planets[p.key];
    if(!data) return '';
    return `
    <div class="planet-cell">
      <div class="planet-name">${p.label}</div>
      <div class="planet-sign">${data.symbol||''} ${data.sign||''}</div>
      <div class="planet-deg">${data.degree||''}</div>
    </div>`;
  }).join('');
}

// ── RENDER BAZI ──
function renderBazi(bazi, luckPillar){
  const el=document.getElementById('bazi-pillars');
  if(!el) return;

  const pillars=bazi.pillars||[];
  const labels=['Year','Month','Day','Hour'];
  const elColors={
    Wood:'element-wood',Fire:'element-fire',
    Earth:'element-earth',Metal:'element-metal',Water:'element-water'
  };

  let html=`<div class="pillar-row">`;
  pillars.forEach((p,i)=>{
    html+=`
    <div class="pillar">
      <div class="pillar-label">${labels[i]||''}</div>
      <div class="pillar-cell">
        <span class="pillar-stem">${p.stem||'?'}</span>
        <span class="pillar-branch">${p.branch||'?'}</span>
      </div>
      <div class="element-tag ${elColors[p.element]||''}">${p.element||''}</div>
    </div>`;
  });
  html+=`</div>`;

  if(bazi.dayMaster||luckPillar){
    html+=`<div style="margin-top:14px;font-size:12px;color:var(--text-dim);font-style:italic;line-height:1.7">`;
    if(bazi.spouseStar) html+=`Spouse Star: <span style="color:var(--gold-light)">${bazi.spouseStar}</span><br>`;
    if(luckPillar?.stem) html+=`Luck Pillar: <span style="color:var(--gold-light)">${luckPillar.stem}${luckPillar.branch}</span> · ${luckPillar.element||''} era`;
    html+=`</div>`;
  }
  el.innerHTML=html;
}

// ── RENDER VENUS INFO ──
const VENUS_LOVE={
  Aries:'Bold initiator — loves the chase',
  Taurus:'Sensual, loyal — loves slowly and deeply',
  Gemini:'Playful, curious — loves through wit',
  Cancer:'Tender, nurturing — bonds through emotion',
  Leo:'Passionate, theatrical — loves grand gestures',
  Virgo:'Devoted, attentive — loves through service',
  Libra:'Romantic, partnership-seeking — loves beautifully',
  Scorpio:'Intense, magnetic — loves all-or-nothing',
  Sagittarius:'Free, adventurous — loves expansively',
  Capricorn:'Patient, committed — loves with longevity',
  Aquarius:'Unconventional, electric — loves uniquely',
  Pisces:'Dreamy, empathic — loves transcendently'
};

function renderVenusInfo(planets, bazi){
  const el=document.getElementById('venus-info');
  if(!el) return;
  const v=planets.venus, m=planets.mars, j=planets.jupiter, s=planets.sun;
  const venSign=v?.sign||'';
  el.innerHTML=`
    ${v?`<div class="venus-row"><span class="venus-key">Venus</span><span class="venus-val">${v.symbol||''} ${v.sign} ${v.degree||''}</span></div>`:''}
    ${m?`<div class="venus-row"><span class="venus-key">Mars</span><span class="venus-val">${m.symbol||''} ${m.sign} ${m.degree||''}</span></div>`:''}
    ${j?`<div class="venus-row"><span class="venus-key">Jupiter</span><span class="venus-val">${j.symbol||''} ${j.sign}</span></div>`:''}
    ${s?`<div class="venus-row"><span class="venus-key">Sun</span><span class="venus-val">${s.symbol||''} ${s.sign}</span></div>`:''}
    <div class="venus-row" style="border:none"></div>
    <div style="font-size:13px;color:var(--text);line-height:1.65;font-style:italic">
      ${VENUS_LOVE[venSign]||''}
    </div>`;
}

// ── GLOBAL HELPERS (called from HTML) ──
window.startCalculation = startCalculation;
window.resetForm = resetForm;
window.showFreeResult = showFreeResult;
window.revealWindowReading = revealWindowReading;
window.showToast = showToast;
window.streamOracleText = streamOracleText;



// ── INIT ON LOAD ──
window.addEventListener('load', function(){
  if(window.Geocode) window.Geocode.initCityAutocomplete();
  if(window.Payment){
    window.showPayment = Payment.showPayment;
    window.saveEmail = Payment.saveEmail;
    window.submitPayment = Payment.submitPayment;
  }
  if(window.Calendar){
    window.downloadICS = Calendar.downloadICS;
    window.addToGoogleCalendar = Calendar.addToGoogleCalendar;
  }
});

// ── WRAP startCalculation to include coords ──
const _origStart = window.startCalculation;
window.startCalculation = function(){
  const cityData = window.Geocode ? window.Geocode.getCityData() : null;
  if(cityData && cityData.lat){
    document.getElementById('city-lat').value = cityData.lat;
    document.getElementById('city-lng').value = cityData.lng;
  }
  _origStart();
};

// ── LEGAL ──
function togglePayButton(){
  const checkbox = document.getElementById('agree-checkbox');
  const btn = document.getElementById('btn-pay');
  if(checkbox && btn){
    btn.disabled = !checkbox.checked;
    btn.style.opacity = checkbox.checked ? '1' : '0.5';
  }
}
window.togglePayButton = togglePayButton;

// ── SHARE ──
function buildShareText(){
  const windows = window.AppState?.paidResult?.windows;
  const top = windows?.[0];
  let days = '?';
  if(top?.date){
    const diff = Math.round((new Date(top.date) - new Date()) / 86400000);
    days = diff;
  }
  return 'I just discovered my next love window is in ' + days + ' days using Next Crush — a cosmic timing engine based on real planetary transits and Bazi astrology. Try it at nextcrush.app';
}

function updateSharePreview(){
  const el = document.getElementById('share-preview');
  if(el) el.textContent = buildShareText();
}

function shareWhatsApp(){
  const text = encodeURIComponent(buildShareText());
  window.open('https://wa.me/?text=' + text, '_blank');
}

function shareTwitter(){
  const text = encodeURIComponent(buildShareText());
  window.open('https://twitter.com/intent/tweet?text=' + text, '_blank');
}

function copyShareLink(){
  const text = buildShareText();
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'));
  } else {
    showToast('nextcrush.app');
  }
}

function shareNative(){
  if(navigator.share){
    navigator.share({
      title: 'Next Crush',
      text: buildShareText(),
      url: 'https://nextcrush.app'
    });
  } else {
    copyShareLink();
  }
}

window.shareWhatsApp = shareWhatsApp;
window.shareTwitter = shareTwitter;
window.copyShareLink = copyShareLink;
window.shareNative = shareNative;
window.updateSharePreview = updateSharePreview;
