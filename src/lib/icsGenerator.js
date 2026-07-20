/**
 * Generates and downloads an .ics file from a Calendar entity's activities.
 * Works with Apple Calendar, Google Calendar, Outlook, and any ICS-compatible app.
 */

function escapeICS(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatDateICS(dateStr) {
  // Expects "YYYY-MM-DD" — outputs "YYYYMMDD"
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  return `${y}${m}${d}`;
}

function nextDay(dateStr) {
  const dt = new Date(dateStr + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + 1);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function timestampNow() {
  const dt = new Date();
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  const h = String(dt.getUTCHours()).padStart(2, '0');
  const min = String(dt.getUTCMinutes()).padStart(2, '0');
  const s = String(dt.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

export function generateICS(calendar) {
  const activities = calendar.activities || [];
  const now = timestampNow();
  const schoolName = 'Milton College of Arts and Science';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeICS(schoolName)}//School Calendar//EN`,
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeICS(calendar.title || schoolName + ' Calendar')}`,
  ];

  activities.forEach((act, idx) => {
    if (!act.date) return;
    const start = formatDateICS(act.date);
    if (!start) return;
    const end = nextDay(act.date);
    const uid = `${calendar.id || 'cal'}-${idx}@micas.edu.ng`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeICS(act.activity || 'School Event')}`,
      `DESCRIPTION:${escapeICS(
        `${act.activity || 'School Event'}\n${calendar.title || ''}\n${calendar.term || ''} - ${calendar.session || ''}`
      )}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadCalendarICS(calendar) {
  const icsContent = generateICS(calendar);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (calendar.title || 'school-calendar').replace(/[^a-zA-Z0-9]/g, '_');
  link.href = url;
  link.download = `${safeName}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}