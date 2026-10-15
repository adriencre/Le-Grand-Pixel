// Daily login reward: a 7-day streak, day 7 opens a chest. Missing a day restarts at day 1.
export const DAILY = [100, 200, 300, 500, 750, 1000]; // days 1-6; day 7 is the chest

export const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString('sv'); // YYYY-MM-DD, server time

// daily: { last, streak } or undefined. chestItems: ids the player could win. Returns null if already claimed today.
export function claimDaily(daily, now, chestItems, rnd = Math.random) {
  const today = dayKey(now), yesterday = dayKey(now - 86400000);
  if (daily?.last === today) return null;
  const streak = daily?.last === yesterday && daily.streak < 7 ? daily.streak + 1 : 1;
  const reward = { day: streak, chips: 0, item: null, chest: streak === 7 };
  if (streak < 7) reward.chips = DAILY[streak - 1];
  else {
    const r = rnd();
    if (r < 0.15 && chestItems.length) reward.item = chestItems[Math.floor(rnd() * chestItems.length)];
    else reward.chips = r < 0.4 ? 15000 : 5000;
  }
  return { daily: { last: today, streak }, reward };
}
