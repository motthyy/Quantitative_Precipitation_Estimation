const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function jstParts(timestamp: string) {
  const parts = Object.fromEntries(
    jstFormatter
      .formatToParts(new Date(timestamp))
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function formatDateTime(timestamp: string): string {
  const { year, month, day, hour, minute } = jstParts(timestamp);
  return `${year}/${month}/${day} ${hour}:${minute}`;
}

export function formatDate(timestamp: string): string {
  const { year, month, day } = jstParts(timestamp);
  return `${year}/${month}/${day}`;
}

export function formatTime(timestamp: string): string {
  const { hour, minute } = jstParts(timestamp);
  return `${hour}:${minute}`;
}

export function toDateTimeLocal(timestamp: string): string {
  const { year, month, day, hour, minute } = jstParts(timestamp);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
