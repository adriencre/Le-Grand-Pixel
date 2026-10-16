import { T, MW, MH, ST, VW, VH, TIERS, VIP_BOUNCER, ENTRY_MIN, COLORS, SPAWN, TABLES } from './map.js';
import { drawVip } from './viproom.js';
import { daily, showDaily, dismissDaily, drawDaily } from './daily.js';
import { rules, showRules, firstTime, rulesKey, rulesClick, drawRules } from './rules.js';
import { tour, startTour, endTour, updateTour, advanceTour, tourFocus, tourGuide, drawTourScene, drawTourUi } from './tour.js';
import { phone, openPhone, notify, drawPhone, phoneClick, insidePhone, phoneScroll, phoneBar, phoneBarClick } from './phone.js';
import { rec, drawReception, recHover, recClick, recBar } from './reception.js';
import { drawStreet, nearbyStreet, streetState, tipFx, floatAt } from './street.js';
import { busk, startBusk, stopBusk, updateBusk, hitBusk, drawBusk } from './busk.js';
import { night, onNight, onCop, nightNote, nightActors, nightPrompt, nightKey, drawNightWorld, drawNight, sceneFill } from './night.js';
import { job, onJob, stopJob, updateJob, jobKey, drawJob, drawJobWorld, jobBar } from './jobs.js';
import { drawWorld, move, nearby } from './world.js';
import { drawTable, tableBar, onView, rouletteHit, raceHit, sceneBackdrop, emotes, outfits, SW, SH } from './tables.js';
import { shop, drawShop, shopClick, shopHover, shopBar, celebrate } from './shop.js';
import { ITEMS } from './items.js';
import { ACHIEVEMENTS } from './achievements.js';
import { aptDims, aptSolids } from './furniture.js';
import { deco, drawApt, nearbyApt, decoBar, decoHover, decoClick } from './apartment.js';
import { nearElevatorApt, LW, LH, CONCIERGE, nearJobBoard, nearStreetBouncer } from './map.js';
import { drawLobby, nearbyLobby } from './lobby.js';
import { RPS, RPS_ICON } from './rps.js';
import { pass, togglePass, passKey, drawPass } from './pass.js';
import { rankColor } from './levels.js';
import { fshop, drawFurnShop, openFurnShop, furnShopHover, furnShopClick, furnShopBar, furnCelebrate } from './furnshop.js';
import { barUi, drawBarScreen, barHover, barClick, served, barBar } from './bar.js';
import { drunkLevel } from './drinks.js';
import { initAudio, sfx, toggleMusic, musicVolume, musicMode } from './sfx.js';
import { canvas, text, label, chipSprite } from './sprites.js';

const socket = io();
// ?film hides the help line and the message log, for clean trailer footage.
const FILM = new URLSearchParams(location.search).has('film');
if (FILM) document.body.classList.add('film');
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const [buf, bx] = canvas(SW, SH);
const $ = id => document.getElementById(id);
const bar = $('bar'), log = $('log'), chat = $('chat');

let scale = 1, dpr = 1, mode = 'world';
// The room is shown more zoomed in than the table close-ups, which need the full 480x270.
function fit(m) {
  mode = m;
  const [w, h] = m === 'table' ? [SW, SH] : [400, 225];
  const reserve = m === 'table' ? 72 * dpr : 0; // room for the betting bar under the table
  scale = Math.max(1, Math.floor(Math.min(cv.width / w, (cv.height - reserve) / h)));
  buf.width = Math.ceil(cv.width / scale); buf.height = Math.ceil(cv.height / scale);
  bx.imageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;
}
function resize() {
  dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr | 0; cv.height = innerHeight * dpr | 0;
  fit(mode);
}
addEventListener('resize', resize);
resize();

// ---------- state ----------
let meId = null, me = { x: SPAWN.x, y: SPAWN.y, dir: 3, moving: false, chips: 0, drunk: 0, zone: 'casino', homeless: false, hype: 0, vip: 0, name: '' }, seated = null;
let msgList = [], achievements = [], jackpotPot = 0, loan = null;
let jobList = null; // jobs offered by the board or the bouncer, shown in the bar
let myApt = null, lobbySay = null, apt = null, resList = null, sleptAt = -1e9, lastCam = { x: 0, y: 0 }; // apartment I'm in, residence door list
let phoneVisible = false, elevatorAt = -1e9, casinoSay = null, market = null, bankState = {};
const [sceneCopy, sceneX] = canvas(SW, SH); // last world frame without HUD/phone, for photos
let kickedAt = -1e9;
let xp = null, lvlUp = null, xpBox = null; // { level, into, next, max, bonus }, the last level-up (banner), the HUD box (click)
const rps = { on: false, invite: null }; // rock-paper-scissors duel: am I playing, who challenged me
const duelFoe = () => !seated && players.find(p => p.id !== meId && (p.zone || 'casino') === me.zone && !p.seat && !p.busking && Math.hypot(p.x - me.x, p.y - me.y) < 40);
const duelHint = n => { // the E prompt wins, otherwise offer a duel to the player next to me
  const o = n ? null : !rps.on && duelFoe();
  return n ? [n] : o ? [{ x: o.x, y: o.y - 52, text: (rps.invite?.from === o.id ? 'F : ACCEPTER LE DUEL DE ' : 'F : DEFIER ') + o.name }] : [];
};
let players = [];
const disp = new Map(), bubbles = new Map();
let race = null, top = [];
const wardrobe = { owned: new Set(), outfit: null, presets: [null, null, null], color: null };
const meData = () => ({ ...wardrobe, chips: me.chips });
let table = null; // { id, type, view }
const ui = { mx: -1, my: -1, chip: 10, slotBet: 10, tid: null, ox: 0, oy: 0 };
const keys = {};

// ---------- login ----------
let color = COLORS[Math.floor(Math.random() * COLORS.length)];
for (const c of COLORS) {
  const b = document.createElement('button');
  b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', 'Couleur ' + c);
  if (c === color) b.classList.add('sel');
  b.onclick = () => { color = c; for (const o of $('colors').children) o.classList.toggle('sel', o === b); };
  $('colors').append(b);
}
$('name').value = localStorageGet('name');
$('name').focus();
let tab = 'login';
for (const b of $('tabs').children) b.onclick = () => {
  tab = b.dataset.tab;
  for (const o of $('tabs').children) o.classList.toggle('on', o === b);
  $('login').classList.toggle('register', tab === 'register');
  $('go').textContent = tab === 'register' ? 'Créer mon compte' : 'Entrer';
  $('err').textContent = '';
};
$('login').querySelector('form').onsubmit = e => {
  e.preventDefault();
  const name = $('name').value.trim(), pass = $('pass').value;
  if (!name || !pass) return;
  if (tab === 'register' && pass !== $('pass2').value) { $('err').textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
  try { localStorage.setItem('name', name); } catch {}
  initAudio(); // browsers only allow sound after a click
  socket.emit(tab, { name, pass, color, remember: $('rem').checked });
};
// "Stay logged in": resume the saved session as soon as we are connected.
const savedToken = () => localStorageGet('token');
socket.on('connect', () => { if (!meId && savedToken()) socket.emit('resume', savedToken()); });
socket.on('auth:ok', m => { if (m.token) try { localStorage.setItem('token', m.token); } catch {} });
socket.on('auth:error', m => {
  if (m.expired) { try { localStorage.removeItem('token'); } catch {} return; }
  $('err').textContent = m.msg;
});
function localStorageGet(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }

// ---------- network ----------
let joinedAt = 0;
socket.on('welcome', m => { meId = m.id; joinedAt = performance.now(); me.x = m.x; me.y = m.y; setZone(m.zone); $('login').remove(); sys('Bienvenue au Grand Pixel ! Approche-toi d\'une table et appuie sur E.'); if (tab === 'register') { startTour(me, performance.now(), () => { if (pendingDaily) showDaily(pendingDaily, performance.now()); pendingDaily = null; }); } });
let pendingDaily = null; // the daily bonus waits for the end of the guided tour
socket.on('players', list => {
  players = list;
  for (const p of list) {
    const d = disp.get(p.id);
    if (!d || Math.hypot(d.x - p.x, d.y - p.y) > 64) disp.set(p.id, { x: p.x, y: p.y });
    if (p.id === meId) Object.assign(me, { chips: p.chips, drunk: p.drunk || 0, homeless: p.homeless, hype: p.hype || 0, vip: p.vip || 0, name: p.name, color: p.color });
    outfits.set(p.id, p.outfit);
  }
});
socket.on('pos', m => {
  me.x = m.x; me.y = m.y; seated = m.seat;
  if (seated && phone.open) togglePhone();
  if (m.zone) setZone(m.zone);
  if (!seated) { table = null; ui.tid = null; bar.style.display = 'none'; document.body.classList.remove('seated'); }
});
socket.on('table', v => {
  if (!seated || v.id !== seated.t) return;
  const type = TABLES.find(t => t.id === v.id).type;
  v.until = performance.now() + v.left;
  table = { id: v.id, type, view: v };
  if (ui.tid !== v.id) { ui.chip = TABLES.find(t => t.id === v.id).limits?.chips?.[0] || 10; firstTime(type); }
  ui.tid = v.id;
  document.body.classList.add('seated');
  onView(v.id, v);
  refreshBar();
});
socket.on('chat', m => {
  bubbles.set(m.id, { text: m.text, at: performance.now() });
  sfx.blip();
  line(`<b style="color:${m.color}">${esc(m.name)}</b> ${esc(m.text)}`);
});
socket.on('say', sys);
socket.on('race', v => { v.until = performance.now() + v.left; race = v; });
socket.on('top', t => { top = t; });
socket.on('me', m => { Object.assign(wardrobe, m, { owned: new Set(m.owned) }); });
socket.on('drank', id => { served(id); sfx.gulp(); });
socket.on('bought', id => { celebrate(); sfx.win(ITEMS[id].price); sys('Acheté : ' + ITEMS[id].name + ' !'); });
socket.on('emote', m => { emotes.set(m.id, { k: m.k, at: performance.now() }); sfx.pop(); });
socket.on('kicked', () => { kickedAt = performance.now(); sfx.slam(); });
socket.on('bouncer', text => { streetState.bouncerSay = casinoSay = { text, at: performance.now() }; sfx.miss(); });
socket.on('vipCard', tier => { rec.won = { tier, at: performance.now() }; sfx.win(1e6); });
socket.on('busk', on => {
  if (on) { startBusk(performance.now()); musicVolume(0); }
  else { stopBusk(); musicVolume(me.zone === 'street' ? 0.08 : 0.35); }
});
socket.on('cop', onCop);
socket.on('night', m => {
  const was = night.mode, end = onNight(m, performance.now());
  if (end) sys(end);
  if (m.result) m.result.fine !== undefined ? sfx.slam() : sfx.win(m.result.paid);
  if (m.escaped) sfx.coin();
  if (m.busted && was !== 'busted') sfx.miss();
  if ((m.mode === 'scene') !== (was === 'scene')) musicVolume(m.mode === 'scene' ? 0 : 0.08);
});
socket.on('job', m => {
  if (!m || m.end) { stopJob(); if (m?.end) sys(m.end); return; }
  if ('ok' in m) m.ok ? sfx.coin() : sfx.miss();
  onJob(m, performance.now());
});
socket.on('tip', m => {
  const now = performance.now();
  tipFx(m.to, m.amt, m.from, players, now);
  if (m.to !== meId) return;
  sfx.coin(); busk.earned += m.amt;
  if (m.by) sys(`${m.by} te donne ${m.amt} jetons !`);
});
socket.on('xp', m => { xp = m; });
socket.on('levelup', m => {
  lvlUp = { ...m, at: performance.now() };
  celebrate(); if (m.chest || m.item) celebrate(); sfx.win(m.chips * 10);
  sys(`⭐ NIVEAU ${m.level} ! ${m.chest ? 'Coffre : ' : ''}+${m.chips.toLocaleString('fr-FR')} jetons` + (m.item ? ` et ${ITEMS[m.item].name} !` : '') + (m.rank ? ` Nouveau rang : ${m.rank} !` : ''));
});
socket.on('rps', m => {
  if (m.invite) { rps.invite = { ...m.invite, until: performance.now() + 20000 }; sfx.pop(); sys(`⚔️ ${m.invite.name} te defie a pierre-feuille-ciseaux pour ${m.invite.amount} jetons : F pres de lui pour accepter.`); }
  if (m.start) { rps.on = true; rps.invite = null; sys(`Duel contre ${m.start.name} (${m.start.amount} jetons) : 1 PIERRE, 2 FEUILLE, 3 CISEAUX (15 s)`); }
  if ('result' in m) {
    sys(`${RPS_ICON[m.you]} contre ${RPS_ICON[m.them]} : ` + (m.result > 0 ? `gagne ! +${m.amount}` : m.result < 0 ? `perdu... -${m.amount}` : 'egalite, rejoue ! 1 / 2 / 3'));
    if (m.result) { rps.on = false; m.result > 0 ? sfx.win(m.amount) : sfx.miss(); }
  }
  if (m.end) { rps.on = false; sys(m.end); }
});
socket.on('loot', l => {
  floatAt(me.x, me.y - 30, l.item ? 'TROUVAILLE !' : l.chips ? '+' + l.chips : '...');
  if (l.item) { sfx.win(1000); sys(`🗑️ Trouvaille : ${ITEMS[l.item].name} ! Va la porter au vestiaire.`); }
  else { if (l.chips) sfx.coin(); sys('🗑️ ' + l.text); }
});
socket.on('binshake', m => { streetState.bins[m.i].shakeUntil = performance.now() + 2000; if (m.id === meId) sfx.rummage(); });
socket.on('bins', left => left.forEach((ms, i) => { streetState.bins[i].until = performance.now() + ms; }));
socket.on('market', m => { market = m; });
socket.on('achievements', m => {
  achievements = m.list;
  if (m.id) { notify('SUCCES : ' + ACHIEVEMENTS[m.id][0], performance.now()); sfx.win(5000); }
});
socket.on('jackpot', j => { jackpotPot = j.pot; if (j.by) sfx.win(1e6); });
socket.on('loan', l => { loan = l && { ...l, at: performance.now() }; });
socket.on('apt', a => {
  apt = a;
  if (deco.hold >= a.items.length) deco.hold = -1;
  musicMode(a.music ? 'vip' : 'casino');
});
socket.on('apt:list', l => { resList = l; });
socket.on('myapt', a => { myApt = a; });
socket.on('furn:bought', () => { furnCelebrate(); sfx.win(2000); });
socket.on('concierge', t => { lobbySay = { text: t, at: performance.now() }; sfx.pop(); });
socket.on('slept', () => { sleptAt = performance.now(); });
socket.on('shark', t => { streetState.sharkSay = { text: t, at: performance.now() }; sfx.miss(); });
socket.on('daily', r => { if (tour.on) pendingDaily = r; else showDaily(r, performance.now()); });
socket.on('msg:list', l => { msgList = l; });
socket.on('msg:convo', c => { if (phone.convo?.name.toLowerCase() === c.name.toLowerCase()) phone.convo = c; socket.emit('msg:list'); });
socket.on('msg', m => {
  notify(`${m.from} : ${m.text}`, performance.now());
  sys('💬 Message de ' + m.from);
  if (phone.open && phone.app === 'convo' && phone.convo?.name.toLowerCase() === m.from.toLowerCase()) socket.emit('msg:open', m.from);
  else socket.emit('msg:list');
});
socket.on('bank', b => { bankState = b; });
socket.on('bankMsg', t => { notify(t, performance.now()); sys('📱 ' + t); });
socket.on('ring', m => {
  if (m.id === meId) return sfx.ring(m.tone);
  const p = players.find(q => q.id === m.id); // nearby players hear it too
  if (p && (p.zone || 'casino') === me.zone && Math.hypot(p.x - me.x, p.y - me.y) < 160) sfx.ring(m.tone, 0.3);
});
socket.on('disconnect', () => sys('Connexion perdue… recharge la page quand le serveur est relancé.'));

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
function line(html, cls = '') {
  const d = document.createElement('div');
  d.innerHTML = html; if (cls) d.className = cls;
  log.append(d);
  while (log.children.length > 6) log.firstChild.remove();
  setTimeout(() => { d.style.opacity = 0; }, 12000);
}
function sys(s) { line(esc(s), 'sys'); }

// ---------- action bar ----------
let barSig = '';
function refreshBar() {
  if (!table) return;
  const { sig, html } = tableBar(table.type, table.view, ui);
  const mine = table.view.seats.find(s => s?.me);
  bar.style.display = 'flex';
  if (sig !== barSig) {
    barSig = sig;
    bar.innerHTML = html + `<span class="chips"></span><button data-rules title="Règles du jeu (H)" aria-label="Règles du jeu">?</button><button data-stand>Se lever</button>`;
  }
  bar.querySelector('.chips').textContent = (mine ? mine.chips : me.chips) + ' jetons';
}
bar.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.act?.includes('"bet"')) sfx.chip(); else sfx.click();
  if (d.act) socket.emit('act', JSON.parse(d.act));
  else if ('raise' in d) socket.emit('act', { a: 'raise', to: +$('raise').value });
  else if (d.chip) { ui.chip = +d.chip; refreshBar(); }
  else if (d.sbet) { ui.slotBet = +d.sbet; refreshBar(); }
  else if ('spin' in d) spin();
  else if ('stand' in d) socket.emit('stand');
  else if ('rules' in d) showRules(table.type);
  else if (d.shop) socket.emit('shop', JSON.parse(d.shop));
  else if (d.vip) socket.emit('vip', +d.vip);
  else if (d.ph) { const act = phoneBarClick(JSON.parse(d.ph)); if (act) socket.emit(...act); }
  else if ('close' in d) closeShop();
  else if (d.apt) { socket.emit('apt:enter', +d.apt); resList = null; }
  else if (d.fbuy) socket.emit('furn:buy', d.fbuy);
  else if ('resclose' in d) resList = null;
  else if (d.job) { const kind = d.job; jobList = null; firstTime(kind, () => socket.emit('job', { a: 'start', kind })); } // rules before the clock starts
  else if ('jobclose' in d) jobList = null;
  else if (d.aptedit) socket.emit('apt:edit', JSON.parse(d.aptedit));
  else if (d.deco) {
    const o = JSON.parse(d.deco);
    if (o.tab) deco.tab = o.tab;
    if (o.sel) { deco.sel = deco.sel === o.sel ? null : o.sel; deco.hold = -1; }
    if (o.done) Object.assign(deco, { on: false, sel: null, hold: -1 });
  }
  b.blur();
});
bar.addEventListener('keydown', e => { // Enter sends a phone message / opens a conversation
  if (e.key !== 'Enter' || !['phMsg', 'phTo'].includes(e.target.id)) return;
  e.preventDefault();
  bar.querySelector(`[data-ph='{"a":"${e.target.id === 'phMsg' ? 'msg' : 'to'}"}']`)?.click();
  e.target.focus();
});
bar.addEventListener('input', e => { if (e.target.id === 'raise') $('raiseV').textContent = e.target.value; });
function setZone(z) {
  if (z === me.zone) return;
  const ride = ((z === 'vip') !== (me.zone === 'vip') && me.zone !== 'street' && z !== 'street' && me.zone !== 'lobby' && z !== 'lobby') || (me.zone === 'lobby' && z.startsWith('apt:')) || (z === 'lobby' && me.zone.startsWith('apt:'));
  if (ride) { elevatorAt = performance.now(); setTimeout(sfx.ding, 1100); }
  me.zone = z;
  closeShop(); stopBusk(); stopJob(); jobList = null;
  resList = null;
  if (!z.startsWith('apt:')) { apt = null; deco.on = false; }
  musicMode(z === 'vip' ? 'vip' : 'casino');
  musicVolume(z === 'street' ? 0.08 : z === 'vip' ? 0.45 : z.startsWith('apt:') || z === 'lobby' ? 0.25 : 0.35);
}
const emitNote = q => socket.emit('busk', { a: 'note', q });
const emitAnswer = v => socket.emit('job', { a: 'answer', v });
const emitNight = m => socket.emit('night', m), sceneNote = q => nightNote(q, emitNight);
// The night work is 18+ content: ask once per browser, nothing starts without a yes.
function adultOk() {
  try { if (localStorage.getItem('adulte') === '1') return true; } catch {}
  for (const k in keys) keys[k] = false; // the dialog swallows the key-up
  if (!confirm('Contenu pour adultes (18+) : activité de nuit suggérée, rien d\'explicite.\nAs-tu 18 ans ou plus ?')) return false;
  try { localStorage.setItem('adulte', '1'); } catch {}
  return true;
}
const LANES = { ArrowLeft: 0, KeyA: 0, ArrowDown: 1, KeyS: 1, ArrowUp: 2, KeyW: 2, ArrowRight: 3, KeyD: 3 };
function openShop() {
  if (phone.open) togglePhone();
  shop.open = true; shop.sel = null;
  for (const k in keys) keys[k] = false;
  me.moving = false;
}
function openBar() { if (phone.open) togglePhone(); barUi.open = true; for (const k in keys) keys[k] = false; me.moving = false; }
function togglePhone() {
  if (phone.open) { phone.open = false; bar.style.display = 'none'; barSig = ''; }
  else { openPhone(performance.now()); phone.zone = me.zone.startsWith('apt:') ? 'street' : me.zone; }
  socket.emit('phone', phone.open);
  sfx.click();
}
const phoneState = () => ({ me: { ...me, outfit: wardrobe.outfit }, meId, players, market, bank: bankState, scene: sceneCopy, msgs: msgList, achievements, unread: msgList.reduce((a, c) => a + c.unread, 0) });
const fshopData = () => ({ chips: me.chips, homeless: me.homeless, apt: myApt });
function openFurn(sel) { if (phone.open) togglePhone(); openFurnShop(sel); for (const k in keys) keys[k] = false; me.moving = false; }
function openReception() { if (phone.open) togglePhone(); rec.open = true; rec.won = null; for (const k in keys) keys[k] = false; me.moving = false; }
const uiOpen = () => shop.open || barUi.open || rec.open || fshop.open;
function closeShop() { shop.open = false; barUi.open = false; rec.open = false; fshop.open = false; bar.style.display = 'none'; barSig = ''; }
function refreshShopBar() {
  const { sig, html } = fshop.open ? furnShopBar(fshopData()) : rec.open ? recBar(me) : barUi.open ? barBar(me) : shopBar(meData());
  bar.style.display = 'flex';
  if (sig !== barSig) { barSig = sig; bar.innerHTML = html; }
}
function spin() { socket.emit('act', { a: 'spin', bet: ui.slotBet }); }

// ---------- input ----------
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
addEventListener('keydown', e => {
  if (!meId) return;
  if (document.activeElement === chat) {
    if (e.key === 'Enter') { if (chat.value.trim()) socket.emit('chat', chat.value); chat.value = ''; chat.style.display = 'none'; chat.blur(); }
    else if (e.key === 'Escape') { chat.value = ''; chat.style.display = 'none'; chat.blur(); }
    return;
  }
  if (e.target.tagName === 'INPUT') return;
  if (tour.on) { if (['Enter', 'Space'].includes(e.code)) advanceTour(performance.now()); else if (e.code === 'Escape') endTour(); e.preventDefault(); return; }
  if (rules.key) { rulesKey(e.code); e.preventDefault(); return; }
  if (pass.open) { passKey(e.code); e.preventDefault(); return; }
  if (daily.show) { if (['Enter', 'Escape', 'Space'].includes(e.code)) dismissDaily(); return; }
  if (e.code === 'KeyH') { // the guide of what you're doing right now
    const k = table ? table.type : night.on ? 'trottoir' : busk.on ? 'busk' : job.on ? job.kind : phone.open && phone.app === 'stocks' ? 'stocks' : null;
    if (k) return showRules(k);
  }
  if (night.on) { // working the street: the motel scene plays like the guitar, haggling has its own keys, Escape ends the night
    if (night.mode === 'scene') {
      if (e.code in LANES && !e.repeat) { hitBusk(LANES[e.code], performance.now(), sceneNote); e.preventDefault(); }
      if (e.code === 'Escape') emitNight({ a: 'stop' });
      return;
    }
    if (nightKey(e.code, emitNight)) { e.preventDefault(); return; }
    if (e.code === 'Escape') return emitNight({ a: 'stop' });
  }
  if (busk.on) { // playing guitar: arrows are notes, E / Escape stops
    if (e.code in LANES && !e.repeat) { hitBusk(LANES[e.code], performance.now(), emitNote); e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyE') socket.emit('busk', { a: 'stop' });
    return;
  }
  if (job.on) { // working: the job's keys answer, Escape quits
    if (e.code === 'Escape') return socket.emit('job', { a: 'stop' });
    if (jobKey(e.code, performance.now(), emitAnswer)) { e.preventDefault(); return; }
  }
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.key === 'Enter') { chat.style.display = 'block'; chat.focus(); e.preventDefault(); }
  if (e.code === 'KeyP' && meId && !seated && !uiOpen()) togglePhone();
  if (deco.on && !phone.open) { // decorating: R flips, Suppr puts away, Escape lets go
    if (e.code === 'KeyR') deco.f = !deco.f;
    if ((e.code === 'Delete' || e.code === 'Backspace') && deco.hold >= 0) { socket.emit('apt:edit', { a: 'take', i: deco.hold }); deco.hold = -1; }
    if (e.code === 'Escape') { if (deco.hold >= 0 || deco.sel) { deco.hold = -1; deco.sel = null; } else deco.on = false; return; }
  }
  if (e.code === 'KeyB' && apt?.mine && !phone.open) { Object.assign(deco, { on: !deco.on, sel: null, hold: -1 }); sfx.click(); }
  if (e.code === 'Escape' && resList) { resList = null; return; }
  if (e.code === 'Escape' && jobList) { jobList = null; return; }
  if (e.code === 'Escape' && phone.open) togglePhone();
  else if (e.code === 'Escape' && uiOpen()) closeShop();
  else if (e.code === 'Escape' && seated) socket.emit('stand');
  if (e.code === 'Space' && table?.type === 'slots') { spin(); e.preventDefault(); }
  if (rps.on && /^Digit[1-3]$/.test(e.code)) { socket.emit('rps', { a: 'pick', k: +e.code[5] - 1 }); return sys('Tu joues ' + RPS[+e.code[5] - 1] + '...'); }
  if (e.code === 'KeyF' && !rps.on && !uiOpen() && !phone.open) {
    const o = duelFoe();
    if (o && rps.invite?.from === o.id && rps.invite.until > performance.now()) socket.emit('rps', { a: 'accept', to: o.id });
    else if (o) {
      for (const k in keys) keys[k] = false; // the prompt swallows the key releases
      const amt = parseInt(prompt(`Mise contre ${o.name} a pierre-feuille-ciseaux ?`, '100'), 10);
      if (amt > 0) socket.emit('rps', { a: 'ask', to: o.id, amount: amt });
    }
  }
  if (/^Digit[1-5]$/.test(e.code)) socket.emit('emote', +e.code[5] - 1);
  if (e.code === 'KeyL' && confirm('Se déconnecter du Grand Pixel ?')) {
    socket.emit('logout', savedToken());
    try { localStorage.removeItem('token'); } catch {}
    return location.reload();
  }
  if (e.code === 'KeyM') sys(toggleMusic() ? 'Musique : on' : 'Musique : off');
  if (e.code === 'KeyN' && xp && !uiOpen() && !phone.open) togglePass(xp.level);
  if (e.code === 'KeyE' && me.zone === 'street') {
    const nn = nightPrompt(me), n = nn ? null : nearbyStreet({ ...me, id: meId }, players.filter(p => p.zone === 'street'));
    if (nn?.a === 'start') { if (adultOk()) firstTime('trottoir', () => emitNight({ a: 'start' })); }
    else if (nn?.a === 'pimp') night.pimpTalk = true;
    else if (nn) emitNight({ a: nn.a, id: nn.id });
    else if (n?.kind === 'door') socket.emit('door');
    else if (n?.kind === 'busk') firstTime('busk', () => socket.emit('busk', { a: 'start' }));
    else if (n?.kind === 'shark') socket.emit('shark');
    else if (n?.kind === 'jobs') jobList = ['videur', 'menage'];
    else if (n?.kind === 'res') socket.emit('door');
    else if (n?.kind === 'tip') socket.emit('tip', n.to);
    else if (n?.kind === 'bin' && streetState.bins[n.i].until <= performance.now()) socket.emit('search', n.i);
  } else if (e.code === 'KeyE' && me.zone === 'lobby' && !uiOpen()) {
    const n = nearbyLobby(me);
    if (n?.kind === 'exit') socket.emit('door');
    else if (n?.kind === 'elev') socket.emit('apt:list');
    else if (n?.kind === 'concierge') socket.emit('concierge');
    else if (n?.kind === 'fshop') openFurn(n.sel);
  } else if (e.code === 'KeyE' && apt && me.zone.startsWith('apt:')) {
    const n = nearbyApt(me, apt);
    if (n?.kind === 'exit') socket.emit('apt:leave');
    else if (n?.kind === 'sit') Object.assign(me, n.seat, { dir: 0, moving: false });
    else if (n) socket.emit('apt:use', n.i);
  } else if (e.code === 'KeyE' && !seated && !uiOpen()) {
    const n = nearby(me, players.filter(p => p.zone === me.zone), me.zone);
    if (n?.kind === 'door') socket.emit('door');
    else if (n?.kind === 'reception') openReception();
    else if (n?.kind === 'locked') sfx.miss();
    if (n?.kind === 'seat') socket.emit('sit', { t: n.t.id, i: n.i });
    else if (n?.kind === 'shop' && wardrobe.outfit) openShop();
    else if (n?.kind === 'bar') openBar();
    else if (n?.kind === 'jobs') jobList = ['barman', 'croupier', 'videur', 'menage'];
  }
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
cv.addEventListener('mousemove', e => {
  ui.mx = e.clientX * dpr / scale - ui.ox; ui.my = e.clientY * dpr / scale - ui.oy;
  if (shop.open) shopHover(ui.mx, ui.my);
  if (barUi.open) barHover(ui.mx, ui.my);
  if (rec.open) recHover(ui.mx, ui.my);
  if (fshop.open) furnShopHover(ui.mx, ui.my);
  if (deco.on && apt) decoHover(apt, ui.mx + lastCam.x, ui.my + lastCam.y);
});
cv.addEventListener('wheel', e => { if (phone.open && insidePhone(ui.mx, ui.my)) { phoneScroll(e.deltaY); e.preventDefault(); } }, { passive: false });
cv.addEventListener('click', e => {
  const mx = e.clientX * dpr / scale - ui.ox, my = e.clientY * dpr / scale - ui.oy;
  if (tour.on) return advanceTour(performance.now());
  if (rules.key) return rulesClick();
  if (pass.open) { pass.open = false; return; }
  if (xpBox && !tour.on && mx + ui.ox >= xpBox[0] && mx + ui.ox < xpBox[0] + xpBox[2] && my + ui.oy >= 6 && my + ui.oy < 22) return togglePass(xp.level);
  if (daily.show) return dismissDaily();
  if (phone.open && insidePhone(mx, my)) { const act = phoneClick(mx, my, phoneState(), performance.now()); if (act) socket.emit(...act); if (phone.app === 'stocks') firstTime('stocks'); }
  else if (deco.on && apt) { const act = decoClick(apt, mx + lastCam.x, my + lastCam.y); sfx.click(); if (act) socket.emit('apt:edit', act); }
  else if (fshop.open) { furnShopClick(mx, my); sfx.click(); }
  else if (rec.open) { recClick(mx, my); sfx.click(); }
  else if (barUi.open) {
    const id = barClick(mx, my);
    if (id) socket.emit('drink', id);
  } else if (shop.open) {
    const act = shopClick(mx, my, meData(), performance.now());
    sfx.click();
    if (act) socket.emit('shop', act);
  } else if (table?.type === 'roulette') {
    const c = rouletteHit(mx, my);
    if (c) { socket.emit('act', { a: 'bet', t: c.t, v: c.v, amt: ui.chip }); sfx.chip(); }
  } else if (table?.type === 'race') {
    const h = raceHit(mx, my);
    if (h >= 0) { socket.emit('act', { a: 'bet', h, amt: ui.chip }); sfx.chip(); }
  }
});

// ---------- loop ----------
let last = performance.now(), lastSend = 0, sent = '';
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  updateTour(dt, now);
  document.body.classList.toggle('touring', tour.on || !!rules.key); // hide the message log under the tour and the guides
  if (meId && !tour.on && !seated && !uiOpen() && !busk.on && !(job.on && job.kind !== 'menage') && !['talk', 'scene'].includes(night.mode) && !night.pimpTalk && document.activeElement !== chat) move(me, keys, dt, me.drunk, me.zone, me.vip, apt && aptSolids(apt));
  if (meId && !seated && now - lastSend > 66) {
    const m = { x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, dir: me.dir, moving: me.moving }, s = JSON.stringify(m);
    if (s !== sent) { socket.emit('move', m); sent = s; }
    lastSend = now;
  }
  const list = players.filter(p => (p.zone || 'casino') === me.zone).map(p => {
    const d = disp.get(p.id) || p, k = Math.min(1, dt * 12);
    d.x += (p.x - d.x) * k; d.y += (p.y - d.y) * k;
    const q = { ...p, x: d.x, y: d.y, bubble: bubbles.get(p.id), emote: emotes.get(p.id) };
    if (p.id === meId && !seated) Object.assign(q, { x: me.x, y: me.y, dir: me.dir, moving: me.moving });
    return q;
  });
  if (tour.on && tour.scene === 'casino') list.push(tourGuide());

  const want = table || uiOpen() ? 'table' : 'world';
  if (want !== mode) fit(want);
  bx.fillStyle = '#000'; bx.fillRect(0, 0, buf.width, buf.height);
  if (tour.on && tour.scene !== 'casino') {
    ui.ox = ui.oy = 0;
    lastCam = drawTourScene(bx, buf.width, buf.height, now, players.find(p => p.id === meId), meId);
  } else if (fshop.open) {
    ui.ox = (buf.width - SW) >> 1; ui.oy = (buf.height - SH) >> 1;
    drawFurnShop(bx, buf.width, buf.height, now, fshopData());
    refreshShopBar();
  } else if (rec.open) {
    ui.ox = (buf.width - SW) >> 1; ui.oy = (buf.height - SH) >> 1;
    drawReception(bx, buf.width, buf.height, now, me);
    refreshShopBar();
  } else if (barUi.open) {
    ui.ox = (buf.width - SW) >> 1; ui.oy = (buf.height - SH) >> 1;
    drawBarScreen(bx, buf.width, buf.height, now, me);
    refreshShopBar();
  } else if (shop.open) {
    ui.ox = (buf.width - SW) >> 1; ui.oy = (buf.height - SH) >> 1;
    drawShop(bx, buf.width, buf.height, now, meData());
    refreshShopBar();
  } else if (table) {
    // centred, but pushed up so the HTML bar (14px from the bottom) doesn't cover the bottom of the scene
    const barH = bar.style.display === 'none' ? 0 : Math.ceil((bar.offsetHeight + 18) * dpr / scale);
    ui.ox = (buf.width - SW) >> 1; ui.oy = Math.max(0, Math.min((buf.height - SH) >> 1, buf.height - SH - barH));
    sceneBackdrop(bx, buf.width, buf.height, TABLES.find(t => t.id === table.id)?.zone === 'vip');
    bx.save(); bx.translate(ui.ox, ui.oy);
    drawTable(bx, table.type, table.view, now, ui);
    bx.restore();
    if (table.view.until > now || table.type === 'roulette' || table.type === 'race') refreshBar(); // keeps the chip count fresh
  } else {
    ui.ox = ui.oy = 0;
    const focus = meId ? (tour.on ? tourFocus() : me) : { x: SPAWN.x + Math.sin(now / 4000) * 200, y: 14 * T };
    const inApt = apt && me.zone.startsWith('apt:');
    const [mw, mh] = inApt ? [aptDims(apt).w * T, aptDims(apt).h * T] : me.zone === 'street' ? [ST.w * T, ST.h * T] : me.zone === 'vip' ? [VW * T, VH * T] : me.zone === 'lobby' ? [LW * T, LH * T] : [MW * T, MH * T];
    const cam = {
      x: Math.round(mw > buf.width ? Math.max(0, Math.min(mw - buf.width, focus.x - buf.width / 2)) : (mw - buf.width) / 2),
      y: Math.round(mh > buf.height ? Math.max(0, Math.min(mh - buf.height, focus.y - 20 - buf.height / 2)) : (mh - buf.height) / 2),
    };
    if (inApt && deco.on) cam.y = mh > buf.height * 0.6 ? Math.round(Math.max(-8, Math.min(mh - buf.height * 0.6, focus.y - buf.height * 0.3))) : -8; // keep the room above the decorating bar
    if (me.zone === 'street') {
      const n = (meId && !tour.on && nightPrompt(me)) || nearbyStreet({ ...me, id: meId, busking: busk.on }, list), scene = night.mode === 'scene';
      streetState.scene = list.some(p => p.scene); // someone is at the hotel: its window lights up for everyone
      drawStreet(bx, cam, now, list.filter(p => !p.scene).concat(nightActors(now)), meId, duelHint(n));
      drawNightWorld(bx, cam, now, me);
      updateBusk(now, scene ? sceneNote : emitNote);
      drawBusk(bx, buf.width, buf.height, now, scene ? sceneFill() : me.hype, scene ? 'LA NUIT' : undefined, scene ? 'SATISFACTION ' + Math.round(sceneFill() * 100) + '%' : undefined);
    } else if (inApt) {
      const n = deco.on ? null : nearbyApt(me, apt);
      drawApt(bx, cam, now, list, meId, n ? [n] : [], apt);
    } else if (me.zone.startsWith('apt:')) { // waiting for the apartment layout
    } else if (me.zone === 'lobby') {
      const n = nearbyLobby(me);
      drawLobby(bx, cam, now, list, meId, duelHint(n));
      if (lobbySay && now - lobbySay.at < 5000) label(bx, lobbySay.text, CONCIERGE.x - cam.x + 60, CONCIERGE.y - 44 - cam.y, '#ffe680', 'rgba(20,30,20,.92)');
    } else if (me.zone === 'vip') {
      const n = nearby(me, list, 'vip');
      drawVip(bx, cam, now, list, meId, duelHint(n), me.vip);
    } else {
      const n = meId && !tour.on ? nearby(me, list) : null;
      drawWorld(bx, cam, now, list, meId, meId && !tour.on ? duelHint(n) : [], race, top, jackpotPot);
      if (casinoSay && now - casinoSay.at < 4000) label(bx, casinoSay.text, VIP_BOUNCER.x - cam.x, VIP_BOUNCER.y - 40 - cam.y, '#ff8080', 'rgba(20,0,0,.9)');
    }
    drawJobWorld(bx, cam, now);
    updateJob(now, emitAnswer);
    drawJob(bx, buf.width, buf.height, now, me);
    drawNight(bx, buf.width, buf.height, now);
    if (phone.open) {
      if (sceneCopy.width !== buf.width || sceneCopy.height !== buf.height) { sceneCopy.width = buf.width; sceneCopy.height = buf.height; }
      sceneX.drawImage(buf, 0, 0);
    }
    if (meId && !tour.on) hud();
    lastCam = cam;
    if (resList && (me.zone !== 'lobby' || !nearElevatorApt(me))) resList = null;
    if (jobList && !(me.zone === 'casino' ? nearJobBoard(me) : me.zone === 'street' && nearStreetBouncer(me))) jobList = null;
    worldBar();
    if (phone.open) {
      phoneVisible = true;
      const pb = phoneBar(phoneState());
      if (pb) { bar.style.display = 'flex'; if (pb.sig !== barSig) { barSig = pb.sig; bar.innerHTML = pb.html; } }
      else if (barSig.startsWith('ph-')) { bar.style.display = 'none'; barSig = ''; }
    }
  }
  if (now - kickedAt < 5500) kickedScreen(now - kickedAt);
  if (now - sleptAt < 2600) { // a short nap: fade to black and back
    const el = now - sleptAt;
    bx.fillStyle = `rgba(0,0,0,${el < 600 ? el / 600 : Math.max(0, 1 - (el - 1800) / 800)})`; bx.fillRect(0, 0, buf.width, buf.height);
    if (el > 500 && el < 2000) text(bx, 'Z z z . . .', buf.width / 2, buf.height / 2, '#c8c0e8', 2, 'center');
  }
  drawDaily(bx, buf.width, buf.height, now);
  drawPass(bx, buf.width, buf.height, now, { outfit: wardrobe.outfit || {}, color: me.color }, xp);
  drawRules(bx, buf.width, buf.height, now);
  if (tour.on) drawTourUi(bx, buf.width, buf.height, now, lastCam);
  if (now - elevatorAt < 2200) elevatorScreen(now - elevatorAt);
  const W = buf.width * scale, H = buf.height * scale, d = me.drunk;
  const showPhone = phoneVisible; phoneVisible = false;
  if (d > 0.02) { // drunk: the screen sways, zooms a little and doubles
    const t = now / 1000;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(cv.width / 2 + Math.sin(t * 1.3) * d * 12 * dpr, cv.height / 2 + Math.cos(t * 1.7) * d * 7 * dpr);
    ctx.rotate(Math.sin(t * 0.9) * d * 0.035);
    ctx.scale(1 + d * 0.08, 1 + d * 0.08);
    ctx.drawImage(buf, -W / 2, -H / 2, W, H);
    ctx.globalAlpha = d * 0.35;
    ctx.drawImage(buf, -W / 2 + Math.sin(t * 2.1) * d * 16 * dpr, -H / 2 + Math.cos(t * 1.1) * d * 4 * dpr, W, H);
    ctx.restore();
  } else ctx.drawImage(buf, 0, 0, W, H);
  if (showPhone && !rules.key && !pass.open) drawPhone(ctx, buf.width, buf.height, now, phoneState(), scale); // full resolution, readable text
  requestAnimationFrame(frame);
}

// Bar under the scene for decorating or picking an apartment at the residence door (the phone's bar wins).
function worldBar() {
  const want = phone.open ? null : deco.on && apt ? decoBar(apt, me.chips, me.homeless) : resList ? {
    sig: 'res' + JSON.stringify(resList),
    html: '<span class="info">ASCENSEUR — quel appartement ?</span>' + resList.map(r => `<button class="${r.mine ? 'go' : ''}" data-apt="${r.id}">${r.mine ? '🏠 Chez moi' : esc(r.name)}${r.online && !r.mine ? ' ●' : ''}</button>`).join('') + '<button data-resclose>Fermer (Échap)</button>',
  } : jobList ? jobBar(jobList) : null;
  if (want) { bar.style.display = 'flex'; if (want.sig !== barSig) { barSig = want.sig; bar.innerHTML = want.html; } }
  else if (barSig.startsWith('deco') || barSig.startsWith('res') || barSig.startsWith('job')) { bar.style.display = 'none'; barSig = ''; }
}

// Elevator ride between the casino and the VIP floor: doors close, floor counter, ding, doors open.
function elevatorScreen(el) {
  const w = buf.width, h = buf.height, close = el < 500 ? el / 500 : el > 1500 ? Math.max(0, 1 - (el - 1500) / 600) : 1;
  const half = Math.round(w / 2 * close);
  for (const [x0, dir] of [[0, 1], [w - half, -1]]) {
    bx.fillStyle = '#c8a040'; bx.fillRect(x0, 0, half, h);
    bx.fillStyle = '#d8b858'; bx.fillRect(x0 + 6, 6, Math.max(0, half - 12), h - 12);
    bx.fillStyle = '#f8e8a8'; bx.fillRect(dir > 0 ? x0 + 12 : x0 + half - 16, 12, 4, h - 24);
  }
  if (close > 0.95) {
    const home = me.zone.startsWith('apt:') || me.zone === 'lobby', up = me.zone === 'vip' || me.zone.startsWith('apt:'), k = Math.min(1, Math.max(0, (el - 500) / 700));
    const [lo, hi] = home ? ['HALL', 'APPT'] : ['RDC', 'VIP'];
    bx.fillStyle = '#100808'; bx.fillRect(w / 2 - 40, h / 2 - 22, 80, 44);
    text(bx, k < 1 ? (up ? `${lo}  >  ${hi}` : `${hi}  >  ${lo}`) : (up ? hi : lo), w / 2, h / 2 - 12, '#ffe680', 1, 'center');
    text(bx, up ? 'A' : 'V', w / 2, h / 2 - 2 - (up ? k * 6 : -k * 6) + 4, Math.floor(el / 150) % 2 ? '#60ff80' : '#208040', 2, 'center');
  }
}

// "The bouncer threw you out" cinematic.
function kickedScreen(el) {
  const w = buf.width, h = buf.height;
  bx.fillStyle = `rgba(0,0,0,${el < 500 ? 1 : Math.max(0, 1 - (el - 3500) / 2000) * 0.75})`; bx.fillRect(0, 0, w, h);
  if (el > 5000) return;
  const shake = el < 600 ? Math.round(Math.sin(el / 20) * 3) : 0;
  text(bx, 'LE VIDEUR T\'A MIS DEHORS !', w / 2 + shake, h / 2 - 24, '#ff5050', 2, 'center', '#000');
  text(bx, 'TU AS TOUT PERDU... TU ES SDF.', w / 2, h / 2 - 4, '#fff', 1, 'center', '#000');
  text(bx, `FAIS LA MANCHE OU FOUILLE LES POUBELLES : ${ENTRY_MIN} JETONS POUR RENTRER`, w / 2, h / 2 + 8, '#ffe680', 1, 'center', '#000');
}

function hud() {
  bx.fillStyle = 'rgba(10,4,16,.8)'; bx.fillRect(6, 6, 18 + String(me.chips).length * 8, 16);
  bx.drawImage(chipSprite('#e2b02c', '#fff6c8'), 9, 9);
  text(bx, me.chips + '', 21, 9, '#ffe680', 2, 'left', '#000');
  if (me.vip) { // mini member card next to the chips
    const t = TIERS[me.vip], cx = 28 + String(me.chips).length * 8, sh = Math.floor(performance.now() / 120) % 30;
    bx.fillStyle = '#000'; bx.fillRect(cx - 1, 7, 20, 14);
    bx.fillStyle = t.color; bx.fillRect(cx, 8, 18, 12);
    bx.fillStyle = t.dark; bx.fillRect(cx, 15, 18, 5);
    bx.fillStyle = '#e8c860'; bx.fillRect(cx + 2, 11, 4, 3);
    if (sh < 18) { bx.fillStyle = 'rgba(255,255,255,.7)'; bx.fillRect(cx + sh, 8, 1, 12); }
  }
  if (xp) { // level and progress to the next one
    const lx = 28 + String(me.chips).length * 8 + (me.vip ? 22 : 0), bw = 70, now = performance.now();
    xpBox = [lx, 6, bw + 6];
    bx.fillStyle = 'rgba(10,4,16,.8)'; bx.fillRect(lx, 6, bw + 6, 16);
    text(bx, 'NIV ' + xp.level, lx + 3, 8, rankColor(xp.level, now));
    text(bx, xp.bonus > 0 ? 'XP X2' : 'N', lx + bw + 3, 8, xp.bonus > 0 ? (Math.floor(now / 400) % 2 ? '#ffe060' : '#ffb030') : '#6a6080', 1, 'right');
    bx.fillStyle = '#2a2040'; bx.fillRect(lx + 3, 16, bw, 3);
    bx.fillStyle = '#60ff80'; bx.fillRect(lx + 3, 16, xp.max ? bw : Math.round(bw * xp.into / xp.next), 3);
  }
  if (lvlUp && performance.now() - lvlUp.at < 3500) {
    text(bx, `NIVEAU ${lvlUp.level} !`, buf.width / 2, 40, Math.floor(performance.now() / 150) % 2 ? '#ffe060' : '#fff', 2, 'center', '#000');
    text(bx, (lvlUp.chest ? 'COFFRE ! ' : '') + `+${lvlUp.chips.toLocaleString('fr-FR')} JETONS` + (lvlUp.item ? ' + ' + ITEMS[lvlUp.item].name : ''), buf.width / 2, 58, '#60ff80', 1, 'center', '#000');
    if (lvlUp.rank) text(bx, 'NOUVEAU RANG : ' + lvlUp.rank, buf.width / 2, 68, rankColor(lvlUp.level, performance.now()), 1, 'center', '#000');
  }
  if (me.drunk > 0.05) {
    const lv = drunkLevel(me.drunk);
    bx.fillStyle = 'rgba(10,4,16,.8)'; bx.fillRect(6, 24, 70, 11);
    text(bx, lv[1], 9, 27, lv[2]);
  }
  if (me.homeless) {
    bx.fillStyle = 'rgba(40,20,10,.85)'; bx.fillRect(6, 37, 150, 11);
    text(bx, `SDF : ${Math.min(me.chips, ENTRY_MIN)}/${ENTRY_MIN} POUR RENTRER`, 9, 40, me.chips >= ENTRY_MIN ? '#60ff80' : '#e8c8a0');
  }
  if (loan) {
    const left = loan.left - (performance.now() - loan.at), y = me.homeless ? 50 : 37;
    const mm = Math.floor(left / 60000), ss = String(Math.floor(left / 1000) % 60).padStart(2, '0');
    bx.fillStyle = 'rgba(10,30,16,.85)'; bx.fillRect(6, y, 150, 11);
    text(bx, `REQUIN : ${loan.owe}  ${left > 0 ? mm + ':' + ss : 'EN RETARD !'}`, 9, y + 3, left > 0 ? '#80ff90' : (Math.floor(performance.now() / 300) % 2 ? '#ff5050' : '#ffe680'));
  }
  const online = players.length + (players.length > 1 ? ' JOUEURS' : ' JOUEUR');
  text(bx, online, buf.width - 6, 9, '#80f0ff', 1, 'right', '#000');
  if (!FILM && performance.now() - joinedAt < 30000) text(bx, 'ZQSD: BOUGER  E: INTERAGIR  ENTREE: CHAT  1-5: EMOTES  N: NIVEAUX  M: MUSIQUE  P: TELEPHONE', buf.width / 2, 26, 'rgba(255,255,255,.55)', 1, 'center', '#000');
}

requestAnimationFrame(frame);
