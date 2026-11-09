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

// Mega-Menü „Serviceleistungen“ (Desktop): öffnet per CSS bei Hover und :focus-within.
// Escape schließt es (Klasse is-mega-closed), der Fokus springt auf den Menüpunkt zurück.
// Geöffnet werden kann es wieder, sobald Maus oder Fokus den Menüpunkt verlassen haben.
(function () {
  var items = document.querySelectorAll('.menu > li.has-mega');
  items.forEach(function (li) {
    var link = li.querySelector('a');
    li.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || li.classList.contains('is-mega-closed')) return;
      if (document.getElementById('menu').classList.contains('is-open')) return;   // mobiles Menü: dort schließt die Menü-Logik oben
      li.classList.add('is-mega-closed');
      link.focus();
    });
    li.addEventListener('mouseleave', function () { li.classList.remove('is-mega-closed'); });
    li.addEventListener('focusout', function (e) {
      if (!li.contains(e.relatedTarget)) li.classList.remove('is-mega-closed');
    });
  });
})();

// Leistungs-Karten: equalize() sorgt dafür, dass Glas-Kacheln und Listen nebeneinander gleich hoch sind.
(function () {
  var grid = document.querySelector('.cards');
  if (!grid) return;
  var wide = window.matchMedia('(min-width: 981px)');

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
  // und wenn sich die Breite ändert (reine Höhenänderungen lösen keine neue Messung aus).
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
// Ein Auslöser mit data-anliegen="unfall" (Wert einer Option) wählt das Anliegen beim Öffnen vor („Schaden melden“).
(function () {
  var dialog = document.getElementById('kontaktformular');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  var form = dialog.querySelector('form');
  var topic = dialog.querySelector('#kf-anliegen');
  var opener = null;

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-open-contact]');
    if (!trigger) return;
    e.preventDefault();
    opener = trigger;
    var pre = trigger.getAttribute('data-anliegen');
    if (pre && topic) topic.value = pre;
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
  var date = form.querySelector('#kf-termin');

  // Wunschtermin nicht in der Vergangenheit
  if (date) {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    date.min = d.toISOString().slice(0, 10);
  }

  form.addEventListener('submit', function (e) {
    // TODO: Formular-Versand anbinden (serverseitig, mit Spam-Schutz). Bis dahin wird nichts gesendet.
    e.preventDefault();
  });
})();

// Formulare mit data-kanal (Kontaktformular im Dialog, Bewerbung auf karriere.html):
// Telefon oder E-Mail, eines von beiden muss ausgefüllt sein. Der Fehler ([data-kanal-error]) steht direkt unter den beiden Feldern
// und erscheint erst nach dem ersten Absenden; setCustomValidity sorgt dafür, dass die eingebaute Prüfung das Absenden ebenfalls stoppt.
// Datei-Felder mit data-max-mb: jede Datei höchstens so groß, nur die erlaubten Endungen aus accept (Fehler im .field__error danach).
(function () {
  document.querySelectorAll('form[data-kanal]').forEach(function (form) {
    var tel = form.querySelector('input[type="tel"]');
    var mail = form.querySelector('input[type="email"]');
    var error = form.querySelector('[data-kanal-error]');
    if (!tel || !mail || !error) return;
    var checked = false;

    function checkChannel() {
      var missing = !tel.value.trim() && !mail.value.trim();
      var show = missing && checked;
      tel.setCustomValidity(missing ? error.textContent : '');
      error.hidden = !show;
      tel.setAttribute('aria-invalid', show ? 'true' : 'false');
      mail.setAttribute('aria-invalid', show ? 'true' : 'false');
    }

    tel.addEventListener('input', checkChannel);
    mail.addEventListener('input', checkChannel);
    form.querySelector('[type="submit"]').addEventListener('click', function () {
      checked = true;
      checkChannel();
    });
    checkChannel();
  });

  document.querySelectorAll('input[type="file"][data-max-mb]').forEach(function (input) {
    var max = parseFloat(input.getAttribute('data-max-mb')) * 1024 * 1024;
    var allowed = (input.getAttribute('accept') || '').split(',').filter(function (a) { return a.charAt(0) === '.'; });
    var error = document.getElementById(input.id + '-error');
    input.addEventListener('change', function () {
      var msg = '';
      Array.prototype.forEach.call(input.files, function (file) {
        var ext = '.' + file.name.split('.').pop().toLowerCase();
        if (allowed.length && allowed.indexOf(ext) < 0) msg = '„' + file.name + '“ hat ein anderes Format. Bitte nur PDF, JPG oder PNG.';
        else if (file.size > max) msg = '„' + file.name + '“ ist größer als ' + input.getAttribute('data-max-mb') + ' MB. Bitte eine kleinere Datei wählen.';
      });
      input.setCustomValidity(msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (error) { error.textContent = msg; error.hidden = !msg; }
    });
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

// Parallax: Bilder verschieben sich beim Scrollen leicht gegen die Scrollrichtung, weich nachgezogen (Lerp).
// Köpfe (Hero-Slider, Seitenköpfe, Karriere-Kopf) bewegen sich mit der Scrollposition (Faktor .2),
// Bilder im Inhalt (Bänder, Banner, Fachwissen, Karriere-Banner der Startseite) relativ zur Fenstermitte (Faktor .1, max. ±50 px
// und nie mehr als der Überstand des Bildes über seinen Rahmen, damit kein Rand sichtbar wird).
// Der Rahmen wird über closest() bestimmt (nicht parentElement: das ist oft <picture> mit Höhe 0).
// Ein requestAnimationFrame-Loop läuft nur, solange sich etwas bewegt; gerechnet wird nur für Rahmen im Fenster (IntersectionObserver).
// Ausgegeben wird --py, das CSS setzt es als transform: translate3d(). Aus bei reduzierter Bewegung.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var FRAME = '.hero__frame, .page-hero__frame, .career, .band, .mbanner, .know__media';
  var HEAD = '.hero__frame, .page-hero__frame, .career--head';
  var items = [];
  document.querySelectorAll('.hero__slides, .page-hero__img img, .career__img img, .band__img img, .mbanner__bg img, .know__media img').forEach(function (el) {
    var frame = el.closest(FRAME);
    if (!frame) return;
    var head = frame.matches(HEAD);
    items.push({ el: el, frame: frame, head: head, speed: head ? 0.2 : 0.1, cur: 0, on: false });
  });
  if (!items.length) return;
  var running = false;

  function target(o) {
    var box = o.frame.getBoundingClientRect();
    if (o.head) return Math.max(0, -box.top) * o.speed;
    var room = Math.max(0, (o.el.offsetHeight - box.height) / 2);
    var max = Math.min(50, room);
    var y = -(box.top + box.height / 2 - window.innerHeight / 2) * o.speed;
    return Math.max(-max, Math.min(max, y));
  }

  function frame() {
    var moving = false;
    items.forEach(function (o) {
      if (!o.on) return;
      var t = target(o);
      o.cur += (t - o.cur) * 0.12;
      if (Math.abs(t - o.cur) < 0.05) o.cur = t; else moving = true;
      o.el.style.setProperty('--py', o.cur.toFixed(2) + 'px');
    });
    running = moving;
    if (moving) requestAnimationFrame(frame);
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        items.forEach(function (o) { if (o.frame === e.target) o.on = e.isIntersecting; });
      });
      kick();
    }, { rootMargin: '100px 0px' });
    items.forEach(function (o) { io.observe(o.frame); });
  } else {
    items.forEach(function (o) { o.on = true; });
  }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  window.addEventListener('load', kick);
  kick();
})();

// Scroll-Hinweis in den Köpfen: Klick scrollt weich bis knapp unter den Kopf (abzüglich der schwebenden Navigation, --hdr)
// und setzt den Fokus auf den ersten Abschnitt danach (Tastatur). html.is-scrolled blendet den Hinweis ab 60 px Scrollen aus (effects.css).
(function () {
  var root = document.documentElement;
  function scrolled() { root.classList.toggle('is-scrolled', window.scrollY > 60); }
  window.addEventListener('scroll', scrolled, { passive: true });
  scrolled();
  document.querySelectorAll('.scroll-hint').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var frame = a.closest('.hero__frame, .page-hero__frame, .career--head');
      if (!frame) return;
      e.preventDefault();
      var hdr = parseFloat(getComputedStyle(root).getPropertyValue('--hdr')) || 78;
      var top = frame.getBoundingClientRect().bottom + window.scrollY - hdr;
      var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'auto' });
      var head = frame.closest('section') || frame;
      var next = head.nextElementSibling;
      while (next && next.offsetParent === null) next = next.nextElementSibling;
      if (!next && head.nextElementSibling === null) next = document.getElementById('inhalt');
      if (next) {
        if (!next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1');
        next.focus({ preventScroll: true });
      }
    });
  });
})();

// Info-Leiste: erscheint nach dem ersten Bildschirm und verschwindet, sobald der echte Footer ins Bild kommt.
// Mobil (Floating-Bar, bis 760 px) ist sie von Anfang an sichtbar: Telefon und Online-Termin stehen dort nicht mehr im Header.
(function () {
  var bar = document.querySelector('.infobar');
  var footer = document.querySelector('.site-footer');
  if (!bar || !footer) return;
  var mobile = window.matchMedia('(max-width: 760px)');
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var docH = document.documentElement.scrollHeight;
    var start = mobile.matches ? -1 : document.querySelector('.hero') ? vh * 0.6 : 40;   // Seiten ohne Hero (z. B. Kontakt): sofort nach dem ersten Scrollen
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

// Karussells (Zertifikate, Partner): so viele Kopien der Liste anhängen, dass das Band auch bei wenigen Kacheln nahtlos endlos läuft
// (Band mindestens Fensterbreite plus eine Runde). Eine Runde (--mq-shift) wird gemessen: Abstand vom ersten Original zur ersten Kopie.
// Die Dauer wächst mit der Zahl der Kacheln (--mq-n × --mq-step), damit beide Bänder gleich schnell laufen. Erst dann startet die Animation (.is-ready).
// Kopien sind für Screenreader unsichtbar (aria-hidden) und nicht per Tab erreichbar. Bei reduzierter Bewegung keine Kopien: das Band steht still.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.marquee').forEach(function (box) {
    var track = box.querySelector('.marquee__track');
    if (!track || !track.children.length) return;
    var items = Array.prototype.slice.call(track.children);
    var lastWidth = 0;

    function fill() {
      var w = box.clientWidth;
      if (!w || w === lastWidth) return;
      lastWidth = w;
      track.querySelectorAll('[data-mq-copy]').forEach(function (c) { c.remove(); });
      var copies = 0, round = 0;
      do {
        items.forEach(function (item) {
          var copy = item.cloneNode(true);
          copy.setAttribute('aria-hidden', 'true');
          copy.setAttribute('data-mq-copy', '');
          copy.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
          copy.querySelectorAll('a, button').forEach(function (el) { el.tabIndex = -1; });
          track.appendChild(copy);
        });
        copies++;
        if (!round) round = track.children[items.length].offsetLeft - items[0].offsetLeft;
      } while (round * copies < w && copies < 20);
      track.style.setProperty('--mq-shift', round + 'px');
      track.style.setProperty('--mq-n', items.length);
      box.classList.add('is-ready');
    }

    fill();
    if ('ResizeObserver' in window) new ResizeObserver(fill).observe(box);
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

// Lightbox (natives <dialog>) für die Galerie .steps und die Zertifikate im Karussell (.mq-item__open).
// Klick oder Enter öffnet das Bild groß. Pfeile und Tastatur ←/→ blättern innerhalb derselben Gruppe, Escape schließt (nativ),
// danach geht der Fokus zurück an das angeklickte Bild bzw. die Kachel. Kopien im Karussell (aria-hidden) zählen nicht mit,
// ein Klick darauf öffnet das passende Original. Läuft nur, wenn es etwas zu öffnen gibt; das <dialog> wird hier erzeugt.
(function () {
  var SEL = '.steps__open, .mq-item__open';
  if (!document.querySelector(SEL)) return;
  var openers = [];
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
    img.alt = (b.querySelector('img:not([alt=""])') || {}).alt || '';   // Karussell: das scharfe Bild, nicht den unscharfen Hintergrund
    void img.offsetWidth;   // Animation bei jedem Wechsel neu starten
    img.classList.add('is-new');
    count.textContent = (b.classList.contains('mq-item__open') ? 'Zertifikat ' : 'Bild ') + (index + 1) + ' von ' + openers.length;
    // Nachbarbilder vorladen, damit das Blättern ohne Wartezeit klappt
    [index + 1, index - 1].forEach(function (n) {
      var nb = openers[(n + openers.length) % openers.length];
      new Image().src = (webp && nb.getAttribute('data-full-webp')) || nb.getAttribute('data-full');
    });
  }

  // Alle Bilder derselben Art auf der Seite bilden eine Gruppe (ohne Karussell-Kopien)
  function group(b) {
    var sel = b.classList.contains('mq-item__open') ? '.mq-item__open' : '.steps__open';
    return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (el) { return !el.closest('[aria-hidden="true"]'); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest(SEL);
    if (!b || box.contains(b)) return;
    openers = group(b);
    var orig = openers.indexOf(b) >= 0 ? b : openers.filter(function (o) { return o.getAttribute('data-full') === b.getAttribute('data-full'); })[0];
    if (!orig) return;
    opener = orig;
    show(openers.indexOf(orig));
    box.showModal();
    box.querySelector('.lightbox__close').focus();
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
    if (opener) opener.focus({ preventScroll: true });   // Fokus zurück an das angeklickte Bild (ohne das Karussell zu verschieben)
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

// Social-Kacheln: stumme Videos nur abspielen, solange mind. 25 % sichtbar sind (spart Akku und Datenvolumen).
// Bei „Bewegung reduzieren“ wird nicht abgespielt, dann bleibt das Poster. Ohne IntersectionObserver: einfach abspielen.
(function () {
  var videos = document.querySelectorAll('.sm-tile video');
  if (!videos.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function play(v) { v.muted = true; var r = v.play(); if (r && r.catch) r.catch(function () {}); }
  if (!('IntersectionObserver' in window)) { videos.forEach(play); return; }
  var io = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) { if (e.isIntersecting) play(e.target); else e.target.pause(); });
  }, { threshold: 0.25 });
  videos.forEach(function (v) { io.observe(v); });
})();

// Kontaktformular, Modell-Vorschläge: passend zur gewählten Marke (#kf-marke) füllt sich die Liste #kf-modelle.
// Groß-/Kleinschreibung egal, freie Eingabe bleibt möglich, Marken ohne Liste: keine Vorschläge.
// Gängige Modelle in Deutschland (PKW, Transporter) und Caravan-/Wohnmobil-Baureihen; Schlüssel = Optionen der <datalist id="kf-marken">.
(function () {
  var marke = document.getElementById('kf-marke');
  var liste = document.getElementById('kf-modelle');
  var modell = document.getElementById('kf-modell');
  if (!marke || !liste) return;

  var M = {
    'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'e-tron GT', 'TT'],
    'BMW': ['1er', '2er', '3er', '4er', '5er', '7er', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'iX', 'iX1', 'iX3'],
    'Citroën': ['C1', 'C3', 'C3 Aircross', 'C4', 'C5 Aircross', 'C5 X', 'Berlingo', 'Jumpy', 'Jumper', 'SpaceTourer'],
    'Cupra': ['Born', 'Formentor', 'Leon', 'Ateca', 'Tavascan', 'Terramar'],
    'Dacia': ['Sandero', 'Duster', 'Jogger', 'Spring', 'Logan', 'Bigster'],
    'Fiat': ['500', '500e', '500X', 'Panda', 'Tipo', 'Doblò', 'Ducato', 'Scudo', '600'],
    'Ford': ['Fiesta', 'Focus', 'Puma', 'Kuga', 'Mustang', 'Mustang Mach-E', 'Explorer', 'Ranger', 'Transit', 'Transit Custom', 'Tourneo', 'S-Max', 'Galaxy'],
    'Honda': ['Jazz', 'Civic', 'HR-V', 'CR-V', 'ZR-V', 'e:Ny1'],
    'Hyundai': ['i10', 'i20', 'i30', 'Bayon', 'Kona', 'Tucson', 'Santa Fe', 'Ioniq 5', 'Ioniq 6'],
    'Jeep': ['Avenger', 'Renegade', 'Compass', 'Wrangler', 'Grand Cherokee'],
    'Kia': ['Picanto', 'Rio', 'Ceed', 'XCeed', 'Stonic', 'Niro', 'Sportage', 'Sorento', 'EV3', 'EV6', 'EV9'],
    'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar'],
    'Mazda': ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'MX-5', 'MX-30'],
    'Mercedes-Benz': ['A-Klasse', 'B-Klasse', 'C-Klasse', 'E-Klasse', 'S-Klasse', 'CLA', 'GLA', 'GLB', 'GLC', 'GLE', 'G-Klasse', 'EQA', 'EQB', 'EQE', 'EQS', 'V-Klasse', 'Vito', 'Sprinter', 'Citan'],
    'Mini': ['Cooper', 'Countryman', 'Clubman', 'Aceman', 'Cabrio'],
    'Mitsubishi': ['Space Star', 'ASX', 'Colt', 'Eclipse Cross', 'Outlander', 'L200'],
    'Nissan': ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf', 'Ariya', 'Townstar', 'Primastar'],
    'Opel': ['Corsa', 'Astra', 'Mokka', 'Frontera', 'Grandland', 'Crossland', 'Insignia', 'Zafira', 'Combo', 'Vivaro', 'Movano'],
    'Peugeot': ['208', '2008', '308', '3008', '408', '508', '5008', 'Rifter', 'Partner', 'Expert', 'Boxer'],
    'Porsche': ['911', '718 Boxster', '718 Cayman', 'Macan', 'Cayenne', 'Panamera', 'Taycan'],
    'Renault': ['Clio', 'Captur', 'Mégane', 'Austral', 'Arkana', 'Scénic', 'Kangoo', 'Trafic', 'Master', 'Twingo', 'Zoe'],
    'Seat': ['Ibiza', 'Arona', 'Leon', 'Ateca', 'Tarraco'],
    'Škoda': ['Fabia', 'Scala', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq', 'Elroq'],
    'Smart': ['fortwo', 'forfour', '#1', '#3'],
    'Subaru': ['Impreza', 'XV / Crosstrek', 'Forester', 'Outback', 'Solterra'],
    'Suzuki': ['Swift', 'Ignis', 'Vitara', 'S-Cross', 'Jimny', 'Swace', 'Across'],
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Toyota': ['Aygo X', 'Yaris', 'Yaris Cross', 'Corolla', 'C-HR', 'RAV4', 'bZ4X', 'Prius', 'Hilux', 'Proace', 'Land Cruiser'],
    'Volkswagen': ['Polo', 'Golf', 'T-Cross', 'T-Roc', 'Taigo', 'Tiguan', 'Touareg', 'Passat', 'Arteon', 'Touran', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. Buzz', 'Up!', 'Caddy', 'Transporter / Multivan', 'California', 'Crafter', 'Amarok'],
    'Volvo': ['EX30', 'XC40', 'EX40', 'XC60', 'XC90', 'EX90', 'V60', 'V90', 'S60', 'S90'],
    // Caravan und Wohnmobil: Baureihen
    'Adria': ['Action', 'Adora', 'Alpina', 'Altea', 'Coral', 'Compact', 'Matrix', 'Sonic', 'Twin', 'Aviva'],
    'Bürstner': ['Averso', 'Premio', 'Lyseo', 'Ixeo', 'Delfin', 'Campeo', 'Habiton'],
    'Carado': ['A-Serie', 'I-Serie', 'T-Serie', 'V-Serie', 'CV-Serie'],
    'Dethleffs': ['Camper', 'Nomad', 'c\'go', 'Globebus', 'Trend', 'Pulse', 'Globetrotter XL', 'Just Go'],
    'Fendt': ['Bianco', 'Tendenza', 'Opal', 'Diamant', 'Saphir', 'Apero'],
    'Hobby': ['De Luxe', 'Excellent', 'Prestige', 'Premium', 'Ontour', 'Maxia', 'Optima', 'Vantana', 'Beachy'],
    'Hymer': ['Eriba Touring', 'Eriba Nova', 'B-Klasse', 'Exsis', 'ML-T', 'Grand Canyon S', 'Free', 'Yosemite'],
    'Knaus': ['Sport', 'Südwind', 'Deseo', 'Sky TI', 'Van TI', 'BoxStar', 'Live Wave', 'L!VE Traveller'],
    'LMC': ['Style', 'Sassino', 'Musica', 'Vivo', 'Tourer', 'Cruiser'],
    'Pössl': ['2Win', 'Summit', 'Roadcamp', 'D-Line', 'Campster'],
    'Sunlight': ['Cliff', 'T-Serie', 'I-Serie', 'A-Serie'],
    'Tabbert': ['Rossini', 'Da Vinci', 'Puccini', 'Pantera', 'Cellini'],
    'Weinsberg': ['CaraOne', 'CaraCito', 'CaraCompact', 'CaraBus', 'CaraSuite', 'CaraHome']
  };

  function fuellen() {
    var wert = marke.value.trim().toLowerCase();
    var key = Object.keys(M).filter(function (k) { return k.toLowerCase() === wert; })[0];
    liste.textContent = '';
    (key ? M[key] : []).forEach(function (name) {
      var o = document.createElement('option');
      o.value = name;
      liste.appendChild(o);
    });
    if (modell) modell.placeholder = key ? 'z. B. ' + M[key][0] : '';
  }
  marke.addEventListener('input', fuellen);
  marke.addEventListener('change', fuellen);
})();
