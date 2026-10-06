/**
 * Utility functions for 12-hour AM/PM time formatting and validation
 */

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  let hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return timeStr;
  const min = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
}

export function formatTimeRange12h(startTimeStr, endTimeStr) {
  if (!startTimeStr) return '';
  const start = formatTime12h(startTimeStr);
  if (!endTimeStr) return start;
  const end = formatTime12h(endTimeStr);
  return `${start} – ${end}`;
}

/**
 * Checks if a given time slot has already passed for the selected date.
 * Compares against local browser time.
 */
export function isSlotInPast(selectedDateStr, startTimeStr, endTimeStr) {
  if (!selectedDateStr || !startTimeStr) return false;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;

  // Only validate time if booking date is TODAY
  if (selectedDateStr === todayDateStr) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTimeStr.split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);

    // If start time is before or equal to current time, it has already passed/started
    if (startMinutes <= nowMinutes) {
      return true;
    }

    if (endTimeStr) {
      const [endH, endM] = endTimeStr.split(':').map(Number);
      const endMinutes = (endH || 0) * 60 + (endM || 0);
      if (endMinutes <= nowMinutes) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Generates smart default start and end times for today (next upcoming hour)
 */
export function getSmartDefaultTimes() {
  const now = new Date();
  let startHour = now.getHours() + 1;
  if (startHour < 9) startHour = 9;
  if (startHour >= 19) startHour = 9;
  let endHour = startHour + 2;
  if (endHour > 21) endHour = 21;
  return {
    start: `${String(startHour).padStart(2, '0')}:00`,
    end: `${String(endHour).padStart(2, '0')}:00`,
  };
}
