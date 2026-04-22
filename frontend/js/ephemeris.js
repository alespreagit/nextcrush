// ═══════════════════════════════════════════
// EPHEMERIS.JS — Browser-side calculations
// Used for FREE tier fuzzy clock only
// Paid tier uses real FreeAstroAPI calls
// ═══════════════════════════════════════════

const RAD = Math.PI/180, DEG = 180/Math.PI;

function julianDay(year,month,day,hour=12,min=0){
  if(month<=2){year--;month+=12}
  const A=Math.floor(year/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(year+4716))+Math.floor(30.6001*(month+1))+day+B-1524.5+(hour+min/60)/24;
}

function norm(a){return((a%360)+360)%360}

function sunLongitude(JD){
  const t=(JD-2451545)/36525;
  const L0=norm(280.46646+36000.76983*t);
  const M=norm(357.52911+35999.05029*t)*RAD;
  const C=(1.914602-0.004817*t)*Math.sin(M)+0.019993*Math.sin(2*M)+0.000289*Math.sin(3*M);
  return norm(L0+C);
}

function venusLongitude(JD){
  const t=(JD-2451545)/36525;
  const L=norm(181.979801+58517.8156760*t);
  const M=norm(212.301632+58517.803875*t)*RAD;
  const C=(0.733490-0.000813*t)*Math.sin(M)+0.006253*Math.sin(2*M)+0.000070*Math.sin(3*M);
  return norm(L+C);
}

function jupiterLongitude(JD){
  const t=(JD-2451545)/36525;
  const L=norm(34.351484+3034.9056746*t);
  const M=norm(20.9202+0.0830853001*t)*RAD;
  const C=(5.554589-0.025321*t)*Math.sin(M)+0.168956*Math.sin(2*M)+0.007104*Math.sin(3*M);
  return norm(L+C);
}

function marsLongitude(JD){
  const t=(JD-2451545)/36525;
  const L=norm(355.433275+19140.2993313*t);
  const M=norm(19.3730+0.5240207766*t)*RAD;
  const C=(10.691680-0.012486*t)*Math.sin(M)+0.623347*Math.sin(2*M)+0.050955*Math.sin(3*M);
  return norm(L+C);
}

function moonLongitude(JD){
  const t=(JD-2451545)/36525;
  const D=norm(297.8501921+445267.1114034*t)*RAD;
  const M=norm(357.5291092+35999.0502909*t)*RAD;
  const Mp=norm(134.9633964+477198.8675055*t)*RAD;
  let L=norm(218.3164477+481267.88123421*t);
  L+=6.288774*Math.sin(Mp)+1.274027*Math.sin(2*D-Mp)+0.658314*Math.sin(2*D)+0.213618*Math.sin(2*Mp)-0.185116*Math.sin(M);
  return norm(L);
}

const SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGN_SYMS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

function signOf(lon){return SIGNS[Math.floor(lon/30)%12]}
function symOf(lon){return SIGN_SYMS[Math.floor(lon/30)%12]}
function degInSign(lon){return(lon%30).toFixed(1)+'°'}

function getSunSign(month,day){
  const dates=[[3,21],[4,20],[5,21],[6,21],[7,23],[8,23],[9,23],[10,23],[11,22],[12,22],[1,20],[2,19],[3,20]];
  for(let i=0;i<12;i++){
    const[m1,d1]=dates[i],[m2,d2]=dates[i+1];
    if((month===m1&&day>=d1)||(month===m2&&day<d2))return i;
  }
  return 11;
}

// ── FUZZY WINDOW CALCULATOR (free tier) ──
// Returns a range in days, not exact date
function calcFuzzyWindow(dob, tob, gender, seeking){
  const year=dob.getFullYear(),month=dob.getMonth()+1,day=dob.getDate();
  const hour=tob?parseInt(tob.split(':')[0]):12;
  const min=tob?parseInt(tob.split(':')[1]):0;
  const JD=julianDay(year,month,day,hour,min);

  const natalVenus=venusLongitude(JD);
  const natalJupiter=jupiterLongitude(JD);
  const natalMars=marsLongitude(JD);
  const natalSun=sunLongitude(JD);
  const sunSign=getSunSign(month,day);
  const venusSign=signOf(natalVenus);
  const marsSign=signOf(natalMars);

  // Scan forward from today in 5-day steps
  const nowJD=julianDay(
    new Date().getFullYear(),
    new Date().getMonth()+1,
    new Date().getDate()
  );

  let bestScore=0, bestDay=45, bestTier=2;

  for(let d=5;d<=365;d+=5){
    const tJD=nowJD+d;
    const tVenus=venusLongitude(tJD);
    const tJupiter=jupiterLongitude(tJD);
    const tMars=marsLongitude(tJD);
    const tSun=sunLongitude(tJD);

    let score=0,tier=3;

    // Venus conjunct natal Venus (Venus Return)
    const vvDelta=Math.abs(((tVenus-natalVenus+180)%360)-180);
    if(vvDelta<8){score+=30;tier=Math.min(tier,2)}
    if(vvDelta<4){score+=20;tier=Math.min(tier,1)}

    // Jupiter aspecting natal Venus
    const jvDelta=Math.abs(((tJupiter-natalVenus+180)%360)-180);
    if(jvDelta<10){score+=40;tier=Math.min(tier,1)}
    if(jvDelta<5){score+=20}

    // Venus aspecting natal Mars
    const vmDelta=Math.abs(((tVenus-natalMars+180)%360)-180);
    if(vmDelta<8){score+=20;tier=Math.min(tier,2)}

    // Sun on natal Venus
    const svDelta=Math.abs(((tSun-natalVenus+180)%360)-180);
    if(svDelta<5){score+=10;tier=Math.min(tier,3)}

    if(score>bestScore){
      bestScore=score;
      bestDay=d;
      bestTier=tier;
    }
  }

  // Add intentional fuzziness — hide precision for free tier
  const fuzz=Math.floor(Math.random()*14)+8;
  const low=Math.max(7,bestDay-fuzz);
  const high=bestDay+fuzz;

  const tierLabels={
    1:'A significant partner energy is forming',
    2:'A meaningful crush window is approaching',
    3:'A romantic encounter is on the horizon'
  };

  const teasers={
    1:`Your ${venusSign} Venus carries a rare magnetic quality right now. The planetary alignments ahead suggest someone significant is already moving into your orbit...`,
    2:`With Mars in ${marsSign} activating your chart, the weeks ahead carry an unmistakable electricity. You may already feel it — a restlessness, a readiness...`,
    3:`The celestial weather is shifting in your favour. Your ${SIGNS[sunSign]} Sun draws warmth and attention during this coming window...`
  };

  return{
    low, high,
    tier: bestTier,
    tierLabel: tierLabels[bestTier],
    teaser: teasers[bestTier],
    venusSign, marsSign,
    sunSign: SIGNS[sunSign],
    natalVenus, natalMars, natalSun,
    JD
  };
}

// ── BAZI QUICK CALC (free tier, approximate) ──
function quickBazi(year,month,day,hour){
  const yBase=year-4;
  const yStem=((yBase%10)+10)%10;
  const yBranch=((yBase%12)+12)%12;
  const H=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const B=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const EL=['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
  return{
    yearStem:H[yStem], yearBranch:B[yBranch],
    element:EL[yStem]
  };
}

window.Ephemeris={calcFuzzyWindow,quickBazi,signOf,symOf,degInSign,SIGNS,SIGN_SYMS};
