// Real local time drives day and night outside (street, VIP windows). Add ?heure=14 to the URL to force an hour.
const forced = parseFloat(new URLSearchParams(globalThis.location?.search || '').get('heure'));
export const hour = (d = new Date()) => (Number.isFinite(forced) ? forced : d.getHours() + d.getMinutes() / 60);

// 0 = broad daylight, 1 = deep night. Dawn 5:30 -> 8:00, dusk 18:30 -> 21:00.
export function darkness(h = hour()) {
  if (h >= 8 && h < 18.5) return 0;
  if (h >= 21 || h < 5.5) return 1;
  return h < 12 ? (8 - h) / 2.5 : (h - 18.5) / 2.5;
}
export const twilight = d => 1 - Math.abs(2 * d - 1); // peaks at mid-dusk / mid-dawn
