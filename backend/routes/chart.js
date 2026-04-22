// ═══════════════════════════════════════════
// CHART.JS — FreeAstroAPI calls
// Real Swiss Ephemeris + Real Bazi
// ═══════════════════════════════════════════

const axios = require('axios');
const oracle = require('./oracle');
const payment = require('./payment');
const { saveReading, createGiftCodes, createReferralCode, validateGiftCode, redeemGiftCode } = require('./db');

const ASTRO_API = 'https://api.freeastroapi.com/api/v1';
const ASTRO_KEY = process.env.FREEASTRO_API_KEY;

async function getNatalChart(birthData){
  const { year, month, day, hour, minute, lat, lng, city } = birthData;
  const res = await axios.post(`${ASTRO_API}/natal/calculate`, {
    name: 'User',
    year, month, day,
    hour: hour || 12,
    minute: minute || 0,
    lat: lat || 40.7128,
    lng: lng || -74.0060,
    city: city || 'New York',
    tz_str: 'AUTO'
  }, {
    headers: { 'x-api-key': ASTRO_KEY, 'Content-Type': 'application/json' }
  });
  return res.data;
}

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
    headers: { 'x-api-key': ASTRO_KEY, 'Content-Type': 'application/json' }
  });
  return res.data;
}

async function getTransits(birthData, natalData){
  const now = new Date();
  const res = await axios.post(`${ASTRO_API}/transits/calculate`, {
    natal: {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour || 12,
      minute: birthData.minute || 0,
      lat: birthData.lat || 40.7128,
      lng: birthData.lng || -74.0060,
      tz_str: 'AUTO'
    },
    transit: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      lat: birthData.lat || 40.7128,
      lng: birthData.lng || -74.0060,
      tz_str: 'AUTO'
    },
    orb: 3,
    aspects: ['conjunction','sextile','trine','square','opposition'],
    planets: ['jupiter','venus','mars','sun','moon','saturn']
  }, {
    headers: { 'x-api-key': ASTRO_KEY, 'Content-Type': 'application/json' }
  });
  return res.data;
}

function parsePlanets(natalData){
  const planets = {};
  const SYMBOLS = {
    sun:'☉', moon:'☽', mercury:'☿', venus:'♀',
    mars:'♂', jupiter:'♃', saturn:'♄', chiron:'⚷'
  };
  if(natalData.planets){
    natalData.planets.forEach(p => {
      const key = p.name?.toLowerCase();
      if(key){
        planets[key] = {
          sign: p.sign,
          degree: p.full_degree ? p.full_degree.toFixed(1)+'°' : '',
          symbol: SYMBOLS[key] || '',
          retrograde: p.is_retro || false
        };
      }
    });
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

function parseWindows(transitData, natalData, seeking){
  const windows = [];
  const TIER_MAP = {
    jupiter: 1, venus: 2, mars: 2, sun: 3, moon: 3, saturn: 3
  };
  const LOVE_ASPECTS = ['conjunction','trine','sextile'];
  const LOVE_NATAL = ['venus','sun','mars'];

  if(transitData.transits){
    transitData.transits.forEach(t => {
      const planet = t.transit_planet?.toLowerCase();
      const natalPlanet = t.natal_planet?.toLowerCase();
      const aspect = t.aspect?.toLowerCase();

      if(!LOVE_NATAL.includes(natalPlanet)) return;
      if(!LOVE_ASPECTS.includes(aspect)) return;

      const tier = TIER_MAP[planet] || 3;
      const date = new Date();
      date.setDate(date.getDate() + Math.round(t.days_to_exact || 30));

      const aspectNames = {
        conjunction:'Conjunction', trine:'Trine',
        sextile:'Sextile', square:'Square', opposition:'Opposition'
      };

      windows.push({
        date: date.toISOString(),
        tier,
        label: `${capitalize(planet)} × ${capitalize(natalPlanet)}`,
        aspect: aspectNames[aspect] || aspect,
        orb: t.orb ? t.orb.toFixed(2) : '',
        reason: `Transiting ${capitalize(planet)} forms a ${aspectNames[aspect]||aspect} with your natal ${capitalize(natalPlanet)} — ${getTransitMeaning(planet, natalPlanet, aspect)}`,
        intensity: Math.round(100 - (t.orb || 2) * 15),
        daysToExact: t.days_to_exact || 30
      });
    });
  }

  windows.sort((a,b) => new Date(a.date) - new Date(b.date));

  return windows.map(w => {
    let score = w.intensity;
    if(seeking === 'partner' && w.tier === 1) score += 10;
    if(seeking === 'crush' && w.tier === 2) score += 10;
    if(seeking === 'encounter' && w.tier === 3) score += 10;
    return { ...w, score };
  }).sort((a,b) => b.score - a.score).slice(0,5);
}

function getTransitMeaning(planet, natal, aspect){
  const meanings = {
    'jupiter-venus': 'your magnetic energy expands dramatically — the great benefic opens your heart',
    'jupiter-sun': 'vitality and confidence peak — you radiate warmth that draws people close',
    'jupiter-mars': 'bold action and passion surge — you pursue and attract with equal force',
    'venus-venus': 'your annual peak of personal magnetism — Venus returns home to you',
    'venus-mars': 'desire and attraction pulse at their highest frequency',
    'venus-sun': 'charm and beauty illuminate your presence — you are seen',
    'mars-venus': 'passion ignites — chemistry and pursuit energy are electric',
    'mars-sun': 'confidence and drive surge — others feel your presence strongly',
    'sun-venus': 'the Sun illuminates your Venus — a brief bright window of radiance',
  };
  return meanings[`${planet}-${natal}`] || 'a favorable alignment for romantic connection';
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

  const [natalData, baziData] = await Promise.all([
    getNatalChart(birthData),
    getBaziChart(birthData)
  ]);

  const transitData = await getTransits(birthData, natalData);
  const planets = parsePlanets(natalData);
  const bazi = parseBazi(baziData);
  const luckPillar = parseLuckPillar(baziData);
  const windows = parseWindows(transitData, natalData, birthData.seeking);

  const oracleText = await oracle.mainReading({
    planets, bazi, luckPillar, windows,
    seeking: birthData.seeking,
    city: birthData.city
  });

  // Generate gift codes if pack purchase
  let giftCodes = [];
  if(product === 'pack' && paymentIntentId){
    try {
      giftCodes = await createGiftCodes({
        email,
        paymentIntentId,
        count: 2
      });
    } catch(e){
      console.error('Gift code generation failed:', e.message);
    }
  }

  // Generate referral code for this user
  let refCode = null;
  if(email){
    try {
      refCode = await createReferralCode(email);
    } catch(e){
      console.error('Referral code generation failed:', e.message);
    }
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

module.exports = { createReading, getNatalChart, getBaziChart };
