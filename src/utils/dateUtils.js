/**
 * Utility functions for safe date conversion and formatting.
 * Handles Firestore Timestamps, JS Date objects, ISO strings, and epoch numbers.
 */

/**
 * Converts a variety of date types safely into a JavaScript Date object.
 * Supports: Firestore Timestamp objects, Date instances, ISO strings, seconds/ms epochs.
 * 
 * @param {any} value - The input date representation
 * @returns {Date|null} A valid JavaScript Date or null
 */
export function toSafeDate(value) {
  if (value === null || value === undefined) return null;

  // If it's already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Firestore Timestamp duck-typing
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      // Fallback
    }
  }

  // Firestore Timestamp raw fields
  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000));
  }

  // Epoch or string representation
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a date value safely using local options.
 * 
 * @param {any} value - The date value to format
 * @param {Intl.DateTimeFormatOptions} options - Formatting options
 * @param {string} [locale] - Optional locale override
 * @returns {string} Formatted date string or 'N/A'
 */
export function formatSafeDate(value, options = {}, locale = undefined) {
  const date = toSafeDate(value);
  if (!date) return 'N/A';
  return date.toLocaleDateString(locale, options);
}

/**
 * Formats a date value with time safely.
 * 
 * @param {any} value - The date value to format
 * @param {string} [locale] - Optional locale override
 * @returns {string} Formatted date and time string or 'N/A'
 */
export function formatSafeDateTime(value, locale = undefined) {
  const date = toSafeDate(value);
  if (!date) return 'N/A';
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Generates an elegant relative time string (e.g., "3 hours ago", "Yesterday").
 * 
 * @param {any} value - The date value
 * @returns {string} Relative time representation or 'N/A'
 */
export function formatRelativeTime(value) {
  const date = toSafeDate(value);
  if (!date) return 'N/A';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
