// ═══════════════════════════════════════════
// ORACLE.JS — Claude AI readings
// ═══════════════════════════════════════════

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VENUS_LOVE = {
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

async function mainReading({ planets, bazi, luckPillar, windows, seeking, city }){
  const top = windows[0];
  const venSign = planets?.venus?.sign || '';
  const marSign = planets?.mars?.sign || '';
  const sunSign = planets?.sun?.sign || '';
  const seekLabel = {
    partner:'a long-term partner',
    crush:'their next romantic crush',
    encounter:'a meaningful romantic encounter'
  }[seeking] || 'love';

  const prompt = `You are the oracle of Next Crush. IMPORTANT: Respond in plain prose only. No markdown, no headers, no # symbols, no asterisks, no bullet points. Pure flowing paragraphs only.

You are the oracle of Next Crush, a celestial love timing engine. Speak with poetic grace and mystical authority. You read love destiny through real planetary transits and Bazi Four Pillars.

This person seeks ${seekLabel}.

Their exact natal chart (Swiss Ephemeris precision):
- Sun: ${sunSign} · Venus: ${venSign} (${VENUS_LOVE[venSign]||'deep romantic nature'}) · Mars: ${marSign}
- Jupiter: ${planets?.jupiter?.sign||''} · Saturn: ${planets?.saturn?.sign||''}
- Bazi Day Master: ${bazi?.dayMaster||''} — ${bazi?.dayMasterElement||''} energy
- Current Luck Pillar: ${luckPillar?.stem||''}${luckPillar?.branch||''} — ${luckPillar?.element||''} era
${city ? `- Birthplace: ${city}` : ''}

Highest love window (real transit):
- ${top?.label||'Venus Return'} on ${top?.date ? new Date(top.date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : 'soon'}
- ${top?.reason||''}

Write a flowing oracle reading in exactly 4 short paragraphs. No headers. No bullets. No asterisks. Pure prose.

1. Their core romantic nature — Venus sign and Day Master element woven together naturally.
2. What this ${luckPillar?.element||''} luck pillar era means for their love life right now.
3. The coming ${top?.label||'Venus'} window — paint the feeling. What will they sense? Who might appear?
4. A closing benediction — poetic, empowering, hopeful.

Tone: mystical but warm, authoritative but tender. Under 300 words total.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0]?.text || '';
}

async function windowReading({ window, birthData, planets, bazi }){
  const venSign = planets?.venus?.sign || '';
  const dayEl = bazi?.dayMasterElement || '';
  const tierLabel = {
    1:'a profound partner potential',
    2:'a magnetic crush energy',
    3:'a sparkling romantic encounter'
  }[window?.tier] || 'romantic';

  const prompt = `You are the oracle of Next Crush. IMPORTANT: Respond in plain prose only. No markdown, no headers, no # symbols, no asterisks, no bullet points. Pure flowing paragraphs only.

You are the oracle of Next Crush. Write exactly 2 sentences for this specific transit window.

Sentence 1: What will this feel like in their body and daily life — be sensory and specific.
Sentence 2: One concrete evocative thing they should do to align with this energy.

Transit: ${window?.label||''} (${window?.aspect||''})
Date: ${window?.date ? new Date(window.date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : ''}
Energy tier: ${tierLabel}
Their Venus: ${venSign} · Day Master element: ${dayEl}

Rules: Second person. No markdown. No repeating the date. Max 55 words. Sensory and specific.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }]
  });

  return { text: message.content[0]?.text || '' };
}

module.exports = { mainReading, windowReading };