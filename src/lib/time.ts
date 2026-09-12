export function isPastDate(date: Date): boolean {
  return date.getTime() < Date.now();
}
