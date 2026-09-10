/** Lowercases and strips everything but letters/digits, so "Ten - Day - A", "ten-day-a" and "tenday" all normalize the same way for matching. */
export const normalizeForSearch = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
