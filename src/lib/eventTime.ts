export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function localInputFromInstant(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

export function instantFromLocalInput(local: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error('Enter a complete date and time.');
  const [, year, month, day, hour, minute] = match;
  const desiredUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  let candidate = desiredUtc;
  for (let index = 0; index < 4; index += 1) {
    const represented = localInputFromInstant(new Date(candidate).toISOString(), timeZone);
    const representedMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(represented);
    if (!representedMatch) break;
    const representedUtc = Date.UTC(+representedMatch[1], +representedMatch[2] - 1, +representedMatch[3], +representedMatch[4], +representedMatch[5]);
    const difference = desiredUtc - representedUtc;
    candidate += difference;
    if (difference === 0) break;
  }
  const result = new Date(candidate).toISOString();
  if (localInputFromInstant(result, timeZone) !== local) {
    throw new Error('That local time does not exist in this timezone because of daylight saving time.');
  }
  return result;
}

export function formatEventDate(instant: string, timeZone: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options ?? {
    timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(instant));
}

export const COMMON_TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Lagos', 'Africa/Johannesburg',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];
