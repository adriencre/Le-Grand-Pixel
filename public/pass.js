// Level pass (N key or click on the level in the HUD): rank, XP, how to earn it, and every milestone up to level 1000
// with a preview of yourself wearing its cosmetic. Rewards come from levels.js, the same table as the server.
import { MAX, TRACK, JACKPOTS, RANKS, XP, XP_CAP, DAY_BONUS, rankOf, rankColor, rewardsOf } from './levels.js';
import { ITEMS, RARITY } from './items.js';
import { text } from './sprites.js';
import { avatarAt } from './shop.js';
import { sfx } from './sfx.js';

// Every level worth a line: a cosmetic, a jackpot or a new rank.
const MILESTONES = [...new Set([...Object.keys(TRACK), ...Object.keys(JACKPOTS), ...RANKS.slice(1).map(r => r[0])].map(Number))].sort((a, b) => a - b);
const ROWS = 9;
export const pass = { open: false, sel: 0 };

export function togglePass(level) {
  pass.open = !pass.open;
  if (pass.open) pass.sel = Math.max(0, MILESTONES.findIndex(l => l > level)); // start on the next one to get
  sfx.click();
}
export function passKey(code) {
  if (code === 'ArrowDown' || code === 'KeyS') pass.sel = Math.min(MILESTONES.length - 1, pass.sel + 1);
  else if (code === 'ArrowUp' || code === 'KeyW' || code === 'KeyZ') pass.sel = Math.max(0, pass.sel - 1);
  else if (code === 'Escape' || code === 'KeyN') pass.open = false;
  else return;
  sfx.click();
}

const HOW = [
  ['MISER A UNE TABLE', `6 A ${XP_CAP} / MANCHE`],
  ['POKER, DUELS', `6 A ${XP_CAP} / MAIN`],
  ['BOULOTS, MANCHE', `${XP.job} / JETON`],
  ['LA NUIT', `${XP.night} / JETON`],
  ['POUBELLE', `${XP.bin}`],
  ['SUCCES', `${XP.achievement}`],
  ['BONUS DU JOUR', `${XP.daily} X SERIE`],
];

export function drawPass(x, w, h, now, me, xp) {
  if (!pass.open || !xp) return;
  const pw = Math.min(w - 12, 400), ph = Math.min(h - 12, 214), X = Math.round((w - pw) / 2), Y = Math.round((h - ph) / 2);
  const lv = xp.level, [, rank] = rankOf(lv), col = rankColor(lv, now);
  x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(0, 0, w, h);
  x.fillStyle = col; x.fillRect(X - 2, Y - 2, pw + 4, ph + 4);
  x.fillStyle = '#150a1e'; x.fillRect(X, Y, pw, ph);

  // header: rank, level, XP bar, daily bonus
  text(x, 'PASSE DES NIVEAUX', X + 10, Y + 8, '#8a7a9a');
  text(x, `NIVEAU ${lv}`, X + 10, Y + 19, col, 2, 'left', '#000');
  text(x, `RANG ${rank}`, X + pw - 10, Y + 8, col, 1, 'right');
  text(x, xp.max ? 'NIVEAU MAXIMUM !' : `${xp.into.toLocaleString('fr-FR')} / ${xp.next.toLocaleString('fr-FR')} XP`, X + pw - 10, Y + 22, '#c8c0d8', 1, 'right');
  x.fillStyle = '#2a2040'; x.fillRect(X + 10, Y + 36, pw - 20, 5);
  x.fillStyle = '#60ff80'; x.fillRect(X + 10, Y + 36, Math.round((pw - 20) * (xp.max ? 1 : xp.into / xp.next)), 5);
  if (xp.bonus > 0) text(x, `XP X2 AUJOURD'HUI : ENCORE ${xp.bonus.toLocaleString('fr-FR')} XP`, X + 10, Y + 45, Math.floor(now / 400) % 2 ? '#ffe060' : '#ffb030');
  else text(x, `XP X2 : REVIENS DEMAIN (${DAY_BONUS} PREMIERS XP DU JOUR)`, X + 10, Y + 45, '#6a6080');

  // left: next rewards and how to earn XP
  const L = X + 10;
  let y = Y + 58;
  if (!xp.max) {
    const nx = rewardsOf(lv + 1), chestAt = Math.ceil((lv + 1) / 10) * 10;
    text(x, `NIVEAU ${lv + 1} : +${nx.chips.toLocaleString('fr-FR')} JETONS`, L, y, '#60ff80'); y += 9;
    if (chestAt <= MAX) text(x, `COFFRE AU NIVEAU ${chestAt} : +${rewardsOf(chestAt).chips.toLocaleString('fr-FR')}`, L, y, '#ffe060');
    y += 13;
  }
  text(x, 'GAGNER DE L\'XP :', L, y, '#8a7a9a'); y += 10;
  for (const [what, much] of HOW) { text(x, what, L, y, '#e8dcf0'); text(x, much, L + 150, y, '#80f0ff', 1, 'right'); y += 9; }
  text(x, 'GAGNE OU PERDU, CA COMPTE !', L, y + 3, '#ff80d0');

  // middle: milestones, the selected one previewed on the right
  const MX = X + 172, MW = pw - 172 - 88, top = Math.max(0, Math.min(MILESTONES.length - ROWS, pass.sel - 4));
  for (let i = 0; i < ROWS && top + i < MILESTONES.length; i++) {
    const k = top + i, l = MILESTONES[k], r = rewardsOf(l), got = lv >= l, ry = Y + 56 + i * 16, it = r.item && ITEMS[r.item];
    x.fillStyle = k === pass.sel ? 'rgba(255,224,96,.18)' : got ? 'rgba(96,255,128,.07)' : 'rgba(255,255,255,.04)';
    x.fillRect(MX, ry, MW, 15);
    text(x, got ? 'OK' : String(l), MX + 3, ry + 4, got ? '#60ff80' : rankColor(l, now));
    text(x, it ? it.name.toUpperCase().slice(0, 20) : r.rank ? 'RANG ' + r.rank : 'JACKPOT', MX + 26, ry + 1, it ? RARITY[it.rarity].color : '#ffe060');
    text(x, `+${r.chips.toLocaleString('fr-FR')}`, MX + 26, ry + 8, '#8a8098');
  }
  text(x, `${MILESTONES.length} PALIERS - FLECHES`, MX + MW / 2, Y + ph - 11, '#6a6080', 1, 'center');

  const sl = MILESTONES[pass.sel], sit = TRACK[sl] && ITEMS[TRACK[sl]], PX = X + pw - 44;
  x.fillStyle = '#24142e'; x.fillRect(PX - 38, Y + 56, 76, 120);
  if (sit) {
    avatarAt(x, { ...me.outfit, [sit.slot]: sit.id }, me.color, sit.style === 'wings' ? 3 : Math.floor(now / 900) % 4 === 1 ? 1 : 0, now, PX, Y + 158, 2);
    text(x, RARITY[sit.rarity].name, PX, Y + 180, RARITY[sit.rarity].color, 1, 'center');
    text(x, lv >= sl ? 'DEBLOQUE' : 'NIVEAU ' + sl, PX, Y + 189, lv >= sl ? '#60ff80' : '#c8c0d8', 1, 'center');
  } else text(x, `NIVEAU ${sl}`, PX, Y + 110, rankColor(sl, now), 1, 'center');
  text(x, 'N / ECHAP : FERMER', X + pw - 10, Y + ph - 11, '#8a7a9a', 1, 'right');
}
