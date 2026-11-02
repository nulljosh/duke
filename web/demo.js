// Hero wall: Duke's own app card, mounted many times behind the hero. Each card replays real solved exercises
// (mate-in-1 and forks, algebra, word order) and one move from every other game it plays, cycling like the runner.
// The first card goes live when the runner is up (/api/live), the rest keep replaying. No screenshot anywhere.
(function () {
  var glyph = { K:'\u2654', Q:'\u2655', R:'\u2656', B:'\u2657', N:'\u2658', P:'\u2659', k:'\u265a', q:'\u265b', r:'\u265c', b:'\u265d', n:'\u265e', p:'\u265f' };
  var puzzles = [
    { type: 'chess', label: 'Checkmate!', pieces: { e1:'Q', g1:'K', g8:'k', f7:'p', g7:'p', h7:'p' }, from: 'e1', to: 'e8' },
    { type: 'game', game: 'Factorio', color: '--g-factorio', label: 'Rocket launched!', move: 'Build the silo, feed it, launch' },
    { type: 'math',  label: 'Solved!', problem: '3(x + 2) = 21', answer: 'x = 5' },
    { type: 'game', game: 'FEZ', color: '--g-fez', label: '32 of 32 cubes', move: 'Rotate the world, take the cube' },
    { type: 'lang',  label: 'Correct!', prompt: '"How are you?" → Spanish', tokens: ['tú', '¿Cómo', 'estás', '?'], order: [1, 0, 2, 3] },
    { type: 'game', game: 'Papers, Please', color: '--g-papers', label: 'Approved', move: 'Passport matches the rulebook' },
    { type: 'chess', label: 'Checkmate!', pieces: { a1:'R', g1:'K', g8:'k', f7:'p', g7:'p', h7:'p' }, from: 'a1', to: 'a8' },
    { type: 'game', game: 'Pokemon Sapphire', color: '--g-pokemon', label: 'Grovyle, level 27', move: 'Treecko evolves' },
    { type: 'math',  label: 'Solved!', problem: '√144 + 5²', answer: '37' },
    { type: 'game', game: 'Pikmin 2', color: '--g-pikmin', label: 'Purples!', move: 'Reds into the Candypop Bud' },
    { type: 'game', game: 'Oxygen Not Included', color: '--g-oni', label: 'Cycle survived', move: 'Dig, build, keep everyone breathing' },
    { type: 'lang',  label: 'Correct!', prompt: '"The cat sleeps" → Greek', tokens: ['κοιμάται', 'Η', 'γάτα'], order: [1, 2, 0] },
    { type: 'game', game: 'Game Dev Tycoon', color: '--g-gdt', label: 'Shipped!', move: 'Pick a topic and genre, make the game' },
    { type: 'game', game: 'Mirage', color: '--g-mirage', label: 'Level clear', move: 'Jump the gap before sunset' },
    { type: 'chess', label: 'Fork!', pieces: { e5:'N', g1:'K', g8:'k', c8:'q' }, from: 'e5', to: 'f7' }
  ];
  var trackName = { chess: 'Chess', math: 'Math', lang: 'Language' };
  function langName(code) { try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code); } catch (e) { return code; } }
  function chessPos(sq) { var file = sq.charCodeAt(0) - 97, rank = parseInt(sq[1], 10); return { left: (file * 12.5) + '%', top: ((8 - rank) * 12.5) + '%' }; }
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var later = function (f, ms) { return setTimeout(f, still ? 0 : ms); };

  function mount(root, lane, withLive) {
    root.className = 'app-demo';
    root.innerHTML = '<h4></h4><div class="app-meta">196 day streak \u00b7 5/5 hearts \u00b7 Diamond League</div><div class="demo-stage"></div>' +
      '<div class="app-label"></div><div class="app-xp">+0 XP</div><div class="app-stats"><div><b>0</b><span>Solved</span></div><div><b>0</b><span>Misses</span></div></div>';
    var q = function (s) { return root.querySelector(s); };
    var trackEl = q('h4'), metaEl = q('.app-meta'), stage = q('.demo-stage'), labelEl = q('.app-label'), xpEl = q('.app-xp');
    var nums = root.querySelectorAll('.app-stats b'), solvedEl = nums[0], missesEl = nums[1];
    var xp = 0, solved = 0, live = false, lastLiveKey = null;

    function playChess(p, done) {
      root.style.setProperty('--tint', 'var(--g-duolingo)');
      stage.innerHTML = '<div class="demo-board"></div>';
      var board = stage.firstChild, nodes = {};
      Object.keys(p.pieces).forEach(function (sq) {
        var piece = p.pieces[sq], pos = chessPos(sq), el = document.createElement('div');
        el.className = 'demo-piece ' + (piece === piece.toUpperCase() ? 'w' : 'b'); el.textContent = glyph[piece];
        el.style.left = pos.left; el.style.top = pos.top; board.appendChild(el); nodes[sq] = el;
      });
      var flash = document.createElement('div'), tp = chessPos(p.to);
      flash.className = 'demo-flash'; flash.style.left = tp.left; flash.style.top = tp.top; board.appendChild(flash);
      later(function () { nodes[p.from].style.left = tp.left; nodes[p.from].style.top = tp.top; later(function () { flash.classList.add('on'); done(); }, 650); }, 700);
    }
    function playMath(p, done) {
      root.style.setProperty('--tint', 'var(--g-duolingo)');
      stage.innerHTML = '<div class="demo-math"><div class="problem"></div><div class="answer"></div></div>';
      stage.querySelector('.problem').textContent = p.problem; var a = stage.querySelector('.answer'); a.textContent = p.answer;
      later(function () { a.classList.add('on'); done(); }, 900);
    }
    function playLang(p, done) {
      root.style.setProperty('--tint', 'var(--g-duolingo)');
      stage.innerHTML = '<div class="demo-lang"><div class="prompt"></div><div class="tiles"></div></div>';
      stage.querySelector('.prompt').textContent = p.prompt;
      var box = stage.querySelector('.tiles'), tiles = p.tokens.map(function (t) { var s = document.createElement('span'); s.className = 'tile'; s.textContent = t; box.appendChild(s); return s; });
      p.order.forEach(function (ti, step) { later(function () { tiles[ti].classList.add('on'); if (step === p.order.length - 1) done(); }, 350 + step * 260); });
    }
    // Every other game: a real frame from Duke's own run of it (web/shots, cropped from games/*/shots), the move and
    // what it lands. Same size as the chess board, never an icon.
    var SHOT = { 'Factorio': 'factorio', 'FEZ': 'fez', 'Papers, Please': 'papers', 'Pokemon Sapphire': 'pokemon', 'Pikmin 2': 'pikmin',
                 'Oxygen Not Included': 'oni', 'Game Dev Tycoon': 'gdt', 'Mirage': 'mirage' };
    function playGame(p, done) {
      root.style.setProperty('--tint', 'var(' + p.color + ')');
      stage.innerHTML = '<div class="demo-game"><img class="demo-shot" alt="" decoding="async" src="shots/' + SHOT[p.game] + '.jpg"><div class="demo-game-move"></div></div>';
      var mv = stage.querySelector('.demo-game-move'); mv.textContent = p.move;
      later(function () { mv.classList.add('on'); }, 350); later(done, 1100);
    }
    var players = { chess: playChess, math: playMath, lang: playLang, game: playGame };
    function playNext() {
      if (live) return; // the real runner took over
      var p = lane[solved % lane.length];
      trackEl.textContent = p.game ? 'Playing ' + p.game : 'Solving ' + trackName[p.type];
      labelEl.classList.remove('on');
      players[p.type](p, function () {
        if (live) return;
        labelEl.textContent = p.label; labelEl.classList.add('on');
        xp += 10; solved += 1; xpEl.textContent = '+' + xp + ' XP'; solvedEl.textContent = solved;
        if (!still) later(playNext, 1600);
      });
    }
    missesEl.textContent = '0';
    playNext();
    if (!withLive) return;

    // ponytail: if the runner is actually up, this card shows the real board instead of the replay, through an
    // edge-cached Function (one request per 10s from the Mac however many people look). It goes back to the replay
    // the moment that stops being true: a landing that breaks whenever a laptop sleeps is worse than a canned one.
    function drawLiveBoard(fen) {
      stage.innerHTML = '<div class="demo-board"></div>';
      var board = stage.firstChild;
      fen.split(' ')[0].split('/').forEach(function (rank, r) {
        var f = 0;
        rank.split('').forEach(function (ch) {
          if (/\d/.test(ch)) { f += parseInt(ch, 10); return; }
          var el = document.createElement('div');
          el.className = 'demo-piece ' + (ch === ch.toUpperCase() ? 'w' : 'b'); el.textContent = glyph[ch] || glyph[ch.toLowerCase()] || '';
          el.style.left = (f * 12.5) + '%'; el.style.top = (r * 12.5) + '%'; board.appendChild(el); f += 1;
        });
      });
    }
    function drawLiveText(prompt, answer) {
      stage.innerHTML = '<div class="demo-math"><div class="problem"></div><div class="answer on"></div></div>';
      stage.querySelector('.problem').textContent = prompt; stage.querySelector('.answer').textContent = answer;
    }
    function off() { if (live) { live = false; lastLiveKey = null; playNext(); } }
    function poll() {
      fetch('/api/live').then(function (r) { return r.json(); }).then(function (d) {
        // Only take over once there is something real to draw; after that a momentary gap holds the last one.
        var hasContent = d.fen || (d.track !== 'chess' && d.prompt);
        var fresh = d.live && d.at && (Date.now() - new Date(d.at).getTime() < 120000) && (hasContent || (live && d.track === trackEl.dataset.liveTrack));
        if (!fresh) return off();
        var trackChanged = trackEl.dataset.liveTrack !== d.track;
        live = true; trackEl.dataset.liveTrack = d.track;
        trackEl.textContent = 'Live: solving ' + (trackName[d.track] || langName(d.track));
        if (d.xp != null) xpEl.textContent = '+' + d.xp + ' XP';
        var n = d.track === 'chess' ? d.puzzles : d.lessons;
        solvedEl.textContent = n; missesEl.textContent = d.misses;
        if (d.streak != null) metaEl.textContent = d.streak + ' day streak \u00b7 ' + (n > 0 ? Math.round(100 * (n - d.misses) / n) : 100) + '% solve rate';
        labelEl.textContent = d.paused ? 'Paused' : 'Solving\u2026'; labelEl.classList.add('on');
        if (d.track === 'chess') { if (d.fen) drawLiveBoard(d.fen); }
        else if (d.prompt) { var key = d.track + '|' + d.prompt; if (key !== lastLiveKey || trackChanged) { lastLiveKey = key; drawLiveText(d.prompt, d.answer || ''); } }
        else if (trackChanged) stage.innerHTML = '';
      }).catch(off);
    }
    poll(); setInterval(poll, 10000);
  }

  var wall = document.getElementById('dwall'); if (!wall) return;
  // One lane per card so no two cards ever show the same thing: chess on one card only, math and language on
  // another, and the other games two to a card.
  var of = function (t) { return puzzles.filter(function (p) { return p.type === t; }); };
  var games = of('game'), lanes = [of('chess'), of('math').concat(of('lang'))];
  for (var g = 0; g < games.length; g += 2) lanes.push(games.slice(g, g + 2));
  var n = Math.min(lanes.length, innerWidth <= 560 ? 4 : 6);
  for (var i = 0; i < n; i++) { var c = document.createElement('div'); wall.appendChild(c); (function (c, i) { later(function () { mount(c, lanes[i], i === 0); }, i * 180); })(c, i); }
})();

// Hero parallax: the wall drifts at 0.45, the copy lifts at 0.2 and fades. Off under reduced motion.
(function () {
  var bg = document.querySelector('.hero-bg'), copy = document.querySelector('.hero-copy');
  if (!bg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var t = 0;
  addEventListener('scroll', function () {
    if (t) return;
    t = requestAnimationFrame(function () {
      t = 0; var y = scrollY, h = innerHeight; if (y > h * 1.2) return;
      bg.style.setProperty('--py', (y * .45) + 'px');
      copy.style.transform = 'translate3d(0,' + (y * .2) + 'px,0)'; copy.style.opacity = Math.max(0, 1 - y / (h * .7));
    });
  }, { passive: true });
})();
