// Companies and cryptos of the pixel stock exchange (shared by the server and the phone).
// every: number of 5 s ticks between two moves; jump: chance of a crash or boom on a move.
export const SECTORS = ['TOUT', 'FOOD', 'TECH', 'LUXE', 'IMMO', 'ENERGIE', 'CRYPTO'];
export const STOCKS = [
  { id: 'pizza', name: 'PIZZA CORP', sector: 'FOOD', base: 120, vol: 0.04, color: '#e04050', desc: 'Leader de la pizza surgelee.' },
  { id: 'burger', name: 'BURGERZ', sector: 'FOOD', base: 80, vol: 0.05, color: '#f2b233', desc: 'Le burger le plus gras du coin.' },
  { id: 'cafe', name: 'CAFE NOIR', sector: 'FOOD', base: 45, vol: 0.03, color: '#8a5030', desc: 'Il reveille les joueurs.' },
  { id: 'banana', name: 'BANANA TECH', sector: 'TECH', base: 25, vol: 0.12, color: '#f8e040', desc: 'Start-up imprevisible.' },
  { id: 'pixsoft', name: 'PIXSOFT', sector: 'TECH', base: 300, vol: 0.06, color: '#3a7bd5', desc: 'Logiciels en 8 bits.' },
  { id: 'robo', name: 'ROBOTIX', sector: 'TECH', base: 150, vol: 0.09, color: '#9aa0ac', desc: 'Bientot des robots croupiers ?' },
  { id: 'casino', name: 'CASINO GROUP', sector: 'LUXE', base: 1000, vol: 0.05, color: '#9b51e0', desc: 'Proprietaire du Grand Pixel.' },
  { id: 'diams', name: 'DIAMS & CO', sector: 'LUXE', base: 2500, vol: 0.04, color: '#60e8ff', desc: 'Diamants et bijoux de luxe.' },
  { id: 'yacht', name: 'YACHTS ROYAL', sector: 'LUXE', base: 800, vol: 0.06, color: '#e8e8f0', desc: 'Les bateaux des millionnaires.' },
  { id: 'laverie', name: 'LAVERIE SA', sector: 'IMMO', base: 60, vol: 0.03, color: '#22c4c4', desc: 'Laveries de quartier. Stable.' },
  { id: 'immo', name: 'PIXEL IMMO', sector: 'IMMO', base: 500, vol: 0.03, color: '#b07840', desc: 'Les immeubles du centre-ville.' },
  { id: 'motors', name: 'PIXEL MOTORS', sector: 'ENERGIE', base: 400, vol: 0.06, color: '#d02030', desc: 'Voitures de sport pixel.' },
  { id: 'petro', name: 'PETROPIX', sector: 'ENERGIE', base: 220, vol: 0.05, color: '#5a5a68', desc: 'Petrole et carburant.' },
  { id: 'fusee', name: 'FUSEE SPATIALE', sector: 'ENERGIE', base: 90, vol: 0.14, color: '#ff7a2f', desc: 'Direction la lune... ou pas.', jump: 0.02 },
  { id: 'pixelcoin', name: 'PIXELCOIN', sector: 'CRYPTO', base: 5000, vol: 0.06, color: '#f0c040', desc: 'La crypto officielle du casino.', crypto: true, every: 1, jump: 0.012 },
  { id: 'dogepix', name: 'DOGEPIX', sector: 'CRYPTO', base: 2, vol: 0.1, color: '#c89040', desc: 'Un meme. Vraiment. Wouf.', crypto: true, every: 1, jump: 0.02 },
].map(s => ({ every: 4, jump: 0.008, crypto: false, ...s }));

// Cheap prices keep cents so they can move in small steps.
export const roundPrice = x => (x >= 100 ? Math.round(x) : Math.max(0.01, Math.round(x * 100) / 100));
export const fmtPrice = x => (x >= 100 ? Math.round(x).toLocaleString('fr-FR') : x.toFixed(2));

// "PIXEL 40" index: average of stock prices relative to their base, x1000 (cryptos excluded).
export function indexValue(prices) {
  const st = STOCKS.filter(s => !s.crypto);
  return Math.round(st.reduce((a, s) => a + (prices[s.id] ?? s.base) / s.base, 0) / st.length * 1000);
}
