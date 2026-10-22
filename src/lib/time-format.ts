/** "14:30" → "2:30 PM" (and "00:00" → "12:00 AM", "12:00" → "12:00 PM") — the stored value stays a 24-hour "HH:mm" string everywhere (DB, scheduling, form submission); this is only for showing it to a person. */
export function formatTime12h(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}
