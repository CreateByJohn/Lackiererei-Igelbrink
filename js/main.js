// Mobile-Menü: öffnen/schließen per Button, Escape, Klick außerhalb oder Klick auf einen Link.
(function () {
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  if (!burger || !menu) return;

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  burger.addEventListener('click', function () {
    var open = !menu.classList.contains('is-open');
    setOpen(open);
    // Menü steht im Quelltext vor dem Button: Fokus auf den ersten Eintrag setzen
    if (open) menu.querySelector('a').focus();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      burger.focus();
    }
  });

  document.addEventListener('click', function (e) {
    if (menu.classList.contains('is-open') && !menu.contains(e.target) && !burger.contains(e.target)) {
      setOpen(false);
    }
  });

  menu.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) setOpen(false);
  });
})();

// Klappkarten: Klick auf das Bild oder den "+"-Button teilt die Karte und zeigt ihre Beschreibung.
// Jede Karte klappt einzeln auf, auf allen Breiten. Ein Klick auf einen Link in der Glas-Kachel klappt nicht auf.
// Die Karten sind voneinander unabhängig; equalize() sorgt dafür, dass Glas-Kacheln und Listen trotzdem gleich hoch sind.
(function () {
  var grid = document.querySelector('.cards');
  if (!grid) return;
  var cards = grid.querySelectorAll('.svc');
  var wide = window.matchMedia('(min-width: 981px)');

  function setCard(card, open) {
    var btn = card.querySelector('.svc__toggle');
    card.classList.toggle('is-open', open);
    if (!btn) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Beschreibung ausblenden' : 'Beschreibung einblenden');
  }

  cards.forEach(function (card) {
    var media = card.querySelector('.svc__media');
    if (!media) return;
    // Der Button liegt im Bildbereich, sein Klick (auch per Tastatur) landet ebenfalls hier.
    media.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      setCard(card, !card.classList.contains('is-open'));
    });
  });

  // Macht alle passenden Elemente so hoch wie das höchste (über min-height).
  // Vorher zurücksetzen, sonst misst man die alte, angeglichene Höhe.
  // Mit active = false wird nur zurückgesetzt (z. B. Listen, wenn die Karten untereinander stehen).
  function equalize(selector, active) {
    var els = grid.querySelectorAll(selector);
    els.forEach(function (el) { el.style.minHeight = ''; });
    if (!active) return;
    var max = 0;
    els.forEach(function (el) { max = Math.max(max, el.getBoundingClientRect().height); });
    els.forEach(function (el) { el.style.minHeight = max + 'px'; });
  }

  // Kacheln immer gleich hoch, Listen nur nebeneinander (ab 981 px).
  function update() {
    equalize('.glass-tile', true);
    equalize('.svc__list', wide.matches);
  }

  // Neu messen, sobald die Schriften geladen sind (Text wird dadurch oft höher)
  // und wenn sich die Breite ändert. Das Aufklappen ändert nur die Höhe, dann wird nicht gemessen.
  // Der ResizeObserver misst außerdem sofort einmal beim Start.
  document.fonts.ready.then(update);
  var lastWidth = 0;
  new ResizeObserver(function (entries) {
    var w = Math.round(entries[0].contentRect.width);
    if (w === lastWidth) return;
    lastWidth = w;
    update();
  }).observe(grid);
})();

// Höhen von Header und Footer als CSS-Variablen am <html>, damit das CSS damit rechnen kann.
// --hdr: Header samt Abstand oben. Um so viel rutscht der Hero unter die schwebende Navigation.
// --fh:  Footer-Höhe. Auf großen Bildschirmen liegt der Footer hinter dem Inhalt, .page lässt unten so viel Platz frei.
// Der ResizeObserver misst sofort einmal und danach bei jeder Größenänderung neu.
(function () {
  var root = document.documentElement;

  function watch(el, name, height) {
    if (!el) return;
    new ResizeObserver(function () {
      root.style.setProperty(name, height(el) + 'px');
    }).observe(el);
  }

  watch(document.querySelector('.site-header'), '--hdr', function (el) {
    return el.offsetHeight + (parseFloat(getComputedStyle(el).marginTop) || 0);
  });
  watch(document.querySelector('.site-footer'), '--fh', function (el) {
    // Passt der Footer nicht ganz ins Fenster, wird er nicht freigelegt, sondern scrollt normal mit (.footer-static).
    root.classList.toggle('footer-static', el.offsetHeight > window.innerHeight - 24);
    return el.offsetHeight;
  });
})();

// Footer: Live-Status der Öffnungszeiten (Mo–Fr 08:00–17:00, Zeit in Dülmen).
// Ohne JavaScript bleibt das Badge versteckt, die Zeiten stehen trotzdem da. Aktualisiert sich jede Minute.
(function () {
  var badge = document.querySelector('[data-open-status]');
  if (!badge) return;
  var text = badge.querySelector('[data-open-text]');
  var OPEN = 8 * 60, CLOSE = 17 * 60;
  var DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  function berlinNow() {
    var parts = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date());
    var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
    return { day: DAYS.indexOf(get('weekday').replace('.', '')), min: +get('hour') * 60 + +get('minute') };
  }

  function update() {
    var n = berlinNow();
    var weekday = n.day >= 1 && n.day <= 5;
    var open = weekday && n.min >= OPEN && n.min < CLOSE;
    var msg;
    if (open) msg = 'Jetzt geöffnet – bis 17:00 Uhr';
    else if (weekday && n.min < OPEN) msg = 'Geschlossen – öffnet heute um 08:00 Uhr';
    else if (n.day >= 1 && n.day <= 4) msg = 'Geschlossen – öffnet morgen um 08:00 Uhr';
    else msg = 'Geschlossen – öffnet Montag um 08:00 Uhr';
    badge.classList.toggle('is-open', open);
    text.textContent = msg;
    badge.hidden = false;
  }

  update();
  setInterval(update, 60000);
})();

// Footer: "Nach oben" scrollt weich (bei reduzierter Bewegung sofort) und setzt den Fokus auf den Seitenanfang.
(function () {
  var up = document.querySelector('.ft-up');
  if (!up) return;
  up.addEventListener('click', function (e) {
    e.preventDefault();
    var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    var skip = document.querySelector('.skip');
    if (skip) skip.focus({ preventScroll: true });
  });
})();

// Kontaktformular: alle Elemente mit data-open-contact öffnen das <dialog> per showModal().
// Schließen per X, Escape (nativ) oder Klick auf den Hintergrund; der Fokus geht zurück an den Auslöser.
(function () {
  var dialog = document.getElementById('kontaktformular');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  var form = dialog.querySelector('form');
  var opener = null;

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-open-contact]');
    if (!trigger) return;
    e.preventDefault();
    opener = trigger;
    if (!dialog.open) dialog.showModal();
  });

  dialog.querySelector('[data-close-contact]').addEventListener('click', function () {
    dialog.close();
  });

  // Hintergrund-Klick: Der ::backdrop gehört zum <dialog>. Nur schließen, wenn Drücken und Loslassen
  // außerhalb des Fensters liegen (kein Schließen, wenn man beim Markieren von Text hinauszieht).
  var downOutside = false;
  function outside(e) {
    var r = dialog.getBoundingClientRect();
    return e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
  }
  dialog.addEventListener('pointerdown', function (e) { downOutside = outside(e); });
  dialog.addEventListener('click', function (e) {
    if (downOutside && outside(e)) dialog.close();
    downOutside = false;
  });

  // Mobil-Menü-Button ist nach dem Schließen evtl. versteckt: dann den Menü-Button fokussieren.
  dialog.addEventListener('close', function () {
    var target = opener && opener.offsetParent !== null ? opener : document.getElementById('burger');
    if (target) target.focus();
  });

  if (!form) return;
  var tel = form.querySelector('#kf-tel');
  var mail = form.querySelector('#kf-mail');
  var error = form.querySelector('#kf-kanal-error');
  var date = form.querySelector('#kf-termin');
  var checked = false;

  // Wunschtermin nicht in der Vergangenheit
  if (date) {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    date.min = d.toISOString().slice(0, 10);
  }

  // Telefon oder E-Mail: eines von beiden muss ausgefüllt sein. Der Fehler steht direkt unter den beiden Feldern;
  // setCustomValidity sorgt dafür, dass die eingebaute Prüfung das Absenden ebenfalls stoppt.
  function checkChannel() {
    var missing = !tel.value.trim() && !mail.value.trim();
    var show = missing && checked;
    tel.setCustomValidity(missing ? error.textContent : '');
    error.hidden = !show;
    tel.setAttribute('aria-invalid', show ? 'true' : 'false');
    mail.setAttribute('aria-invalid', show ? 'true' : 'false');
    return !missing;
  }

  tel.addEventListener('input', checkChannel);
  mail.addEventListener('input', checkChannel);
  form.querySelector('[type="submit"]').addEventListener('click', function () {
    checked = true;
    checkChannel();
  });
  checkChannel();

  form.addEventListener('submit', function (e) {
    // TODO: Formular-Versand anbinden (serverseitig, mit Spam-Schutz). Bis dahin wird nichts gesendet.
    e.preventDefault();
  });
})();
