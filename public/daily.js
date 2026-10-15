// Daily login reward screen: the 7-day streak, today's prize, and the chest on day 7.
import { ITEMS } from './items.js';
import { text, chipSprite } from './sprites.js';
import { sfx } from './sfx.js';

const DAYS = [100, 200, 300, 500, 750, 1000];
export const daily = { show: null }; // { r: reward from the server, at }

export function showDaily(r, now) { daily.show = { r, at: now, opened: false }; sfx.win(r.chips || 1000); }
export const dismissDaily = () => { daily.show = null; };

function chest(x, cx, cy, open, now, shake) {
  const s = shake ? Math.round(Math.sin(now / 30) * 2) : 0;
  x.fillStyle = '#5a3018'; x.fillRect(cx - 14 + s, cy - 8, 28, 16);
  x.fillStyle = '#c8a040'; x.fillRect(cx - 14 + s, cy - 1, 28, 2); x.fillRect(cx - 2 + s, cy - 4, 4, 6);
  if (open) { x.fillStyle = '#7a4424'; x.fillRect(cx - 14, cy - 20, 28, 6); x.fillStyle = '#fff6a0'; x.fillRect(cx - 12, cy - 10, 24, 3); }
  else { x.fillStyle = '#7a4424'; x.fillRect(cx - 15 + s, cy - 14, 30, 7); x.fillStyle = '#c8a040'; x.fillRect(cx - 15 + s, cy - 8, 30, 1); }
}

export function drawDaily(x, w, h, now) {
  const s = daily.show;
  if (!s) return;
  const el = now - s.at, r = s.r, cx = Math.round(w / 2), cy = Math.round(h / 2);
  x.fillStyle = `rgba(0,0,0,${Math.min(0.75, el / 300)})`; x.fillRect(0, 0, w, h);
  const pw = 270, ph = 160, X = cx - pw / 2, Y = cy - ph / 2;
  x.fillStyle = '#c8a040'; x.fillRect(X - 2, Y - 2, pw + 4, ph + 4);
  x.fillStyle = '#150a1e'; x.fillRect(X, Y, pw, ph);
  text(x, 'BONUS DU JOUR', cx + 1, Y + 9, '#3a2408', 2, 'center');
  text(x, 'BONUS DU JOUR', cx, Y + 8, '#ffe060', 2, 'center');
  text(x, `JOUR ${r.day}/7 - REVIENS CHAQUE JOUR !`, cx, Y + 24, '#c8b8d8', 1, 'center');
  // the week
  for (let d = 1; d <= 7; d++) {
    const bx = X + 12 + (d - 1) * 36, by = Y + 36, past = d < r.day, today = d === r.day;
    const pulse = today ? Math.round(Math.sin(now / 150) * 1.5) : 0;
    x.fillStyle = today ? '#ffe060' : past ? '#2fb36b' : '#3a2a48'; x.fillRect(bx - 1, by - 1 - pulse, 32, 36);
    x.fillStyle = today ? '#3a2408' : '#1e1028'; x.fillRect(bx, by - pulse, 30, 34);
    text(x, 'J' + d, bx + 15, by + 3 - pulse, past ? '#60ff80' : '#fff', 1, 'center');
    if (d < 7) { x.drawImage(chipSprite('#e2b02c', '#fff6c8'), bx + 11, by + 12 - pulse); text(x, DAYS[d - 1], bx + 15, by + 24 - pulse, '#ffe680', 1, 'center'); }
    else chest(x, bx + 15, by + 22 - pulse, false, now, false);
    if (past) text(x, 'OK', bx + 24, by + 3, '#60ff80', 1, 'center');
  }
  // today's prize
  const py = Y + 104;
  if (r.chest) {
    const open = el > 1200;
    if (open && !s.opened) { s.opened = true; sfx.win(1e6); }
    if (open) { // light rays
      x.fillStyle = `rgba(255,240,150,${0.25 + 0.1 * Math.sin(now / 120)})`;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + now / 900; x.fillRect(Math.round(cx + Math.cos(a) * 18) - 2, Math.round(py + Math.sin(a) * 12) - 2, 4, 4); }
    }
    chest(x, cx - 60, py + 10, open, now, !open);
    if (open) {
      const it = ITEMS[r.item];
      text(x, it ? 'TROUVAILLE : ' + it.name : '+' + r.chips.toLocaleString('fr-FR') + ' JETONS', cx + 20, py + 2, '#ffe060', 1, 'center', '#000');
      text(x, it ? 'DANS TON VESTIAIRE' : 'LE COFFRE DE LA SEMAINE !', cx + 20, py + 12, '#c8b8d8', 1, 'center');
    } else text(x, 'LE COFFRE S\'OUVRE...', cx + 20, py + 6, '#c8b8d8', 1, 'center');
  } else {
    const k = Math.min(1, el / 400), sc = 2 + Math.round(k);
    x.drawImage(chipSprite('#e2b02c', '#fff6c8'), cx - 40, py);
    text(x, '+' + r.chips.toLocaleString('fr-FR'), cx + 6, py - 2, '#ffe060', sc, 'center', '#3a2408');
  }
  if (Math.floor(now / 500) % 2) text(x, 'CLIQUE POUR CONTINUER', cx, Y + ph - 12, '#8a7a9a', 1, 'center');
}
