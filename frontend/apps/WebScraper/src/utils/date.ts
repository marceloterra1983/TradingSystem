const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short'
};

export function formatDate(
  value: string | number | Date,
  locale: string | string[] = 'en-US',
  options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toISOString();
  }
}
