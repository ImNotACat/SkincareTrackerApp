// ─── Date Utilities ──────────────────────────────────────────────────────────
// Centralized date formatting and parsing utilities

/**
 * Formats a date string (YYYY-MM-DD) to dd-mm-yyyy format
 */
export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr; // Return original if invalid
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Parses a date string in dd-mm-yyyy format to YYYY-MM-DD
 */
export function parseDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  
  // Try dd-mm-yyyy format first
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Fallback: try YYYY-MM-DD format (backward compatibility)
  const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmddMatch) {
    return dateStr; // Already in correct format
  }
  
  // If neither format matches, try to parse as-is
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return dateStr; // Return original if can't parse
}

/**
 * Formats a date for display (dd-mm-yyyy)
 */
export function formatDateForDisplay(dateStr: string): string {
  return formatDateDDMMYYYY(dateStr);
}

/**
 * Gets today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formats a date with weekday and full date (e.g., "Monday, 08-02-2026")
 */
export function formatDateWithWeekday(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = weekdays[date.getDay()];
  const formatted = formatDateDDMMYYYY(dateStr);
  return `${weekday}, ${formatted}`;
}

/**
 * Formats a date for display with short weekday (e.g., "Mon, 08-02-2026")
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekday = weekdays[date.getDay()];
  const formatted = formatDateDDMMYYYY(dateStr);
  return `${weekday}, ${formatted}`;
}
