// Footer band, after Hermes: the brand grid and every game's glyph in a row, cut like a line
// engraving in plain 2D canvas. Faint rules run across the band; inside the glyphs they thicken, and thicken again on
// the edge facing away from the light, so the glyphs look cut into the page. Drawn once per size and theme.
(function () {
  var band = document.querySelector('.word-band'), canvas = band && band.querySelector('canvas');
  if (!canvas) return;

  // Each glyph is drawn white on a 100 unit square: the brand grid first, then every game's card glyph (the same
  // drawing as its tile above), so the footer names every game Duke plays.
  var GLYPHS = [
    function (c) { // the mark: nine tiles, play in the middle
      [10, 38, 66].forEach(function (y, r) { [10, 38, 66].forEach(function (x, k) {
        if (r === 1 && k === 1) return;
        c.beginPath(); c.roundRect(x, y, 24, 24, 6); c.fill();
      }); });
      c.beginPath(); c.moveTo(42, 39); c.lineTo(42, 61); c.lineTo(61, 50); c.closePath(); c.fill();
    }
  ];
  var pending = 0;
  [].slice.call(document.querySelectorAll('#games .game-tile svg')).forEach(function (svg) {
    var img = new Image(); pending++;
    img.onload = function () { if (--pending === 0) draw(); };
    img.src = 'data:image/svg+xml,' + encodeURIComponent(new XMLSerializer().serializeToString(svg).replace(/stroke-width="4"/g, 'stroke-width="5"'));
    GLYPHS.push(function (c) { if (img.complete && img.naturalWidth) c.drawImage(img, 0, 0, 100, 100); });
  });
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
  // iOS fires resize as the toolbar slides; only a width change needs a redraw
  window.addEventListener('resize', function () { if (Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) !== drawnW) draw(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
})();
