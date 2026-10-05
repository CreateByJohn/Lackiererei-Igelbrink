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
    if (e.target.closest('a')) setOpen(false);
  });
})();

// Klappkarten: Klick auf das Bild oder den "+"-Button teilt die Karte und zeigt die Beschreibung.
// Ein Klick auf einen Link in der Glas-Kachel klappt nicht auf.
(function () {
  document.querySelectorAll('.svc').forEach(function (card) {
    var media = card.querySelector('.svc__media');
    var btn = card.querySelector('.svc__toggle');
    if (!media || !btn) return;

    function setOpen(open) {
      card.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Beschreibung ausblenden' : 'Beschreibung einblenden');
    }

    // Der Button liegt im Bildbereich, sein Klick (auch per Tastatur) landet ebenfalls hier.
    media.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      setOpen(!card.classList.contains('is-open'));
    });
  });
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
