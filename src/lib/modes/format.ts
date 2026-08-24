import type { ModeReleaseMetadata } from './catalog';

export function formatModeDate(
  isoDate: ModeReleaseMetadata['lastUpdated'],
  locale?: string
): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
