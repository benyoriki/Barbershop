/* Tukang Cukur - penyimpanan data bersama (localStorage, mode demo) */
(function () {
  var KEY = 'tc_db_v1';
  var DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

  function genData() {
    var names = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi', 'Intan', 'Joko', 'Kiki', 'Lina', 'Maman', 'Nanda', 'Oki', 'Putri', 'Rudi', 'Sari', 'Tono', 'Umi'];
    var methods = ['Tunai', 'Tunai', 'QRIS', 'Transfer', 'Tunai', 'Debit'];
    var caps = ['c1', 'c2', 'c3'], tx = [], cash = [], seq = 0;
    for (var d = 13; d >= 0; d--) {
      var date = today(-d), cnt = d === 0 ? 2 : 3 + ((d * 5 + 2) % 4);
      for (var j = 0; j < cnt; j++) {
        seq++;
        var prem = (seq * 3) % 5 < 2;
        var items = [prem ? { type: 'svc', id: 's2', name: 'Tukang Premium', price: 50000, qty: 1 } : { type: 'svc', id: 's1', name: 'Tukang Basic', price: 30000, qty: 1 }];
        if (seq % 7 === 0) items.push({ type: 'prd', id: 'p1', name: 'Pomade Premium', price: 65000, qty: 1 });
        var sub = items.reduce(function (a, b) { return a + b.price * b.qty; }, 0);
        var time = ('0' + (9 + j * 2)).slice(-2) + ':' + (j % 2 ? '30' : '00');
        var created = new Date(date + 'T' + time + ':00+07:00').getTime();
        var method = methods[seq % methods.length];
        var no = 'TC' + date.replace(/-/g, '').slice(2) + '-' + ('00' + (j + 1)).slice(-3);
        tx.push({ id: 't' + seq, no: no, date: date, time: time, created: created, cashier: 'Kasir 1', customer: names[seq % names.length], wa: '', capsterId: caps[seq % 3], items: items, subtotal: sub, discount: 0, promo: '', total: sub, method: method, paid: method === 'Tunai' ? Math.ceil(sub / 50000) * 50000 : sub, change: method === 'Tunai' ? Math.ceil(sub / 50000) * 50000 - sub : 0, void: false });
        cash.push({ id: 'k' + seq, date: date, created: created, type: 'masuk', category: 'Penjualan', amount: sub, note: no, method: method, ref: 't' + seq, source: 'kasir' });
      }
    }
    function man(i, off, type, cat, amt, note, method) {
      cash.push({ id: 'km' + i, date: today(off), created: new Date(today(off) + 'T08:00:00+07:00').getTime(), type: type, category: cat, amount: amt, note: note, method: method || 'Tunai', ref: '', source: 'manual' });
    }
    man(1, -13, 'masuk', 'Modal', 500000, 'Modal awal kas');
    man(2, -12, 'keluar', 'Sewa', 500000, 'Sewa tempat bulanan', 'Transfer');
    man(3, -9, 'keluar', 'Listrik & Air', 150000, 'Token listrik & air', 'Transfer');
    man(4, -6, 'keluar', 'Beli Produk', 120000, 'Stok pomade & shampoo');
    man(5, -2, 'keluar', 'Gaji/Komisi', 300000, 'Komisi capster pekan ini');
    man(6, 0, 'keluar', 'Operasional', 35000, 'Air galon & kebersihan');
    return { tx: tx, cash: cash };
  }

  function seed() {
    var now = Date.now();
    var gen = genData();
    return {
      settings: {
        name: 'Tukang Cukur',
        tagline: 'Barbershop Pria & Wanita',
        address: 'Jl. Contoh Raya No. 10, Bogor, Jawa Barat (DATA DEMO)',
        wa: '+6281200000000',
        email: 'halo@tukangcukur.id',
        hours: {
          0: ['08:30', '20:00'], 1: ['09:00', '20:00'], 2: ['09:00', '20:00'],
          3: ['09:00', '20:00'], 4: ['09:00', '20:00'], 5: ['09:00', '20:30'],
          6: ['08:30', '21:00']
        },
        perSlotMinutes: 30,
        acceptBooking: true,
        adminEmail: 'admin@tukangcukur.id',
        adminPass: 'admin123',
        adminName: 'Admin Demo',
        cashier: 'Kasir 1',
        paper: 58,
        showLogo: true,
        receiptFooter: 'Terima kasih sudah cukur di sini. Sampai jumpa lagi!'
      },
      products: [
        { id: 'p1', name: 'Pomade Premium', price: 65000, stock: 12 },
        { id: 'p2', name: 'Hair Tonic', price: 45000, stock: 8 },
        { id: 'p3', name: 'Shampoo Mini', price: 25000, stock: 20 },
        { id: 'p4', name: 'Sisir Saku', price: 15000, stock: 15 }
      ],
      transactions: gen.tx,
      cash: gen.cash,
      capsters: [
        { id: 'c1', name: 'Susi', exp: 10, spec: 'Founder & Senior Capster', rating: 4.9, status: 'Tersedia', photo: 'img/capster1.jpg' },
        { id: 'c2', name: 'Nia', exp: 5, spec: 'Layering & Styling', rating: 4.8, status: 'Tersedia', photo: 'img/capster2.jpg' },
        { id: 'c3', name: 'Rani', exp: 4, spec: 'Potong Rapi & Cepat', rating: 4.8, status: 'Sedang Mencukur', photo: 'img/capster3.jpg' }
      ],
      services: [
        { id: 's1', name: 'Basic', desc: 'Layanan esensial, cepat & rapi', price: 30000, duration: 30, popular: false,
          features: ['Potong rambut', 'Konsultasi model', 'Styling sederhana', 'Finishing rapi'] },
        { id: 's2', name: 'Premium', desc: 'Layanan lengkap + relaksasi', price: 50000, duration: 50, popular: true,
          features: ['Potong rambut', 'Konsultasi model', 'Hair wash', 'Styling', 'Finishing', 'Special Pijat Relaksasi'] }
      ],
      promos: [
        { id: 'p1', title: 'Diskon Pelanggan Baru', code: 'BARU10', discount: 10, until: '', active: true },
        { id: 'p2', title: 'Weekday Hemat', code: 'HEMAT5', discount: 5, until: '', active: false }
      ],
      bookings: [
        { id: 'b1', name: 'Andi Pratama', wa: '081211112222', serviceId: 's2', capsterId: 'c1', date: today(), time: '10:00', status: 'Dikonfirmasi', promo: '', created: now - 7200000 },
        { id: 'b2', name: 'Budi Santoso', wa: '081233334444', serviceId: 's1', capsterId: 'c2', date: today(), time: '13:30', status: 'Baru', promo: 'BARU10', created: now - 3600000 },
        { id: 'b3', name: 'Citra Lestari', wa: '081255556666', serviceId: 's2', capsterId: 'c3', date: today(-1), time: '15:00', status: 'Selesai', promo: '', created: now - 90000000 },
        { id: 'b4', name: 'Dewi Anggraini', wa: '081277778888', serviceId: 's1', capsterId: 'c1', date: today(-1), time: '11:00', status: 'Selesai', promo: '', created: now - 95000000 },
        { id: 'b5', name: 'Eko Wahyu', wa: '081299990000', serviceId: 's2', capsterId: 'c2', date: today(-2), time: '16:00', status: 'Selesai', promo: '', created: now - 180000000 },
        { id: 'b6', name: 'Fajar Nugroho', wa: '081200001111', serviceId: 's1', capsterId: 'c3', date: today(-3), time: '09:30', status: 'Selesai', promo: '', created: now - 270000000 },
        { id: 'b7', name: 'Gita Permata', wa: '081200002222', serviceId: 's2', capsterId: 'c1', date: today(-4), time: '14:00', status: 'Batal', promo: '', created: now - 360000000 },
        { id: 'b8', name: 'Hadi Kurniawan', wa: '081200003333', serviceId: 's1', capsterId: 'c2', date: today(-5), time: '17:00', status: 'Selesai', promo: '', created: now - 450000000 },
        { id: 'b9', name: 'Intan Sari', wa: '081200004444', serviceId: 's2', capsterId: 'c3', date: today(-6), time: '12:00', status: 'Selesai', promo: '', created: now - 540000000 }
      ],
      queue: [],
      messages: [
        { id: 'm1', name: 'Rina', contact: '081244445555', text: 'Kak, apakah bisa bayar cash/QRIS?', read: false, reply: '', created: now - 1800000 },
        { id: 'm2', name: 'Yoga', contact: 'yoga@mail.com', text: 'Apakah ada layanan potong rambut anak-anak?', read: false, reply: '', created: now - 5400000 }
      ],
      notifications: [
        { id: 'n1', type: 'booking', text: 'Booking baru dari Budi Santoso (13:30)', read: false, created: now - 3600000 },
        { id: 'n2', type: 'message', text: 'Pesan baru dari Rina', read: false, created: now - 1800000 },
        { id: 'n3', type: 'system', text: 'Selamat datang di dasbor admin Tukang Cukur', read: true, created: now - 86400000 }
      ]
    };
  }

  function today(offset) {
    var d = new Date(Date.now() + 7 * 3600 * 1000 + (offset || 0) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) {}
    var db = seed();
    save(db);
    return db;
  }

  /* tambahkan field baru ke data lama tanpa menghapus data yang sudah ada */
  function migrate(db) {
    if (db.transactions && db.cash && db.products && db.settings && db.settings.adminEmail) return db;
    var d = seed();
    if (db.settings && db.settings.pin && db.settings.adminPass === undefined) db.settings.adminPass = db.settings.pin;
    ['products', 'transactions', 'cash'].forEach(function (k) { if (!db[k]) db[k] = d[k]; });
    Object.keys(d.settings).forEach(function (k) { if (db.settings[k] === undefined) db.settings[k] = d.settings[k]; });
    return db;
  }

  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('tc:change')); } catch (e) {}
  }

  function uid(p) { return (p || 'x') + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }

  function rupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }

  function wibNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: map[o.weekday], h: +o.hour % 24, m: +o.minute, s: +o.second };
  }

  function toMin(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }

  function openState(db) {
    var n = wibNow();
    var hrs = db.settings.hours[n.day];
    var cur = n.h * 60 + n.m;
    if (!hrs) return { open: false, text: 'Libur hari ini', now: n };
    if (cur >= toMin(hrs[0]) && cur < toMin(hrs[1])) return { open: true, text: 'Tutup pukul ' + hrs[1] + ' WIB', now: n };
    if (cur < toMin(hrs[0])) return { open: false, text: 'Buka pukul ' + hrs[0] + ' WIB hari ini', now: n };
    return { open: false, text: 'Sudah tutup. Buka lagi besok', now: n };
  }

  function notify(db, type, text) {
    db.notifications.unshift({ id: uid('n'), type: type, text: text, read: false, created: Date.now() });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ago(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'baru saja';
    if (s < 3600) return Math.floor(s / 60) + ' mnt lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    return Math.floor(s / 86400) + ' hari lalu';
  }

  window.TC = {
    DAYS: DAYS, load: load, save: save, uid: uid, rupiah: rupiah, today: today, wibNow: wibNow,
    openState: openState, notify: notify, esc: esc, ago: ago, toMin: toMin,
    reset: function () { localStorage.removeItem(KEY); return load(); }
  };
})();
