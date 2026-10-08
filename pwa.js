/* PWA: registrasi service worker + tombol/banner "Pasang Aplikasi" */
(function () {
  var KEY = 'tantehSusi_installDismissed';
  var deferred = null;
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  function $(id) { return document.getElementById(id); }
  function toast(m) { if (typeof showToast === 'function') showToast(m, 5200); }
  function hideAll() {
    var b = $('installBtn'), n = $('installBanner');
    if (b) b.style.display = 'none';
    if (n) n.classList.remove('on');
  }
  function dismissed() { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < 7 * 864e5; } catch (e) { return false; } }

  function install() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (r) {
        deferred = null;
        if (r && r.outcome === 'accepted') hideAll();
      });
    } else if (isIOS) {
      toast('Di iPhone: ketuk ikon Bagikan, lalu pilih "Tambah ke Layar Utama".');
    } else {
      toast('Buka menu browser (⋮), lalu pilih "Instal Barbershop Tanteh Susi" atau "Tambahkan ke layar utama".');
    }
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    var n = $('installBanner');
    if (n && !standalone && !dismissed()) setTimeout(function () { n.classList.add('on'); }, 6000);
  });
  window.addEventListener('appinstalled', function () { hideAll(); toast('Aplikasi terpasang. Selamat datang di Tanteh Susi!'); });

  document.addEventListener('DOMContentLoaded', function () {
    if (standalone) { hideAll(); document.documentElement.classList.add('is-app'); var b0 = $('installBtn'); if (b0) b0.style.display = 'none'; return; }
    var b = $('installBtn'); if (b) b.addEventListener('click', install);
    var go = $('installGo'); if (go) go.addEventListener('click', function () { install(); });
    var x = $('installClose');
    if (x) x.addEventListener('click', function () {
      $('installBanner').classList.remove('on');
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    });
  });
})();
