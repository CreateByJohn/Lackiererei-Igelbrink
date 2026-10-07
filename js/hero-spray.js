// Spray-Intro im Hero: Eine dunkelblaue Deckfläche (Canvas) liegt über dem Foto. Die Spritzpistole
// deckt das Foto in drei Zeilen von oben nach unten auf, jede Zeile von links nach rechts.
// Rein dekorativ: Canvas und Pistole sind aria-hidden und ohne pointer-events, der Text liegt darüber.
// Ohne JS und bei prefers-reduced-motion bleibt das Foto sofort sichtbar.
(function () {
  var frame = document.querySelector('.hero__frame');
  if (!frame) return;
  var img = frame.querySelector('.hero__img');
  var cover = frame.querySelector('.hero__cover');
  var mist = frame.querySelector('.hero__mist');
  var gun = frame.querySelector('.hero__gun');
  if (!img || !cover || !mist || !gun || !cover.getContext) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cx = cover.getContext('2d');
  var mx = mist.getContext('2d');
  var COVER = getComputedStyle(document.documentElement).getPropertyValue('--navy-deep').trim() || '#16233f';

  // Zeitplan (ms): Zeile 1 L -> R, Zeile 2 R -> L, Zeile 3 L -> R. Dazwischen fährt die Pistole ohne zu sprühen
  // zum Startpunkt der nächsten Zeile und dreht sich dabei um; am Ende Ausfahrt nach rechts.
  var STROKE = 1800, BACK = 520, EXIT = 650, ROWS = 3;
  var SEG = STROKE + BACK;
  var TOTAL = (ROWS - 1) * SEG + STROKE + EXIT;
  var NOZ = { x: 0.951, y: 0.348 };     // Düsenspitze im SVG (Anteil von Breite/Höhe)
  var GUN_RATIO = 620 / 800;            // Höhe/Breite der SVG
  var SPREAD = 0.028;                   // Breite des Sprühnebels als Anteil der Hero-Breite
  var TAU = Math.PI * 2;

  var W = 0, H = 0, gunW = 0, gunH = 0, maxParts = 900;
  var parts = [], raf = 0, t0 = 0, last = 0;
  var state = 'wait';                   // wait -> run -> done

  // Canvas auf Hero-Größe bringen. Auf scharfen Displays mit bis zu 1,5-facher Auflösung; leert beide Canvas
  function size() {
    var r = frame.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    [cover, mist].forEach(function (c) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    });
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mx.setTransform(dpr, 0, 0, dpr, 0, 0);
    maxParts = window.innerWidth < 700 ? 450 : 900;
  }

  function paintCover() {
    cx.globalCompositeOperation = 'source-over';
    cx.globalAlpha = 1;
    cx.fillStyle = COVER;
    cx.fillRect(0, 0, W, H);
  }

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 0.75; } // Zufallswert um 0, meist zwischen -2 und 2 (Glockenkurve)
  function rowY(i) { return H / ROWS * (i + 0.5); }                                         // Mitte der Zeile i
  function left() { return -gunW * 0.15; }                                                  // Düse knapp links vom Bild
  function right() { return W * (1 + SPREAD * 3.2); }                                       // weit genug, dass die Zeile bis zum Rand frei wird
  function leftOut() { return -W * SPREAD * 3.2; }                                          // Gegenstück zu right() für den Strich R -> L

  // Strich je Zeile: Start, Ende, Richtung (1 = nach rechts, -1 = nach links)
  function stroke(i) {
    return i % 2 ? { from: right(), to: leftOut(), dir: -1 } : { from: left(), to: right(), dir: 1 };
  }

  // Position und Richtung der Düse zum Zeitpunkt t (ms)
  function nozzle(t) {
    var i = Math.min(ROWS - 1, Math.floor(t / SEG));
    var local = t - i * SEG;
    var s = stroke(i);
    if (i === ROWS - 1 && local >= STROKE) {
      var te = Math.min(1, (local - STROKE) / EXIT);
      return { x: s.to + s.dir * gunW * te * 1.1, y: rowY(i), dir: s.dir, spraying: false, row: i };
    }
    if (local < STROKE) {
      var p = ease(local / STROKE);
      return { x: s.from + (s.to - s.from) * p, y: rowY(i), dir: s.dir, spraying: true, row: i };
    }
    // Wechsel zur nächsten Zeile: Richtung läuft von s.dir nach n.dir, die Pistole dreht sich dabei
    var nx = stroke(i + 1), b = ease((local - STROKE) / BACK);
    return { x: s.to + (nx.from - s.to) * b, y: rowY(i) + (rowY(i + 1) - rowY(i)) * b,
      dir: s.dir + (nx.dir - s.dir) * b, spraying: false, row: i };
  }

  // Pistole so setzen, dass die Düsenspitze bei (n.x, y) sitzt. scaleX(dir) spiegelt um die Bildmitte.
  function placeGun(n, y) {
    var tx = n.x - gunW / 2 - n.dir * (NOZ.x - 0.5) * gunW;
    gun.style.transform = 'translate3d(' + tx + 'px,' + (y - gunH * NOZ.y) + 'px,0) rotate(' + (-3 * n.dir) + 'deg) scaleX(' + n.dir + ')';
  }

  // An der Düse die Deckfläche körnig wegradieren (destination-out = zeichnen löscht statt zu malen)
  function spray(n, dt, sig, sy) {
    var y0 = H / ROWS * n.row, y1 = H / ROWS * (n.row + 1);
    var count = Math.round(dt * (H / 900) * 22 + 36);
    var i, x, y;
    cx.globalCompositeOperation = 'destination-out';
    cx.fillStyle = '#000';

    var d = n.dir;

    // Hinter der Düse die Zeile sicher freilegen, ein schmaler Randstreifen oben/unten bleibt den Punkten.
    // Oben reicht das Rechteck in den Randstreifen der schon freien Zeile darüber, am Bildrand bis an den Rand.
    var top = n.row === 0 ? 0 : y0 - sy;
    var bottom = n.row === ROWS - 1 ? H : y1 - sy;
    var edge = n.x - d * sig * 3;
    cx.globalAlpha = 1;
    if (d > 0) cx.fillRect(0, top, Math.max(0, edge), bottom - top);
    else cx.fillRect(edge, top, Math.max(0, W - edge), bottom - top);

    // Sprühnebel an der Düse: gaußverteilt um die Kante, leicht dahinter
    for (i = 0; i < count; i++) {
      x = n.x - d * sig * 1.3 + gauss() * sig;
      y = y0 + Math.random() * (y1 - y0) + gauss() * sy;
      cx.globalAlpha = 0.55 + Math.random() * 0.45;
      cx.beginPath(); cx.arc(x, y, 0.8 + Math.random() * 3.2, 0, TAU); cx.fill();
    }

    // Ober- und Unterkante der Zeile ausfransen
    for (i = 0; i < Math.round(count * 0.9); i++) {
      x = d > 0 ? Math.random() * Math.max(1, n.x - sig) : n.x + sig + Math.random() * Math.max(1, W - n.x - sig);
      y = (Math.random() < 0.5 ? y0 : y1) + gauss() * sy * 1.6;
      cx.globalAlpha = 0.4 + Math.random() * 0.5;
      cx.beginPath(); cx.arc(x, y, 0.7 + Math.random() * 2.2, 0, TAU); cx.fill();
    }
    cx.globalAlpha = 1;

    // Partikel aus der Düse in Sprührichtung im Kegel, ca. 18 % in Akzentorange
    var emit = Math.round(dt / 3 * (maxParts / 900));
    for (i = 0; i < emit; i++) {
      var a = (Math.random() - 0.5) * 0.9, sp = 0.18 + Math.random() * 0.5;
      parts.push({
        x: n.x + d * 4, y: n.y, vx: d * (Math.cos(a) * sp + 0.06), vy: Math.sin(a) * sp * 1.7 + 0.03,
        life: 0, max: 400 + Math.random() * 500, r: 0.7 + Math.random() * 2.3,
        c: Math.random() < 0.18 ? '232,98,46' : '235,240,250'
      });
    }
    // Feine, fast stehende Spritzer kurz vor der Kante (Overspray)
    for (i = 0; i < (maxParts < 900 ? 2 : 3); i++) {
      parts.push({
        x: n.x + d * sig * (1 + Math.random() * 3), y: y0 + Math.random() * (y1 - y0), vx: d * 0.02, vy: 0.015,
        life: 0, max: 260 + Math.random() * 300, r: 0.6 + Math.random() * 1.4, c: '235,240,250', still: true
      });
    }
    if (parts.length > maxParts) parts.splice(0, parts.length - maxParts);
  }

  function drawParts(dt) {
    mx.clearRect(0, 0, W, H);
    for (var j = parts.length - 1; j >= 0; j--) {
      var q = parts[j];
      q.life += dt;
      // Abgelaufene Partikel entfernen: mit dem letzten tauschen und kürzen (schneller als splice mitten im Array)
      if (q.life >= q.max) { parts[j] = parts[parts.length - 1]; parts.pop(); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 0.0004 * dt;   // leichte Schwerkraft
      var al = 1 - q.life / q.max;
      al = al * al * (q.still ? 0.5 : 0.85);
      mx.fillStyle = 'rgba(' + q.c + ',' + al.toFixed(3) + ')';
      mx.beginPath(); mx.arc(q.x, q.y, q.r, 0, TAU); mx.fill();
    }
  }

  function tick(now) {
    if (!t0) { t0 = now; last = now; }
    var t = now - t0, dt = Math.min(50, now - last);
    last = now;
    var n = nozzle(t);
    var wob = Math.sin(t / 180) * H * 0.004;
    placeGun(n, n.y + wob);
    if (n.spraying) spray(n, dt, W * SPREAD, H * 0.012);
    drawParts(dt);
    if (t < TOTAL) raf = requestAnimationFrame(tick);
    else finish();
  }

  // Ende: Foto komplett frei, Pistole weg, Animation gestoppt.
  // Die Canvas werden ausgeblendet, damit der Browser sie beim Scrollen nicht weiter mitrechnet.
  function finish() {
    cancelAnimationFrame(raf);
    raf = 0;
    parts = [];
    cx.clearRect(0, 0, W, H);
    mx.clearRect(0, 0, W, H);
    gun.style.display = 'none';
    cover.style.display = 'none';
    mist.style.display = 'none';
    state = 'done';
  }

  function start() {
    cancelAnimationFrame(raf);
    size();
    paintCover();
    parts = [];
    gun.style.display = 'block';
    gunW = gun.offsetWidth;
    gunH = gunW * GUN_RATIO;
    placeGun({ x: left(), dir: 1 }, rowY(0));
    t0 = 0;
    state = 'run';
    raf = requestAnimationFrame(tick);
  }

  // Bild laden lassen und dekodieren; Fehler oder fehlendes decode() zählen als geladen
  function ready(el) {
    if (el.decode) return el.decode().catch(function () {});
    return new Promise(function (res) {
      if (el.complete) return res();
      el.addEventListener('load', res, { once: true });
      el.addEventListener('error', res, { once: true });
    });
  }

  // Deckfläche sofort zeichnen, damit das Foto nicht kurz aufblitzt; Intro startet, wenn Foto und Pistole bereit sind
  size();
  paintCover();
  var timeout = new Promise(function (res) { setTimeout(res, 1500); });
  Promise.race([Promise.all([ready(img), ready(gun)]), timeout]).then(function () {
    if (state === 'wait') start();
  });

  // Hero nicht mehr zu sehen (weggescrollt): Intro sofort beenden, damit es nicht unsichtbar weiterrechnet
  // und das Scrollen bremst. Wer zurückscrollt, sieht direkt das Foto.
  new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting && state !== 'done') finish();
  }).observe(frame);

  // Größenänderung: laufendes Intro neu starten, nach dem Ende bleibt das Foto frei
  var rt, lastW = W, lastH = H;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var r = frame.getBoundingClientRect();
      if (r.width === lastW && r.height === lastH) return;   // z. B. mobile Adressleiste
      lastW = r.width; lastH = r.height;
      if (state === 'run') start();
      else if (state === 'wait') { size(); paintCover(); }
    }, 150);
  });
})();
