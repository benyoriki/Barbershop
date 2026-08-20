'use strict';
/* ==========================================================================
   BARBERSHOP TANTEH SUSI — Application Script
   Vanilla JS, localStorage-first ("LOCAL DEMO MODE").
   ========================================================================== */

// ── CONFIG (owner-editable single source of truth) ──
const CONFIG = {
  brand: {
    name: 'Barbershop Tanteh Susi',
    tagline: 'Barbershop untuk pria & wanita, ditangani capster wanita yang ramah dan modern',
    city: 'Bogor',
    timezone: 'Asia/Jakarta',
    whatsapp: '6281200000000',          // DATA DEMO — ganti sebelum production
    address: 'Jl. Contoh Raya No. 10, Bogor, Jawa Barat (DATA DEMO)',
    email: 'halo@tantehsusi.id',        // DATA DEMO
    instagram: '#',
    tiktok: '#'
  },
  booking: {
    deposit: 20000,
    depositRequired: true
  },
  payment: {
    bank: 'Bank Demo',
    accountNumber: '1234 5678 9099 (DEMO)',
    accountName: 'Tanteh Susi (DEMO)'
  },
  services: [
    { id: 'basic', name: 'Tanteh Basic', price: 30000, duration: 30, massage: false,
      features: ['Potong rambut', 'Konsultasi model', 'Styling sederhana', 'Finishing rapi'] },
    { id: 'premium', name: 'Tanteh Premium', price: 50000, duration: 50, massage: true,
      features: ['Potong rambut', 'Konsultasi model', 'Hair wash', 'Styling', 'Finishing', 'Special Pijat Relaksasi'] }
  ],
  // 0 = Minggu ... 6 = Sabtu
  hours: {
    0: { open: '08:30', close: '20:00' },
    1: { open: '09:00', close: '20:00' },
    2: { open: '09:00', close: '20:00' },
    3: { open: '09:00', close: '20:00' },
    4: { open: '09:00', close: '20:00' },
    5: { open: '09:00', close: '20:30' },
    6: { open: '08:30', close: '21:00' }
  },
  // `photo` boleh diisi path seperti "img/capster-nia.jpg" (foto asli capster dengan izin).
  // Jika kosong/gagal dimuat, otomatis fallback ke avatar inisial elegan.
  capsters: [
    { id: 'susi',  name: 'Tanteh Susi', experience: '10 Tahun Pengalaman', specialty: 'Founder & Senior Capster', rating: 4.9, defaultStatus: 'available', photo: 'img/capster-susi.jpg' },
    { id: 'nia',   name: 'Nia',  experience: '5 Tahun Pengalaman', specialty: 'Layering & Styling', rating: 4.8, defaultStatus: 'available', photo: 'img/capster-nia.jpg' },
    { id: 'rani',  name: 'Rani', experience: '4 Tahun Pengalaman', specialty: 'Potong Rapi & Cepat', rating: 4.8, defaultStatus: 'busy', photo: 'img/capster-rani.jpg' },
    { id: 'dinda', name: 'Dinda',experience: '3 Tahun Pengalaman', specialty: 'Konsultasi Model', rating: 4.7, defaultStatus: 'available', photo: 'img/capster-dinda.jpg' },
    { id: 'wulan', name: 'Wulan',experience: '3 Tahun Pengalaman', specialty: 'Hair Wash & Relax', rating: 4.7, defaultStatus: 'rest', photo: 'img/capster-wulan.jpg' }
  ],
  admin: { email: 'admin@tantehsusi.id', password: 'admin123' }, // DEMO ONLY — client-side auth is NOT secure for production
  avgServiceMinutes: 40
};

// ══════════════════════════════════════════════════════════════════════════
// STORAGE ABSTRACTION
// LOCAL DEMO MODE — data hanya tersimpan pada browser/device ini.
// Untuk realtime multi-device production, ganti LocalStorageAdapter dengan
// FirebaseAdapter / SupabaseAdapter / RESTApiAdapter yang mengimplementasi
// interface get/set/delete/list yang sama.
// ══════════════════════════════════════════════════════════════════════════
const NS = 'tantehSusi_';

class LocalStorageAdapter {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(NS + key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  delete(key) { try { localStorage.removeItem(NS + key); return true; } catch (e) { return false; } }
  list(prefix = '') {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NS + prefix)) out.push(k.slice(NS.length));
    }
    return out;
  }
}
class DataStore {
  constructor(adapter) { this.adapter = adapter; }
  get(key, fallback) { return this.adapter.get(key, fallback); }
  set(key, value) { return this.adapter.set(key, value); }
  delete(key) { return this.adapter.delete(key); }
  list(prefix) { return this.adapter.list(prefix); }
}
const StorageService = new DataStore(new LocalStorageAdapter());

// ── APP STATE ──
let S = {
  queues: [], bookings: [], transactions: [], gallery: [], reviews: [],
  capsterStatus: {}, nextQueueNumber: 1,
  myTicket: null, myBooking: null,
  adminIn: false,
  clickCnt: 0, clickTimer: null,
  testiIdx: 0, transFilt: 'all',
  bookingDraft: { step: 1, serviceId: null, capsterId: 'any', date: null, time: null, name: '', phone: '' }
};

function loadState() {
  S.queues = StorageService.get('queues', []);
  S.bookings = StorageService.get('bookings', []);
  S.transactions = StorageService.get('transactions', []);
  S.gallery = StorageService.get('gallery', []);
  S.reviews = StorageService.get('reviews', []);
  S.nextQueueNumber = StorageService.get('nextQueueNumber', 1);
  S.myTicket = StorageService.get('currentTicket', null);
  S.myBooking = StorageService.get('currentBooking', null);
  const savedCapSt = StorageService.get('capsters', null);
  S.capsterStatus = {};
  CONFIG.capsters.forEach(c => {
    S.capsterStatus[c.id] = (savedCapSt && savedCapSt[c.id]) || c.defaultStatus;
  });
  const savedSettings = StorageService.get('settings', null);
  if (savedSettings) {
    if (savedSettings.deposit != null) CONFIG.booking.deposit = savedSettings.deposit;
    if (savedSettings.bank) CONFIG.payment.bank = savedSettings.bank;
    if (savedSettings.accountNumber) CONFIG.payment.accountNumber = savedSettings.accountNumber;
    if (savedSettings.whatsapp) CONFIG.brand.whatsapp = savedSettings.whatsapp;
    if (savedSettings.address) CONFIG.brand.address = savedSettings.address;
  }
  const savedAdmin = StorageService.get('adminCreds', null);
  if (savedAdmin) { CONFIG.admin.email = savedAdmin.email; CONFIG.admin.password = savedAdmin.password; }
}

function saveQueues() { StorageService.set('queues', S.queues); }
function saveBookings() { StorageService.set('bookings', S.bookings); }
function saveTrans() { StorageService.set('transactions', S.transactions); }
function saveGallery() { StorageService.set('gallery', S.gallery); }
function saveReviews() { StorageService.set('reviews', S.reviews); }
function saveNextQ() { StorageService.set('nextQueueNumber', S.nextQueueNumber); }
function saveMyTicket() { StorageService.set('currentTicket', S.myTicket); }
function saveMyBooking() { StorageService.set('currentBooking', S.myBooking); }
function saveCapsters() { StorageService.set('capsters', S.capsterStatus); }
function saveSettings() {
  StorageService.set('settings', {
    deposit: CONFIG.booking.deposit, bank: CONFIG.payment.bank,
    accountNumber: CONFIG.payment.accountNumber, whatsapp: CONFIG.brand.whatsapp, address: CONFIG.brand.address
  });
}

// ══════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initLoader();
  initTheme();
  initNavbar();
  initReveal();
  initHamburger();
  initTicker();
  initPricing();
  initCapsters();
  initQueue();
  initBookingWidgetHero();
  initGallery();
  initTestimonials();
  initFAQ();
  initContact();
  initFooter();
  initStickyCTA();
  initBottomNav();
  initFloatBook();
  initProtoNotice();
  initBookingWizard();
  initPaymentModal();
  initBookingStatusModal();
  initChatbot();
  initAdmin();
  initBTT();
  initLightbox();
  window.addEventListener('storage', onStorageEvent); // cross-tab sync (same browser)
  setInterval(masterTick, 1000);
  setInterval(refreshLiveData, 8000);
  masterTick(); refreshLiveData();

  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  }));
});

function onStorageEvent(e) {
  if (!e.key || !e.key.startsWith(NS)) return;
  loadState();
  refreshLiveData();
  renderQList(); renderCapsters();
  if (S.adminIn) refreshAdmin();
}

function masterTick() {
  tickClock();
}

function refreshLiveData() {
  renderLiveStatus();
  renderSmartCard();
  renderHoursHighlight();
  renderQStats();
  renderNowServing();
  renderQList();
  renderCapsters();
  renderStickyInfo();
  if (S.myTicket) updateMyTicket();
  if (S.myBooking) updateBookingStatusIfOpen();
  if (S.adminIn) refreshAdmin();
}

// ── HELPERS ──
const pad2 = n => String(n).padStart(2, '0');
const rupiah = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function queueLabel(n) { return 'A' + String(n).padStart(3, '0'); }
function bookingId() {
  const n = new Date();
  const ds = `${n.getFullYear()}${pad2(n.getMonth() + 1)}${pad2(n.getDate())}`;
  const seq = String((S.bookings.length + 1)).padStart(3, '0');
  return `TS-${ds}-${seq}`;
}
function svcById(id) { return CONFIG.services.find(s => s.id === id); }
function capById(id) { return CONFIG.capsters.find(c => c.id === id); }
function nowJakarta() {
  // Use Intl to get accurate Asia/Jakarta wall-clock time regardless of device TZ
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.brand.timezone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
  });
  const parts = {};
  fmt.formatToParts(new Date()).forEach(p => parts[p.type] = p.value);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: +parts.year, month: +parts.month, day: +parts.day,
    hour: +parts.hour, minute: +parts.minute, second: +parts.second,
    weekday: map[parts.weekday]
  };
}
function minutesOf(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function fmtHHMM(mins) { return pad2(Math.floor(mins / 60) % 24) + ':' + pad2(mins % 60); }

function showToast(msg, dur = 3200) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), dur);
}
function playSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

// ══════════════════════════════════════════════════════════════════════════
// LOADER / THEME / NAVBAR / HAMBURGER / REVEAL
// ══════════════════════════════════════════════════════════════════════════
const LOADER_DURATION = 6000;
function initLoader() {
  document.body.style.overflow = 'hidden';

  // floating particles
  const pWrap = document.getElementById('ldParticles');
  if (pWrap) {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.bottom = (Math.random() * 20) + 'px';
      s.style.animationDelay = (Math.random() * 4.5) + 's';
      s.style.animationDuration = (3.5 + Math.random() * 2.5) + 's';
      pWrap.appendChild(s);
    }
  }

  // rotating subtitle
  const subEl = document.getElementById('ldSub');
  const subs = ['Menyiapkan pengalaman terbaik…', 'Merapikan antrean live…', 'Menyapa capster wanita kami…', 'Hampir siap, tunggu sebentar…'];
  let si = 0;
  if (subEl) {
    const subInterval = setInterval(() => {
      si = (si + 1) % subs.length;
      subEl.style.opacity = 0;
      setTimeout(() => { subEl.textContent = subs[si]; subEl.style.opacity = 1; }, 250);
    }, LOADER_DURATION / subs.length);
    setTimeout(() => clearInterval(subInterval), LOADER_DURATION);
  }

  // percentage counter synced to fill duration
  const pctEl = document.getElementById('ldPct');
  const start = performance.now();
  function tickPct(now) {
    const elapsed = now - start;
    const pct = Math.min(100, Math.round((elapsed / LOADER_DURATION) * 100));
    if (pctEl) pctEl.textContent = pct + '%';
    if (elapsed < LOADER_DURATION) requestAnimationFrame(tickPct);
  }
  requestAnimationFrame(tickPct);

  setTimeout(() => {
    const l = document.getElementById('loader');
    if (l) l.classList.add('out');
    document.body.style.overflow = '';
    setTimeout(() => { if (l) l.remove(); }, 800);
  }, LOADER_DURATION);
}

function initTheme() {
  const saved = StorageService.get('theme', 'light');
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeBtn');
  btn.textContent = saved === 'dark' ? '☀️' : '🌙';
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
    StorageService.set('theme', next);
  });
}

function initNavbar() {
  const nav = document.getElementById('navbar');
  const links = document.querySelectorAll('.nl');
  const progress = document.getElementById('scrollProgress');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scr', window.scrollY > 30);
    if (progress) {
      const h = document.documentElement;
      const pct = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      progress.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
    const pos = window.scrollY + 120;
    document.querySelectorAll('section[id]').forEach(sec => {
      if (pos >= sec.offsetTop && pos < sec.offsetTop + sec.offsetHeight) {
        links.forEach(l => l.classList.toggle('act', l.getAttribute('href') === '#' + sec.id));
      }
    });
  }, { passive: true });
  links.forEach(l => l.addEventListener('click', closeMobileNav));
  document.getElementById('navBookBtn').addEventListener('click', () => openBookingWizard());
}

function initHamburger() {
  const hbg = document.getElementById('hbg');
  const nl = document.getElementById('navLinks');
  const scrim = document.getElementById('navScrim');
  function toggle() {
    const open = !nl.classList.contains('open');
    hbg.classList.toggle('on', open); nl.classList.toggle('open', open);
    scrim.classList.toggle('on', open);
    hbg.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  hbg.addEventListener('click', toggle);
  scrim.addEventListener('click', closeMobileNav);
}
function closeMobileNav() {
  document.getElementById('hbg').classList.remove('on');
  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('navScrim').classList.remove('on');
}

function initReveal() {
  const obs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('vis');
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-r]').forEach(el => obs.observe(el));
  window._reveal = () => document.querySelectorAll('[data-r]:not(.vis)').forEach(el => obs.observe(el));
}

// ══════════════════════════════════════════════════════════════════════════
// CLOCK / OPERATING HOURS / LIVE STATUS
// ══════════════════════════════════════════════════════════════════════════
function tickClock() {
  const n = nowJakarta();
  const t = `${pad2(n.hour)}:${pad2(n.minute)}:${pad2(n.second)}`;
  const el = document.getElementById('liveClock'); if (el) el.textContent = t;
  const ael = document.getElementById('aClock'); if (ael) ael.textContent = t;
}

function getHoursStatus() {
  const n = nowJakarta();
  const today = CONFIG.hours[n.weekday];
  const nowMin = n.hour * 60 + n.minute;
  const openMin = minutesOf(today.open), closeMin = minutesOf(today.close);
  const isOpen = nowMin >= openMin && nowMin < closeMin;
  return {
    isOpen, openMin, closeMin, nowMin,
    minutesToOpen: openMin - nowMin,
    minutesToClose: closeMin - nowMin,
    openStr: today.open, closeStr: today.close
  };
}

function getCrowdLevel() {
  const active = S.queues.filter(q => q.status === 'waiting' || q.status === 'processing').length;
  if (active <= 2) return { level: 'low', label: '🟢 SEPI', count: active };
  if (active <= 5) return { level: 'low', label: '🟢 NORMAL', count: active };
  if (active <= 9) return { level: 'mid', label: '🟡 CUKUP RAMAI', count: active };
  return { level: 'high', label: '🔴 RAMAI', count: active };
}

function activeCapsterCount() {
  return CONFIG.capsters.filter(c => {
    const st = S.capsterStatus[c.id];
    return st === 'available' || st === 'busy';
  }).length || 1;
}

function estimateWaitMinutes() {
  const waiting = S.queues.filter(q => q.status === 'waiting');
  if (!waiting.length) return 0;
  let totalMin = 0;
  waiting.forEach(q => { const svc = svcById(q.serviceId); totalMin += svc ? svc.duration : CONFIG.avgServiceMinutes; });
  const capsters = activeCapsterCount();
  return Math.max(5, Math.round(totalMin / capsters));
}

function renderHoursHighlight() {
  const list = document.getElementById('hoursList'); if (!list) return;
  const n = nowJakarta();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
  list.innerHTML = days.map((d, i) => {
    const h = CONFIG.hours[i];
    return `<div class="hours-row${i === n.weekday ? ' today' : ''}"><span>${d}</span><span>${h.open}–${h.close}</span></div>`;
  }).join('');
  const st = getHoursStatus();
  const note = document.getElementById('hoursNote');
  if (st.isOpen) {
    note.textContent = `🟢 Buka sekarang, tutup pukul ${st.closeStr} WIB.`;
  } else if (st.minutesToOpen > 0 && st.minutesToOpen <= 60) {
    note.textContent = `🟡 Segera buka. Tinggal ${st.minutesToOpen} menit lagi.`;
  } else if (st.minutesToOpen > 60) {
    note.textContent = `⚪ Belum buka. Buka pukul ${st.openStr} WIB hari ini.`;
  } else {
    note.textContent = `🔴 Saat ini tutup. Buka kembali besok pukul ${CONFIG.hours[(n.weekday + 1) % 7].open} WIB.`;
  }
}

function renderLiveStatus() {
  const st = getHoursStatus();
  const crowd = getCrowdLevel();
  const serving = S.queues.filter(q => q.status === 'processing').length;
  const waitMin = estimateWaitMinutes();

  const liveEl = document.getElementById('lcLive');
  const badge = document.getElementById('lcStatusBadge');
  const sub = document.getElementById('lcStatusSub');

  let statusText, statusColor, subText;
  if (!st.isOpen) {
    if (st.minutesToOpen > 0 && st.minutesToOpen <= 60) {
      statusText = '🟡 SEGERA BUKA'; statusColor = 'var(--amber)';
      subText = `Buka dalam ${st.minutesToOpen} menit (${st.openStr} WIB)`;
      liveEl.classList.remove('op');
    } else if (st.minutesToOpen > 60) {
      statusText = '⚪ BELUM BUKA'; statusColor = 'var(--text-faint)';
      subText = `Buka kembali pukul ${st.openStr} WIB`;
      liveEl.classList.remove('op');
    } else {
      statusText = '🔴 TUTUP'; statusColor = 'var(--red)';
      subText = `Buka kembali besok pukul ${CONFIG.hours[(nowJakarta().weekday + 1) % 7].open} WIB`;
      liveEl.classList.remove('op');
    }
  } else if (crowd.level === 'mid' || crowd.level === 'high') {
    statusText = '🟡 RAMAI — ANTREAN SEDANG BERJALAN'; statusColor = 'var(--amber)';
    subText = 'Buka sekarang, siap melayani (cukup ramai)';
    liveEl.classList.add('op');
  } else {
    statusText = '🟢 BUKA — SIAP MELAYANI'; statusColor = 'var(--green)';
    subText = 'Buka sekarang, silakan datang';
    liveEl.classList.add('op');
  }
  badge.textContent = statusText; badge.style.color = statusColor;
  sub.textContent = subText;

  document.getElementById('lcQueue').textContent = S.queues.filter(q => q.status === 'waiting').length;
  document.getElementById('lcServing').textContent = serving;
  document.getElementById('lcWait').textContent = waitMin > 0 ? `±${waitMin}m` : '—';

  const crowdEl = document.getElementById('lcCrowd');
  const crowdTxt = document.getElementById('lcCrowdTxt');
  crowdEl.className = 'lc-crowd ' + crowd.level;
  crowdTxt.textContent = `${crowd.label} — ${crowd.count} orang dalam antrean`;
}

function renderSmartCard() {
  const crowd = getCrowdLevel();
  const ans = document.getElementById('smartAns');
  const desc = document.getElementById('smartDesc');
  const st = getHoursStatus();
  if (!st.isOpen) {
    ans.className = 'smart-ans mid'; ans.textContent = '⚪ Sedang Tutup';
    desc.textContent = st.minutesToOpen > 0 && st.minutesToOpen <= 60
      ? `Segera buka dalam ${st.minutesToOpen} menit. Booking dulu biar dapat slot pertama.`
      : `Barbershop sedang tutup. Booking untuk jadwal berikutnya, atau cek jam operasional di samping.`;
    return;
  }
  if (crowd.count <= 2) {
    ans.className = 'smart-ans low'; ans.textContent = '🟢 Tidak Terlalu Ramai';
    desc.textContent = `Saat ini hanya ${crowd.count} orang menunggu. Bisa langsung datang tanpa booking.`;
  } else if (crowd.count <= 9) {
    ans.className = 'smart-ans mid'; ans.textContent = '🟡 Sebaiknya Booking Dulu';
    desc.textContent = `Saat ini ada ${crowd.count} orang dalam antrean. Booking disarankan biar nggak menunggu lama.`;
  } else {
    ans.className = 'smart-ans high'; ans.textContent = '🔴 Sedang Ramai';
    desc.textContent = `${crowd.count} orang sedang menunggu. Booking sangat disarankan.`;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// TICKER
// ══════════════════════════════════════════════════════════════════════════
function initTicker() {
  const items = [
    '🙌 Melayani pelanggan pria & wanita setiap hari',
    '💆 Special Pijat Relaksasi setiap paket Premium',
    '👩‍🦰 Semua capster kami adalah wanita berpengalaman',
    '📅 Booking online, wajib DP untuk mengunci slot',
    '🎫 Walk-in? Ambil antrean langsung tanpa DP'
  ];
  const track = document.getElementById('tkTrack');
  const all = [...items, ...items];
  track.innerHTML = all.map(i => `<span class="tk-item">${i}</span>`).join('<span class="tk-item">•</span>');
}

// ══════════════════════════════════════════════════════════════════════════
// PRICING
// ══════════════════════════════════════════════════════════════════════════
function initPricing() {
  const grid = document.getElementById('priceGrid'); if (!grid) return;
  grid.innerHTML = CONFIG.services.map((s, i) => `
    <div class="price-card${s.massage ? ' feat' : ''}" data-r data-r-d="${i}">
      ${s.massage ? '<div class="price-badge">⭐ PALING FAVORIT</div>' : ''}
      <div class="price-name">${s.id === 'basic' ? '✂️' : '✨'} ${s.name}</div>
      <div class="price-desc">${s.massage ? 'Layanan lengkap + relaksasi' : 'Layanan esensial, cepat & rapi'}</div>
      <div class="price-amt">${rupiah(s.price)}</div>
      <div class="price-dur">🕐 Estimasi ±${s.duration} menit</div>
      <ul class="price-list">
        ${s.features.map(f => `<li><span class="ck">✓</span>${f}</li>`).join('')}
      </ul>
      <button class="btn-pri btn-full" data-book-service="${s.id}">Pilih ${s.name}</button>
    </div>`).join('');
  grid.querySelectorAll('[data-book-service]').forEach(btn => btn.addEventListener('click', () => {
    openBookingWizard({ serviceId: btn.dataset.bookService });
  }));
  document.getElementById('cmpBasicPrice').textContent = rupiah(svcById('basic').price);
  document.getElementById('cmpPremiumPrice').textContent = rupiah(svcById('premium').price);
  document.getElementById('relaxDur').textContent = `±5–10 menit`;
  window._reveal && window._reveal();
}

function serviceSelectOptions() {
  return CONFIG.services.map(s => `<option value="${s.id}">${s.name} – ${rupiah(s.price)}</option>`).join('');
}
function capsterSelectOptions(includeAny = true) {
  let out = includeAny ? `<option value="any">Siapa saja (Tersedia)</option>` : '';
  out += CONFIG.capsters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  return out;
}

// ══════════════════════════════════════════════════════════════════════════
// CAPSTER
// ══════════════════════════════════════════════════════════════════════════
const CAP_STATUS_LABEL = { available: ['🟢', 'Tersedia'], busy: ['✂️', 'Sedang Mencukur'], rest: ['☕', 'Istirahat'], off: ['🔴', 'Offline'] };

function initCapsters() { renderCapsters(); }

function renderCapsters() {
  const grid = document.getElementById('capGrid'); if (!grid) return;
  grid.innerHTML = CONFIG.capsters.map((c, i) => {
    const st = S.capsterStatus[c.id] || c.defaultStatus;
    const [icon, label] = CAP_STATUS_LABEL[st];
    const initials = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const activeQ = S.queues.find(q => q.capsterId === c.id && q.status === 'processing');
    const avInner = c.photo
      ? `<img src="${c.photo}" alt="Foto ${escapeHTML(c.name)}" loading="lazy" onerror="this.parentElement.classList.add('noimg');this.remove();"/><span class="cap-av-fallback">${initials}</span>`
      : `<span class="cap-av-fallback">${initials}</span>`;
    return `<div class="cap-card" data-r data-r-d="${i % 5}">
      <div class="cap-av${c.photo ? '' : ' noimg'}">${avInner}<span class="cap-status-dot ${st}"></span></div>
      <div class="cap-name">${c.name}</div>
      <div class="cap-exp">${c.experience}</div>
      <div class="cap-spec">${c.specialty}</div>
      <div class="cap-rating">★ ${c.rating.toFixed(1)}</div>
      <div class="cap-st-txt ${st}">${icon} ${label}${activeQ ? ' ' + queueLabel(activeQ.number) : ''}</div>
    </div>`;
  }).join('');
  document.getElementById('statCap').textContent = CONFIG.capsters.length;
  window._reveal && window._reveal();
}

// ══════════════════════════════════════════════════════════════════════════
// QUEUE (WALK-IN)
// ══════════════════════════════════════════════════════════════════════════
function initQueue() {
  const qService = document.getElementById('qService');
  const qCapster = document.getElementById('qCapster');
  qService.innerHTML = serviceSelectOptions();
  qCapster.innerHTML = capsterSelectOptions(true);

  renderQStats(); renderQList(); renderNowServing();
  if (S.myTicket) {
    const q = S.queues.find(x => x.id === S.myTicket.id);
    if (q && q.status !== 'done' && q.status !== 'cancelled') showTicket(q);
    else { S.myTicket = null; saveMyTicket(); }
  }
  document.getElementById('takeQBtn').addEventListener('click', takeQueue);
  document.getElementById('cancelQBtn').addEventListener('click', cancelQueue);
  document.getElementById('shareTicketBtn').addEventListener('click', shareTicket);
  const howQ = document.getElementById('howQueueBtn'); if (howQ) howQ.addEventListener('click', () => scrollToId('#antrean'));
  const smartQ = document.getElementById('smartQueueBtn'); if (smartQ) smartQ.addEventListener('click', () => scrollToId('#antrean'));
}

function scrollToId(id) { const t = document.querySelector(id); if (t) t.scrollIntoView({ behavior: 'smooth' }); }

function takeQueue() {
  const name = document.getElementById('qName').value.trim();
  if (!name) { showToast('⚠️ Nama harus diisi!'); document.getElementById('qName').focus(); return; }
  if (S.myTicket) { showToast('⚠️ Kamu sudah punya antrean aktif!'); return; }
  const serviceId = document.getElementById('qService').value;
  const capsterId = document.getElementById('qCapster').value;
  const svc = svcById(serviceId);
  const q = {
    id: genId(), number: S.nextQueueNumber++, name,
    phone: document.getElementById('qPhone').value.trim(),
    serviceId, capsterId, status: 'waiting',
    estimatedMinutes: svc ? svc.duration : CONFIG.avgServiceMinutes,
    createdAt: new Date().toISOString()
  };
  S.queues.push(q); S.myTicket = { id: q.id };
  saveQueues(); saveNextQ(); saveMyTicket();
  showTicket(q); renderQStats(); renderQList(); renderNowServing(); renderStickyInfo();
  playSound();
  showToast(`✅ Antrean ${queueLabel(q.number)} berhasil diambil!`);
}

function showTicket(q) {
  document.getElementById('takeCard').style.display = 'none';
  document.getElementById('ticketBox').style.display = 'block';
  document.getElementById('tktNum').textContent = queueLabel(q.number);
  document.getElementById('tktName').textContent = q.name;
  document.getElementById('tktSvc').textContent = svcById(q.serviceId)?.name || q.serviceId;
  document.getElementById('tktCapster').textContent = q.capsterId === 'any' ? 'Siapa saja' : (capById(q.capsterId)?.name || q.capsterId);
  const ahead = S.queues.filter(x => x.status === 'waiting' && x.number < q.number).length;
  document.getElementById('tktWait').textContent = ahead < 1 ? 'Segera' : `~${estimateWaitMinutes()} menit`;
  const stEl = document.getElementById('tktStatus');
  const map = { waiting: ['Menunggu', 'wait'], processing: ['⚡ Sedang Dicukur', 'proc'], done: ['Selesai', 'done'], cancelled: ['Dibatalkan', 'canc'] };
  const [lbl, cls] = map[q.status] || ['Menunggu', 'wait'];
  stEl.textContent = lbl; stEl.className = 'stbadge ' + cls;
}

function updateMyTicket() {
  if (!S.myTicket) return;
  const q = S.queues.find(x => x.id === S.myTicket.id);
  if (!q) return;
  showTicket(q);
  const prev = StorageService.get('prevQueueStatus_' + q.id);
  if (q.status === 'processing' && prev !== 'processing') { playSound(); showToast('🔔 Giliran kamu sekarang! Segera ke kursi capster.'); }
  StorageService.set('prevQueueStatus_' + q.id, q.status);
}

function cancelQueue() {
  if (!S.myTicket) return;
  const idx = S.queues.findIndex(x => x.id === S.myTicket.id);
  if (idx !== -1) S.queues[idx].status = 'cancelled';
  S.myTicket = null; saveQueues(); saveMyTicket();
  document.getElementById('ticketBox').style.display = 'none';
  document.getElementById('takeCard').style.display = 'block';
  document.getElementById('qName').value = '';
  renderQStats(); renderQList(); renderNowServing(); renderStickyInfo();
  showToast('❌ Antrean dibatalkan.');
}

function renderQStats() {
  const waiting = S.queues.filter(q => q.status === 'waiting').length;
  const proc = S.queues.filter(q => q.status === 'processing').length;
  const doneToday = S.queues.filter(q => q.status === 'done' && sameDay(q.createdAt)).length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('qTotal', waiting + proc);
  set('qActive', proc);
  set('qDone', doneToday);
  const wait = estimateWaitMinutes();
  set('qWait', wait > 0 ? `±${wait}m` : '0m');
}

function sameDay(iso) { return new Date(iso).toDateString() === new Date().toDateString(); }

function renderNowServing() {
  const cur = S.queues.find(q => q.status === 'processing');
  const box = document.getElementById('nowServingBox'); if (!box) return;
  if (!cur) {
    document.getElementById('nsNum').textContent = '–';
    document.getElementById('nsName').textContent = 'Belum ada yang dilayani';
    document.getElementById('nsAhead').textContent = S.queues.filter(q => q.status === 'waiting').length;
    document.getElementById('nsEst').textContent = '—';
    return;
  }
  document.getElementById('nsNum').textContent = queueLabel(cur.number);
  document.getElementById('nsName').textContent = (capById(cur.capsterId)?.name || 'Capster') + ' — ' + cur.name;
  document.getElementById('nsAhead').textContent = S.queues.filter(q => q.status === 'waiting').length;
  const wait = estimateWaitMinutes();
  document.getElementById('nsEst').textContent = wait > 0 ? `±${wait} menit` : 'Segera';
}

function renderQList() {
  const list = document.getElementById('qList'); if (!list) return;
  const active = S.queues.filter(q => q.status !== 'done' && q.status !== 'cancelled');
  if (!active.length) { list.innerHTML = `<div class="q-empty"><div class="qi">🎫</div><p>Belum ada antrean. Jadilah yang pertama mengambil nomor!</p></div>`; return; }
  list.innerHTML = active.map(q => {
    const map = { waiting: ['Menunggu', 'wait'], processing: ['⚡ Dicukur', 'proc'] };
    const [lbl, cls] = map[q.status] || ['Menunggu', 'wait'];
    const t = new Date(q.createdAt);
    return `<div class="q-item">
      <div class="q-num">${queueLabel(q.number)}</div>
      <div class="q-info"><strong>${escapeHTML(q.name)}</strong><span>${svcById(q.serviceId)?.name || ''} · ${q.capsterId === 'any' ? 'Siapa saja' : (capById(q.capsterId)?.name || '')}</span></div>
      <span class="stbadge ${cls}">${lbl}</span>
    </div>`;
  }).join('');
}

function escapeHTML(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

window.shareTicket = shareTicket;
function shareTicket() {
  if (!S.myTicket) return;
  const q = S.queues.find(x => x.id === S.myTicket.id); if (!q) return;
  const txt = `✂️ Antrean di ${CONFIG.brand.name}!\nNomor: ${queueLabel(q.number)}\nLayanan: ${svcById(q.serviceId)?.name}`;
  if (navigator.share) navigator.share({ title: CONFIG.brand.name, text: txt });
  else navigator.clipboard?.writeText(txt).then(() => showToast('✅ Disalin ke clipboard!'));
}

// ══════════════════════════════════════════════════════════════════════════
// HERO QUICK BOOKING WIDGET
// ══════════════════════════════════════════════════════════════════════════
function initBookingWidgetHero() {
  const svcSel = document.getElementById('qbService');
  svcSel.innerHTML = serviceSelectOptions();
  populateQbTimes();
  document.getElementById('qbDay').addEventListener('change', populateQbTimes);
  document.getElementById('qbCheckBtn').addEventListener('click', checkQuickSlot);
}

function populateQbTimes() {
  const day = document.getElementById('qbDay').value;
  const n = nowJakarta();
  const weekday = day === 'today' ? n.weekday : (n.weekday + 1) % 7;
  const h = CONFIG.hours[weekday];
  const openMin = minutesOf(h.open), closeMin = minutesOf(h.close);
  const nowMin = n.hour * 60 + n.minute;
  const opts = [];
  for (let m = openMin; m < closeMin; m += 30) {
    if (day === 'today' && m < nowMin) continue;
    opts.push(`<option value="${m}">${fmtHHMM(m)}</option>`);
  }
  const sel = document.getElementById('qbTime');
  sel.innerHTML = opts.length ? opts.join('') : `<option value="">Tutup hari ini</option>`;
}

function checkQuickSlot() {
  const day = document.getElementById('qbDay').value;
  const timeVal = document.getElementById('qbTime').value;
  const serviceId = document.getElementById('qbService').value;
  const resultEl = document.getElementById('qbResult');
  resultEl.classList.add('show');
  if (!timeVal) { resultEl.className = 'qb-result show full'; resultEl.textContent = '🔴 Barbershop tutup pada hari yang dipilih.'; return; }

  const n = nowJakarta();
  const isToday = day === 'today';
  if (isToday) {
    const crowd = getCrowdLevel();
    const wait = estimateWaitMinutes();
    if (crowd.count > 0) {
      resultEl.className = 'qb-result show wait';
      resultEl.textContent = `🟡 Sekarang ada ${crowd.count} antrean. Estimasi tunggu ±${wait || 15} menit.`;
      return;
    }
  }
  // Simulate slot capacity check against existing bookings at that date/time
  const dateStr = getDateStrForDay(day);
  const bookingsAtSlot = S.bookings.filter(b => b.date === dateStr && b.time === fmtHHMM(+timeVal) && b.status !== 'CANCELLED').length;
  const capacity = activeCapsterCount();
  if (bookingsAtSlot < capacity) {
    resultEl.className = 'qb-result show ok';
    resultEl.textContent = `🟢 Slot tersedia pukul ${fmtHHMM(+timeVal)}. Yuk booking sekarang!`;
  } else {
    resultEl.className = 'qb-result show full';
    resultEl.textContent = `🔴 Slot pukul ${fmtHHMM(+timeVal)} penuh. Coba jam lain.`;
  }
}

function getDateStrForDay(day) {
  const n = new Date();
  if (day === 'tomorrow') n.setDate(n.getDate() + 1);
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`;
}

// ══════════════════════════════════════════════════════════════════════════
// GALLERY
// ══════════════════════════════════════════════════════════════════════════
const GAL_DEMO = [
  { icon: '💈', ratio: 4 / 5 }, { icon: '✂️', ratio: 1 }, { icon: '💇‍♀️', ratio: 5 / 4 },
  { icon: '🎀', ratio: 4 / 5 }, { icon: '💆‍♀️', ratio: 1 }, { icon: '✨', ratio: 5 / 4 },
  { icon: '💇‍♀️', ratio: 4 / 5 }, { icon: '💈', ratio: 1 }
];
function initGallery() { renderPublicGallery(); }
function renderPublicGallery() {
  const grid = document.getElementById('galGrid'); if (!grid) return;
  const uploaded = S.gallery.map(g => `<div class="gal-item" data-full="${g.url}"><img src="${g.url}" alt="Hasil kerja Tanteh Susi" loading="lazy"/></div>`);
  const demo = GAL_DEMO.map((d, i) => `<div class="gal-item ph" data-r data-r-d="${i % 5}" style="aspect-ratio:${d.ratio}"><span class="gi">${d.icon}</span><small>DATA DEMO</small></div>`);
  grid.innerHTML = [...uploaded, ...demo].join('');
  grid.querySelectorAll('.gal-item[data-full]').forEach(el => el.addEventListener('click', () => openLightbox(el.dataset.full)));
  window._reveal && window._reveal();
}
function initLightbox() {
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
}
function openLightbox(url) { document.getElementById('lbImg').src = url; document.getElementById('lightbox').classList.add('on'); }
function closeLightbox() { document.getElementById('lightbox').classList.remove('on'); }

// ══════════════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ══════════════════════════════════════════════════════════════════════════
const TESTI_DEMO = [
  { stars: 5, text: 'Awalnya ragu karena capsternya wanita semua, eh ternyata malah lebih detail dan sabar. Hasil potongnya rapi banget buat rambut cowok.', name: 'Pelanggan Tanteh Susi' },
  { stars: 5, text: 'Pelayanannya ramah banget. Hasil cukurnya rapi dan ternyata setelah selesai ada pijat relaksasi. Enak banget.', name: 'Pelanggan Tanteh Susi' },
  { stars: 5, text: 'Suka konsepnya, capsternya semua wanita jadi lebih nyaman ngobrol soal model rambut yang aku mau.', name: 'Pelanggan Tanteh Susi' },
  { stars: 5, text: 'Sistem antreannya membantu banget, bisa cek dulu dari rumah sebelum berangkat.', name: 'Pelanggan Tanteh Susi' },
  { stars: 4, text: 'Booking-nya gampang, tinggal isi form dan bayar DP. Pas datang langsung dilayani tanpa nunggu lama.', name: 'Pelanggan Tanteh Susi' }
];
function initTestimonials() {
  const track = document.getElementById('testiTrack');
  const wrap = document.getElementById('testiWrap');
  const dotsEl = document.getElementById('tDots');
  if (!track) return;
  const all = [...TESTI_DEMO, ...S.reviews.map(r => ({ stars: r.stars, text: r.text, name: r.name, real: true }))];
  track.innerHTML = all.map(t => `<div class="testi-card">
      <div class="t-stars">${'★'.repeat(t.stars)}${'☆'.repeat(5 - t.stars)}</div>
      <p class="t-text">"${escapeHTML(t.text)}"</p>
      <div class="t-author"><div class="t-av">${t.name.slice(0, 2).toUpperCase()}</div><div><strong>${escapeHTML(t.name)}</strong><span>${t.real ? 'Ulasan Pelanggan' : 'Data Demo'}</span></div></div>
    </div>`).join('');
  const cards = track.querySelectorAll('.testi-card');
  const total = cards.length;
  dotsEl.innerHTML = '';
  cards.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 't-dot' + (i === 0 ? ' on' : '');
    d.setAttribute('aria-label', 'Slide ' + (i + 1));
    d.addEventListener('click', () => goSlide(i));
    dotsEl.appendChild(d);
  });
  let startX = 0, dragging = false;
  function goSlide(i) {
    S.testiIdx = Math.max(0, Math.min(i, total - 1));
    const w = cards[0].offsetWidth + 20;
    track.style.transform = `translateX(-${S.testiIdx * w}px)`;
    dotsEl.querySelectorAll('.t-dot').forEach((d, j) => d.classList.toggle('on', j === S.testiIdx));
  }
  wrap.addEventListener('touchstart', e => { startX = e.touches[0].pageX; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].pageX;
    if (diff > 40) goSlide(S.testiIdx + 1); else if (diff < -40) goSlide(S.testiIdx - 1);
  });
  wrap.addEventListener('mousedown', e => { dragging = true; startX = e.pageX; });
  window.addEventListener('mouseup', e => {
    if (!dragging) return; dragging = false;
    const diff = startX - e.pageX;
    if (diff > 50) goSlide(S.testiIdx + 1); else if (diff < -50) goSlide(S.testiIdx - 1);
  });
  clearInterval(window._testiInterval);
  window._testiInterval = setInterval(() => goSlide((S.testiIdx + 1) % total), 6000);
}

// ══════════════════════════════════════════════════════════════════════════
// FAQ
// ══════════════════════════════════════════════════════════════════════════
const FAQ_DATA = [
  { q: 'Apakah barbershop ini hanya untuk wanita?', a: 'Tidak! Barbershop Tanteh Susi terbuka untuk pelanggan <strong>pria maupun wanita</strong>. Yang membuat kami berbeda: seluruh capster kami adalah wanita profesional dan berpengalaman.' },
  { q: 'Apakah bisa langsung datang?', a: 'Bisa! Kamu bisa datang langsung (walk-in) dan ambil nomor antrean di tempat atau lewat website, tanpa perlu booking.' },
  { q: 'Apakah wajib booking?', a: 'Tidak wajib. Booking disarankan kalau kamu ingin memastikan slot & jam tertentu, terutama saat sedang ramai.' },
  { q: 'Apakah booking harus DP?', a: 'Ya, setiap booking online wajib membayar DP untuk mengunci slot jadwal kamu.' },
  { q: `Berapa DP-nya?`, a: `DP saat ini sebesar <span id="faqDeposit">Rp 20.000</span>, sisanya dibayar langsung di tempat.` },
  { q: 'Kalau terlambat bagaimana?', a: 'Kebijakan keterlambatan mengikuti aturan barbershop. <span class="demo-tag">DATA DEMO — kebijakan final akan ditentukan owner.</span>' },
  { q: 'Bisa pilih capster?', a: 'Bisa. Saat booking atau ambil antrean, kamu bisa memilih capster tertentu atau "siapa saja yang tersedia".' },
  { q: 'Semua capster wanita?', a: 'Ya, seluruh capster di Barbershop Tanteh Susi adalah wanita berpengalaman, dan siap melayani pelanggan pria maupun wanita dengan ramah.' },
  { q: 'Ada pijat setelah cukur?', a: 'Ada! Untuk paket Tanteh Premium, kamu mendapat special pijat relaksasi singkat setelah cukur selesai.' },
  { q: 'Berapa lama antre?', a: 'Estimasi waktu tunggu ditampilkan realtime di halaman Antrean Live, dihitung dari jumlah antrean dan capster yang aktif.' },
  { q: 'Bagaimana cara membatalkan booking?', a: 'Kamu bisa membatalkan booking dari tiket status booking yang muncul setelah booking berhasil dibuat.' },
  { q: 'Apakah DP dikembalikan?', a: 'Kebijakan refund DP belum ditentukan. <span class="demo-tag">DATA DEMO — silakan lengkapi kebijakan resmi.</span>' },
  { q: 'Apakah bisa bayar cash/QRIS?', a: 'Bisa. Sisa pembayaran setelah DP dapat dilakukan dengan tunai atau QRIS langsung di tempat.' }
];
function initFAQ() {
  const list = document.getElementById('faqList'); if (!list) return;
  list.innerHTML = FAQ_DATA.map(f => `<div class="faq-item"><button class="faq-q">${f.q}<span class="arr">▼</span></button><div class="faq-ans"><p>${f.a}</p></div></div>`).join('');
  list.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-q').addEventListener('click', () => {
      const was = item.classList.contains('on');
      list.querySelectorAll('.faq-item').forEach(i => i.classList.remove('on'));
      if (!was) item.classList.add('on');
    });
  });
  const dep = document.getElementById('faqDeposit'); if (dep) dep.textContent = rupiah(CONFIG.booking.deposit);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTACT / FOOTER
// ══════════════════════════════════════════════════════════════════════════
function initContact() {
  const cards = document.getElementById('ctCards');
  cards.innerHTML = `
    <div class="ct-card"><span class="ci">📍</span><div><strong>Alamat</strong><p>${CONFIG.brand.address}</p><span class="demo-note">DATA DEMO</span></div></div>
    <div class="ct-card"><span class="ci">🕐</span><div><strong>Jam Operasional</strong><p>Senin–Kamis: 09.00–20.00<br/>Jumat: 09.00–20.30<br/>Sabtu: 08.30–21.00<br/>Minggu: 08.30–20.00</p></div></div>
    <div class="ct-card"><span class="ci">📞</span><div><strong>WhatsApp</strong><a href="https://wa.me/${CONFIG.brand.whatsapp}" target="_blank">+${CONFIG.brand.whatsapp}</a><span class="demo-note">DATA DEMO</span></div></div>
    <div class="ct-card"><span class="ci">📧</span><div><strong>Email</strong><a href="mailto:${CONFIG.brand.email}">${CONFIG.brand.email}</a></div></div>`;
  document.getElementById('waBtn').href = `https://wa.me/${CONFIG.brand.whatsapp}`;
  document.getElementById('callBtn').href = `tel:+${CONFIG.brand.whatsapp}`;
}
function initFooter() {
  document.getElementById('ftContact').innerHTML = `<h4>Kontak</h4>
    <p style="font-size:.85rem;color:#B8A488;margin-top:4px">📍 ${CONFIG.brand.address}</p>
    <p style="font-size:.85rem;color:#B8A488;margin-top:6px">📞 +${CONFIG.brand.whatsapp}</p>
    <div class="ft-soc"><a href="${CONFIG.brand.instagram}" aria-label="Instagram">📷</a><a href="https://wa.me/${CONFIG.brand.whatsapp}" aria-label="WhatsApp">💬</a><a href="${CONFIG.brand.tiktok}" aria-label="TikTok">🎵</a></div>`;
  document.getElementById('ftRating').textContent = 'Data demo — silakan ganti rating & ulasan Google asli';
  document.getElementById('shareBtn').addEventListener('click', shareWebsite);
}
function shareWebsite() {
  const url = window.location.href;
  if (navigator.share) navigator.share({ title: CONFIG.brand.name, url });
  else navigator.clipboard?.writeText(url).then(() => showToast('✅ URL disalin!'));
}

// ══════════════════════════════════════════════════════════════════════════
// STICKY CTA / BOTTOM NAV / FLOAT BOOK
// ══════════════════════════════════════════════════════════════════════════
function initStickyCTA() {
  document.getElementById('stickyBookBtn').addEventListener('click', () => openBookingWizard());
  document.getElementById('heroBookBtn').addEventListener('click', () => openBookingWizard());
  document.getElementById('smartBookBtn').addEventListener('click', () => openBookingWizard());
  document.getElementById('howBookBtn').addEventListener('click', () => openBookingWizard());
  document.getElementById('finalBookBtn').addEventListener('click', () => openBookingWizard());
  document.getElementById('lcDetailBtn').addEventListener('click', () => scrollToId('#antrean'));
  renderStickyInfo();
}
function renderStickyInfo() {
  const crowd = getCrowdLevel();
  const dot = document.getElementById('smDot'); const txt = document.getElementById('smText');
  if (!dot) return;
  dot.style.background = crowd.level === 'high' ? 'var(--red)' : crowd.level === 'mid' ? 'var(--amber)' : 'var(--green)';
  txt.textContent = `${crowd.count} antrean`;
}
function initFloatBook() {
  document.getElementById('floatBookBtn').addEventListener('click', () => openBookingWizard());
}
function initBottomNav() {
  const nav = document.getElementById('bottomNav');
  function apply() { nav.classList.toggle('on', window.innerWidth < 900); syncBottomOffsets(); }
  apply(); window.addEventListener('resize', apply);
  window.addEventListener('load', syncBottomOffsets);
  setTimeout(syncBottomOffsets, 400); // re-sync after web fonts settle
  document.getElementById('bnBooking').addEventListener('click', () => openBookingWizard());
  document.getElementById('bnMenu').addEventListener('click', () => {
    document.getElementById('hbg').classList.add('on');
    document.getElementById('navLinks').classList.add('open');
    document.getElementById('navScrim').classList.add('on');
  });
  const btns = nav.querySelectorAll('.bn-btn[data-target]');
  window.addEventListener('scroll', () => {
    const pos = window.scrollY + 140;
    document.querySelectorAll('section[id]').forEach(sec => {
      if (pos >= sec.offsetTop && pos < sec.offsetTop + sec.offsetHeight) {
        btns.forEach(b => b.classList.toggle('act', b.dataset.target === '#' + sec.id));
      }
    });
  }, { passive: true });
}

// Stack sticky-mobile CTA bar directly above the bottom icon nav (instead of
// overlapping it), and expose the combined height via --bottombar-h so other
// floating UI (e.g. the prototype notice) can sit clear of both bars.
function syncBottomOffsets() {
  const navEl = document.getElementById('bottomNav');
  const stickyEl = document.getElementById('stickyMobile');
  const navVisible = navEl && getComputedStyle(navEl).display !== 'none';
  const navH = navVisible ? navEl.offsetHeight : 0;
  if (stickyEl) stickyEl.style.bottom = navH + 'px';
  const stickyVisible = stickyEl && getComputedStyle(stickyEl).display !== 'none';
  const stickyH = stickyVisible ? stickyEl.offsetHeight : 0;
  document.documentElement.style.setProperty('--bottombar-h', (navH + stickyH) + 'px');
}

function initProtoNotice() {
  const el = document.getElementById('protoNotice');
  const closeBtn = document.getElementById('pnClose');
  if (!el || !closeBtn) return;
  // Always shown on load/reload — closing only hides it for the current
  // page view, it is not persisted, so it never gets "stuck" hidden.
  closeBtn.addEventListener('click', () => {
    el.classList.add('out');
    setTimeout(() => { el.style.display = 'none'; }, 350);
  });
}
function initBTT() {
  const btn = document.getElementById('btt');
  window.addEventListener('scroll', () => btn.classList.toggle('vis', window.scrollY > 500), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ══════════════════════════════════════════════════════════════════════════
// BOOKING WIZARD (6 steps, wajib DP)
// ══════════════════════════════════════════════════════════════════════════
function initBookingWizard() {
  document.getElementById('bkClose').addEventListener('click', closeBookingWizard);
  document.getElementById('bookingModal').addEventListener('click', e => { if (e.target.id === 'bookingModal') closeBookingWizard(); });
}

function openBookingWizard(prefill = {}) {
  S.bookingDraft = { step: 1, serviceId: prefill.serviceId || null, capsterId: 'any', date: null, time: null, name: '', phone: '' };
  document.getElementById('bookingModal').style.display = 'flex';
  if (S.bookingDraft.serviceId) S.bookingDraft.step = 2;
  renderBkSteps(); renderBkStep();
}
function closeBookingWizard() { document.getElementById('bookingModal').style.display = 'none'; }

function renderBkSteps() {
  const wrap = document.getElementById('bkSteps');
  wrap.innerHTML = '';
  for (let i = 1; i <= 6; i++) {
    const d = document.createElement('div');
    d.className = 'bk-step' + (i <= S.bookingDraft.step ? ' on' : '');
    wrap.appendChild(d);
  }
}

function renderBkStep() {
  const d = S.bookingDraft;
  const content = document.getElementById('bkStepContent');
  renderBkSteps();
  document.getElementById('bkTitle').textContent = `Booking Layanan — Langkah ${d.step}/6`;

  if (d.step === 1) {
    content.innerHTML = `<div class="bk-opt-list">${CONFIG.services.map(s => `
      <div class="bk-opt${d.serviceId === s.id ? ' sel' : ''}" data-svc="${s.id}">
        <div class="bk-opt-l"><strong>${s.name}</strong><span>±${s.duration} menit${s.massage ? ' · termasuk pijat relaksasi' : ''}</span></div>
        <div class="bk-opt-r">${rupiah(s.price)}</div>
      </div>`).join('')}</div>
      <div class="bk-nav"><button class="btn-pri btn-full" id="bkNextBtn">Lanjut</button></div>`;
    content.querySelectorAll('[data-svc]').forEach(el => el.addEventListener('click', () => {
      d.serviceId = el.dataset.svc;
      content.querySelectorAll('.bk-opt').forEach(o => o.classList.toggle('sel', o.dataset.svc === d.serviceId));
    }));
    document.getElementById('bkNextBtn').addEventListener('click', () => { if (!d.serviceId) { showToast('⚠️ Pilih layanan dulu ya!'); return; } d.step = 2; renderBkStep(); });
  }

  else if (d.step === 2) {
    content.innerHTML = `<div class="bk-opt-list">
      <div class="bk-opt${d.capsterId === 'any' ? ' sel' : ''}" data-cap="any">
        <div class="bk-opt-l"><strong>Siapa saja</strong><span>Capster tercepat yang tersedia</span></div><div class="bk-opt-r">⚡</div>
      </div>
      ${CONFIG.capsters.map(c => {
        const st = S.capsterStatus[c.id];
        const [icon, label] = CAP_STATUS_LABEL[st];
        return `<div class="bk-opt${d.capsterId === c.id ? ' sel' : ''}" data-cap="${c.id}">
          <div class="bk-opt-l"><strong>${c.name}</strong><span>${c.specialty}</span></div><div class="bk-opt-r" style="font-size:.78rem">${icon} ${label}</div>
        </div>`;
      }).join('')}
      </div>
      <div class="bk-nav"><button class="btn-ghost" id="bkBackBtn">Kembali</button><button class="btn-pri btn-full" id="bkNextBtn">Lanjut</button></div>`;
    content.querySelectorAll('[data-cap]').forEach(el => el.addEventListener('click', () => {
      d.capsterId = el.dataset.cap;
      content.querySelectorAll('.bk-opt').forEach(o => o.classList.toggle('sel', o.dataset.cap === d.capsterId));
    }));
    document.getElementById('bkBackBtn').addEventListener('click', () => { d.step = 1; renderBkStep(); });
    document.getElementById('bkNextBtn').addEventListener('click', () => { d.step = 3; renderBkStep(); });
  }

  else if (d.step === 3) {
    const dates = [];
    for (let i = 0; i < 7; i++) { const nd = new Date(); nd.setDate(nd.getDate() + i); dates.push(nd); }
    content.innerHTML = `<div class="bk-opt-list">${dates.map(nd => {
      const ds = `${nd.getFullYear()}-${pad2(nd.getMonth() + 1)}-${pad2(nd.getDate())}`;
      const label = nd.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
      return `<div class="bk-opt${d.date === ds ? ' sel' : ''}" data-date="${ds}"><div class="bk-opt-l"><strong>${label}</strong></div></div>`;
    }).join('')}</div>
    <div class="bk-nav"><button class="btn-ghost" id="bkBackBtn">Kembali</button><button class="btn-pri btn-full" id="bkNextBtn">Lanjut</button></div>`;
    content.querySelectorAll('[data-date]').forEach(el => el.addEventListener('click', () => {
      d.date = el.dataset.date;
      content.querySelectorAll('.bk-opt').forEach(o => o.classList.toggle('sel', o.dataset.date === d.date));
    }));
    document.getElementById('bkBackBtn').addEventListener('click', () => { d.step = 2; renderBkStep(); });
    document.getElementById('bkNextBtn').addEventListener('click', () => { if (!d.date) { showToast('⚠️ Pilih tanggal dulu ya!'); return; } d.step = 4; renderBkStep(); });
  }

  else if (d.step === 4) {
    const nd = new Date(d.date + 'T00:00:00');
    const weekday = nd.getDay();
    const h = CONFIG.hours[weekday];
    const openMin = minutesOf(h.open), closeMin = minutesOf(h.close);
    const n = nowJakarta();
    const isToday = d.date === getDateStrForDay('today');
    const nowMin = n.hour * 60 + n.minute;
    let slots = [];
    for (let m = openMin; m < closeMin; m += 30) { if (isToday && m <= nowMin) continue; slots.push(m); }
    content.innerHTML = `<div class="bk-opt-list" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${slots.length ? slots.map(m => `<div class="bk-opt${d.time === fmtHHMM(m) ? ' sel' : ''}" data-time="${fmtHHMM(m)}" style="justify-content:center;padding:12px 6px"><strong style="font-size:.85rem">${fmtHHMM(m)}</strong></div>`).join('') : '<p style="grid-column:1/-1;color:var(--text-faint);text-align:center;padding:20px">Tidak ada slot tersisa untuk tanggal ini.</p>'}
      </div>
      <div class="bk-nav"><button class="btn-ghost" id="bkBackBtn">Kembali</button><button class="btn-pri btn-full" id="bkNextBtn">Lanjut</button></div>`;
    content.querySelectorAll('[data-time]').forEach(el => el.addEventListener('click', () => {
      d.time = el.dataset.time;
      content.querySelectorAll('.bk-opt').forEach(o => o.classList.toggle('sel', o.dataset.time === d.time));
    }));
    document.getElementById('bkBackBtn').addEventListener('click', () => { d.step = 3; renderBkStep(); });
    document.getElementById('bkNextBtn').addEventListener('click', () => { if (!d.time) { showToast('⚠️ Pilih jam dulu ya!'); return; } d.step = 5; renderBkStep(); });
  }

  else if (d.step === 5) {
    content.innerHTML = `
      <div class="f-grp"><label>Nama Lengkap *</label><input type="text" id="bkName" value="${d.name}" placeholder="Nama kamu"/></div>
      <div class="f-grp"><label>Nomor WhatsApp *</label><input type="tel" id="bkPhone" value="${d.phone}" placeholder="08xxxxxxxxxx"/></div>
      <div class="bk-nav"><button class="btn-ghost" id="bkBackBtn">Kembali</button><button class="btn-pri btn-full" id="bkNextBtn">Lihat Ringkasan</button></div>`;
    document.getElementById('bkBackBtn').addEventListener('click', () => { d.step = 4; renderBkStep(); });
    document.getElementById('bkNextBtn').addEventListener('click', () => {
      const name = document.getElementById('bkName').value.trim();
      const phone = document.getElementById('bkPhone').value.trim();
      if (!name || !phone) { showToast('⚠️ Lengkapi nama & nomor WhatsApp!'); return; }
      d.name = name; d.phone = phone; d.step = 6; renderBkStep();
    });
  }

  else if (d.step === 6) {
    const svc = svcById(d.serviceId);
    const capName = d.capsterId === 'any' ? 'Siapa saja' : capById(d.capsterId)?.name;
    const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    content.innerHTML = `
      <div class="bk-summary">
        <div class="tkt-row"><span>Layanan</span><strong>${svc.name}</strong></div>
        <div class="tkt-row"><span>Harga</span><strong>${rupiah(svc.price)}</strong></div>
        <div class="tkt-row"><span>Capster</span><strong>${capName}</strong></div>
        <div class="tkt-row"><span>Tanggal</span><strong>${dateLabel}</strong></div>
        <div class="tkt-row"><span>Jam</span><strong>${d.time} WIB</strong></div>
        <div class="bk-deposit-hl"><span>DP yang harus dibayar</span><strong>${rupiah(CONFIG.booking.deposit)}</strong></div>
        <div class="tkt-row" style="padding-top:14px"><span>Sisa dibayar di tempat</span><strong>${rupiah(svc.price - CONFIG.booking.deposit)}</strong></div>
      </div>
      <div class="bk-nav"><button class="btn-ghost" id="bkBackBtn">Kembali</button><button class="btn-pri btn-full" id="bkConfirmBtn">✅ Konfirmasi Booking</button></div>`;
    document.getElementById('bkBackBtn').addEventListener('click', () => { d.step = 5; renderBkStep(); });
    document.getElementById('bkConfirmBtn').addEventListener('click', confirmBooking);
  }
}

function confirmBooking() {
  const d = S.bookingDraft;
  const svc = svcById(d.serviceId);
  const b = {
    id: bookingId(), customerName: d.name, phone: d.phone,
    serviceId: d.serviceId, capsterId: d.capsterId,
    date: d.date, time: d.time,
    depositAmount: CONFIG.booking.deposit, depositStatus: 'unpaid',
    status: 'PENDING_PAYMENT',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  S.bookings.push(b); S.myBooking = { id: b.id };
  saveBookings(); saveMyBooking();
  closeBookingWizard();
  showToast(`✅ Booking ${b.id} berhasil dibuat!`);
  playSound();
  openBookingStatus(b.id);
  refreshAdmin();
}

// ══════════════════════════════════════════════════════════════════════════
// BOOKING STATUS TICKET
// ══════════════════════════════════════════════════════════════════════════
const BK_STATUS_LABEL = {
  PENDING_PAYMENT: ['Menunggu Pembayaran DP', 'pending'],
  DP_PENDING: ['Menunggu Verifikasi DP', 'pending'],
  CONFIRMED: ['Booking Terkonfirmasi', 'confirmed'],
  CHECKED_IN: ['Sudah Check-in', 'confirmed'],
  SERVING: ['Sedang Dilayani', 'proc'],
  COMPLETED: ['Selesai', 'done'],
  CANCELLED: ['Dibatalkan', 'canc'],
  NO_SHOW: ['Tidak Hadir', 'canc']
};

function initBookingStatusModal() {
  document.getElementById('bkStatusClose').addEventListener('click', () => document.getElementById('bkStatusModal').style.display = 'none');
  document.getElementById('bkCancelBtn').addEventListener('click', cancelMyBooking);
  document.getElementById('bkShareBtn').addEventListener('click', shareBookingTicket);
}

function openBookingStatus(id) {
  renderBookingStatus(id);
  document.getElementById('bkStatusModal').style.display = 'flex';
}

function renderBookingStatus(id) {
  const b = S.bookings.find(x => x.id === id); if (!b) return;
  const svc = svcById(b.serviceId);
  document.getElementById('bkId').textContent = b.id;
  const [lbl, cls] = BK_STATUS_LABEL[b.status] || ['—', 'pending'];
  const badge = document.getElementById('bkStatusBadge');
  badge.textContent = lbl; badge.className = 'stbadge ' + cls;
  document.getElementById('bkInfo').innerHTML = `
    <div class="tkt-row"><span>Nama</span><strong>${escapeHTML(b.customerName)}</strong></div>
    <div class="tkt-row"><span>Layanan</span><strong>${svc?.name || ''}</strong></div>
    <div class="tkt-row"><span>Capster</span><strong>${b.capsterId === 'any' ? 'Siapa saja' : capById(b.capsterId)?.name}</strong></div>
    <div class="tkt-row"><span>Tanggal</span><strong>${new Date(b.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
    <div class="tkt-row"><span>Jam</span><strong>${b.time} WIB</strong></div>
    <div class="tkt-row"><span>DP</span><strong>${rupiah(b.depositAmount)}</strong></div>`;

  // action buttons area
  const cancelBtn = document.getElementById('bkCancelBtn');
  const shareBtn = document.getElementById('bkShareBtn');
  const acts = shareBtn.parentElement;
  let payBtn = document.getElementById('bkPayNowBtn');
  if (b.status === 'PENDING_PAYMENT') {
    if (!payBtn) {
      payBtn = document.createElement('button');
      payBtn.className = 'btn-pri btn-full'; payBtn.id = 'bkPayNowBtn';
      payBtn.textContent = '💳 Bayar DP Sekarang';
      payBtn.addEventListener('click', () => openPayModal(b.id));
      acts.appendChild(payBtn);
    }
    payBtn.style.display = '';
    cancelBtn.style.display = ''; shareBtn.style.display = '';
  } else {
    if (payBtn) payBtn.style.display = 'none';
    if (b.status === 'CANCELLED' || b.status === 'COMPLETED' || b.status === 'NO_SHOW') { cancelBtn.style.display = 'none'; }
    else cancelBtn.style.display = '';
  }
}

function updateBookingStatusIfOpen() {
  const modal = document.getElementById('bkStatusModal');
  if (modal.style.display === 'flex' && S.myBooking) renderBookingStatus(S.myBooking.id);
}

function cancelMyBooking() {
  if (!S.myBooking) return;
  const idx = S.bookings.findIndex(x => x.id === S.myBooking.id); if (idx === -1) return;
  S.bookings[idx].status = 'CANCELLED'; S.bookings[idx].updatedAt = new Date().toISOString();
  saveBookings();
  renderBookingStatus(S.myBooking.id);
  showToast('❌ Booking dibatalkan.');
  refreshAdmin();
}

function shareBookingTicket() {
  if (!S.myBooking) return;
  const b = S.bookings.find(x => x.id === S.myBooking.id); if (!b) return;
  const txt = `📅 Booking di ${CONFIG.brand.name}\nID: ${b.id}\nLayanan: ${svcById(b.serviceId)?.name}\nTanggal: ${b.date} ${b.time}`;
  if (navigator.share) navigator.share({ title: CONFIG.brand.name, text: txt });
  else navigator.clipboard?.writeText(txt).then(() => showToast('✅ Disalin ke clipboard!'));
}

// ══════════════════════════════════════════════════════════════════════════
// PAYMENT (DEMO / LOCAL MODE)
// ══════════════════════════════════════════════════════════════════════════
let _payingBookingId = null;
function initPaymentModal() {
  document.getElementById('payClose').addEventListener('click', () => document.getElementById('payModal').style.display = 'none');
  document.getElementById('paidBtn').addEventListener('click', markPaid);
}
function openPayModal(bookingId) {
  _payingBookingId = bookingId;
  const b = S.bookings.find(x => x.id === bookingId); if (!b) return;
  document.getElementById('payAcc').textContent = CONFIG.payment.accountNumber;
  document.getElementById('payBank').textContent = `${CONFIG.payment.bank} — a.n. ${CONFIG.payment.accountName}`;
  document.getElementById('payAmt').textContent = rupiah(b.depositAmount);
  document.getElementById('bkStatusModal').style.display = 'none';
  document.getElementById('payModal').style.display = 'flex';
}
function markPaid() {
  if (!_payingBookingId) return;
  const idx = S.bookings.findIndex(x => x.id === _payingBookingId); if (idx === -1) return;
  S.bookings[idx].depositStatus = 'pending_verification';
  S.bookings[idx].status = 'DP_PENDING';
  S.bookings[idx].updatedAt = new Date().toISOString();
  saveBookings();
  document.getElementById('payModal').style.display = 'none';
  showToast('🟡 Menunggu verifikasi DP oleh admin.');
  openBookingStatus(_payingBookingId);
  refreshAdmin();
}

// ══════════════════════════════════════════════════════════════════════════
// CHATBOT — "Tanteh Assistant"
// ══════════════════════════════════════════════════════════════════════════
function botReplyFor(msg) {
  const m = msg.toLowerCase();
  if (/pria|cowok|laki|khusus wanita|hanya wanita|untuk wanita saja/.test(m)) {
    return `🙌 Barbershop Tanteh Susi terbuka untuk <strong>pelanggan pria maupun wanita</strong>! Yang membedakan kami: seluruh capster adalah wanita profesional dan berpengalaman.`;
  }
  if (/harga|biaya|berapa.*harga|tarif/.test(m)) {
    return `💰 <strong>Daftar Harga:</strong><br>${CONFIG.services.map(s => `• ${s.name}: ${rupiah(s.price)}`).join('<br>')}`;
  }
  if (/jam|buka|tutup|operasional/.test(m)) {
    return `🕐 <strong>Jam Operasional:</strong><br>Senin–Kamis: 09.00–20.00<br>Jumat: 09.00–20.30<br>Sabtu: 08.30–21.00<br>Minggu: 08.30–20.00`;
  }
  if (/lokasi|alamat|dimana|tempat/.test(m)) {
    return `📍 <strong>Lokasi Kami:</strong><br>${CONFIG.brand.address}<br><span style="font-size:.7rem;opacity:.7">Data demo — alamat asli akan diupdate owner.</span>`;
  }
  if (/booking|pesan.*dulu|dp/.test(m)) {
    return `📅 <strong>Cara Booking:</strong><br>1. Klik tombol "Booking Sekarang"<br>2. Pilih layanan & capster<br>3. Pilih tanggal & jam<br>4. Isi data diri<br>5. Bayar DP ${rupiah(CONFIG.booking.deposit)}<br>Slot terkunci setelah DP diverifikasi! 😊`;
  }
  if (/antri|antrean|nomor|walk.?in/.test(m)) {
    return `🎫 <strong>Cara Ambil Antrean:</strong><br>1. Scroll ke bagian "Antrean Live"<br>2. Isi nama & pilih layanan<br>3. Klik "Ambil Antrean Sekarang"<br>4. Nomor antrean langsung muncul, tanpa DP!`;
  }
  if (/pijat|massage|relax|relaksasi/.test(m)) {
    return `💆 <strong>Special Pijat Relaksasi:</strong><br>Tersedia untuk paket Tanteh Premium (${rupiah(svcById('premium').price)}), durasi ±5–10 menit setelah cukur selesai.`;
  }
  if (/capster|barber|siapa.*potong/.test(m)) {
    return `💇‍♀️ <strong>Capster Kami:</strong><br>${CONFIG.capsters.map(c => `• ${c.name} — ${c.specialty}`).join('<br>')}<br>Semua capster wanita berpengalaman, siap melayani pelanggan pria maupun wanita!`;
  }
  if (/halo|hai|hi|hello|selamat/.test(m)) return `Halo! Selamat datang di ${CONFIG.brand.name}! 👋💇‍♀️<br>Kami melayani pelanggan pria & wanita. Ada yang bisa Tanteh Assistant bantu?`;
  if (/terima kasih|makasih|thanks/.test(m)) return `Sama-sama! Senang bisa membantu 😊<br>Ditunggu kedatangannya ya!`;
  return `Maaf, aku kurang paham 😅 Coba tanya soal:<br>💰 Harga · 📅 Booking · 🎫 Antrean<br>💆 Pijat · 💇‍♀️ Capster · 🕐 Jam buka · 📍 Lokasi`;
}

function initChatbot() {
  const toggle = document.getElementById('chatToggle');
  const box = document.getElementById('chatBox');
  const close = document.getElementById('cbClose');
  const send = document.getElementById('cbSend');
  const input = document.getElementById('cbInput');
  const badge = document.getElementById('chatBadge');
  toggle.addEventListener('click', () => { box.classList.toggle('open'); badge.style.display = 'none'; });
  close.addEventListener('click', () => box.classList.remove('open'));
  document.querySelectorAll('.qr-btn').forEach(b => b.addEventListener('click', () => {
    const msg = b.dataset.msg;
    addMsg(msg, 'user');
    document.getElementById('qrWrap').style.display = 'none';
    setTimeout(() => addMsg(botReplyFor(msg), 'bot'), 550);
  }));
  function sendMsg() {
    const msg = input.value.trim(); if (!msg) return;
    addMsg(msg, 'user'); input.value = '';
    const typing = addMsg('…', 'bot', true);
    setTimeout(() => { typing.remove(); addMsg(botReplyFor(msg), 'bot'); }, 650);
  }
  send.addEventListener('click', sendMsg);
  input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });
}
function addMsg(text, sender, typing = false) {
  const msgs = document.getElementById('cbMsgs');
  const div = document.createElement('div');
  div.className = `cm ${sender}`;
  const n = nowJakarta();
  const t = `${pad2(n.hour)}:${pad2(n.minute)}`;
  div.innerHTML = `<div class="cm-bub">${typing ? text : escapeHTML(text)}</div>${!typing ? `<div class="cm-time">${t}</div>` : ''}`;
  msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight; return div;
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════════════════
function initAdmin() {
  const logo = document.getElementById('adminTrigger');
  const modal = document.getElementById('adminModal');
  const close = document.getElementById('mdClose');
  const loginBtn = document.getElementById('aLoginBtn');

  function triggerHandler() {
    S.clickCnt++;
    if (S.clickTimer) clearTimeout(S.clickTimer);
    S.clickTimer = setTimeout(() => S.clickCnt = 0, 3000);
    if (S.clickCnt >= 5) {
      S.clickCnt = 0;
      if (!S.adminIn) modal.style.display = 'flex'; else openAdmin();
    }
  }
  logo.addEventListener('click', triggerHandler);
  logo.addEventListener('keypress', e => { if (e.key === 'Enter') triggerHandler(); });
  close.addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  loginBtn.addEventListener('click', doLogin);
  document.getElementById('aPwd').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('aLogout').addEventListener('click', logoutAdmin);
  document.getElementById('aLogoutMobile').addEventListener('click', logoutAdmin);

  document.querySelectorAll('.a-nav-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.a-nav-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on');
    switchPanel(btn.dataset.p);
  }));

  document.getElementById('addQBtn').addEventListener('click', () => {
    document.getElementById('aqSvc').innerHTML = serviceSelectOptions();
    document.getElementById('aqCapster').innerHTML = capsterSelectOptions(true);
    document.getElementById('addQModal').style.display = 'flex';
  });
  document.getElementById('addQClose').addEventListener('click', () => document.getElementById('addQModal').style.display = 'none');
  document.getElementById('aqAddBtn').addEventListener('click', adminAddQueue);
  document.getElementById('qSearch').addEventListener('input', e => renderAQTable(e.target.value.toLowerCase()));

  const upArea = document.getElementById('upArea');
  const upInput = document.getElementById('upInput');
  upArea.addEventListener('click', () => upInput.click());
  upArea.addEventListener('dragover', e => { e.preventDefault(); upArea.style.borderColor = 'var(--gold)'; });
  upArea.addEventListener('dragleave', () => upArea.style.borderColor = '');
  upArea.addEventListener('drop', e => { e.preventDefault(); upArea.style.borderColor = ''; handleUpload(e.dataTransfer.files); });
  upInput.addEventListener('change', () => handleUpload(upInput.files));

  document.getElementById('addIncomeBtn').addEventListener('click', addIncome);
  document.getElementById('addExpenseBtn').addEventListener('click', addExpense);
  document.querySelectorAll('.fin-tab').forEach(t => t.addEventListener('click', () => {
    S.transFilt = t.dataset.f;
    document.querySelectorAll('.fin-tab').forEach(x => x.classList.remove('on')); t.classList.add('on');
    renderFinList();
  }));
  document.getElementById('exportPDFBtn1').addEventListener('click', exportPDF);
  document.getElementById('exportPDFBtn2').addEventListener('click', exportPDF);

  document.querySelectorAll('.rep-tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.rep-tab').forEach(x => x.classList.remove('on')); t.classList.add('on');
    renderReport(t.dataset.rep);
  }));

  document.getElementById('addReviewBtn').addEventListener('click', adminAddReview);

  document.getElementById('aBackupBtn').addEventListener('click', backupData);
  document.getElementById('settingsBackupBtn').addEventListener('click', backupData);
  document.getElementById('aRestoreBtn').addEventListener('click', () => document.getElementById('restoreInput').click());
  document.getElementById('settingsRestoreBtn').addEventListener('click', () => document.getElementById('restoreInput').click());
  document.getElementById('restoreInput').addEventListener('change', e => restoreData(e.target.files[0]));
  document.getElementById('aResetBtn').addEventListener('click', resetAll);

  document.getElementById('saveDepositBtn').addEventListener('click', saveDepositSettings);
  document.getElementById('saveContactBtn').addEventListener('click', saveContactSettings);
  document.getElementById('saveAdminBtn').addEventListener('click', saveAdminSettings);

  window.addEventListener('resize', () => { if (S.adminIn) drawFinChart(); }, { passive: true });
}

function doLogin() {
  const e = document.getElementById('aEmail').value.trim();
  const p = document.getElementById('aPwd').value;
  const err = document.getElementById('loginErr');
  if (e === CONFIG.admin.email && p === CONFIG.admin.password) {
    err.style.display = 'none'; S.adminIn = true;
    document.getElementById('adminModal').style.display = 'none';
    openAdmin(); showToast('✅ Login berhasil!');
  } else { err.style.display = 'block'; }
}
function logoutAdmin() { S.adminIn = false; document.getElementById('adminDash').style.display = 'none'; showToast('👋 Logout berhasil.'); }

function openAdmin() {
  document.getElementById('adminDash').style.display = 'flex';
  loadSettingsIntoForm();
  refreshAdmin(); renderReport('daily');
}
function switchPanel(name) {
  document.querySelectorAll('.a-panel').forEach(p => p.classList.remove('on'));
  document.getElementById('pa-' + name).classList.add('on');
  const titles = { overview: 'Dashboard Overview', queue: 'Kelola Antrean', booking: 'Kelola Booking', capster: 'Kelola Capster', finance: 'Transaksi', gallery: 'Kelola Galeri', reviews: 'Kelola Review', reports: 'Laporan', settings: 'Pengaturan' };
  document.getElementById('aPanelTitle').textContent = titles[name] || name;
  if (name === 'overview') renderOverview();
  if (name === 'queue') renderAQTable();
  if (name === 'booking') renderABTable();
  if (name === 'capster') renderACTable();
  if (name === 'finance') renderFinList();
  if (name === 'gallery') renderAdmGallery();
  if (name === 'reviews') renderAdminReviews();
  if (name === 'reports') renderReport('daily');
}
function refreshAdmin() {
  renderOverview(); renderAQTable(); renderABTable(); renderACTable(); renderFinList(); renderAdmGallery(); renderAdminReviews();
}

// ── OVERVIEW ──
function renderOverview() {
  if (!S.adminIn) return;
  const crowd = getCrowdLevel();
  const active = CONFIG.capsters.filter(c => S.capsterStatus[c.id] === 'available').length;
  const serving = S.queues.filter(q => q.status === 'processing').length;
  const bookingsToday = S.bookings.filter(b => sameDay(b.createdAt)).length;
  document.getElementById('aLiveOps').innerHTML = `
    <span>🟢 ${active} Capster Tersedia</span>
    <span>🟡 ${S.bookings.filter(b => ['PENDING_PAYMENT', 'DP_PENDING', 'CONFIRMED'].includes(b.status)).length} Booking Aktif</span>
    <span>🔴 ${serving} Sedang Dilayani</span>`;
  const td = new Date().toDateString();
  const ti = S.transactions.filter(t => new Date(t.date).toDateString() === td && t.type === 'income');
  const te = S.transactions.filter(t => new Date(t.date).toDateString() === td && t.type === 'expense');
  const tc = S.queues.filter(q => new Date(q.createdAt).toDateString() === td);
  const inc = ti.reduce((s, t) => s + t.amount, 0);
  document.getElementById('asCust').textContent = tc.length;
  document.getElementById('asInc').textContent = rupiah(inc);
  document.getElementById('asBooking').textContent = bookingsToday;
  document.getElementById('asQueue').textContent = S.queues.filter(q => q.status === 'waiting' || q.status === 'processing').length;

  const cc = {}; S.queues.forEach(q => { if (q.capsterId && q.capsterId !== 'any') cc[q.capsterId] = (cc[q.capsterId] || 0) + 1; });
  const tcap = Object.entries(cc).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('asCapster').textContent = tcap ? `${capById(tcap[0])?.name || tcap[0]} (${tcap[1]}x)` : '–';
  const hc = {}; S.queues.forEach(q => { const h = new Date(q.createdAt).getHours(); hc[h] = (hc[h] || 0) + 1; });
  const th = Object.entries(hc).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('asPeak').textContent = th ? `${th[0]}:00–${parseInt(th[0]) + 1}:00` : '–';
  const sc = {}; S.queues.forEach(q => { if (q.serviceId) sc[q.serviceId] = (sc[q.serviceId] || 0) + 1; });
  const ts = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('asSvc').textContent = ts ? (svcById(ts[0])?.name || ts[0]) : '–';
  document.getElementById('asTotal').textContent = S.queues.filter(q => q.status === 'done').length;
  drawFinChart();
}

function drawFinChart() {
  const canvas = document.getElementById('finChart'); if (!canvas || !S.adminIn) return;
  const ctx = canvas.getContext('2d');
  const cssW = canvas.parentElement.clientWidth - 40;
  canvas.width = Math.max(280, cssW); canvas.height = 180;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const days = [], inc = [], exp = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toDateString();
    days.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
    inc.push(S.transactions.filter(t => new Date(t.date).toDateString() === ds && t.type === 'income').reduce((s, t) => s + t.amount, 0));
    exp.push(S.transactions.filter(t => new Date(t.date).toDateString() === ds && t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }
  const maxV = Math.max(...inc, ...exp, 1);
  const pL = 44, pR = 16, pT = 16, pB = 30;
  const cW = W - pL - pR, cH = H - pT - pB;
  const bW = cW / 7 / 3;
  const styles = getComputedStyle(document.documentElement);
  ctx.fillStyle = styles.getPropertyValue('--surface').trim() || '#fff'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i <= 4; i++) {
    const y = pT + (cH / 4) * i;
    ctx.strokeStyle = 'rgba(120,100,80,.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
  }
  const gold = styles.getPropertyValue('--gold').trim() || '#C9A45C';
  const red = styles.getPropertyValue('--red').trim() || '#BF5038';
  const mute = styles.getPropertyValue('--text-faint').trim() || '#999';
  days.forEach((day, i) => {
    const x = pL + (cW / 7) * i + (cW / 7 - bW * 2 - 4) / 2;
    const iH = (inc[i] / maxV) * cH;
    ctx.fillStyle = gold; ctx.fillRect(x, pT + cH - iH, bW, iH);
    const eH = (exp[i] / maxV) * cH;
    ctx.fillStyle = red; ctx.fillRect(x + bW + 4, pT + cH - eH, bW, eH);
    ctx.fillStyle = mute; ctx.font = '10px Manrope,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(day, x + bW, H - 8);
  });
}

// ── QUEUE MANAGEMENT ──
function renderAQTable(search = '') {
  const tbody = document.getElementById('aQTable'); if (!tbody) return;
  let qs = [...S.queues].reverse();
  if (search) qs = qs.filter(q => q.name.toLowerCase().includes(search));
  if (!qs.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Belum ada antrean</td></tr>'; return; }
  const stL = { waiting: 'Menunggu', processing: 'Diproses', done: 'Selesai', cancelled: 'Dibatalkan' };
  tbody.innerHTML = qs.map(q => `<tr>
    <td style="color:var(--gold-deep);font-weight:700">${queueLabel(q.number)}</td>
    <td>${escapeHTML(q.name)}</td><td>${svcById(q.serviceId)?.name || ''}</td>
    <td>${q.capsterId === 'any' ? 'Siapa saja' : (capById(q.capsterId)?.name || '')}</td>
    <td style="color:var(--text-faint);font-size:.78rem">${new Date(q.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
    <td><span class="stbadge ${{ waiting: 'wait', processing: 'proc', done: 'done', cancelled: 'canc' }[q.status]}">${stL[q.status]}</span></td>
    <td>
      <select class="a-sel-sm" data-qchg="${q.id}">
        <option value="" disabled selected>Ubah</option>
        <option value="waiting">Menunggu</option><option value="processing">Panggil / Proses</option>
        <option value="done">Selesai</option><option value="cancelled">Batalkan</option>
      </select>
      <button class="a-del-btn" data-qdel="${q.id}">Hapus</button>
    </td></tr>`).join('');
  tbody.querySelectorAll('[data-qchg]').forEach(sel => sel.addEventListener('change', () => changeQueueStatus(sel.dataset.qchg, sel.value)));
  tbody.querySelectorAll('[data-qdel]').forEach(btn => btn.addEventListener('click', () => deleteQueue(btn.dataset.qdel)));
}
function changeQueueStatus(id, status) {
  const idx = S.queues.findIndex(q => q.id === id); if (idx === -1) return;
  S.queues[idx].status = status;
  const q = S.queues[idx];
  if (status === 'processing') {
    if (q.capsterId !== 'any') S.capsterStatus[q.capsterId] = 'busy';
    autoIncome(q); playSound(); showToast(`🔔 ${queueLabel(q.number)} ${q.name} dipanggil!`);
  } else if (status === 'done' || status === 'cancelled') {
    if (q.capsterId !== 'any' && !S.queues.some(x => x.capsterId === q.capsterId && x.status === 'processing' && x.id !== q.id)) {
      S.capsterStatus[q.capsterId] = 'available';
    }
  }
  saveQueues(); saveCapsters();
  renderAQTable(); refreshLiveData();
}
function deleteQueue(id) {
  S.queues = S.queues.filter(q => q.id !== id);
  if (S.myTicket?.id === id) { S.myTicket = null; saveMyTicket(); }
  saveQueues(); renderAQTable(); refreshLiveData();
  showToast('🗑️ Antrean dihapus.');
}
function adminAddQueue() {
  const name = document.getElementById('aqName').value.trim();
  if (!name) { showToast('Nama harus diisi!'); return; }
  const serviceId = document.getElementById('aqSvc').value;
  const capsterId = document.getElementById('aqCapster').value;
  const q = { id: genId(), number: S.nextQueueNumber++, name, serviceId, capsterId, status: 'waiting', estimatedMinutes: svcById(serviceId)?.duration || CONFIG.avgServiceMinutes, createdAt: new Date().toISOString() };
  S.queues.push(q); saveQueues(); saveNextQ();
  document.getElementById('addQModal').style.display = 'none';
  document.getElementById('aqName').value = '';
  renderAQTable(); refreshLiveData();
  showToast(`✅ Antrean ${queueLabel(q.number)} ditambahkan.`);
}

// ── BOOKING MANAGEMENT ──
function renderABTable() {
  const tbody = document.getElementById('aBTable'); if (!tbody) return;
  const bs = [...S.bookings].reverse();
  if (!bs.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Belum ada booking</td></tr>'; return; }
  tbody.innerHTML = bs.map(b => {
    const [lbl, cls] = BK_STATUS_LABEL[b.status] || ['—', 'pending'];
    return `<tr>
    <td style="font-weight:700;color:var(--gold-deep);font-size:.78rem">${b.id}</td>
    <td>${escapeHTML(b.customerName)}</td>
    <td>${svcById(b.serviceId)?.name || ''}</td>
    <td>${b.capsterId === 'any' ? 'Siapa saja' : (capById(b.capsterId)?.name || '')}</td>
    <td style="font-size:.78rem">${b.date}<br/>${b.time}</td>
    <td style="font-size:.78rem">${rupiah(b.depositAmount)}</td>
    <td><span class="stbadge ${cls}">${lbl}</span></td>
    <td>
      <select class="a-sel-sm" data-bchg="${b.id}">
        <option value="" disabled selected>Ubah</option>
        <option value="CONFIRMED">Terima DP → Konfirmasi</option>
        <option value="PENDING_PAYMENT">Tolak DP</option>
        <option value="CHECKED_IN">Check-in</option>
        <option value="SERVING">Sedang Dilayani</option>
        <option value="COMPLETED">Selesai</option>
        <option value="CANCELLED">Batalkan</option>
        <option value="NO_SHOW">Tidak Hadir</option>
      </select>
    </td></tr>`;
  }).join('');
  tbody.querySelectorAll('[data-bchg]').forEach(sel => sel.addEventListener('change', () => changeBookingStatus(sel.dataset.bchg, sel.value)));
}
function changeBookingStatus(id, status) {
  const idx = S.bookings.findIndex(b => b.id === id); if (idx === -1) return;
  S.bookings[idx].status = status; S.bookings[idx].updatedAt = new Date().toISOString();
  if (status === 'CONFIRMED') S.bookings[idx].depositStatus = 'confirmed';
  if (status === 'COMPLETED') autoIncomeBooking(S.bookings[idx]);
  saveBookings(); renderABTable(); renderOverview();
  showToast(`✅ Status booking ${id} diubah.`);
}
function autoIncomeBooking(b) {
  const svc = svcById(b.serviceId);
  S.transactions.push({ id: genId(), type: 'income', desc: `${svc?.name} – ${b.customerName} (Booking)`, amount: svc?.price || 0, date: new Date().toISOString() });
  saveTrans(); renderFinList();
}

// ── CAPSTER MANAGEMENT ──
function renderACTable() {
  const tbody = document.getElementById('aCTable'); if (!tbody) return;
  tbody.innerHTML = CONFIG.capsters.map(c => {
    const st = S.capsterStatus[c.id];
    return `<tr>
      <td style="font-weight:700">${c.name}</td><td>${c.experience}</td><td>${c.specialty}</td><td>★ ${c.rating}</td>
      <td><select class="a-sel-sm" data-capchg="${c.id}">
        <option value="available"${st === 'available' ? ' selected' : ''}>🟢 Tersedia</option>
        <option value="busy"${st === 'busy' ? ' selected' : ''}>✂️ Sedang Mencukur</option>
        <option value="rest"${st === 'rest' ? ' selected' : ''}>☕ Istirahat</option>
        <option value="off"${st === 'off' ? ' selected' : ''}>🔴 Offline</option>
      </select></td></tr>`;
  }).join('');
  tbody.querySelectorAll('[data-capchg]').forEach(sel => sel.addEventListener('change', () => {
    S.capsterStatus[sel.dataset.capchg] = sel.value; saveCapsters(); refreshLiveData();
    showToast('✅ Status capster diperbarui.');
  }));
}

// ── FINANCE ──
function autoIncome(q) {
  const svc = svcById(q.serviceId);
  S.transactions.push({ id: genId(), type: 'income', desc: `${svc?.name || q.serviceId} – ${q.name}`, amount: svc?.price || 0, date: new Date().toISOString() });
  saveTrans(); renderFinList(); renderOverview();
}
function addIncome() {
  const desc = document.getElementById('incDesc').value.trim();
  const amt = parseInt(document.getElementById('incAmt').value);
  if (!desc || !amt || amt <= 0) { showToast('⚠️ Isi deskripsi dan jumlah!'); return; }
  S.transactions.push({ id: genId(), type: 'income', desc, amount: amt, date: new Date().toISOString() });
  saveTrans(); document.getElementById('incDesc').value = ''; document.getElementById('incAmt').value = '';
  renderFinList(); renderOverview(); showToast(`✅ Pemasukan ${rupiah(amt)} ditambahkan.`);
}
function addExpense() {
  const desc = document.getElementById('expDesc').value.trim();
  const amt = parseInt(document.getElementById('expAmt').value);
  if (!desc || !amt || amt <= 0) { showToast('⚠️ Isi deskripsi dan jumlah!'); return; }
  S.transactions.push({ id: genId(), type: 'expense', desc, amount: amt, date: new Date().toISOString() });
  saveTrans(); document.getElementById('expDesc').value = ''; document.getElementById('expAmt').value = '';
  renderFinList(); renderOverview(); showToast(`✅ Pengeluaran ${rupiah(amt)} ditambahkan.`);
}
function renderFinList() {
  const list = document.getElementById('finList'); if (!list) return;
  let items = [...S.transactions].reverse();
  if (S.transFilt !== 'all') items = items.filter(t => t.type === S.transFilt);
  if (!items.length) { list.innerHTML = '<div class="empty-box"><span class="ei">💰</span>Belum ada transaksi</div>'; return; }
  list.innerHTML = items.map(t => `<div class="fin-item"><div><div class="fi-desc">${escapeHTML(t.desc)}</div><div class="fi-date">${new Date(t.date).toLocaleString('id-ID')}</div></div><div class="fi-amt ${t.type === 'income' ? 'inc' : 'exp'}">${t.type === 'income' ? '+' : '-'} ${rupiah(t.amount)}</div></div>`).join('');
}

// ── GALLERY ──
function handleUpload(files) {
  Array.from(files).forEach(f => {
    if (!f.type.startsWith('image/')) return;
    if (f.size > 5 * 1024 * 1024) { showToast('⚠️ Ukuran gambar maksimal 5MB.'); return; }
    const r = new FileReader();
    r.onload = e => { S.gallery.push({ id: genId(), url: e.target.result }); saveGallery(); renderAdmGallery(); renderPublicGallery(); showToast('✅ Gambar diupload!'); };
    r.readAsDataURL(f);
  });
}
function renderAdmGallery() {
  const grid = document.getElementById('galAdmGrid'); if (!grid) return;
  if (!S.gallery.length) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-faint);padding:20px">Belum ada foto. Upload di atas!</p>'; return; }
  grid.innerHTML = S.gallery.map(img => `<div class="gal-adm-item"><img src="${img.url}" alt="Galeri" loading="lazy"/><button class="gal-adm-del" data-galdel="${img.id}">✕</button></div>`).join('');
  grid.querySelectorAll('[data-galdel]').forEach(btn => btn.addEventListener('click', () => deleteGalleryItem(btn.dataset.galdel)));
}
function deleteGalleryItem(id) {
  S.gallery = S.gallery.filter(g => g.id !== id); saveGallery(); renderAdmGallery(); renderPublicGallery();
  showToast('🗑️ Foto dihapus.');
}

// ── REVIEWS ──
function adminAddReview() {
  const name = document.getElementById('rvName').value.trim();
  const stars = Math.min(5, Math.max(1, parseInt(document.getElementById('rvStar').value) || 5));
  const text = document.getElementById('rvText').value.trim();
  if (!name || !text) { showToast('⚠️ Lengkapi nama & ulasan!'); return; }
  S.reviews.push({ id: genId(), name, stars, text, createdAt: new Date().toISOString() });
  saveReviews();
  document.getElementById('rvName').value = ''; document.getElementById('rvText').value = ''; document.getElementById('rvStar').value = 5;
  renderAdminReviews(); initTestimonials();
  showToast('✅ Review ditambahkan.');
}
function renderAdminReviews() {
  const list = document.getElementById('reviewAdmList'); if (!list) return;
  if (!S.reviews.length) { list.innerHTML = '<div class="empty-box"><span class="ei">⭐</span>Belum ada review nyata. Testimoni publik masih data demo.</div>'; return; }
  list.innerHTML = S.reviews.slice().reverse().map(r => `<div class="review-row">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <strong>${escapeHTML(r.name)}</strong><span style="color:var(--gold)">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>
    </div>
    <p style="font-size:.85rem;color:var(--text-mute)">${escapeHTML(r.text)}</p>
    <button class="a-del-btn" style="margin-top:8px" data-rvdel="${r.id}">Hapus</button>
  </div>`).join('');
  list.querySelectorAll('[data-rvdel]').forEach(btn => btn.addEventListener('click', () => {
    S.reviews = S.reviews.filter(r => r.id !== btn.dataset.rvdel); saveReviews(); renderAdminReviews(); initTestimonials();
  }));
}

// ── REPORTS ──
function renderReport(period) {
  const el = document.getElementById('repContent'); if (!el) return;
  const now = new Date(); let sd = new Date();
  if (period === 'daily') sd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (period === 'weekly') sd.setDate(now.getDate() - 7);
  else sd.setDate(now.getDate() - 30);
  const pt = S.transactions.filter(t => new Date(t.date) >= sd);
  const pq = S.queues.filter(q => new Date(q.createdAt) >= sd);
  const inc = pt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = pt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lbl = { daily: 'Hari Ini', weekly: '7 Hari Terakhir', monthly: '30 Hari Terakhir' }[period];
  el.innerHTML = `<div style="margin-bottom:14px;color:var(--text-faint);font-size:.82rem">Laporan: <strong style="color:var(--text)">${lbl}</strong></div>
  <div class="rep-sum">
    <div class="rep-si"><div class="rs-lbl">Pemasukan</div><div class="rs-val" style="color:var(--green)">${rupiah(inc)}</div></div>
    <div class="rep-si"><div class="rs-lbl">Pengeluaran</div><div class="rs-val" style="color:var(--red)">${rupiah(exp)}</div></div>
    <div class="rep-si"><div class="rs-lbl">Laba</div><div class="rs-val" style="color:${inc - exp >= 0 ? 'var(--gold-deep)' : 'var(--red)'}">${rupiah(inc - exp)}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
    <div class="rep-si"><div class="rs-lbl">Total Pelanggan</div><div class="rs-val">${pq.length}</div></div>
    <div class="rep-si"><div class="rs-lbl">Selesai</div><div class="rs-val">${pq.filter(q => q.status === 'done').length}</div></div>
  </div>
  ${pt.length === 0 ? '<p style="color:var(--text-faint);text-align:center;padding:20px">Belum ada data untuk periode ini</p>' : `
  <h4 style="color:var(--text-faint);font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Riwayat Transaksi</h4>
  <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:7px">
    ${[...pt].reverse().map(t => `<div class="fin-item"><div><div class="fi-desc">${escapeHTML(t.desc)}</div><div class="fi-date">${new Date(t.date).toLocaleString('id-ID')}</div></div><div class="fi-amt ${t.type === 'income' ? 'inc' : 'exp'}">${t.type === 'income' ? '+' : '-'} ${rupiah(t.amount)}</div></div>`).join('')}
  </div>`}`;
}

// ── EXPORT PDF (print) ──
function exportPDF() {
  const inc = S.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = S.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const html = `<html><head><title>Laporan ${CONFIG.brand.name}</title><style>body{font-family:Arial;padding:40px;color:#2B1F17}h1{color:#C9A45C}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#F3EAD6;padding:9px 12px;text-align:left;font-size:12px}td{padding:9px 12px;border-bottom:1px solid #eee;font-size:12px}.inc{color:green;font-weight:bold}.exp{color:#BF5038;font-weight:bold}</style></head>
  <body><h1>✂ ${CONFIG.brand.name}</h1><p>Laporan Keuangan – ${new Date().toLocaleString('id-ID')}</p>
  <table><tr><th>Total Pemasukan</th><td class="inc">${rupiah(inc)}</td></tr><tr><th>Total Pengeluaran</th><td class="exp">${rupiah(exp)}</td></tr><tr><th>Laba Bersih</th><td style="font-weight:bold">${rupiah(inc - exp)}</td></tr><tr><th>Total Pelanggan (Antrean)</th><td>${S.queues.length}</td></tr><tr><th>Total Booking</th><td>${S.bookings.length}</td></tr></table>
  <h3>Riwayat Transaksi</h3><table><thead><tr><th>Deskripsi</th><th>Tipe</th><th>Jumlah</th><th>Tanggal</th></tr></thead><tbody>${S.transactions.map(t => `<tr><td>${escapeHTML(t.desc)}</td><td>${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td><td class="${t.type === 'income' ? 'inc' : 'exp'}">${rupiah(t.amount)}</td><td>${new Date(t.date).toLocaleString('id-ID')}</td></tr>`).join('')}</tbody></table></body></html>`;
  const w = window.open('', '_blank'); if (!w) { showToast('⚠️ Popup diblokir browser.'); return; }
  w.document.write(html); w.document.close(); w.print();
}

// ── SETTINGS ──
function loadSettingsIntoForm() {
  document.getElementById('setDeposit').value = CONFIG.booking.deposit;
  document.getElementById('setBank').value = CONFIG.payment.bank;
  document.getElementById('setAccNum').value = CONFIG.payment.accountNumber;
  document.getElementById('setWA').value = CONFIG.brand.whatsapp;
  document.getElementById('setAddr').value = CONFIG.brand.address;
  document.getElementById('setAdminEmail').value = CONFIG.admin.email;
  document.getElementById('setAdminPwd').value = '';
}
function saveDepositSettings() {
  CONFIG.booking.deposit = parseInt(document.getElementById('setDeposit').value) || CONFIG.booking.deposit;
  CONFIG.payment.bank = document.getElementById('setBank').value.trim() || CONFIG.payment.bank;
  CONFIG.payment.accountNumber = document.getElementById('setAccNum').value.trim() || CONFIG.payment.accountNumber;
  saveSettings(); showToast('✅ Pengaturan DP disimpan.');
  initFAQ();
}
function saveContactSettings() {
  CONFIG.brand.whatsapp = document.getElementById('setWA').value.trim() || CONFIG.brand.whatsapp;
  CONFIG.brand.address = document.getElementById('setAddr').value.trim() || CONFIG.brand.address;
  saveSettings(); initContact(); initFooter();
  showToast('✅ Info kontak disimpan.');
}
function saveAdminSettings() {
  const email = document.getElementById('setAdminEmail').value.trim();
  const pwd = document.getElementById('setAdminPwd').value;
  if (!email) { showToast('⚠️ Email tidak boleh kosong!'); return; }
  CONFIG.admin.email = email;
  if (pwd) CONFIG.admin.password = pwd;
  StorageService.set('adminCreds', { email: CONFIG.admin.email, password: CONFIG.admin.password });
  showToast('✅ Kredensial admin diperbarui (demo).');
}

// ── BACKUP / RESTORE / RESET ──
function backupData() {
  const data = {
    exportedAt: new Date().toISOString(), namespace: NS,
    settings: { deposit: CONFIG.booking.deposit, bank: CONFIG.payment.bank, accountNumber: CONFIG.payment.accountNumber, whatsapp: CONFIG.brand.whatsapp, address: CONFIG.brand.address },
    queues: S.queues, bookings: S.bookings, transactions: S.transactions,
    gallery: S.gallery, reviews: S.reviews, capsters: S.capsterStatus, nextQueueNumber: S.nextQueueNumber
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `tantehsusi-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Backup berhasil didownload!');
}
function restoreData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.queues) { S.queues = data.queues; saveQueues(); }
      if (data.bookings) { S.bookings = data.bookings; saveBookings(); }
      if (data.transactions) { S.transactions = data.transactions; saveTrans(); }
      if (data.gallery) { S.gallery = data.gallery; saveGallery(); }
      if (data.reviews) { S.reviews = data.reviews; saveReviews(); }
      if (data.capsters) { S.capsterStatus = data.capsters; saveCapsters(); }
      if (data.nextQueueNumber) { S.nextQueueNumber = data.nextQueueNumber; saveNextQ(); }
      if (data.settings) {
        CONFIG.booking.deposit = data.settings.deposit ?? CONFIG.booking.deposit;
        CONFIG.payment.bank = data.settings.bank ?? CONFIG.payment.bank;
        CONFIG.payment.accountNumber = data.settings.accountNumber ?? CONFIG.payment.accountNumber;
        CONFIG.brand.whatsapp = data.settings.whatsapp ?? CONFIG.brand.whatsapp;
        CONFIG.brand.address = data.settings.address ?? CONFIG.brand.address;
        saveSettings();
      }
      refreshAdmin(); refreshLiveData(); renderPublicGallery(); initTestimonials(); initContact(); initFooter(); initFAQ();
      showToast('✅ Data berhasil di-restore!');
    } catch (err) { showToast('⚠️ File backup tidak valid.'); }
  };
  r.readAsText(file);
}
function resetAll() {
  if (!confirm('⚠️ PERINGATAN!\n\nIni akan menghapus SEMUA data (antrean, booking, transaksi, galeri, review).\nYakin?')) return;
  S.queues = []; S.bookings = []; S.transactions = []; S.gallery = []; S.reviews = [];
  S.nextQueueNumber = 1; S.myTicket = null; S.myBooking = null;
  saveQueues(); saveBookings(); saveTrans(); saveGallery(); saveReviews(); saveNextQ(); saveMyTicket(); saveMyBooking();
  refreshAdmin(); refreshLiveData(); renderPublicGallery(); initTestimonials();
  showToast('🗑️ Semua data direset.');
}
