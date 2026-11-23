// Hero scene, after Keyrate. The nine game tiles (the icon's nine, cloned from the list below) drift at three depths
// around the title and the app. Each layer eases toward the scroll position at its own speed and the copy lifts and
// fades. Reduced motion gets a still scene.
(function () {
  var sky = document.getElementById('dsky'), src = document.querySelectorAll('.games li');
  if (!sky || !src.length) return;
  var seed = 9, rnd = function () { return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  // [layer, size px, scroll speed]; positions hug the edges so the middle stays clear
  var depths = [['far', 34, .15], ['mid', 52, .3], ['near', 76, .5]], layers = [];
  var spots = [[6, 12], [88, 9], [14, 44], [82, 40], [4, 74], [92, 70], [24, 86], [74, 84], [62, 92], [16, 26], [86, 24], [8, 58], [94, 52], [30, 66], [70, 62], [36, 96]];
  depths.forEach(function (d, di) {
    var layer = sky.appendChild(document.createElement('div')); layer.className = 'layer ' + d[0]; layers.push([layer, d[2]]);
    for (var i = 0; i < 6; i++) {
      var g = src[(di * 6 + i) % src.length], p = spots[(i * 3 + di * 5) % spots.length]; // every game shows, none twice in a layer
      var t = layer.appendChild(document.createElement('span')); t.className = 'tile';
      t.style.cssText = '--game:' + g.style.getPropertyValue('--game') + ';--s:' + Math.round(d[1] * (.85 + rnd() * .3)) + 'px;--r:' + Math.round(rnd() * 24 - 12) + 'deg;' +
        'left:calc(' + (p[0] + rnd() * 4 - 2) + '% - var(--s) / 2);top:' + (p[1] + rnd() * 4 - 2) + '%;animation-duration:' + (5 + rnd() * 4).toFixed(1) + 's';
      t.innerHTML = g.querySelector('svg').outerHTML;
    }
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var copy = document.querySelector('.hero-copy'), ground = document.querySelector('.ground'), raf = 0;
  addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0; var y = scrollY, h = innerHeight; if (y > h * 1.5) return;
      layers.forEach(function (l) { l[0].style.transform = 'translate3d(0,' + (-y * l[1]) + 'px,0)'; });
      copy.style.transform = 'translate3d(0,' + (y * .2) + 'px,0)'; copy.style.opacity = Math.max(0, 1 - y / (h * .6));
      ground.style.transform = 'translate3d(0,' + (y * .08) + 'px,0)';
    });
  }, { passive: true });
})();
