// Companies of the pixel stock exchange (shared by the server and the phone).
export const STOCKS = [
  { id: 'pizza', name: 'PIZZA CORP', base: 120, vol: 0.04 },
  { id: 'laverie', name: 'LAVERIE SA', base: 60, vol: 0.03 },
  { id: 'motors', name: 'PIXEL MOTORS', base: 400, vol: 0.06 },
  { id: 'casino', name: 'CASINO GROUP', base: 1000, vol: 0.05 },
  { id: 'banana', name: 'BANANA TECH', base: 25, vol: 0.12 },
];
export const STOCK_NAMES = Object.fromEntries(STOCKS.map(s => [s.id, s.name]));
