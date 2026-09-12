/**
 * Utility to format a time string (e.g. "09:00", "14:30") according to user preference ('12h' | '24h')
 */
export function formatTime(timeStr?: string | null, format: '12h' | '24h' = '12h'): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // If already formatted with AM/PM
  if (trimmed.toUpperCase().includes('AM') || trimmed.toUpperCase().includes('PM')) {
    if (format === '12h') return trimmed;
    // convert from 12h to 24h
    const isPM = trimmed.toUpperCase().includes('PM');
    const clean = trimmed.replace(/(AM|PM)/gi, '').trim();
    const parts = clean.split(':').map(Number);
    let h = isNaN(parts[0]) ? 0 : parts[0];
    const m = isNaN(parts[1]) ? '00' : parts[1].toString().padStart(2, '0');
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
  }

  // Expecting "HH:MM"
  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;

  const rawH = parseInt(parts[0], 10);
  const minStr = parts[1].slice(0, 2).padStart(2, '0');

  if (isNaN(rawH)) return trimmed;

  if (format === '24h') {
    return `${rawH.toString().padStart(2, '0')}:${minStr}`;
  }

  // 12-hour format
  const isPM = rawH >= 12;
  let h12 = rawH % 12;
  if (h12 === 0) h12 = 12;

  const hStr = h12.toString().padStart(2, '0');
  const meridiem = isPM ? 'PM' : 'AM';
  return `${hStr}:${minStr} ${meridiem}`;
}

/**
 * Format a time range (e.g. "09:00", "09:50") -> "09:00 AM - 09:50 AM" or "09:00 - 09:50"
 */
export function formatTimeRange(
  startTime?: string | null,
  endTime?: string | null,
  format: '12h' | '24h' = '12h'
): string {
  if (!startTime && !endTime) return '';
  if (startTime && !endTime) return formatTime(startTime, format);
  if (!startTime && endTime) return formatTime(endTime, format);
  return `${formatTime(startTime, format)} - ${formatTime(endTime, format)}`;
}
