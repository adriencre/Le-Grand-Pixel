import { randomInt } from 'node:crypto';

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Cards are 2-char strings: rank (23456789TJQKA) + suit (s h d c).
export function deck(n = 1) {
  const d = [];
  for (let k = 0; k < n; k++) for (const s of 'shdc') for (const r of '23456789TJQKA') d.push(r + s);
  return shuffle(d);
}

// Validates a bet coming from a client: positive integer the player can afford.
export function validBet(p, a) {
  return Number.isInteger(a) && a > 0 && a <= p.chips;
}
