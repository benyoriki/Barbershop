/* Tukang Cukur — website publik. Ringan: tanpa library, tanpa timer detik. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var E = TC.esc, R = TC.rupiah, db = TC.load();

  /* ---------- loader 3 detik (ketuk untuk lewati) ---------- */
  var loader = $('#loader');
  function hideLoader() {
    if (!loader) return;
    var l = loader; loader = null;
    l.classList.add('hide');
    setTimeout(function () { if (l.parentNode) l.parentNode.removeChild(l); }, 600);
  }
  if (loader) { setTimeout(hideLoader, 3000); loader.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) return; hideLoader(); }); }

  /* ---------- util ---------- */
  function toast(t) {
    var el = $('#toast'); el.textContent = t; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 3000);
  }
  function svc(id) { return db.services.filter(function (s) { return s.id === id; })[0]; }
  function promoByCode(c) {
    c = (c || '').trim().toUpperCase(); if (!c) return null;
    return db.promos.filter(function (p) { return p.active && p.code.toUpperCase() === c && (!p.until || p.until >= TC.today()); })[0] || null;
  }
  function activePromos() { return db.promos.filter(function (p) { return p.active && (!p.until || p.until >= TC.today()); }); }
  function waLink(text) {
    var d = String(db.settings.wa || '').replace(/\D/g, '');
    return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  function I(n, c) { return TC.i(n, c); }
  function pad(n) { return ('0' + n).slice(-2); }

  /* ---------- tema & menu ---------- */
  try { var th = localStorage.getItem('tc_theme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) {}
  function themeIcon() { $('#theme').innerHTML = I(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon'); }
  $('#theme').addEventListener('click', function () {
    var d = document.documentElement, v = d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    d.setAttribute('data-theme', v);
    try { localStorage.setItem('tc_theme', v); } catch (e) {}
    themeIcon();
  });
  themeIcon();
  function placeMenu() { $('#menu').style.paddingTop = Math.max(0, Math.round($('header.top').getBoundingClientRect().bottom)) + 'px'; }
  $('#burger').addEventListener('click', function () { placeMenu(); $('#menu').classList.toggle('open'); });
  window.addEventListener('scroll', function () { if ($('#menu').classList.contains('open')) placeMenu(); }, { passive: true });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { $('#menu').classList.remove('open'); }); });

  /* ---------- promo bar ---------- */
  var promoClosed = false;
  try { promoClosed = sessionStorage.getItem('tc_promo_x') === '1'; } catch (e) {}
  $('#promoX').addEventListener('click', function () {
    $('#promobar').hidden = true;
    try { sessionStorage.setItem('tc_promo_x', '1'); } catch (e) {}
  });

  /* ---------- status buka/tutup (ringan, tanpa detik) ---------- */
  function renderStatus() {
    var os = TC.openState(db), s = os.open;
    $('#hdDot').className = 'dot ' + (s ? 'ok' : '');
    $('#hdStatus').textContent = s ? 'Buka · ' + os.text : 'Tutup · ' + os.text;
    $('#heroDot').className = 'dot ' + (s ? 'ok' : '');
    $('#heroStatus').textContent = s ? 'Buka sekarang' : 'Sedang tutup';
    var rows = [0, 1, 2, 3, 4, 5, 6].map(function (d) {
      var h = db.settings.hours[d];
      return '<li class="' + (d === os.now.day ? 'today' : '') + '"><span>' + TC.DAYS[d] + '</span><span>' + (h ? h[0] + '–' + h[1] : 'Libur') + '</span></li>';
    });
    $('#hours').innerHTML = rows.join('');
  }

  /* ---------- render utama ---------- */
  function fillSelects() {
    var opts = db.services.map(function (s) { return '<option value="' + s.id + '">Tukang ' + E(s.name) + ' – ' + R(s.price) + '</option>'; }).join('');
    $$('.svcSel').forEach(function (s) { var v = s.value; s.innerHTML = opts; if (v) s.value = v; });
    var cur = $('#bCap').value;
    $('#bCap').innerHTML = '<option value="">Siapa saja</option>' + db.capsters.filter(function (c) { return c.status !== 'Libur'; }).map(function (c) { return '<option value="' + c.id + '">' + E(c.name) + '</option>'; }).join('');
    if (cur) $('#bCap').value = cur;
  }

  function render() {
    db = TC.load();
    var s = db.settings;
    $$('[data-brand]').forEach(function (e) { e.textContent = s.name; });
    $$('[data-tag]').forEach(function (e) { e.textContent = s.tagline; });
    document.title = s.name + ' — ' + s.tagline + ' di Bogor | Mulai ' + R(Math.min.apply(null, db.services.map(function (x) { return x.price; }).concat([1e9])));

    /* promo bar */
    var pr = activePromos();
    if (pr.length && !promoClosed) {
      $('#promoText').innerHTML = 'Promo <b>' + E(pr[0].code) + '</b> diskon ' + pr[0].discount + '% — ' + E(pr[0].title) + '. <a href="#harga" style="text-decoration:underline">Lihat harga</a>';
      $('#promobar').hidden = false;
    } else { $('#promobar').hidden = true; }

    /* hero & trust */
    var minP = db.services.length ? Math.min.apply(null, db.services.map(function (x) { return x.price; })) : 0;
    $('#fromPrice').textContent = R(minP);
    var cs = db.capsters;
    if (cs.length) {
      $('#avgRating').textContent = (cs.reduce(function (a, c) { return a + Number(c.rating); }, 0) / cs.length).toFixed(1);
      $('#tYears').textContent = Math.max.apply(null, cs.map(function (c) { return +c.exp || 0; }));
    }

    /* harga */
    $('#planCount').textContent = db.services.length;
    $('#plans').innerHTML = db.services.map(function (p) {
      return '<div class="card plan ' + (p.popular ? 'pop' : '') + '">' + (p.popular ? '<span class="badge">' + I('star', 'sm') + 'PALING FAVORIT</span>' : '') +
        '<h3>' + I(p.popular ? 'sparkles' : 'scissors') + 'Tukang ' + E(p.name) + '</h3><div class="d">' + E(p.desc) + '</div>' +
        '<div class="amt">' + R(p.price) + '</div><span class="tag">' + I('clock', 'sm') + 'Estimasi ±' + p.duration + ' menit</span>' +
        '<ul>' + p.features.map(function (f) { return '<li><span class="ck">' + I('check') + '</span>' + E(f) + '</li>'; }).join('') + '</ul>' +
        '<button class="btn ' + (p.popular ? 'gold ' : '') + 'block" type="button" data-open data-svc="' + p.id + '">Pilih Tukang ' + E(p.name) + '</button></div>';
    }).join('');
    var sorted = db.services.slice().sort(function (a, b) { return a.price - b.price; });
    if (sorted.length >= 2) {
      var lo = sorted[0], hi = db.services.filter(function (x) { return x.popular; })[0] || sorted[sorted.length - 1];
      if (hi.id !== lo.id) {
        var extra = hi.features.filter(function (f) { return lo.features.indexOf(f) < 0; }).slice(0, 3).map(E).join(', ').toLowerCase();
        $('#upsell').innerHTML = 'Naik ke <b>Tukang ' + E(hi.name) + '</b> cuma <b>+' + R(hi.price - lo.price) + '</b>' + (extra ? ' — dapat ' + extra + '.' : '.');
      } else $('#upsell').textContent = '';
    } else $('#upsell').textContent = '';
    $('#promos').innerHTML = pr.map(function (p) {
      return '<div class="p">' + I('tag') + '<div><b>' + E(p.title) + '</b><small>Diskon ' + p.discount + '%' + (p.until ? ' · s/d ' + E(p.until) : '') + ' · masukkan kode saat booking</small></div><code>' + E(p.code) + '</code></div>';
    }).join('');

    /* capster */
    $('#caps').innerHTML = cs.map(function (c) {
      var st = c.status === 'Tersedia' ? 'ok' : (c.status === 'Libur' || c.status === 'Istirahat') ? 'mute' : 'warn';
      return '<div class="card cap"><div class="ph"><img src="' + E(c.photo || 'img/logo-192.webp') + '" width="332" height="391" alt="' + E(c.name) + '" loading="lazy" decoding="async"' + (c.photo ? '' : ' style="object-fit:contain;padding:40px"') + '><span class="tag ' + st + '"><i class="dot ' + (st === 'mute' ? '' : st) + '"></i>' + E(c.status) + '</span></div>' +
        '<div class="in"><h3>' + E(c.name) + ' <span>' + I('star') + Number(c.rating).toFixed(1) + '</span></h3><p>' + c.exp + ' tahun pengalaman</p><span class="tag">' + E(c.spec) + '</span></div></div>';
    }).join('');

    /* antrean */
    var active = cs.filter(function (c) { return c.status !== 'Libur' && c.status !== 'Istirahat'; });
    var wait = db.queue.filter(function (q) { return q.status === 'Menunggu'; });
    var serv = db.queue.filter(function (q) { return q.status === 'Dicukur'; });
    var todayStr = new Date().toDateString();
    var done = db.queue.filter(function (q) { return q.status === 'Selesai' && (q.doneDate === TC.today() || new Date(q.created).toDateString() === todayStr); }).length;
    var avg = db.services.length ? Math.round(db.services.reduce(function (a, b) { return a + b.duration; }, 0) / db.services.length) : 30;
    var est = Math.ceil(wait.length * avg / Math.max(1, active.length));

    /* kontak */
    $('#cAddr').textContent = s.address.replace(' (DATA DEMO)', ''); $('#cWa').textContent = s.wa; $('#cMail').textContent = s.email;
    $('#fAddr').textContent = s.address.replace(' (DATA DEMO)', ''); $('#fWa').textContent = s.wa;
    var wl = waLink('Halo ' + s.name + ', saya mau tanya / booking.');
    ['heroWa', 'ctaWa', 'waBtn', 'mWa'].forEach(function (id) { $('#' + id).href = wl; });
    ['telBtn', 'mTel'].forEach(function (id) { $('#' + id).href = 'tel:' + s.wa.replace(/\s/g, ''); });
    $('#mapBtn').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + s.address.replace(' (DATA DEMO)', ''));
    $('#yr').textContent = new Date().getFullYear();

    fillSelects();
    renderStatus();
    renderLive();
  }


  /* ---------- panel antrean live (tombol chat) ---------- */
  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || 'Pelanggan'; }
  function renderLive() {
    var cs = db.capsters, os = TC.openState(db);
    var wait = db.queue.filter(function (q) { return q.status === 'Menunggu'; });
    var serv = db.queue.filter(function (q) { return q.status === 'Dicukur'; });
    var cutting = cs.filter(function (c) { return c.status === 'Sedang Mencukur'; });
    var rest = cs.filter(function (c) { return c.status === 'Istirahat'; });
    var ready = cs.filter(function (c) { return c.status === 'Tersedia'; });
    var avail = cs.filter(function (c) { return c.status !== 'Libur' && c.status !== 'Istirahat'; });
    var avg = db.services.length ? Math.round(db.services.reduce(function (a, b) { return a + b.duration; }, 0) / db.services.length) : 30;
    var est = Math.ceil(wait.length * avg / Math.max(1, avail.length));

    /* tombol chat */
    var b = $('#liveBdg');
    b.textContent = wait.length || '';
    b.className = 'bdg' + (wait.length ? '' : ' zero') + (!os.open ? ' closed' : '');
    $('#lpDot').className = 'dot ' + (os.open ? 'ok' : '');
    $('#lpStatus').textContent = os.open ? 'Buka · ' + os.text : 'Tutup · ' + os.text;

    /* status singkat */
    var msg, cls = os.open ? 'ok' : 'closed';
    if (!os.open) msg = 'Sedang tutup. ' + os.text + '. Kamu tetap bisa booking untuk jadwal berikutnya.';
    else if (!wait.length && !serv.length && !cutting.length) msg = 'Antrean kosong, langsung datang tanpa menunggu.';
    else if (!wait.length) msg = ready.length + ' capster siap melayani sekarang, tanpa antre.';
    else msg = wait.length + ' orang menunggu. Estimasi giliranmu sekitar ' + fmtMin(est) + '.';
    var mEl = $('#lpMsg'); mEl.textContent = msg; mEl.className = 'lp-msg ' + cls;
    $('#lpWait').textContent = wait.length; $('#lpServ').textContent = Math.max(serv.length, cutting.length);
    $('#lpEst').textContent = wait.length ? fmtMin(est) : '—';
    /* semua capster: status + pasangan pelanggan */
    var order = { 'Sedang Mencukur': 0, 'Tersedia': 1, 'Istirahat': 2, 'Libur': 3 }, si = 0;
    var caps = cs.slice().sort(function (x, y) { return (order[x.status] == null ? 4 : order[x.status]) - (order[y.status] == null ? 4 : order[y.status]); });
    $('#lpCapN').textContent = ready.length + '/' + cs.filter(function (c) { return c.status !== 'Libur'; }).length + ' siap';
    $('#lpCaps').innerHTML = caps.length ? caps.map(function (c) {
      var k = 'ok', sub = 'Siap melayani', lab = 'Tersedia';
      if (c.status === 'Sedang Mencukur') { var q = serv[si++]; k = 'warn'; lab = 'Mencukur'; sub = 'Mencukur ' + (q ? E(firstName(q.name)) : 'pelanggan'); }
      else if (c.status === 'Istirahat') { k = 'mute'; lab = 'Istirahat'; sub = 'Kembali sebentar lagi'; }
      else if (c.status === 'Libur') { k = 'mute'; lab = 'Libur'; sub = 'Tidak bertugas hari ini'; }
      return '<div class="cp ' + k + '"><span class="av"><img src="' + E(c.photo || 'img/logo-t-96.webp') + '" alt="" width="44" height="44"></span><div class="m"><b>' + E(c.name) + '</b><small>' + sub + '</small></div><span class="st"><i></i>' + lab + '</span></div>';
    }).join('') : '<div class="lnone">Belum ada data capster.</div>';

    /* antrean berikutnya (nama depan saja demi privasi) */
    var nx = wait.slice(0, 3).map(function (q) {
      return '<div class="lrow slim"><div class="no">' + (db.queue.indexOf(q) + 1) + '</div><div class="m"><b>' + E(firstName(q.name)) + '</b><small>' + E((svc(q.serviceId) || {}).name || '') + ' · ' + TC.ago(q.created) + '</small></div></div>';
    });
    if (wait.length > 3) nx.push('<div class="lmore">+' + (wait.length - 3) + ' antrean lainnya</div>');
    $('#lpNext').innerHTML = nx.length ? nx.join('') : '<div class="lnone">Belum ada antrean. Jadilah yang pertama!</div>';
  }
  function fmtMin(m) { if (m > 240) return '4j+'; if (m < 60) return m + 'm'; return Math.floor(m / 60) + 'j' + (m % 60 ? ' ' + (m % 60) + 'm' : ''); }
  function liveOpen(on) {
    var p = $('#livePanel'), f = $('#liveFab');
    if (on === undefined) on = !p.classList.contains('open');
    p.classList.toggle('open', on); f.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) { renderLive(); $('#menu').classList.remove('open'); }
  }
  $('#liveFab').addEventListener('click', function () { liveOpen(); });
  $('#liveX').addEventListener('click', function () { liveOpen(false); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-live]') : null;
    if (t) { e.preventDefault(); liveOpen(true); return; }
    var p = $('#livePanel');
    if (p.classList.contains('open') && !p.contains(e.target) && !$('#liveFab').contains(e.target) && !(e.target.closest && e.target.closest('[data-open]'))) liveOpen(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') liveOpen(false); });

  /* ---------- modal booking ---------- */
  var lastFocus = null;
  function timeSlots(dateStr) {
    var d = new Date(dateStr + 'T00:00:00Z').getUTCDay(), h = db.settings.hours[d];
    if (!h) return [];
    var out = [], step = db.settings.perSlotMinutes || 30;
    for (var m = TC.toMin(h[0]); m < TC.toMin(h[1]); m += step) out.push(pad(Math.floor(m / 60)) + ':' + pad(m % 60));
    return out;
  }
  function fillTimes() {
    var dateStr = $('#bDate').value, slots = timeSlots(dateStr), sel = $('#bTime');
    if (dateStr === TC.today()) { var n = TC.wibNow(), cur = n.h * 60 + n.m; slots = slots.filter(function (t) { return TC.toMin(t) > cur; }); }
    var taken = db.bookings.filter(function (b) { return b.date === dateStr && b.status !== 'Batal'; }).map(function (b) { return b.time; });
    sel.innerHTML = slots.length ? slots.map(function (t) { return '<option value="' + t + '">' + t + (taken.indexOf(t) > -1 ? ' (sudah ada booking)' : '') + '</option>'; }).join('') : '<option value="">Tidak tersedia</option>';
  }
  function updTotal() {
    var f = $('#bForm'), sv = svc(f.svc.value); if (!sv) { $('#bTotal').textContent = ''; return; }
    var p = promoByCode(f.promo.value), total = sv.price, msg = '';
    if (f.promo.value.trim()) { if (p) { total = Math.round(sv.price * (100 - p.discount) / 100); msg = 'Promo ' + p.code + ' aktif: diskon ' + p.discount + '%'; } else msg = 'Kode promo tidak valid'; }
    $('#bPromoMsg').textContent = msg;
    $('#bTotal').textContent = 'Total: ' + R(total) + (p ? '  (hemat ' + R(sv.price - total) + ')' : '');
  }
  function showForm(on) {
    var f = $('#bForm'), d = $('#bDone');
    f.style.display = on ? '' : 'none'; if (d) d.style.display = on ? 'none' : '';
  }
  function openBooking(svcId) {
    lastFocus = document.activeElement;
    db = TC.load(); fillSelects();
    var f = $('#bForm');
    if (svcId) f.svc.value = svcId;
    f.date.min = TC.today(); if (!f.date.value || f.date.value < TC.today()) f.date.value = TC.today();
    fillTimes(); updTotal(); showForm(true);
    $('#bookingModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { if (!$('#bForm').contains(document.activeElement)) $('#bName').focus(); }, 50);
  }
  function closeBooking() {
    $('#bookingModal').classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (t) { e.preventDefault(); $('#menu').classList.remove('open'); openBooking(t.getAttribute('data-svc')); return; }
    if ((e.target.closest && e.target.closest('[data-close]')) || e.target === $('#bookingModal')) closeBooking();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#bookingModal').classList.contains('open')) closeBooking(); });
  $('#bDate').addEventListener('change', fillTimes);
  $('#bForm').addEventListener('input', updTotal);
  $('#bForm').addEventListener('change', updTotal);

  var done = document.createElement('div');
  done.id = 'bDone'; done.style.display = 'none';
  $('#bookingModal .card').appendChild(done);

  $('#bForm').addEventListener('submit', function (e) {
    e.preventDefault(); db = TC.load();
    if (!db.settings.acceptBooking) { toast('Booking online sedang ditutup sementara. Hubungi kami lewat WhatsApp.'); return; }
    var f = this;
    if (!f.time.value) { toast('Pilih jam yang tersedia.'); return; }
    var p = promoByCode(f.promo.value), sv = svc(f.svc.value);
    var pay = (f.pay && f.pay.value) || 'Tunai';
    var b = { id: TC.uid('b'), name: f.name.value.trim(), wa: f.wa.value.trim(), serviceId: f.svc.value, capsterId: f.cap.value, date: f.date.value, time: f.time.value, status: 'Baru', promo: p ? p.code : '', pay: pay, payStatus: 'Belum bayar', created: Date.now() };
    var total = sv ? (p ? Math.round(sv.price * (100 - p.discount) / 100) : sv.price) : 0; b.total = total;
    var dt = b.date.split('-').reverse().join('/');
    var cp = db.capsters.filter(function (c) { return c.id === b.capsterId; })[0];
    db.bookings.unshift(b);
    /* 1) notifikasi  2) pesan masuk dasbor admin  3) opsi teruskan WhatsApp */
    TC.notify(db, 'booking', 'Booking baru dari ' + b.name + ' (' + dt + ' ' + b.time + ') · ' + pay);
    db.messages.unshift({ id: TC.uid('m'), kind: 'booking', bookingId: b.id, name: b.name, contact: b.wa, read: false, reply: '', created: Date.now(),
      text: 'BOOKING BARU\nLayanan: ' + (sv ? sv.name : '-') + '\nCapster: ' + (cp ? cp.name : 'Siapa saja') + '\nJadwal: ' + dt + ' jam ' + b.time + '\nTotal: ' + R(total) + (p ? ' (promo ' + p.code + ')' : '') + '\nPembayaran: ' + pay });
    TC.save(db);
    var msg = 'Halo ' + db.settings.name + ', saya ' + b.name + ' sudah booking ' + (sv ? 'Tukang ' + sv.name : '') + ' pada ' + dt + ' jam ' + b.time + '. Total ' + R(total) + ', bayar ' + pay + '.' + (p ? ' Kode promo: ' + p.code + '.' : '') + ' Mohon konfirmasi ya.';
    function step(t) { return '<li><span class="ck">' + I('check') + '</span><span>' + t + '</span></li>'; }
    done.innerHTML = '<div style="text-align:center;padding:6px 0 4px"><div style="width:60px;height:60px;border-radius:50%;background:var(--gold);color:var(--ink);display:grid;place-items:center;margin:0 auto 12px">' + I('check', 'lg') + '</div><h3 style="justify-content:center;margin-bottom:6px">Booking terkirim!</h3><p style="color:var(--muted);margin-bottom:14px">' + E(b.name) + ', jadwalmu <b style="color:var(--text)">' + dt + ' &middot; ' + b.time + '</b></p>'
      + '<ul class="dsteps">' + step('Masuk ke <b>notifikasi</b> admin') + step('Masuk ke <b>pesan</b> dasbor admin') + '</ul>'
      + (pay === 'QRIS' ? '<div class="qrbox"><img src="img/qris.webp" alt="QRIS Tukang Cukur" width="260" height="300"></div><p class="qrnote">Scan QRIS di atas &amp; bayar <b style="color:var(--text)">' + R(total) + '</b>. Kasir akan mengonfirmasi pembayaranmu.</p>' : '<p class="qrnote">Bayar tunai di tempat sebesar <b style="color:var(--text)">' + R(total) + '</b>.</p>')
      + '<a class="btn wa block lg" target="_blank" rel="noopener" href="' + waLink(msg) + '">' + I('message') + 'Teruskan ke WhatsApp</a><button class="btn block" type="button" data-close style="margin-top:10px">Selesai, tanpa WhatsApp</button></div>';
    showForm(false); f.reset(); render();
  });

  /* ---------- form antrean (modal) & pesan ---------- */
  function openQ() { db = TC.load(); fillSelects(); liveOpen(false); $('#queueModal').classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(function () { $('#qName').focus(); }, 60); }
  function closeQ() { $('#queueModal').classList.remove('open'); if (!$('#bookingModal').classList.contains('open')) document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-queue]') : null;
    if (t) { e.preventDefault(); $('#menu').classList.remove('open'); openQ(); return; }
    if ((e.target.closest && e.target.closest('[data-qclose]')) || e.target === $('#queueModal')) closeQ();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#queueModal').classList.contains('open')) closeQ(); });

  $('#qForm').addEventListener('submit', function (e) {
    e.preventDefault(); db = TC.load(); var f = this;
    var q = { id: TC.uid('q'), name: f.name.value.trim(), wa: f.wa.value.trim(), serviceId: f.svc.value, status: 'Menunggu', created: Date.now() };
    db.queue.push(q); TC.notify(db, 'queue', 'Antrean walk-in: ' + q.name); TC.save(db);
    f.reset(); closeQ(); render(); toast('Nomor antrean kamu: ' + db.queue.length);
    setTimeout(function () { liveOpen(true); }, 350);
  });
  $('#msgForm').addEventListener('submit', function (e) {
    e.preventDefault(); db = TC.load(); var f = this;
    db.messages.unshift({ id: TC.uid('m'), name: f.name.value.trim(), contact: f.contact.value.trim(), text: f.text.value.trim(), read: false, reply: '', created: Date.now() });
    TC.notify(db, 'message', 'Pesan baru dari ' + f.name.value.trim()); TC.save(db);
    f.reset(); toast('Pesan terkirim. Terima kasih!');
  });

  /* sinkron antar tab; status diperbarui tiap 60 dtk (bukan tiap detik) */
  window.addEventListener('tc:change', render);
  window.addEventListener('storage', render);
  setInterval(function () { if (!document.hidden) { renderStatus(); renderLive(); } }, 60000);

  /* animasi muncul saat discroll (sekali jalan, ringan) */
  try {
    if ('IntersectionObserver' in window) {
      document.documentElement.classList.add('js');
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
      $$('.head,.promos,.upsell,.faq,.cta,.note,.live,.two,.hstats').forEach(function (e) { e.classList.add('rv'); io.observe(e); });
      $$('.plans,.grid4,.caps,.steps,.rev,.qstats,.trust .wrap').forEach(function (e) { e.classList.add('rv', 'stag'); io.observe(e); });
    }
  } catch (e) {}
  render();
})();
