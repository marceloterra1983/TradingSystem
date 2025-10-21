const DEFAULT_TIME_ZONE = process.env.TZ || 'America/Sao_Paulo';

const padTwo = (value) => String(value).padStart(2, '0');

function getOffsetMinutes(date, timeZone) {
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const diff = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  return diff;
}

export function formatTimestamp(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const base = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;

  const offsetMinutes = getOffsetMinutes(date, timeZone);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absolute / 60);
  const offsetRemainingMinutes = absolute - offsetHours * 60;
  const offset = `${sign}${padTwo(offsetHours)}:${padTwo(offsetRemainingMinutes)}`;

  return `${base}${offset}`;
}
