// ═══════════════════════════════════════════
// EMAIL.JS — Resend email delivery
// ═══════════════════════════════════════════

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@nextcrush.app';
const FROM_NAME = 'Next Crush';

async function sendEmail({ to, subject, html }){
  if(!RESEND_API_KEY){
    console.log('No Resend key — email skipped');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html
      })
    });
    const data = await res.json();
    console.log('Email sent:', data.id);
    return data;
  } catch(e){
    console.error('Email error:', e.message);
  }
}

// ── TEMPLATES ──

function giftCodesEmail({ email, giftCodes, windows }){
  const topWindow = windows?.[0];
  const windowDate = topWindow?.date ? new Date(topWindow.date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : '';

  const codesHtml = giftCodes.map(code => `
    <div style="background:#0d0b1f;border:1px solid rgba(201,168,76,0.3);padding:16px;margin:8px 0;text-align:center;font-family:monospace;font-size:20px;letter-spacing:0.15em;color:#e8c97a">
      ${code}
    </div>
  `).join('');

  return {
    subject: '✦ Your Next Crush Reading Pack — Gift Codes Inside',
    html: `
    <div style="background:#03020a;color:#d4c5a9;font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 32px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:28px;color:#c9a84c;font-family:Georgia,serif;letter-spacing:0.2em">NEXT CRUSH</div>
        <div style="font-size:11px;letter-spacing:0.4em;color:#7a6e5f;text-transform:uppercase;margin-top:4px">Cosmic Love Timing Engine</div>
      </div>

      <p style="font-size:16px;line-height:1.8;color:#d4c5a9">Your Reading Pack is ready. Your personal reading has been unlocked, and below are your 2 gift codes to share with friends.</p>

      <div style="margin:28px 0">
        <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.35em;color:#c9a84c;text-transform:uppercase;margin-bottom:16px">✦ Your Gift Codes ✦</div>
        ${codesHtml}
        <p style="font-size:13px;color:#7a6e5f;font-style:italic;margin-top:12px">Each code unlocks one free full reading. Share them with friends or use one yourself for a different reading. Codes never expire.</p>
      </div>

      ${windowDate ? `
      <div style="background:#1a0f2e;border-left:2px solid #c9a84c;padding:16px 20px;margin:24px 0">
        <div style="font-size:11px;letter-spacing:0.3em;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Your Highest Love Window</div>
        <div style="font-size:16px;color:#e8c97a">${windowDate}</div>
        <div style="font-size:13px;color:#7a6e5f;margin-top:4px">${topWindow?.reason || ''}</div>
      </div>
      ` : ''}

      <div style="text-align:center;margin-top:32px">
        <a href="https://nextcrush.app" style="background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);color:#e8c97a;padding:14px 28px;text-decoration:none;font-family:Georgia,serif;font-size:11px;letter-spacing:0.3em;text-transform:uppercase">View My Reading →</a>
      </div>

      <div style="border-top:1px solid rgba(201,168,76,0.15);margin-top:40px;padding-top:20px;text-align:center;font-size:11px;color:#7a6e5f">
        <p>The stars do not dictate — they illuminate.</p>
        <p style="margin-top:8px"><a href="https://nextcrush.app" style="color:#7a6e5f">nextcrush.app</a></p>
      </div>
    </div>
    `
  };
}

function readingSummaryEmail({ email, windows, oracle, planets }){
  const topWindow = windows?.[0];
  const windowDate = topWindow?.date ? new Date(topWindow.date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : '';
  const daysUntil = topWindow?.date ? Math.round((new Date(topWindow.date) - new Date()) / 86400000) : null;

  return {
    subject: `✦ Your Next Crush Reading — ${daysUntil ? daysUntil + ' days until your window' : 'Your reading is ready'}`,
    html: `
    <div style="background:#03020a;color:#d4c5a9;font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 32px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:28px;color:#c9a84c;font-family:Georgia,serif;letter-spacing:0.2em">NEXT CRUSH</div>
        <div style="font-size:11px;letter-spacing:0.4em;color:#7a6e5f;text-transform:uppercase;margin-top:4px">Cosmic Love Timing Engine</div>
      </div>

      <p style="font-size:16px;line-height:1.8">Your celestial love reading is ready. Keep this email — it contains your highest probability window and oracle reading.</p>

      ${windowDate ? `
      <div style="background:#1a0f2e;border:1px solid rgba(196,96,127,0.3);padding:24px;margin:24px 0;text-align:center">
        <div style="font-size:11px;letter-spacing:0.4em;color:#c4607f;text-transform:uppercase;margin-bottom:12px">✦ Your Highest Love Window ✦</div>
        ${daysUntil ? `<div style="font-size:36px;color:#e8c97a;margin-bottom:8px">${daysUntil} days</div>` : ''}
        <div style="font-size:15px;color:#d4c5a9">${windowDate}</div>
        <div style="font-size:13px;color:#7a6e5f;margin-top:8px">${topWindow?.label || ''}</div>
      </div>
      ` : ''}

      ${oracle ? `
      <div style="margin:24px 0">
        <div style="font-size:11px;letter-spacing:0.35em;color:#c9a84c;text-transform:uppercase;margin-bottom:16px">✦ The Oracle Speaks ✦</div>
        <div style="font-size:15px;line-height:1.9;color:#d4c5a9;font-style:italic">${oracle.substring(0, 400)}...</div>
      </div>
      ` : ''}

      <div style="text-align:center;margin-top:32px">
        <a href="https://nextcrush.app" style="background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);color:#e8c97a;padding:14px 28px;text-decoration:none;font-family:Georgia,serif;font-size:11px;letter-spacing:0.3em;text-transform:uppercase">View Full Reading →</a>
      </div>

      <div style="border-top:1px solid rgba(201,168,76,0.15);margin-top:40px;padding-top:20px;text-align:center;font-size:11px;color:#7a6e5f">
        <p>The stars do not dictate — they illuminate.</p>
        <p style="margin-top:8px">You'll receive a reminder 7 days before your window opens.</p>
        <p style="margin-top:8px"><a href="https://nextcrush.app" style="color:#7a6e5f">nextcrush.app</a></p>
      </div>
    </div>
    `
  };
}

function windowReminderEmail({ email, window, daysUntil }){
  const windowDate = window?.date ? new Date(window.date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : '';

  return {
    subject: `✦ Your love window opens in ${daysUntil} days`,
    html: `
    <div style="background:#03020a;color:#d4c5a9;font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 32px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:28px;color:#c9a84c;font-family:Georgia,serif;letter-spacing:0.2em">NEXT CRUSH</div>
        <div style="font-size:11px;letter-spacing:0.4em;color:#7a6e5f;text-transform:uppercase;margin-top:4px">Cosmic Love Timing Engine</div>
      </div>

      <div style="background:#1a0f2e;border:1px solid rgba(196,96,127,0.3);padding:24px;margin:24px 0;text-align:center">
        <div style="font-size:11px;letter-spacing:0.4em;color:#c4607f;text-transform:uppercase;margin-bottom:12px">✦ Your Window Opens Soon ✦</div>
        <div style="font-size:48px;color:#e8c97a;margin-bottom:8px">${daysUntil}</div>
        <div style="font-size:13px;letter-spacing:0.2em;color:#7a6e5f;text-transform:uppercase">days remaining</div>
        <div style="font-size:15px;color:#d4c5a9;margin-top:12px">${windowDate}</div>
        <div style="font-size:13px;color:#7a6e5f;margin-top:6px">${window?.label || ''}</div>
      </div>

      <p style="font-size:15px;line-height:1.8;font-style:italic;color:#d4c5a9">${window?.reason || ''}</p>

      <div style="text-align:center;margin-top:32px">
        <a href="https://nextcrush.app" style="background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);color:#e8c97a;padding:14px 28px;text-decoration:none;font-family:Georgia,serif;font-size:11px;letter-spacing:0.3em;text-transform:uppercase">View My Full Reading →</a>
      </div>

      <div style="border-top:1px solid rgba(201,168,76,0.15);margin-top:40px;padding-top:20px;text-align:center;font-size:11px;color:#7a6e5f">
        <p>The stars do not dictate — they illuminate.</p>
        <p style="margin-top:8px"><a href="https://nextcrush.app" style="color:#7a6e5f">nextcrush.app</a></p>
      </div>
    </div>
    `
  };
}

async function sendGiftCodes({ email, giftCodes, windows }){
  const template = giftCodesEmail({ email, giftCodes, windows });
  return sendEmail({ to: email, ...template });
}

async function sendReadingSummary({ email, windows, oracle, planets }){
  const template = readingSummaryEmail({ email, windows, oracle, planets });
  return sendEmail({ to: email, ...template });
}

async function sendWindowReminder({ email, window, daysUntil }){
  const template = windowReminderEmail({ email, window, daysUntil });
  return sendEmail({ to: email, ...template });
}

module.exports = { sendGiftCodes, sendReadingSummary, sendWindowReminder };
