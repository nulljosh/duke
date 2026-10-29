(function(){
  // ponytail: real solved exercises from each Duolingo track (mate-in-1/fork,
  // algebra, word-order) and one move from every other game, replayed on a mini
  // stage (move/type + flash + XP), cycling like the runner. No screenshot anywhere.
  // All twelve: the scripted demo only ever used a handful, but a live FEN can
  // contain anything.
  var glyph = {
    K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙',
    k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟'
  };
  var stage = document.getElementById('demoStage');
  var trackEl = document.getElementById('appTrackName');
  var xpEl = document.getElementById('appXp'), labelEl = document.getElementById('appLabel');
  var solvedEl = document.getElementById('statPuzzles'), missesEl = document.getElementById('statMisses');
  var metaEl = document.getElementById('appMeta');
  var xp = 0, solved = 0;
  missesEl.textContent = '0';

  function chessPos(sq) {
    var file = sq.charCodeAt(0) - 97, rank = parseInt(sq[1], 10);
    return { left: (file * 12.5) + '%', top: ((8 - rank) * 12.5) + '%' };
  }
  function playChess(p, done) {
    stage.innerHTML = '<div class="demo-board" id="demoBoard"></div>';
    var board = document.getElementById('demoBoard');
    var nodes = {};
    Object.keys(p.pieces).forEach(function(sq) {
      var piece = p.pieces[sq], pos = chessPos(sq);
      var el = document.createElement('div');
      el.className = 'demo-piece ' + (piece === piece.toUpperCase() ? 'w' : 'b');
      el.textContent = glyph[piece];
      el.style.left = pos.left; el.style.top = pos.top;
      board.appendChild(el);
      nodes[sq] = el;
    });
    var flash = document.createElement('div');
    flash.className = 'demo-flash';
    var tp = chessPos(p.to);
    flash.style.left = tp.left; flash.style.top = tp.top;
    board.appendChild(flash);
    setTimeout(function() {
      nodes[p.from].style.left = tp.left; nodes[p.from].style.top = tp.top;
      setTimeout(function() { flash.classList.add('on'); done(); }, 650);
    }, 700);
  }
  function playMath(p, done) {
    stage.innerHTML = '<div class="demo-math"><div class="problem">' + p.problem + '</div><div class="answer" id="mathAnswer">' + p.answer + '</div></div>';
    setTimeout(function() {
      document.getElementById('mathAnswer').classList.add('on');
      done();
    }, 900);
  }
  function playLang(p, done) {
    stage.innerHTML = '<div class="demo-lang"><div class="prompt">' + p.prompt + '</div><div class="tiles" id="langTiles">' +
      p.tokens.map(function(t) { return '<span class="tile">' + t + '</span>'; }).join('') + '</div></div>';
    var tiles = document.querySelectorAll('#langTiles .tile');
    p.order.forEach(function(tokenIdx, step) {
      setTimeout(function() { tiles[tokenIdx].classList.add('on'); if (step === p.order.length - 1) done(); }, 350 + step * 260);
    });
  }
  // Every other game gets a turn between Duolingo rounds: its tile (the same glyph as its card below), the move it
  // makes and what it lands. Glyphs come from the cards so there is one drawing per game.
  function playGame(p, done) {
    var card = [].slice.call(document.querySelectorAll('#games .game')).filter(function(c) { return c.querySelector('h3').textContent === p.game; })[0];
    var svg = card ? card.querySelector('.game-tile').innerHTML : '';
    stage.innerHTML = '<div class="demo-game"><div class="demo-game-tile" style="--game: var(' + p.color + ')">' + svg +
      '</div><div class="demo-game-move" id="gameMove">' + p.move + '</div></div>';
    setTimeout(function() { document.getElementById('gameMove').classList.add('on'); }, 350);
    setTimeout(done, 1100);
  }
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
  // Live tracks are language codes ("ro"); show the name.
  function langName(code) { try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code); } catch (e) { return code; } }
  var players = { chess: playChess, math: playMath, lang: playLang, game: playGame };
  function playNext() {
    if (live) return;              // the real runner took over
    var p = puzzles[solved % puzzles.length];
    trackEl.textContent = p.game ? 'Playing ' + p.game : 'Solving ' + trackName[p.type];
    labelEl.classList.remove('on');
    players[p.type](p, function() {
      if (live) return;
      labelEl.textContent = p.label;
      labelEl.classList.add('on');
      xp += 10; solved += 1;
      xpEl.textContent = '+' + xp + ' XP';
      solvedEl.textContent = solved;
      setTimeout(playNext, 1600);
    });
  }

  // ponytail: if the runner is actually up, show the real board instead of the
  // replay - same data the apps read, through an edge-cached Function so the
  // Mac takes one request per 10s no matter how many people are looking.
  // It goes back to the scripted demo the moment that stops being true, because
  // a landing page that breaks whenever a laptop sleeps is worse than a canned one.
  var live = false;
  var captionEl = document.querySelector('.device-caption');
  var canned = captionEl ? captionEl.textContent : '';

  function drawLiveBoard(fen) {
    stage.innerHTML = '<div class="demo-board" id="demoBoard"></div>';
    var board = document.getElementById('demoBoard');
    fen.split(' ')[0].split('/').forEach(function(rank, r) {
      var f = 0;
      rank.split('').forEach(function(ch) {
        if (/\d/.test(ch)) { f += parseInt(ch, 10); return; }
        var el = document.createElement('div');
        el.className = 'demo-piece ' + (ch === ch.toUpperCase() ? 'w' : 'b');
        el.textContent = glyph[ch] || glyph[ch.toLowerCase()] || '';
        el.style.left = (f * 12.5) + '%';
        el.style.top = (r * 12.5) + '%';
        board.appendChild(el);
        f += 1;
      });
    });
  }

  // ponytail: math/lang have no board to draw, just a prompt+answer pair off
  // the last graded challenge (run.mjs now saves it to state.json). Reuse the
  // same reveal box the scripted demo uses so a subject switch actually looks
  // like a different subject, not a frozen chessboard with new stats next to it.
  var lastLiveKey = null;
  function drawLiveText(prompt, answer) {
    stage.innerHTML = '<div class="demo-math"><div class="problem">' + prompt + '</div><div class="answer on">' + answer + '</div></div>';
  }

  function poll() {
    fetch('/api/live').then(function(r) { return r.json(); }).then(function(d) {
      // Stale `at` means the Mac went away since the edge last looked.
      // Between puzzles the runner has no position to report. Taking over on
      // one of those would stop the replay and leave a scripted board sitting
      // under a "live right now" caption - so only take over once there is
      // something real to draw. After that, a momentary gap just holds the last one.
      var hasContent = d.fen || (d.track !== 'chess' && d.prompt);
      var fresh = d.live && d.at && (Date.now() - new Date(d.at).getTime() < 120000)
        && (hasContent || (live && d.track === trackEl.dataset.liveTrack));
      if (!fresh) {
        if (live) { live = false; lastLiveKey = null; if (captionEl) captionEl.textContent = canned; playNext(); }
        return;
      }
      var wasLive = live, trackChanged = trackEl.dataset.liveTrack !== d.track;
      live = true;
      trackEl.dataset.liveTrack = d.track;
      if (!wasLive && captionEl) {
        captionEl.textContent = 'Live right now, from the Mac actually running it.';
      }
      trackEl.textContent = 'Solving ' + (trackName[d.track] || langName(d.track));
      if (d.xp != null) xpEl.textContent = '+' + d.xp + ' XP';
      var solved = d.track === 'chess' ? d.puzzles : d.lessons;
      solvedEl.textContent = solved;
      missesEl.textContent = d.misses;
      if (metaEl && d.streak != null) {
        var acc = solved > 0 ? Math.round(100 * (solved - d.misses) / solved) : 100;
        metaEl.textContent = d.streak + ' day streak · ' + acc + '% solve rate';
      }
      labelEl.textContent = d.paused ? 'Paused' : 'Solving…';
      labelEl.classList.add('on');
      if (d.track === 'chess') {
        if (d.fen) drawLiveBoard(d.fen);
      } else if (d.prompt) {
        var key = d.track + '|' + d.prompt;
        if (key !== lastLiveKey || trackChanged) { lastLiveKey = key; drawLiveText(d.prompt, d.answer || ''); }
      } else if (trackChanged) {
        stage.innerHTML = '';
      }
    }).catch(function() {
      if (live) { live = false; lastLiveKey = null; if (captionEl) captionEl.textContent = canned; playNext(); }
    });
  }

  playNext();
  poll();
  setInterval(poll, 10000);
})();
