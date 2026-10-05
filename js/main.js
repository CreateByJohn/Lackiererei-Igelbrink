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

// Klappkarten: Klick auf das Bild oder den "+"-Button teilt die Karte und zeigt die Beschreibung.
// Ab 981 px teilen sich die Karten die Beschreibungszeile (Subgrid), deshalb klappen dort alle gemeinsam auf.
// Darunter klappt jede Karte einzeln. Ein Klick auf einen Link in der Glas-Kachel klappt nicht auf.
(function () {
  var grid = document.querySelector('.cards');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.svc'));
  var shared = window.matchMedia('(min-width: 981px)');

  function setCard(card, open) {
    var btn = card.querySelector('.svc__toggle');
    card.classList.toggle('is-open', open);
    if (!btn) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Beschreibung ausblenden' : 'Beschreibung einblenden');
  }

  function setAll(open) {
    grid.classList.toggle('is-open', open);
    cards.forEach(function (card) { setCard(card, open); });
  }

  cards.forEach(function (card) {
    var media = card.querySelector('.svc__media');
    if (!media) return;
    // Der Button liegt im Bildbereich, sein Klick (auch per Tastatur) landet ebenfalls hier.
    media.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      if (shared.matches) setAll(!grid.classList.contains('is-open'));
      else setCard(card, !card.classList.contains('is-open'));
    });
  });

  // Beim Wechsel zwischen den Breiten alles schließen, damit Raster und Buttons übereinstimmen.
  function reset() { setAll(false); }
  if (shared.addEventListener) shared.addEventListener('change', reset);
  else shared.addListener(reset);
})();

// Header-Höhe samt oberem Rand als --hdr am <html>. Der Hero rückt genau um diesen Wert
// unter die schwebende Navigation (Oberkante bei y = 0) und beginnt seinen Text darunter.
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var root = document.documentElement;

  function measure() {
    var top = parseFloat(getComputedStyle(header).marginTop) || 0;
    root.style.setProperty('--hdr', (header.offsetHeight + top) + 'px');
  }

  measure();
  if ('ResizeObserver' in window) {
    new ResizeObserver(measure).observe(header);
  } else {
    window.addEventListener('resize', measure);
  }
})();

// Footer freilegen: Die Footer-Höhe steht als --fh am <html>. Ab 980 × 760 px ist der Footer
// position:fixed hinter dem Inhalt, und .page bekommt unten genau diesen Platz (siehe components.css).
(function () {
  var footer = document.querySelector('.site-footer');
  if (!footer) return;
  var root = document.documentElement;

  function measure() {
    root.style.setProperty('--fh', footer.offsetHeight + 'px');
  }

  measure();
  if ('ResizeObserver' in window) {
    new ResizeObserver(measure).observe(footer);
  } else {
    window.addEventListener('resize', measure);
  }
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
