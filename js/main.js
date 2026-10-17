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
    if (!media || !card.querySelector('.svc__toggle')) return;   // Karten ohne „+“ (service.html) klappen nicht auf
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
// Gilt für alle Badges mit data-open-status (Footer und Info-Leiste).
(function () {
  var badges = document.querySelectorAll('[data-open-status]');
  if (!badges.length) return;
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
    badges.forEach(function (badge) {
      badge.classList.toggle('is-open', open);
      badge.querySelector('[data-open-text]').textContent = msg;
      badge.hidden = false;
    });
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

// Unsere Expertise: Zeilen einzeln aufklappen (Akkordeon).
(function () {
  document.querySelectorAll('.exp__head').forEach(function (head) {
    head.addEventListener('click', function () {
      var item = head.closest('.exp__item');
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
})();

// Parallax: Bilder mit data-px verschieben sich beim Scrollen leicht gegen die Scrollrichtung.
// Der Hero bewegt sich mit der Scrollposition, alle anderen Bilder relativ zur Fenstermitte,
// begrenzt auf den Überstand des Bildes über seinen Rahmen (kein sichtbarer Rand).
// Nur mit requestAnimationFrame und nur für Bilder im Fenster; aus bei reduzierter Bewegung.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-px]'));
  if (!els.length) return;
  var ticking = false;

  function update() {
    ticking = false;
    var vh = window.innerHeight;
    els.forEach(function (img) {
      var speed = parseFloat(img.getAttribute('data-px')) || 0;
      var box = img.parentElement.getBoundingClientRect();
      if (box.bottom < -100 || box.top > vh + 100 || box.height === 0) return;
      var y;
      if (img.classList.contains('hero__img')) {
        y = Math.max(0, -box.top) * speed;
      } else {
        var room = Math.max(0, (img.offsetHeight - box.height) / 2);
        y = -(box.top + box.height / 2 - vh / 2) * speed;
        y = Math.max(-room, Math.min(room, y));
      }
      img.style.setProperty('--py', y.toFixed(1) + 'px');
    });
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('load', request);
  update();
})();

// Info-Leiste: erscheint nach dem ersten Bildschirm und verschwindet, sobald der echte Footer ins Bild kommt.
(function () {
  var bar = document.querySelector('.infobar');
  var footer = document.querySelector('.site-footer');
  if (!bar || !footer) return;
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var docH = document.documentElement.scrollHeight;
    var start = document.querySelector('.hero') ? vh * 0.6 : 40;   // Seiten ohne Hero (z. B. Kontakt): sofort nach dem ersten Scrollen
    var nearFooter = y + vh > docH - footer.offsetHeight * 0.85;
    bar.classList.toggle('is-visible', y > start && !nearFooter);
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
})();

// Kontaktseite, Karte: Google Maps lädt erst nach Klick (Zwei-Klick-Lösung, DSGVO).
(function () {
  document.querySelectorAll('[data-map]').forEach(function (wrap) {
    var btn = wrap.querySelector('[data-map-load]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var box = wrap.querySelector('.kt-map__box');
      box.innerHTML = '<iframe title="Karte: Lackiertechnik Igelbrink, Telgenkamp 31, 48249 Dülmen" loading="lazy" referrerpolicy="no-referrer-when-downgrade" ' +
        'src="https://www.google.com/maps?q=Telgenkamp+31,+48249+D%C3%BClmen&output=embed"></iframe>';
    });
  });
})();

// Karussell Zertifikate und Partner: zweite Kopie der Liste anhängen, damit das Band nahtlos endlos läuft.
// Die Kopie ist für Screenreader unsichtbar (aria-hidden). Bei reduzierter Bewegung keine Kopie: das Band steht still.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.marquee__track').forEach(function (track) {
    Array.prototype.slice.call(track.children).forEach(function (item) {
      var copy = item.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
      track.appendChild(copy);
    });
  });
})();

// Projekt-Timeline „Lackstab“ (.steps--rail): Der Stab füllt sich beim Scrollen bis zur Auslöselinie (--rail-line, Anteil der Fensterhöhe).
// Schritte, deren Knoten darüber liegt, bekommen „is-on“ (Knoten orange, Bild federt herein); beim Hochscrollen geht es zurück.
// Der Lacktropfen hängt am Ende der Füllung und streckt sich bei schnellem Scrollen (--drip, max. 1.9).
// Stab, Füllung, Tropfen und End-Pille werden hier als versteckte Zeile eingefügt, damit sie nicht in jeder Seite stehen müssen.
// Bei reduzierter Bewegung: Stab voll, alle Schritte erreicht, kein Tropfen und kein Scroll-Listener.
(function () {
  var lists = Array.prototype.slice.call(document.querySelectorAll('.steps--rail'));
  if (!lists.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DROP = '<svg viewBox="0 0 26 34" aria-hidden="true"><path d="M13 0C13 0 0 15 0 22a13 12 0 0 0 26 0C26 15 13 0 13 0z" fill="currentColor"/>' +
    '<ellipse cx="8.5" cy="21" rx="2.6" ry="4" fill="#fff" opacity=".45"/></svg>';
  var line = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-line')) || 60) / 100;

  var rails = lists.map(function (ul) {
    var items = Array.prototype.slice.call(ul.children);
    var deco = document.createElement('li');
    deco.className = 'rail__deco';
    deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = '<span class="rail__bar"></span><span class="rail__fill"></span><span class="rail__drop">' + DROP + '</span>' +
      '<span class="rail__end">Projekt abgeschlossen</span>';
    ul.appendChild(deco);
    ul.classList.add('has-rail');
    return { ul: ul, items: items, end: deco.querySelector('.rail__end'), offs: [], top: 0, len: 0, fill: -1,
      nodes: items.map(function (li) { return li.querySelector('.rail__node'); }) };
  });

  // Geometrie relativ zur Liste: Knotenmitten und Stab von der Mitte des ersten Knotens bis zur Mitte der End-Pille.
  // Wird nur bei Größenänderungen gemessen, beim Scrollen reicht dann eine Messung der Liste.
  function measure(r) {
    var base = r.ul.getBoundingClientRect().top;
    r.offs = r.nodes.map(function (n) { var b = n.getBoundingClientRect(); return b.top + b.height / 2 - base; });
    var e = r.end.getBoundingClientRect();
    r.top = r.offs[0] || 0;
    r.len = Math.max(0, e.top + e.height / 2 - base - r.top);
    r.ul.style.setProperty('--rail-top', r.top + 'px');
    r.ul.style.setProperty('--rail-len', r.len + 'px');
  }

  function update() {
    ticking = false;
    var y = window.innerHeight * line;
    rails.forEach(function (r) {
      var base = r.ul.getBoundingClientRect().top;
      var fill = r.len ? Math.min(1, Math.max(0, (y - base - r.top) / r.len)) : 0;
      // Tropfen strecken: je weiter sich die Füllung seit dem letzten Frame bewegt hat, desto länger
      if (r.fill >= 0) {
        var px = Math.abs(fill - r.fill) * r.len;
        if (px > 1) r.ul.style.setProperty('--drip', (1 + Math.min(0.9, px / 40)).toFixed(2));
      }
      r.fill = fill;
      r.ul.style.setProperty('--fill', fill.toFixed(4));
      r.ul.classList.toggle('is-empty', fill <= 0);
      r.ul.classList.toggle('is-done', fill >= 1);
      r.offs.forEach(function (o, i) { r.items[i].classList.toggle('is-on', base + o <= y); });
    });
  }

  if (reduce) {
    rails.forEach(function (r) {
      r.items.forEach(function (li) { li.classList.add('is-on'); });
      r.ul.style.setProperty('--fill', 1);
      r.ul.classList.add('is-done');
    });
    var remeasure = function () { rails.forEach(measure); };
    if ('ResizeObserver' in window) rails.forEach(function (r) { new ResizeObserver(remeasure).observe(r.ul); });
    window.addEventListener('resize', remeasure);
    remeasure();
    return;
  }

  var ticking = false, settle = 0;
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
    // ca. 120 ms nach dem letzten Scrollen federt der Tropfen auf normale Länge zurück
    clearTimeout(settle);
    settle = setTimeout(function () { rails.forEach(function (r) { r.ul.style.setProperty('--drip', 1); }); }, 120);
  }
  function relayout() { rails.forEach(measure); update(); }

  // ResizeObserver erfasst auch Höhenänderungen durch nachgeladene Schriften; resize als Rückfall
  if ('ResizeObserver' in window) rails.forEach(function (r) { new ResizeObserver(relayout).observe(r.ul); });
  window.addEventListener('resize', relayout);
  window.addEventListener('scroll', onScroll, { passive: true });
  rails.forEach(function (r) { r.ul.classList.add('is-ready'); });
  relayout();
})();

// Galerie .steps: Klick auf ein Bild öffnet die Lightbox (natives <dialog>).
// Pfeile und Tastatur ←/→ blättern, Escape schließt (nativ), danach geht der Fokus zurück an das angeklickte Bild.
// Läuft nur, wenn es eine Galerie gibt. Das <dialog> wird hier erzeugt, damit es nicht in jeder Seite stehen muss.
(function () {
  var openers = Array.prototype.slice.call(document.querySelectorAll('.steps__open'));
  if (!openers.length) return;
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var box = document.createElement('dialog');
  box.className = 'lightbox';
  box.setAttribute('aria-label', 'Bildansicht');
  box.innerHTML =
    '<div class="lightbox__stage"><img alt=""></div>' +
    '<button class="lightbox__btn lightbox__prev" type="button" aria-label="Vorheriges Bild">' + ARROW + '<path d="m15 5-7 7 7 7"/></svg></button>' +
    '<button class="lightbox__btn lightbox__next" type="button" aria-label="Nächstes Bild">' + ARROW + '<path d="m9 5 7 7-7 7"/></svg></button>' +
    '<button class="lightbox__btn lightbox__close" type="button" aria-label="Bildansicht schließen">' + ARROW + '<path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
    '<p class="lightbox__count" aria-live="polite"></p>';
  document.body.appendChild(box);
  var img = box.querySelector('img');
  var count = box.querySelector('.lightbox__count');
  var webp = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
  var index = 0, opener = null;

  function show(i) {
    index = (i + openers.length) % openers.length;
    var b = openers[index];
    img.classList.remove('is-new');
    img.src = (webp && b.getAttribute('data-full-webp')) || b.getAttribute('data-full');
    img.alt = (b.querySelector('img') || {}).alt || '';
    void img.offsetWidth;   // Animation bei jedem Wechsel neu starten
    img.classList.add('is-new');
    count.textContent = 'Bild ' + (index + 1) + ' von ' + openers.length;
    // Nachbarbilder vorladen, damit das Blättern ohne Wartezeit klappt
    [index + 1, index - 1].forEach(function (n) {
      var nb = openers[(n + openers.length) % openers.length];
      new Image().src = (webp && nb.getAttribute('data-full-webp')) || nb.getAttribute('data-full');
    });
  }

  openers.forEach(function (b, i) {
    b.addEventListener('click', function () {
      opener = b;
      show(i);
      box.showModal();
      box.querySelector('.lightbox__close').focus();
    });
  });
  box.querySelector('.lightbox__prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lightbox__next').addEventListener('click', function () { show(index + 1); });
  box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  // Klick auf die dunkle Fläche neben dem Bild schließt
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.classList.contains('lightbox__stage')) box.close();
  });
  box.addEventListener('close', function () {
    if (opener) opener.focus();   // Fokus zurück an das angeklickte Bild
  });
})();

// Formulare direkt auf der Seite (Online-Termin, Widerrufsformular): Versand ist noch nicht angebunden.
(function () {
  document.querySelectorAll('form[data-form-todo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      // TODO: Formular-Versand anbinden (serverseitig, mit Spam-Schutz). Bis dahin wird nichts gesendet.
      e.preventDefault();
    });
  });
})();
