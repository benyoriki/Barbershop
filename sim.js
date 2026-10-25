/* Tukang Cukur — Simulasi lalu lintas (tes performa).
   Membuat transaksi, pembayaran Tunai/QRIS, booking, pesan, notifikasi & antrean berjalan secara acak.
   Semua data ditandai sim:true sehingga bisa dihapus. Ringan: 1x baca + 1x simpan per tick. */
(function () {
  'use strict';
  var KEY = 'tc_sim', TAB = Math.random().toString(36).slice(2);
  var FIRST = ['Andi', 'Budi', 'Cahyo', 'Dimas', 'Eko', 'Fajar', 'Gilang', 'Hendra', 'Iqbal', 'Joko', 'Kevin', 'Lutfi', 'Rizky', 'Naufal', 'Oki', 'Putra', 'Rafi', 'Satria', 'Teguh', 'Wahyu', 'Yoga', 'Zaki', 'Ayu', 'Bella', 'Citra', 'Dewi', 'Fitri', 'Intan', 'Maya', 'Sinta'];
  var LAST = ['Pratama', 'Saputra', 'Wijaya', 'Hidayat', 'Nugroho', 'Ramadhan', 'Kurniawan', 'Setiawan', 'Lestari', 'Permana', 'Maulana', 'Firmansyah'];
  var NOTE = ['Mau potongan rapi ya, kak', 'Apakah hari ini ramai?', 'Bisa cukur anak 7 tahun?', 'Tanya harga paket keluarga', 'Boleh minta capster Susi?', 'Terima kasih, hasilnya keren!'];
  var P = { on: false, speed: 5, owner: '', ts: 0 };
  var st = { ticks: 0, started: 0, carry: 0, ev: { tx: 0, qris: 0, tunai: 0, book: 0, msg: 0, queue: 0, notif: 0, done: 0 }, omzet: 0, ms: [], maxMs: 0, fps: 0, long: 0, frames: 0, last: 0 };
  var timer = 0, raf = 0, hud, hudPop, mounts = [], uiTimer = 0;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function pad(n, l) { return ('000' + n).slice(-(l || 2)); }
  function name() { return pick(FIRST) + (Math.random() < .6 ? ' ' + pick(LAST) : ''); }
  function phone() { return '08' + (1 + rnd(9)) + pad(rnd(100000000), 8); }
  function readCfg() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function writeCfg() { P.ts = Date.now(); try { localStorage.setItem(KEY, JSON.stringify({ on: P.on, speed: P.speed, owner: P.owner, ts: P.ts })); } catch (e) {} }

  /* ---------- pembuat data ---------- */
  function mkTx(db, o) {
    var now = Date.now(), date = TC.today(), w = TC.wibNow();
    var items = o.items, sub = 0; items.forEach(function (l) { sub += l.price * l.qty; });
    var promo = o.promo, disc = promo ? Math.round(sub * promo.discount / 100) : 0, total = sub - disc;
    var method = o.method || (Math.random() < .42 ? 'QRIS' : 'Tunai');
    var paid = total, change = 0;
    if (method === 'Tunai') { var step = total > 50000 ? 50000 : 10000; paid = Math.ceil(total / step) * step; if (Math.random() < .3) paid = Math.ceil(total / 100000) * 100000; change = paid - total; }
    var seq = db._seq = (db._seq || db.transactions.filter(function (t) { return t.date === date; }).length) + 1;
    var no = 'TC' + date.replace(/-/g, '').slice(2) + '-' + pad(seq, 3);
    var tx = { id: TC.uid('t'), no: no, date: date, time: pad(w.h) + ':' + pad(w.m), created: now, cashier: db.settings.cashier, customer: o.customer, wa: o.wa || '', capsterId: o.capsterId || '', items: items, subtotal: sub, discount: disc, promo: promo ? promo.code : '', total: total, method: method, paid: paid, change: change, void: false, sim: true };
    db.transactions.unshift(tx);
    db.cash.unshift({ id: TC.uid('k'), date: date, created: now, type: 'masuk', category: 'Penjualan', amount: total, note: no, method: method, ref: tx.id, source: 'kasir', sim: true });
    items.forEach(function (l) { if (l.type === 'prd') { var p = db.products.filter(function (x) { return x.id === l.id; })[0]; if (p) p.stock = p.stock > 3 ? p.stock - l.qty : 40; } });
    note(db, 'system', (method === 'QRIS' ? 'Pembayaran QRIS diterima ' : 'Pembayaran tunai diterima ') + TC.rupiah(total) + ' · ' + o.customer + ' (' + no + ')');
    st.ev.tx++; st.omzet += total; if (method === 'QRIS') st.ev.qris++; else st.ev.tunai++;
    return tx;
  }
  function note(db, type, text) { TC.notify(db, type, text); db.notifications[0].sim = true; st.ev.notif++; }
  function svcItem(s) { return { type: 'svc', id: s.id, name: 'Tukang ' + s.name, price: s.price, qty: 1 }; }
  function prodItem(db) { var p = pick(db.products); return p ? { type: 'prd', id: p.id, name: p.name, price: p.price, qty: 1 } : null; }
  function activePromo(db) { var a = db.promos.filter(function (p) { return p.active; }); return a.length && Math.random() < .2 ? a[0] : null; }
  function itemsFor(db, svcId) {
    var s = db.services.filter(function (x) { return x.id === svcId; })[0] || db.services[0], it = [svcItem(s)];
    if (Math.random() < .25) { var pi = prodItem(db); if (pi) it.push(pi); }
    return it;
  }

  function addWalkin(db) {
    if (db.queue.filter(function (q) { return q.status === 'Menunggu'; }).length >= 24) return;
    var s = pick(db.services), q = { id: TC.uid('q'), name: name(), wa: phone(), serviceId: s.id, status: 'Menunggu', created: Date.now(), sim: true };
    db.queue.push(q); note(db, 'queue', 'Antrean walk-in: ' + q.name); st.ev.queue++;
  }
  function addBooking(db) {
    var s = pick(db.services), c = Math.random() < .8 ? pick(db.capsters.filter(function (x) { return x.status !== 'Libur'; })) : null;
    var d = TC.today(Math.random() < .6 ? 0 : 1), h = 9 + rnd(11), m = Math.random() < .5 ? '00' : '30', pay = Math.random() < .45 ? 'QRIS' : 'Tunai';
    var p = activePromo(db), total = p ? Math.round(s.price * (100 - p.discount) / 100) : s.price;
    var b = { id: TC.uid('b'), name: name(), wa: phone(), serviceId: s.id, capsterId: c ? c.id : '', date: d, time: pad(h) + ':' + m, status: 'Baru', promo: p ? p.code : '', pay: pay, payStatus: 'Belum bayar', total: total, created: Date.now(), sim: true };
    db.bookings.unshift(b);
    note(db, 'booking', 'Booking baru dari ' + b.name + ' (' + d.split('-').reverse().join('/') + ' ' + b.time + ') · ' + pay);
    db.messages.unshift({ id: TC.uid('m'), kind: 'booking', bookingId: b.id, name: b.name, contact: b.wa, read: false, reply: '', created: Date.now(), sim: true,
      text: 'BOOKING BARU\nLayanan: ' + s.name + '\nCapster: ' + (c ? c.name : 'Siapa saja') + '\nJadwal: ' + d.split('-').reverse().join('/') + ' jam ' + b.time + '\nTotal: ' + TC.rupiah(total) + (p ? ' (promo ' + p.code + ')' : '') + '\nPembayaran: ' + pay });
    st.ev.book++; st.ev.msg++;
  }
  function addMessage(db) {
    var n = name();
    db.messages.unshift({ id: TC.uid('m'), name: n, contact: phone(), text: pick(NOTE), read: false, reply: '', created: Date.now(), sim: true });
    note(db, 'message', 'Pesan baru dari ' + n); st.ev.msg++;
  }
  function confirmBooking(db) {
    var b = db.bookings.filter(function (x) { return x.sim && x.status === 'Baru'; })[0]; if (!b) return addWalkin(db);
    b.status = 'Dikonfirmasi';
    if (b.date === TC.today() && db.queue.filter(function (q) { return q.status === 'Menunggu'; }).length < 24) {
      db.queue.push({ id: TC.uid('q'), name: b.name, wa: b.wa, serviceId: b.serviceId, status: 'Menunggu', created: Date.now(), bookingId: b.id, sim: true }); st.ev.queue++;
    }
  }
  function directSale(db) {
    var s = pick(db.services), pi = prodItem(db), it = Math.random() < .5 && pi ? [pi] : [svcItem(s)];
    mkTx(db, { customer: name(), wa: '', capsterId: pick(db.capsters).id, items: it, promo: null }); st.ev.done++;
  }

  /* ---------- antrean berjalan ---------- */
  function runQueue(db, now) {
    var sp = P.speed;
    db.capsters.forEach(function (c) {
      if (!c.simUntil || c.simUntil > now) return;
      if (c.status === 'Sedang Mencukur') {
        var q = db.queue.filter(function (x) { return x.status === 'Dicukur' && x.capsterId === c.id; })[0];
        if (q) {
          mkTx(db, { customer: q.name, wa: q.wa, capsterId: c.id, items: itemsFor(db, q.serviceId), promo: activePromo(db) });
          q.status = 'Selesai'; q.doneDate = TC.today(); st.ev.done++;
          if (q.bookingId) { var b = db.bookings.filter(function (x) { return x.id === q.bookingId; })[0]; if (b) { b.status = 'Selesai'; b.payStatus = 'Lunas'; } }
        }
        if (Math.random() < .3) { c.status = 'Istirahat'; c.simUntil = now + (6000 + rnd(8000)) / sp; } else { c.status = 'Tersedia'; c.simUntil = now; }
      } else if (c.status === 'Istirahat') { c.status = 'Tersedia'; c.simUntil = now; }
    });
    db.capsters.forEach(function (c) {
      if (c.status !== 'Tersedia') return;
      var q = db.queue.filter(function (x) { return x.status === 'Menunggu'; })[0]; if (!q) return;
      q.status = 'Dicukur'; q.capsterId = c.id; c.status = 'Sedang Mencukur'; c.simUntil = now + (9000 + rnd(12000)) / sp;
    });
  }

  function prune(db) {
    function cap(arr, max, extra) {
      var n = 0, i; for (i = 0; i < arr.length; i++) if (arr[i].sim) n++;
      for (i = arr.length - 1; i >= 0 && n > max; i--) if (arr[i].sim && (!extra || extra(arr[i]))) { if (arr[i].id && arr === db.transactions) { var id = arr[i].id; db.cash = db.cash.filter(function (k) { return k.ref !== id; }); } arr.splice(i, 1); n--; }
    }
    cap(db.queue, 40, function (q) { return q.status === 'Selesai'; });
    cap(db.bookings, 160, function (b) { return b.status !== 'Baru'; });
    cap(db.messages, 140); cap(db.notifications, 220); cap(db.transactions, 1500);
    if (db.cash.length > 4000) cap(db.cash, 1500);
  }

  /* ---------- tick ---------- */
  function tick() {
    var t0 = performance.now(), now = Date.now();
    var db = TC.load();
    var rate = P.speed * 0.8, interval = Math.max(250, Math.min(1200, 1200 / P.speed));
    st.carry += rate * interval / 1000;
    var n = Math.floor(st.carry); st.carry -= n;
    for (var i = 0; i < n; i++) {
      var r = Math.random();
      if (r < .34) addWalkin(db); else if (r < .54) addBooking(db); else if (r < .68) addMessage(db);
      else if (r < .84) confirmBooking(db); else if (r < .94) directSale(db); else note(db, 'system', pick(['Stok produk menipis', 'Backup otomatis berhasil', 'Pelanggan memberi ulasan baru']));
    }
    runQueue(db, now); prune(db); delete db._seq;
    TC.save(db);
    var d = performance.now() - t0; st.ms.push(d); if (st.ms.length > 40) st.ms.shift(); if (d > st.maxMs) st.maxMs = d;
    st.ticks++; writeCfg();
    timer = setTimeout(tick, interval);
  }

  function frame(t) {
    if (!P.on || P.owner !== TAB) return;
    if (st.last) { var dt = t - st.last; st.frames++; if (dt > 50) st.long++; st.fps += (1000 / dt - st.fps) * .1; }
    st.last = t; raf = requestAnimationFrame(frame);
  }

  function start(speed) {
    if (speed) P.speed = speed;
    if (P.on && P.owner === TAB) { writeCfg(); return; }
    P.on = true; P.owner = TAB; st.started = Date.now(); st.last = 0; st.fps = 60; st.long = 0; st.maxMs = 0; st.ms = [];
    writeCfg(); clearTimeout(timer); tick(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); ui();
  }
  function stop() {
    var mine = P.owner === TAB; P.on = false; clearTimeout(timer); cancelAnimationFrame(raf);
    if (mine || true) { P.owner = ''; writeCfg(); } ui();
  }
  function setSpeed(s) { P.speed = s; st.carry = 0; if (P.on && P.owner === TAB) { clearTimeout(timer); timer = setTimeout(tick, 50); writeCfg(); } else writeCfg(); ui(); }
  function clearData() {
    var db = TC.load(), k;
    db.transactions = db.transactions.filter(function (x) { return !x.sim; });
    db.cash = db.cash.filter(function (x) { return !x.sim; });
    ['queue', 'bookings', 'messages', 'notifications'].forEach(function (a) { db[a] = db[a].filter(function (x) { return !x.sim; }); });
    db.capsters.forEach(function (c) { if (c.simUntil) { delete c.simUntil; if (c.status === 'Sedang Mencukur') c.status = 'Tersedia'; } });
    st.ev = { tx: 0, qris: 0, tunai: 0, book: 0, msg: 0, queue: 0, notif: 0, done: 0 }; st.omzet = 0;
    TC.save(db); ui();
  }

  /* ---------- UI (HUD + panel) ---------- */
  function metrics() {
    var avg = 0; st.ms.forEach(function (x) { avg += x; }); avg = st.ms.length ? avg / st.ms.length : 0;
    var raw = ''; try { raw = localStorage.getItem('tc_db_v1') || ''; } catch (e) {}
    var mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'n/a';
    var sec = P.on && P.owner === TAB ? Math.floor((Date.now() - st.started) / 1000) : 0;
    return { fps: Math.round(st.fps), avg: avg, max: st.maxMs, kb: Math.round(raw.length / 1024), dom: document.getElementsByTagName('*').length, mem: mem, up: pad(Math.floor(sec / 60)) + ':' + pad(sec % 60) };
  }
  function remote() { return P.on && P.owner !== TAB; }
  function running() { return P.on && P.owner === TAB; }
  function ico(p) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">' + (p ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>') + '</svg>'; }
  function panelHTML() {
    var m = metrics(), e = st.ev, on = running();
    var sp = [1, 5, 20, 50].map(function (s) { return '<button type="button" data-sim-speed="' + s + '" class="' + (P.speed === s ? 'on' : '') + '">' + (s === 50 ? 'Turbo ' : '') + '&times;' + s + '</button>'; }).join('');
    function c(l, v) { return '<div class="sc"><b>' + v + '</b><small>' + l + '</small></div>'; }
    return '<div class="simp"><div class="sh"><span class="sd ' + (on ? 'on' : remote() ? 'rem' : '') + '"></span><b>Simulasi Lalu Lintas</b><em>' + (on ? 'berjalan ' + m.up : remote() ? 'berjalan di tab lain' : 'berhenti') + '</em></div>'
      + '<div class="sb"><button type="button" class="sp" data-sim-toggle>' + ico(on) + (on ? 'Jeda' : (remote() ? 'Ambil alih' : 'Play')) + '</button><div class="ss">' + sp + '</div></div>'
      + '<div class="sg">' + c('FPS', m.fps) + c('Tick rata2', m.avg.toFixed(1) + ' ms') + c('Tick maks', m.max.toFixed(0) + ' ms') + c('Frame patah', st.long) + c('Ukuran data', m.kb + ' KB') + c('Elemen DOM', m.dom) + c('Memori JS', m.mem) + c('Tick', st.ticks) + '</div>'
      + '<div class="sg">' + c('Transaksi', e.tx) + c('QRIS', e.qris) + c('Tunai', e.tunai) + c('Selesai dicukur', e.done) + c('Booking', e.book) + c('Pesan', e.msg) + c('Antrean baru', e.queue) + c('Notifikasi', e.notif) + '</div>'
      + '<div class="so">Omzet simulasi <b>' + TC.rupiah(st.omzet) + '</b></div>'
      + '<div class="sf"><button type="button" data-sim-clear>Hapus data simulasi</button></div>'
      + '<p class="sn">Data simulasi memakai tanda khusus dan bisa dihapus kapan saja. Buka website &amp; dasbor di dua tab untuk melihat sinkron langsung.</p></div>';
  }
  function hudHTML() {
    var m = metrics();
    if (running()) return '<span class="sd on"></span><b>SIM &times;' + P.speed + '</b><span>' + m.fps + ' fps</span><span>' + m.avg.toFixed(0) + ' ms</span>';
    if (remote()) return '<span class="sd rem"></span><b>SIM aktif</b><span>tab lain</span>';
    return ico(false) + '<b>Play simulasi</b>';
  }
  function ui() {
    if (hud) hud.innerHTML = hudHTML();
    if (hudPop && hudPop.classList.contains('open')) hudPop.innerHTML = panelHTML() + '<button type="button" class="sx" data-sim-close aria-label="Tutup">&times;</button>';
    mounts = mounts.filter(function (el) { return document.body.contains(el); });
    mounts.forEach(function (el) { el.innerHTML = panelHTML(); });
  }
  function uiLoop() { clearInterval(uiTimer); uiTimer = setInterval(function () { if (!document.hidden) ui(); }, 700); }

  var CSS = '.simhud{position:fixed;left:12px;bottom:84px;z-index:80;display:flex;align-items:center;gap:8px;height:36px;padding:0 13px;border-radius:99px;border:1px solid #2b3a34;background:#0b1210;color:#e9efe9;font:600 12px/1 "Segoe UI",system-ui,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45)}.simhud b{font-weight:800}.simhud span{color:#a4b1aa}.simhud:hover{border-color:#dcb96a}'
    + '@media(min-width:760px){.simhud{bottom:18px}}'
    + '.simpop{position:fixed;left:12px;bottom:130px;z-index:81;width:min(380px,calc(100vw - 24px));max-height:calc(100vh - 150px);overflow:auto;background:#0b1210;border:1px solid #2b3a34;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.6);display:none;color:#e9efe9;font-family:"Segoe UI",system-ui,Arial,sans-serif}.simpop.open{display:block}@media(min-width:760px){.simpop{bottom:64px}}'
    + '.simpop .sx{position:absolute;right:10px;top:8px;background:none;border:0;color:#a4b1aa;font-size:22px;cursor:pointer;line-height:1}'
    + '.simp{padding:14px;font-size:13px;color:#e9efe9}.simp .sh{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-right:22px}.simp .sh em{margin-left:auto;font-style:normal;color:#a4b1aa;font-size:12px}'
    + '.sd{width:9px;height:9px;border-radius:50%;background:#6f7d76;display:inline-block;flex:none}.sd.on{background:#ff3b3b}.sd.rem{background:#e8a94a}'
    + '.simp .sb{display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap}.simp .sp{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:11px;background:#dcb96a;color:#1a1405;font-weight:800;font-size:14px;padding:11px 20px;cursor:pointer}'
    + '.simp .ss{display:flex;gap:4px;flex-wrap:wrap}.simp .ss button{border:1px solid #2b3a34;background:#121c18;color:#e9efe9;border-radius:9px;padding:8px 10px;font-weight:700;font-size:12.5px;cursor:pointer}.simp .ss button.on{border-color:#dcb96a;background:rgba(220,185,106,.16);color:#dcb96a}'
    + '.simp .sg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:8px}.simp .sc{background:#121c18;border:1px solid #22302a;border-radius:10px;padding:8px 6px;text-align:center;min-width:0}.simp .sc b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.simp .sc small{color:#a4b1aa;font-size:10.5px}'
    + '.simp .so{margin:8px 0;color:#a4b1aa}.simp .so b{color:#dcb96a;font-size:15px}.simp .sf button{border:1px solid #5a2a2a;background:transparent;color:#ff8a80;border-radius:9px;padding:8px 12px;font-weight:700;cursor:pointer;font-size:12.5px}.simp .sn{color:#6f7d76;font-size:11.5px;margin:10px 0 0;line-height:1.45}'
    + '@media(max-width:420px){.simp .sg{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{.simhud,.simpop{display:none!important}}';

  function init(opts) {
    opts = opts || {};
    var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    var c = readCfg(); P.speed = c.speed || 5;
    if (c.on && Date.now() - (c.ts || 0) < 4000) { P.on = true; P.owner = c.owner; }   /* tab lain masih menjalankan */
    else if (c.on) { P.on = false; P.owner = ''; writeCfg(); }
    if (!opts.noHud) {
      hud = document.createElement('button'); hud.type = 'button'; hud.className = 'simhud'; hud.setAttribute('aria-label', 'Simulasi lalu lintas'); document.body.appendChild(hud);
      hudPop = document.createElement('div'); hudPop.className = 'simpop'; document.body.appendChild(hudPop);
    }
    document.addEventListener('click', function (e) {
      var t = e.target; if (!t.closest) return;
      if (hud && t.closest('.simhud')) { hudPop.classList.toggle('open'); ui(); return; }
      var b;
      if ((b = t.closest('[data-sim-toggle]'))) { if (running()) stop(); else { P.on = false; start(); } return; }
      if ((b = t.closest('[data-sim-speed]'))) { setSpeed(+b.getAttribute('data-sim-speed')); return; }
      if (t.closest('[data-sim-clear]')) { clearData(); return; }
      if (t.closest('[data-sim-close]')) { hudPop.classList.remove('open'); return; }
    });
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY) return; var n = readCfg();
      if (n.owner !== TAB) { if (running()) { clearTimeout(timer); cancelAnimationFrame(raf); } P.on = !!n.on; P.owner = n.owner || ''; P.speed = n.speed || P.speed; }
      ui();
    });
    ui(); uiLoop();
  }

  TC.sim = { init: init, start: start, stop: stop, toggle: function () { if (running()) stop(); else { P.on = false; start(); } }, setSpeed: setSpeed, clear: clearData,
    mount: function (el) { if (mounts.indexOf(el) < 0) mounts.push(el); el.innerHTML = panelHTML(); }, running: running, state: function () { return { on: P.on, speed: P.speed, stats: st, metrics: metrics() }; } };
})();
