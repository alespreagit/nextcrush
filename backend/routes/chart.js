// ═══════════════════════════════════════════
// CHART.JS — Reading creation
// Western: Swiss Ephemeris (local, no rate limits)
// Bazi: FreeAstroAPI (solar terms accurate)
// ═══════════════════════════════════════════

const axios = require('axios');
const oracle = require('./oracle');
const payment = require('./payment');
const ephemeris = require('./ephemeris');
const { saveReading, createGiftCodes, createReferralCode, validateGiftCode, redeemGiftCode } = require('./db');
const { sendGiftCodes, sendReadingSummary } = require('./email');

const ASTRO_API = 'https://api.freeastroapi.com/api/v1';
const ASTRO_KEY = process.env.FREEASTRO_API_KEY;

// Bazi only — FreeAstroAPI (proper solar terms)
async function getBaziChart(birthData){
  const { year, month, day, hour, minute, lat, lng, city, gender } = birthData;
  const res = await axios.post(`${ASTRO_API}/chinese/bazi`, {
    year, month, day,
    hour: hour || 12,
    minute: minute || 0,
    lat: lat || 40.7128,
    lng: lng || -74.0060,
    city: city || 'New York',
    sex: gender || 'M',
    time_standard: 'civil',
    include_pinyin: true,
    include_stars: true,
    include_interactions: true,
    include_professional: true
  }, {
    headers: { 'x-api-key': ASTRO_KEY, 'Content-Type': 'application/json' },
    timeout: 15000
  });
  return res.data;
}

// Parse planets from Swiss Ephemeris output
function parsePlanets(natalChart){
  const planets = {};
  if(!natalChart || !natalChart.planets) return planets;
  for(const [name, data] of Object.entries(natalChart.planets)){
    planets[name] = {
      sign: data.sign,
      degree: data.degree,
      symbol: data.symbol || '',
      longitude: data.lon,
      retrograde: false
    };
  }
  return planets;
}

function parseBazi(baziData){
  const pillars = [];
  if(baziData.pillars){
    baziData.pillars.forEach(p => {
      pillars.push({
        label: p.label,
        stem: p.gan || '',
        branch: p.zhi || '',
        element: p.gan_element || '',
        yinyang: p.gan_polarity || ''
      });
    });
  }
  return {
    pillars,
    dayMaster: baziData.day_master?.stem || '',
    dayMasterElement: baziData.day_master?.info?.element || '',
    spouseStar: baziData.spouse_star || '',
    luckPillars: baziData.luck_pillars || []
  };
}

function parseLuckPillar(baziData){
  const lucks = baziData.luck_pillars || [];
  const now = new Date();
  const current = lucks.find(l => {
    const start = new Date(l.start_year, 0, 1);
    const end = new Date(l.end_year, 11, 31);
    return now >= start && now <= end;
  });
  if(current){
    return {
      stem: current.gan || '',
      branch: current.zhi || '',
      element: current.element || ''
    };
  }
  return { stem: '', branch: '', element: '' };
}

function capitalize(s){
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

async function createReading(body){
  const { paymentIntentId, birthData, email, giftCode, product } = body;

  // Verify payment OR gift code
  if(giftCode){
    const valid = await validateGiftCode(giftCode);
    if(!valid) throw new Error('Invalid or already used gift code');
    await redeemGiftCode(giftCode, email);
  } else {
    if(!paymentIntentId) throw new Error('Payment not verified');
    const paid = await payment.verifyPayment(paymentIntentId);
    if(!paid) throw new Error('Payment not completed');
  }

  console.log('Creating reading for:', email, 'product:', product);

  // ── Western chart via Swiss Ephemeris (local, no API, no rate limits) ──
  const { year, month, day, hour, minute } = birthData;
  const natalChart = ephemeris.calcNatalChart(
    year, month, day, hour || 12, minute || 0
  );
  const planets = parsePlanets(natalChart);
  console.log('Swiss Ephemeris natal chart done. Planets:', Object.keys(planets).join(', '));

  // ── Bazi via FreeAstroAPI (solar terms) ──
  let baziData = {};
  try {
    baziData = await getBaziChart(birthData);
    console.log('Bazi done');
  } catch(e){
    console.log('Bazi API failed:', e.message, '— continuing without Bazi');
  }

  const bazi = parseBazi(baziData);
  const luckPillar = parseLuckPillar(baziData);

  // ── Love windows via Swiss Ephemeris transit scanner ──
  const nowJD = ephemeris.toJulianDay(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate()
  );
  console.log('Scanning love transits...');
  const windows = ephemeris.scanLoveTransits(natalChart, birthData.seeking, nowJD);
  console.log('Windows found:', windows.length);

  // ── Claude oracle reading ──
  const oracleText = await oracle.mainReading({
    planets, bazi, luckPillar, windows,
    seeking: birthData.seeking,
    city: birthData.city
  });

  // ── Gift codes if pack purchase ──
  let giftCodes = [];
  if(product === 'pack' && paymentIntentId){
    try {
      giftCodes = await createGiftCodes({ email, paymentIntentId, count: 2 });
      if(email && giftCodes.length > 0){
        sendGiftCodes({ email, giftCodes, windows }).catch(e =>
          console.error('Gift code email failed:', e.message)
        );
      }
    } catch(e){
      console.error('Gift code generation failed:', e.message);
    }
  }

  // ── Referral code ──
  let refCode = null;
  if(email){
    try {
      refCode = await createReferralCode(email);
    } catch(e){
      console.error('Referral code failed:', e.message);
    }
  }

  // ── Send reading summary email ──
  if(email){
    sendReadingSummary({ email, windows, oracle: oracleText, planets })
      .catch(e => console.error('Reading email failed:', e.message));
  }

  const result = {
    planets,
    bazi,
    luckPillar,
    windows,
    oracle: oracleText,
    giftCodes,
    refCode,
    product: product || 'single',
    seeking: birthData.seeking || 'partner',
    createdAt: new Date().toISOString()
  };

  try {
    await saveReading({
      email,
      paymentIntentId: paymentIntentId || giftCode,
      birthData,
      result
    });
  } catch(e){
    console.error('DB save failed:', e.message);
  }

  return result;
}

module.exports = { createReading, getBaziChart };
