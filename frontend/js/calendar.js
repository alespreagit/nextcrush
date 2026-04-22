// ═══════════════════════════════════════════
// CALENDAR.JS — Google Calendar + .ics export
// ═══════════════════════════════════════════

function formatDateForCal(date){
  return date.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
}

function formatDateReadable(date){
  return date.toLocaleString('en-US',{
    weekday:'long',year:'numeric',month:'long',
    day:'numeric',hour:'2-digit',minute:'2-digit'
  });
}

function buildEventDescription(window, oracleText){
  return [
    `Your ${window.label} love window — calculated by Next Crush`,
    ``,
    `Transit: ${window.reason||window.label}`,
    ``,
    oracleText ? `Oracle reading: ${oracleText.substring(0,200)}...` : '',
    ``,
    `View your full reading at nextcrush.app`,
    ``,
    `— Next Crush | Cosmic Love Timing`
  ].join('\\n');
}

// ── GOOGLE CALENDAR ──
function buildGoogleCalendarURL(window, oracleText){
  const start = new Date(window.date);
  const end = new Date(window.date);
  end.setHours(end.getHours()+2);

  const title = encodeURIComponent(`💫 ${window.label} — Next Crush`);
  const dates = `${formatDateForCal(start)}/${formatDateForCal(end)}`;
  const details = encodeURIComponent(buildEventDescription(window, oracleText));
  const text = encodeURIComponent('Your cosmic love window is here. Go live your life. ✨');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
}

// ── APPLE / iCAL .ICS FILE ──
function buildICSContent(windows, oracleText){
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Next Crush//Cosmic Love Timing//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  windows.forEach((w,i) => {
    const start = new Date(w.date);
    const end = new Date(w.date);
    end.setHours(end.getHours()+2);
    const uid = `nextcrush-${Date.now()}-${i}@nextcrush.app`;
    const desc = buildEventDescription(w, i===0 ? oracleText : null).replace(/\n/g,'\\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatDateForCal(new Date())}`,
      `DTSTART:${formatDateForCal(start)}`,
      `DTEND:${formatDateForCal(end)}`,
      `SUMMARY:💫 ${w.label} — Next Crush`,
      `DESCRIPTION:${desc}`,
      // 7 day reminder
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Your ${w.label} window opens in 7 days ✨`,
      'END:VALARM',
      // 1 day reminder
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Tomorrow is your ${w.label} window. Go live your life 💫`,
      'END:VALARM',
      // 1 hour reminder
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      `DESCRIPTION:Your cosmic love window opens in 1 hour ✨`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(){
  const windows = window.AppState?.paidResult?.windows;
  const oracle = window.AppState?.paidResult?.oracle;
  if(!windows||!windows.length){
    showToast('No windows to export');
    return;
  }
  const ics = buildICSContent(windows, oracle);
  const blob = new Blob([ics],{type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nextcrush-love-windows.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Calendar file downloaded ✨');
}

function addToGoogleCalendar(){
  const windows = window.AppState?.paidResult?.windows;
  const oracle = window.AppState?.paidResult?.oracle;
  if(!windows||!windows.length){
    showToast('No windows to export');
    return;
  }
  // Open top window in Google Calendar
  const url = buildGoogleCalendarURL(windows[0], oracle);
  window.open(url,'_blank');
  showToast('Opening Google Calendar ✨');
}

window.Calendar={downloadICS,addToGoogleCalendar,buildICSContent,buildGoogleCalendarURL};
