// ═══════════════════════════════════════════
// EPHEMERIS.JS — Pure JavaScript VSOP87
// No native dependencies — works everywhere
// ═══════════════════════════════════════════

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function toJulianDay(year, month, day, hour=12, minute=0){
  if(month <= 2){ year--; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25*(year+4716)) +
         Math.floor(30.6001*(month+1)) +
         day + B - 1524.5 + (hour+minute/60)/24;
}

function fromJulianDay(JD){
  const z = Math.floor(JD+0.5), f = JD+0.5-z;
  let A = z;
  if(z >= 2299161){ const a=Math.floor((z-1867216.25)/36524.25); A=z+1+a-Math.floor(a/4); }
  const B=A+1524, C=Math.floor((B-122.1)/365.25), D=Math.floor(365.25*C);
  const E=Math.floor((B-D)/30.6001);
  const day=B-D-Math.floor(30.6001*E);
  const month=E<14?E-1:E-13;
  const year=month>2?C-4716:C-4715;
  const hour=Math.floor(f*24);
  const minute=Math.round((f*24-hour)*60);
  return new Date(year,month-1,day,hour,minute,0);
}

function norm(a){ return ((a%360)+360)%360; }
function T(JD){ return (JD-2451545.0)/36525; }

function sunLongitude(JD){
  const t=T(JD), L0=norm(280.46646+36000.76983*t);
  const M=norm(357.52911+35999.05029*t)*RAD;
  const C=(1.914602-0.004817*t)*Math.sin(M)+0.019993*Math.sin(2*M)+0.000289*Math.sin(3*M);
  const omega=norm(125.04-1934.136*t);
  return norm(L0+C-0.00569-0.00478*Math.sin(omega*RAD));
}

function venusLongitude(JD){
  const t=T(JD), L=norm(181.979801+58517.8156760*t);
  const M=norm(212.301632+58517.803875*t)*RAD;
  return norm(L+(0.733490-0.000813*t)*Math.sin(M)+0.006253*Math.sin(2*M)+0.000070*Math.sin(3*M));
}

function marsLongitude(JD){
  const t=T(JD), L=norm(355.433275+19140.2993313*t);
  const M=norm(19.3730+0.5240207766*t)*RAD;
  return norm(L+(10.691680-0.012486*t)*Math.sin(M)+0.623347*Math.sin(2*M)+0.050955*Math.sin(3*M));
}

function jupiterLongitude(JD){
  const t=T(JD), L=norm(34.351484+3034.9056746*t);
  const M=norm(20.9202+0.0830853001*t)*RAD;
  return norm(L+(5.554589-0.025321*t)*Math.sin(M)+0.168956*Math.sin(2*M)+0.007104*Math.sin(3*M));
}

function saturnLongitude(JD){
  const t=T(JD), L=norm(50.077444+1222.1138488*t);
  const M=norm(317.0207+0.0334442282*t)*RAD;
  return norm(L+(6.393188-0.055949*t)*Math.sin(M)+0.209955*Math.sin(2*M)+0.011820*Math.sin(3*M));
}

function moonLongitude(JD){
  const t=T(JD);
  const D=norm(297.8501921+445267.1114034*t)*RAD;
  const M=norm(357.5291092+35999.0502909*t)*RAD;
  const Mp=norm(134.9633964+477198.8675055*t)*RAD;
  let L=norm(218.3164477+481267.88123421*t);
  L+=6.288774*Math.sin(Mp)+1.274027*Math.sin(2*D-Mp)+0.658314*Math.sin(2*D)+0.213618*Math.sin(2*Mp)-0.185116*Math.sin(M);
  return norm(L);
}

function mercuryLongitude(JD){
  const t=T(JD), L=norm(252.250906+149472.6746358*t);
  const M=norm(168.6562+149472.515*t)*RAD;
  return norm(L+23.4400*Math.sin(M)+2.9818*Math.sin(2*M)+0.5255*Math.sin(3*M));
}

function chironLongitude(JD){
  const t=T(JD);
  return norm(209.767+0.71958*t);
}

const PLANET_FNS = {
  sun:sunLongitude, moon:moonLongitude, mercury:mercuryLongitude,
  venus:venusLongitude, mars:marsLongitude, jupiter:jupiterLongitude,
  saturn:saturnLongitude, chiron:chironLongitude
};

const PLANET_SYMBOLS = {
  sun:"\u2609",moon:"\u263d",mercury:"\u263f",venus:"\u2640",
  mars:"\u2642",jupiter:"\u2643",saturn:"\u2644",chiron:"\u26b7"
};

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
               "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

function signOf(lon){ return SIGNS[Math.floor(norm(lon)/30)]; }
function degInSign(lon){ return (norm(lon)%30).toFixed(1)+"\u00b0"; }

function calcNatalChart(year,month,day,hour,minute){
  const jd = toJulianDay(year,month,day,hour,minute);
  const planets = {};
  for(const [name,fn] of Object.entries(PLANET_FNS)){
    try {
      const lon = fn(jd);
      planets[name] = { lon, sign:signOf(lon), degree:degInSign(lon), symbol:PLANET_SYMBOLS[name]||"", longitude:lon };
    } catch(e){ console.error("Error",name,e.message); }
  }
  return { planets, jd };
}

const LOVE_TRANSITS = [
  { transiting:"jupiter", natal:"venus",  aspects:[0,60,120], tier:1, weight:50 },
  { transiting:"jupiter", natal:"sun",    aspects:[0,120],    tier:1, weight:40 },
  { transiting:"venus",   natal:"venus",  aspects:[0],        tier:1, weight:45 },
  { transiting:"venus",   natal:"mars",   aspects:[0,60,120], tier:2, weight:35 },
  { transiting:"mars",    natal:"venus",  aspects:[0,60,120], tier:2, weight:30 },
  { transiting:"venus",   natal:"sun",    aspects:[0,120],    tier:2, weight:25 },
  { transiting:"sun",     natal:"venus",  aspects:[0],        tier:3, weight:15 },
  { transiting:"venus",   natal:"sun",    aspects:[60],       tier:3, weight:12 },
  { transiting:"mars",    natal:"sun",    aspects:[0,120],    tier:3, weight:10 },
  { transiting:"jupiter", natal:"mars",   aspects:[0,120],    tier:2, weight:30 },
];

const ASPECT_NAMES = {0:"Conjunction",60:"Sextile",120:"Trine",180:"Opposition",90:"Square"};

function getTransitMeaning(transiting,natal,aspect){
  const meanings = {
    "jupiter-venus-0":   "Jupiter conjuncts your natal Venus — the great benefic opens your heart wide, expanding your magnetic presence and romantic luck to its peak",
    "jupiter-venus-60":  "Jupiter sextiles your natal Venus — opportunities for meaningful connection flow naturally, opening doors you did not know existed",
    "jupiter-venus-120": "Jupiter trines your natal Venus — the most harmonious love transit possible, bringing effortless attraction and authentic romantic encounters",
    "jupiter-sun-0":     "Jupiter conjuncts your natal Sun — your vitality and confidence peak, drawing romantic attention from unexpected directions",
    "jupiter-sun-120":   "Jupiter trines your natal Sun — expansive energy lights you from within, making you irresistibly compelling to others",
    "venus-venus-0":     "Venus returns to its natal position — your annual peak of personal magnetism, beauty, and romantic resonance",
    "venus-mars-0":      "Venus conjuncts your natal Mars — desire and attraction pulse at their highest frequency, chemistry is undeniable",
    "venus-mars-60":     "Venus sextiles your natal Mars — playful attraction and romantic momentum build naturally",
    "venus-mars-120":    "Venus trines your natal Mars — passion and tenderness combine perfectly, creating deep romantic chemistry",
    "mars-venus-0":      "Mars conjuncts your natal Venus — electric attraction and bold pursuit energy, others feel drawn to your presence",
    "mars-venus-60":     "Mars sextiles your natal Venus — confident warm energy makes romantic initiative feel natural",
    "mars-venus-120":    "Mars trines your natal Venus — passion and beauty align, creating magnetic romantic energy",
    "venus-sun-0":       "Venus conjuncts your natal Sun — charm, warmth, and social grace are at their peak",
    "venus-sun-120":     "Venus trines your natal Sun — a gentle but powerful window of attractiveness and romantic possibility",
    "sun-venus-0":       "The Sun illuminates your natal Venus — a bright window of visibility, beauty, and romantic noticeability",
    "jupiter-mars-0":    "Jupiter conjuncts your natal Mars — bold confident action in love; the courage to pursue what you desire",
    "jupiter-mars-120":  "Jupiter trines your natal Mars — expansive passion and romantic courage flow with ease",
  };
  return meanings[transiting+"-"+natal+"-"+aspect] || transiting+" activates your natal "+natal+" — a favorable window for romantic connection";
}

function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ""; }

// Compute angular distance between transiting planet and target angle
// Returns value 0-180 (smaller = closer to exact aspect)
function orbToTarget(tLon, natalLon, aspectAngle){
  const target = norm(natalLon + aspectAngle);
  const diff = norm(tLon - target);
  return diff > 180 ? 360 - diff : diff;
}

function scanLoveTransits(natalChart, seeking, startJD){
  const windows = [];
  const ORB = 3;

  for(const tr of LOVE_TRANSITS){
    const natalPlanet = natalChart.planets[tr.natal];
    if(!natalPlanet) continue;
    const transitFn = PLANET_FNS[tr.transiting];
    if(!transitFn) continue;

    for(const aspectAngle of tr.aspects){
      // Scan step: slower planets need bigger steps
      const step = (tr.transiting === "jupiter" || tr.transiting === "saturn") ? 5 : 1;

      let inOrb = false;
      let bestJD = null, bestOrb = 999;

      for(let d = 0; d <= 400; d += step){
        const jd = startJD + d;
        const tLon = transitFn(jd);
        const orb = orbToTarget(tLon, natalPlanet.lon, aspectAngle);

        if(orb <= ORB){
          inOrb = true;
          if(orb < bestOrb){ bestOrb = orb; bestJD = jd; }
        } else if(inOrb){
          // Just left orb — record this window
          break;
        }
      }

      if(bestJD === null) continue;

      // Refine with smaller steps around bestJD
      for(let d = -step; d <= step; d += 0.1){
        const jd = bestJD + d;
        const tLon = transitFn(jd);
        const orb = orbToTarget(tLon, natalPlanet.lon, aspectAngle);
        if(orb < bestOrb){ bestOrb = orb; bestJD = jd; }
      }

      const date = fromJulianDay(bestJD);
      if(date < new Date()) continue;

      const transitSign = signOf(transitFn(bestJD));
      let score = tr.weight - bestOrb * 5;
      if(seeking === "partner"   && tr.tier === 1) score += 15;
      if(seeking === "crush"     && tr.tier === 2) score += 15;
      if(seeking === "encounter" && tr.tier === 3) score += 15;

      windows.push({
        date: date.toISOString(),
        tier: tr.tier,
        label: capitalize(tr.transiting)+" x "+capitalize(tr.natal),
        aspect: ASPECT_NAMES[aspectAngle] || aspectAngle+"deg",
        orb: bestOrb.toFixed(2),
        transitSign,
        natalSign: natalPlanet.sign,
        reason: getTransitMeaning(tr.transiting, tr.natal, aspectAngle),
        intensity: Math.round(100 - bestOrb*15),
        score,
        daysToExact: Math.round(bestJD - startJD)
      });
    }
  }

  return windows.sort((a,b) => b.score - a.score).slice(0,5);
}

module.exports = { calcNatalChart, scanLoveTransits, toJulianDay, signOf, degInSign, SIGNS };
