// Footer band, after Hermes: the things of the sea in a row (surfboard, wave, trident, sun, shell), cut like a line
// engraving in plain 2D canvas. Faint rules run across the band; inside the glyphs they thicken, and thicken again on
// the edge facing away from the light, so the glyphs look cut into the page. Drawn once per size and theme.
(function () {
  var band = document.querySelector('.word-band'), canvas = band && band.querySelector('canvas');
  if (!canvas) return;

  var mark = new Image(), tints = {};
  mark.src = 'mark.svg';

  // Each glyph is drawn white on a 100 unit square.
  var GLYPHS = [
    function (c) { // surfboard: the brand mark itself
      if (!mark.complete || !mark.naturalWidth) return;
      var key = c.fillStyle;
      if (!tints[key]) {
        var t = document.createElement('canvas'); t.width = t.height = 400;
        var tc = t.getContext('2d'); tc.drawImage(mark, 0, 0, 400, 400);
        tc.globalCompositeOperation = 'source-in'; tc.fillStyle = key; tc.fillRect(0, 0, 400, 400);
        tints[key] = t;
      }
      c.drawImage(tints[key], -6, -6, 112, 112);
    },
    function (c) { // wave, curling over
      c.beginPath(); c.moveTo(6, 88);
      c.bezierCurveTo(14, 40, 58, 10, 92, 34);
      c.bezierCurveTo(70, 30, 52, 42, 56, 60);
      c.bezierCurveTo(58, 72, 72, 76, 82, 68);
      c.bezierCurveTo(80, 86, 50, 92, 6, 88);
      c.fill();
    },
    function (c) { // trident
      c.fillRect(46, 30, 8, 66); c.fillRect(24, 44, 52, 8);
      [[24, 22], [46, 10], [68, 22]].forEach(function (p) {
        c.fillRect(p[0], p[1] + 8, 8, 44 - p[1]);
        c.beginPath(); c.moveTo(p[0] - 5, p[1] + 12); c.lineTo(p[0] + 4, p[1]); c.lineTo(p[0] + 13, p[1] + 12); c.fill();
      });
    },
    function (c) { // sun
      c.beginPath(); c.arc(50, 50, 18, 0, 7); c.fill();
      for (var i = 0; i < 8; i++) { c.save(); c.translate(50, 50); c.rotate(i * Math.PI / 4); c.beginPath(); c.roundRect(-4, -44, 8, 16, 4); c.fill(); c.restore(); }
    },
    function (c) { // scallop shell
      c.beginPath(); c.moveTo(50, 88); c.arc(50, 88, 44, Math.PI * 1.12, Math.PI * 1.88); c.closePath(); c.fill();
      c.fillRect(40, 84, 20, 10);
      c.globalCompositeOperation = 'destination-out'; c.lineWidth = 3;
      for (var i = 1; i < 6; i++) { var a = Math.PI * (1.12 + 0.76 * i / 6); c.beginPath(); c.moveTo(50, 86); c.lineTo(50 + 44 * Math.cos(a), 88 + 44 * Math.sin(a)); c.stroke(); }
      c.globalCompositeOperation = 'source-over';
    }
  ];
  // Lays the glyphs out evenly across a w by h 2D context, in the given colour: one row, or two on a narrow band.
  function grid(w, h) {
    var n = GLYPHS.length, rows = w < h * 3 ? 2 : 1, per = Math.ceil(n / rows);
    return { rows: rows, per: per, cell: Math.min(h / rows * 0.86, w / per) };
  }
  function paint(c, w, h, colour) {
    var g = grid(w, h), gap = (w - g.cell * g.per) / g.per, rowH = h / g.rows;
    GLYPHS.forEach(function (draw, i) {
      var col = i % g.per, row = Math.floor(i / g.per);
      c.save(); c.translate(gap / 2 + col * (g.cell + gap), row * rowH + (rowH - g.cell) / 2 + rowH * 0.04); c.scale(g.cell / 100, g.cell / 100);
      c.fillStyle = c.strokeStyle = colour; draw(c); c.restore();
    });
  }

  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  function layer(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // Horizontal rules `t` px thick, one every `pitch` px, kept only where `mask` is drawn (everywhere when null).
  function rules(w, h, pitch, t, colour, mask) {
    var c = layer(w, h), x = c.getContext('2d');
    x.fillStyle = colour;
    for (var y = 0; y < h; y += pitch) x.fillRect(0, Math.round(y + (pitch - t) / 2), w, Math.max(1, Math.round(t)));
    if (mask) { x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0); }
    return c;
  }
  var drawnW = 0;
  function draw() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    drawnW = w; canvas.width = w; canvas.height = h;
    var colour = getComputedStyle(band).color, pitch = Math.min(5 * dpr, Math.max(3 * dpr, grid(w, h).cell / 22)), s = Math.max(2, h * 0.014);
    var glyphs = layer(w, h); paint(glyphs.getContext('2d'), w, h, '#fff');
    // the shadow side: glyph pixels whose neighbour down and right is outside the glyph (light from the top left)
    var shade = layer(w, h), sc = shade.getContext('2d');
    sc.drawImage(glyphs, 0, 0); sc.globalCompositeOperation = 'destination-out'; sc.drawImage(glyphs, -s, -s);
    ctx.globalAlpha = 0.28; ctx.drawImage(rules(w, h, pitch, dpr * 0.75, colour, null), 0, 0);
    ctx.globalAlpha = 1; ctx.drawImage(rules(w, h, pitch, pitch * 0.32, colour, glyphs), 0, 0);
    ctx.drawImage(rules(w, h, pitch, pitch * 0.6, colour, shade), 0, 0);
    // fade out toward the legal line
    var g = ctx.createLinearGradient(0, h * 0.88, 0, h);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  band.classList.add('live');
  draw();
  mark.addEventListener('load', draw);
  // iOS fires resize as the toolbar slides; only a width change needs a redraw
  window.addEventListener('resize', function () { if (Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) !== drawnW) draw(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
})();
