/**
 * Real-time date provider for AI context
 * Updates automatically without requiring page reload
 */

export interface DateContext {
  iso: string; // ISO 8601 format: "2026-05-06"
  formatted: string; // Human readable: "Tuesday, May 6, 2026"
  dayOfWeek: string; // "Tuesday"
  unixMs: number; // Milliseconds since epoch
}

/**
 * Get current date in multiple formats
 * Always returns fresh date on each call (no caching)
 */
export function getCurrentDate(): DateContext {
  const now = new Date();

  const dayOfWeek = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(now);

  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  const iso = now.toISOString().split("T")[0]; // YYYY-MM-DD

  return {
    iso,
    formatted,
    dayOfWeek,
    unixMs: now.getTime(),
  };
}

/**
 * Get a date context string ready for injection into prompts
 * Example: "Today is Tuesday, May 6, 2026 (2026-05-06)"
 */
export function getDateContextString(): string {
  const date = getCurrentDate();
  return `Today is ${date.formatted} (${date.iso})`;
}

/**
 * Format date for API context
 * Returns a structured string for inclusion in system prompts
 */
export function formatDateForContext(): string {
  const date = getCurrentDate();
  return `Current date: ${date.iso}
Day: ${date.dayOfWeek}
Full date: ${date.formatted}`;
}

/**
 * Check if two dates are the same day
 * Useful for cache invalidation
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Setup auto-update listener for daily changes
 * Returns cleanup function
 */
export function setupDailyUpdate(callback: (date: DateContext) => void): () => void {
  let lastDate = getCurrentDate();
  
  // Check every minute if date changed
  const intervalId = setInterval(() => {
    const newDate = getCurrentDate();
    if (newDate.iso !== lastDate.iso) {
      lastDate = newDate;
      callback(newDate);
    }
  }, 60000); // Check every minute

  return () => clearInterval(intervalId);
}
