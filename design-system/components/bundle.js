/* @ds-bundle: {"format":4,"namespace":"Zoofus","components":[{"name":"Paper"},{"name":"Tape"},{"name":"Scribble"},{"name":"Wordmark"},{"name":"Masthead"},{"name":"Button"},{"name":"Chip"},{"name":"ToggleGroup"},{"name":"TextField"},{"name":"Slider"},{"name":"ColorPicker"},{"name":"Dialog"},{"name":"Toast"},{"name":"Tooltip"},{"name":"Avatar"},{"name":"AvatarMenu"},{"name":"Loader"},{"name":"EmptyState"},{"name":"Sticker"},{"name":"StickerTile"},{"name":"LassoCanvas"},{"name":"PatternEditor"},{"name":"TapeStudio"},{"name":"StickerEdgeStudio"},{"name":"CJKSpecimen"},{"name":"AuthPage"},{"name":"HomePage"},{"name":"StickerMakerPage"},{"name":"StickerBookPage"},{"name":"NotFoundPage"}]} */
(function () {
  var React = window.React, h = React.createElement, F = React.Fragment;

  /* =========================================================
     1. Seeded randomness
     ========================================================= */
  function hash(str) {
    str = String(str); var h1 = 2166136261;
    for (var i = 0; i < str.length; i++) { h1 ^= str.charCodeAt(i); h1 = Math.imul(h1, 16777619); }
    return h1 >>> 0;
  }
  function rng(seed) { // mulberry32
    var a = typeof seed === 'number' ? seed : hash(seed);
    return function () {
      a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededRot(seed, range) { var r = rng('rot' + seed); return ((r() * 2 - 1) * range).toFixed(2) + 'deg'; }

  /* =========================================================
     2. Torn-edge generator, v2: "torn from a magazine"
     One edge = a wandering tear line built from layered value noise
     (low bow + drift, mid wander, fine fibre jag, per-point grit) with
     roughness that changes along the edge, 0–2 asymmetric bites, and a
     pale fibre lip (the paper's core) that comes and goes.
     Output: two clip-paths — face and fibre — mixing % (along) and px (depth).
     ========================================================= */
  var TEAR = {
    xs: { amp: 2.6, res: 2,   nick: 0.15, fiber: 1.4, w: 90,   h: 32 },
    sm: { amp: 3.6, res: 2.5, nick: 0.25, fiber: 2,   w: 150,  h: 46 },
    md: { amp: 5.5, res: 3,   nick: 0.4,  fiber: 3.2, w: 300,  h: 200 },
    lg: { amp: 7.5, res: 3.5, nick: 0.5,  fiber: 4,   w: 560,  h: 420 },
    xl: { amp: 10,  res: 4,   nick: 0.6,  fiber: 5,   w: 1280, h: 90 }
  };
  var clipCache = new Map();
  function f1(n) { return Math.round(n * 10) / 10; }
  // 1-D value noise on [0,1] with smoothstep interpolation; periodic for closed outlines
  function vnoise(R, cells, periodic) {
    cells = Math.max(1, Math.round(cells)); var v = [];
    for (var i = 0; i <= cells; i++) v.push(R());
    if (periodic) v[cells] = v[0];
    return function (t) {
      var x = Math.min(Math.max(t, 0), 1) * cells, i = Math.min(cells - 1, Math.floor(x)), f = x - i, u = f * f * (3 - 2 * f);
      return v[i] * (1 - u) + v[i + 1] * u;
    };
  }
  function tearEdge(R, len, o) {
    var n = Math.max(8, Math.min(420, Math.round(len / o.res)));
    var big = vnoise(R, 2 + Math.floor(R() * 2)), mid = vnoise(R, Math.max(4, len / 38)), fine = vnoise(R, Math.max(8, len / 7));
    var rough = vnoise(R, 3 + Math.floor(R() * 4)), fib = vnoise(R, Math.max(5, len / 18));
    // every edge gets its own character, so no two edges of one scrap match
    var slope = (R() * 2 - 1) * 0.9, bow = 0.4 + R() * 0.9, roughBase = 0.15 + R() * 0.55, lip = 0.5 + R() * 0.8;
    var bites = [], nb = R() < o.nick * Math.min(2, len / 160) ? (R() < 0.25 ? 2 : 1) : 0;
    for (var k = 0; k < nb; k++) bites.push({ t: 0.08 + R() * 0.84, w: (5 + R() * 22) / len, d: o.amp * (1 + R() * 1.6), lead: 0.2 + R() * 0.6 });
    var pts = [], min = Infinity;
    for (var i = 0; i <= n; i++) {
      var t = i / n; if (i > 0 && i < n) t += (R() - 0.5) * 0.7 / n;
      var r = Math.min(1, roughBase + rough(t) * 0.9);
      var d = o.amp * (bow * big(t) + 0.5 * mid(t) + r * (0.55 * fine(t) + 0.45 * R() * R())) + slope * o.amp * t;
      for (var b = 0; b < bites.length; b++) {                  // asymmetric bite: steep on one side, slow on the other
        var bt = bites[b], x = (t - bt.t) / bt.w;
        if (x > -bt.lead && x < 1 - bt.lead) { var u = x < 0 ? 1 + x / bt.lead : 1 - x / (1 - bt.lead); d += bt.d * Math.pow(u, 0.6); }
      }
      pts.push({ t: t, d: d, fb: fib(t) }); if (d < min) min = d;
    }
    for (var j = 0; j < pts.length; j++) {
      var p = pts[j], fw = Math.min(o.fiber, o.fiber * lip * Math.max(0.12, p.fb * 1.7 - 0.3) * (0.75 + 0.5 * R()));
      p.d = p.d - min + o.fiber; p.f = p.d - fw;                // fibre sits outside the face, inside the box
    }
    return pts;
  }
  function cutEdge(R, len, o) {                                 // a scissor-cut (or page) edge: straight but not square
    var n = 2, a = o.flush ? 0 : R() * o.amp * 0.6, b = o.flush ? 0 : R() * o.amp * 0.6, pts = [];
    for (var i = 0; i <= n; i++) { var t = i / n, d = a + (b - a) * t + (o.flush ? 0 : o.fiber * 0.3); pts.push({ t: t, d: d, f: d }); }
    return pts;
  }
  /**
   * tornPair(seed, opts) → { face, fiber } clip-path strings (cached).
   * opts: { size, amp?, res?, nick?, fiber?, edges?: 'trbl' | 'auto' | any subset, w?, h? }
   *   'auto' (default for scraps): all four torn, but ~35% of scraps keep one cut edge.
   */
  function tornPair(seed, opts) {
    opts = opts || {};
    var base = TEAR[opts.size || 'md'];
    var o = { amp: opts.amp != null ? opts.amp : base.amp, res: opts.res || base.res, nick: opts.nick != null ? opts.nick : base.nick,
      fiber: opts.fiber != null ? opts.fiber : base.fiber, w: opts.w || base.w, h: opts.h || base.h, edges: opts.edges || 'trbl', flush: !!opts.flush };
    var key = [seed, o.amp, o.res, o.nick, o.fiber, o.edges, o.flush, Math.round(o.w / 64), Math.round(o.h / 64)].join('|');
    var hit = clipCache.get(key); if (hit) return hit;
    var R = rng(hash(key)), E = o.edges;
    if (E === 'auto') { E = 'trbl'; if (R() < 0.35) E = E.replace('trbl'.charAt(Math.floor(R() * 4)), ''); }
    function edge(k, len) { return E.indexOf(k) > -1 ? tearEdge(R, len, o) : cutEdge(R, len, o); }
    var T = edge('t', o.w), Rt = edge('r', o.h), B = edge('b', o.w), L = edge('l', o.h);
    function build(key) {
      var P = [], i;
      for (i = 0; i < T.length; i++) {                         // top: left → right
        var x = i === 0 ? f1(L[L.length - 1][key]) + 'px' : i === T.length - 1 ? 'calc(100% - ' + f1(Rt[0][key]) + 'px)' : f1(T[i].t * 100) + '%';
        P.push(x + ' ' + f1(T[i][key]) + 'px');
      }
      for (i = 1; i < Rt.length; i++) {                        // right: top → bottom
        var y = i === Rt.length - 1 ? 'calc(100% - ' + f1(B[0][key]) + 'px)' : f1(Rt[i].t * 100) + '%';
        P.push('calc(100% - ' + f1(Rt[i][key]) + 'px) ' + y);
      }
      for (i = 1; i < B.length; i++) {                         // bottom: right → left
        var bx = i === B.length - 1 ? f1(L[0][key]) + 'px' : f1(100 - B[i].t * 100) + '%';
        P.push(bx + ' calc(100% - ' + f1(B[i][key]) + 'px)');
      }
      for (i = 1; i < L.length - 1; i++) P.push(f1(L[i][key]) + 'px ' + f1(100 - L[i].t * 100) + '%'); // left: bottom → top
      return 'polygon(' + P.join(',') + ')';
    }
    var out = { face: build('d'), fiber: build('f') };
    clipCache.set(key, out);
    return out;
  }
  function tornClip(seed, opts) { return tornPair(seed, opts).face; }
  function tornVars(seed, opts) { var p = tornPair(seed, opts); return { '--clip': p.face, '--fclip': p.fiber }; }

  // React hooks: stable seed + optional measuring (bucketed to 64px, so cheap)
  var uid = 0;
  function useSeed(seed) { var r = React.useRef(null); if (r.current == null) r.current = seed != null ? String(seed) : 'zf' + (++uid); return r.current; }
  function useTorn(seed, opts, measure) {
    var ref = React.useRef(null), st = React.useState(null), size = st[0], set = st[1];
    React.useLayoutEffect(function () {
      if (!measure || !ref.current || typeof ResizeObserver === 'undefined') return;
      var el = ref.current, last = '';
      var ro = new ResizeObserver(function (en) {
        var b = en[0].contentRect, k = Math.round(b.width / 64) + 'x' + Math.round(b.height / 64);
        if (k !== last) { last = k; set({ w: b.width, h: b.height }); }
      });
      ro.observe(el); return function () { ro.disconnect(); };
    }, [measure]);
    return [ref, tornVars(seed, Object.assign({}, opts, size || {}))];
  }

  /* =========================================================
     2b. Pattern engine — shared by tape and sticker edges (user-designed)
     PatternSpec = { kind, bg, ink, scale, angle, weight, pixels?, strokes? }
     colours are hex from PALETTE so the same spec renders in CSS and canvas.
     ========================================================= */
  var PALETTE = {
    'kraft-100': '#e8ddd0', 'peach-100': '#ffe4c5', 'apricot-300': '#f1a17a', 'tangerine-400': '#e57c48', 'orange-500': '#ea6422',
    'sage-100': '#e3e5d0', 'celery-200': '#ecefbc', 'lime-300': '#dce35d', 'chartreuse-400': '#e3ed2a', 'olive-500': '#b4bc2f', 'moss-700': '#57620d',
    'mustard-300': '#edcd7e', 'cream-100': '#f1e9bf', 'blush-100': '#f4ddea', 'pink-200': '#efb6d5', 'hotpink-300': '#f779be', 'rose-400': '#e374a7',
    'magenta-500': '#da3b84', 'brick-600': '#bc3b22', 'raspberry-600': '#c32768', 'cocoa-800': '#6c4a3b', 'loden-900': '#41470e', 'plum-900': '#7a0e4d', 'sheet-50': '#fbf6ee'
  };
  var USER_COLORS = ['sheet-50', 'cream-100', 'peach-100', 'blush-100', 'pink-200', 'celery-200', 'lime-300', 'mustard-300', 'apricot-300', 'rose-400', 'olive-500', 'tangerine-400', 'brick-600', 'plum-900', 'moss-700', 'cocoa-800'];
  var PATTERN_KINDS = [['solid', 'Solid'], ['stripes', 'Stripes'], ['dots', 'Dots'], ['gingham', 'Gingham'], ['check', 'Check'], ['wave', 'Wave'], ['pixels', 'Pixels'], ['doodle', 'Doodle']];
  function hex(c) { return PALETTE[c] || c; }
  var pid = 0;
  /** patternMarkup(spec, k) → inner SVG markup (defs + two rects). k scales the pattern (e.g. devicePixelRatio). */
  function patternMarkup(spec, k, id) {
    k = k || 1; id = id || ('zp' + (++pid));
    var s = (spec.scale || 12) * k, w = spec.weight != null ? spec.weight : 0.5, ink = hex(spec.ink || 'cocoa-800'), bg = hex(spec.bg || 'mustard-300');
    var a = spec.angle || 0, tile = '', tw = s, th = s;
    switch (spec.kind) {
      case 'stripes': tile = '<rect width="' + f1(s * w) + '" height="' + s + '" fill="' + ink + '"/>'; break;
      case 'dots': { var r = f1(s * (0.12 + w * 0.3)); tile = ['0,0', s + ',0', '0,' + s, s + ',' + s, s / 2 + ',' + s / 2].map(function (c) { c = c.split(','); return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + r + '" fill="' + ink + '"/>'; }).join(''); break; }
      case 'gingham': { var g = f1(s * (0.2 + w * 0.5)); tile = '<rect width="' + g + '" height="' + s + '" fill="' + ink + '" fill-opacity=".5"/><rect width="' + s + '" height="' + g + '" fill="' + ink + '" fill-opacity=".5"/>'; break; }
      case 'check': tile = '<rect width="' + s / 2 + '" height="' + s / 2 + '" fill="' + ink + '"/><rect x="' + s / 2 + '" y="' + s / 2 + '" width="' + s / 2 + '" height="' + s / 2 + '" fill="' + ink + '"/>'; break;
      case 'wave': tw = s * 2; tile = '<path d="M0 ' + s / 2 + ' Q' + s / 2 + ' 0 ' + s + ' ' + s / 2 + ' T' + 2 * s + ' ' + s / 2 + '" fill="none" stroke="' + ink + '" stroke-width="' + f1(Math.max(1, s * (0.08 + w * 0.3))) + '" stroke-linecap="round"/>'; break;
      case 'pixels': { var rows = spec.pixels || [], c = s / 4; tw = th = c * 8;
        rows.forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === '1') tile += '<rect x="' + f1(x * c) + '" y="' + f1(y * c) + '" width="' + f1(c + .3) + '" height="' + f1(c + .3) + '" fill="' + ink + '"/>'; }); break; }
      case 'doodle': { tw = th = s * 4; var sc = tw / 48;
        tile = '<g transform="scale(' + f1(sc * 100) / 100 + ')" fill="none" stroke="' + ink + '" stroke-width="' + f1(1.2 + w * 3) + '" stroke-linecap="round" stroke-linejoin="round">' + (spec.strokes || []).map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</g>'; break; }
      default: tile = '';
    }
    var defs = tile ? '<defs><pattern id="' + id + '" patternUnits="userSpaceOnUse" width="' + f1(tw) + '" height="' + f1(th) + '" patternTransform="rotate(' + a + ')">' + tile + '</pattern></defs>' : '';
    return defs + '<rect width="100%" height="100%" fill="' + bg + '"/>' + (tile ? '<rect width="100%" height="100%" fill="url(#' + id + ')"/>' : '');
  }
  function patternSVG(spec, w, h, k) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' + patternMarkup(spec, k, 'p') + '</svg>'; }
  function PatternFill(p) {
    var id = React.useMemo(function () { return 'zp' + (++pid); }, []);
    return h('svg', { className: 'zf-pattern', width: '100%', height: '100%', 'aria-hidden': true, dangerouslySetInnerHTML: { __html: patternMarkup(p.spec, 1, id) } });
  }

  /* =========================================================
     3. Hand-drawn lines
     ========================================================= */
  function scribblePath(seed, opts) {
    opts = opts || {}; var W = opts.w || 200, H = opts.h || 8, R = rng('s' + seed), n = Math.round(W / 16);
    var y = H / 2, d = 'M0 ' + f1(y + (R() - .5) * 2);
    for (var i = 1; i <= n; i++) {
      var x = (i / n) * W, ny = H / 2 + (R() - .5) * H * (opts.wave ? 0 : 0.55) + (opts.wave ? (i % 2 ? -2 : 2) : 0);
      d += ' Q' + f1(x - W / n / 2) + ' ' + f1((y + ny) / 2 + (R() - .5) * 1.5) + ' ' + f1(x) + ' ' + f1(ny); y = ny;
    }
    return d;
  }
  function Scribble(p) {
    var seed = useSeed(p.seed);
    return h('svg', { className: 'zf-scribble ' + (p.className || ''), viewBox: '0 0 200 8', preserveAspectRatio: 'none', 'aria-hidden': true, style: p.style },
      h('path', { d: scribblePath(seed, { wave: p.variant === 'wave' }), fill: 'none', stroke: 'currentColor', strokeWidth: p.weight || 1.6, strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke', strokeDasharray: p.variant === 'dashed' ? '7 5 3 6 9 5' : null }));
  }
  function Divider(p) { return h('div', { className: 'zf-divider', role: 'separator' }, h(Scribble, { seed: p.seed, variant: 'dashed' })); }

  /* =========================================================
     4. Paper + Tape primitives (flat: no shadows anywhere)
     wrapper: rotation, focus trace, fibre lip (::before, clip --fclip)
     face:    tone, grain, clip --clip
     ========================================================= */
  function Paper(p) {
    var seed = useSeed(p.seed);
    var t = useTorn(seed, { size: p.size || 'md', edges: p.edges || 'auto', flush: p.flush, w: p.w, h: p.h, fiber: p.fiber === false ? 0 : undefined }, p.measure);
    var rot = p.rotate === 0 ? '0deg' : seededRot(seed, p.rotate || 0);
    return h(p.as || 'div', Object.assign({ className: 'zf-paper zf-torn' + (p.inline ? '' : ' is-block') + ' ' + (p.className || ''),
      style: Object.assign({ '--rot': rot, '--fiber-tone': p.fiberTone ? 'var(--' + p.fiberTone + ')' : undefined }, t[1], p.style) }, p.wrapperProps),
      p.tape, h('div', { ref: t[0], className: 'zf-face ' + (p.faceClass || ''), style: Object.assign({ '--tone': p.tone ? 'var(--' + p.tone + ')' : undefined }, p.faceStyle) }, p.children));
  }
  var TAPE_PRESETS = {
    'tape-mustard': { kind: 'solid', bg: 'mustard-300' },
    'tape-celery': { kind: 'stripes', bg: 'lime-300', ink: 'sheet-50', scale: 10, angle: 90, weight: 0.3 },
    'tape-pink': { kind: 'dots', bg: 'pink-200', ink: 'sheet-50', scale: 9, weight: 0.35 },
    'tape-apricot': { kind: 'solid', bg: 'apricot-300' },
    'tape-gingham': { kind: 'gingham', bg: 'cream-100', ink: 'olive-500', scale: 10, weight: 0.4 }
  };
  var TAPES = ['tape-mustard', 'tape-celery', 'tape-pink', 'tape-apricot'];
  function tapeEnds(seed, ends, len, th) {
    if (ends === 'cut') return 'none';
    if (ends === 'pinked') {                                      // pinking-shear ends: a user choice, never UI chrome
      var n = Math.max(3, Math.round(th / 5)), P = ['4px 0', 'calc(100% - 4px) 0'], i;
      for (i = 1; i <= n; i++) P.push((i % 2 ? 'calc(100% - 0px) ' : 'calc(100% - 4px) ') + f1(i / n * 100) + '%');
      P.push('4px 100%');
      for (i = n - 1; i >= 1; i--) P.push((i % 2 ? '0 ' : '4px ') + f1(i / n * 100) + '%');
      return 'polygon(' + P.join(',') + ')';
    }
    return tornClip('tp' + seed, { size: 'xs', edges: 'lr', amp: 2.6, res: 1.4, nick: 0, fiber: 0, w: len, h: th });
  }
  /**
   * Tape — user-adjustable: pattern (PatternSpec), angle (deg, any direction), length, width, opacity, ends.
   * Decorative presets: color='tape-mustard' | 'tape-celery' | 'tape-pink' | 'tape-apricot' | 'tape-gingham'.
   */
  function Tape(p) {
    var seed = useSeed(p.seed), R = rng('tape' + seed);
    var spec = p.pattern || TAPE_PRESETS[p.color] || TAPE_PRESETS[TAPES[Math.floor(R() * 4)]];
    var len = p.length || p.width || 72, th = p.thickness || p.height || 20;
    var ang = p.angle != null ? p.angle : p.rotate != null ? p.rotate : +((R() * 2 - 1) * 8).toFixed(1);
    return h('span', { className: 'zf-tape', 'aria-hidden': true,
      style: { left: p.x || '50%', top: p.y || '0', width: len, height: th, opacity: p.opacity != null ? p.opacity : 0.82,
        transform: 'translate(-50%,-50%) rotate(' + ang + 'deg)', clipPath: tapeEnds(seed, p.ends || 'torn', len, th) } },
      h(PatternFill, { spec: spec }));
  }

  /* =========================================================
     5. Icons (hand-ish, 1.7 stroke)
     ========================================================= */
  var IC = {
    upload: 'M12 16V5M7.5 9.5 12 5l4.5 4.5M5 15.5v3.2c0 .5.4.9.9.9h12.3c.5 0 .8-.4.8-.9v-3.3',
    download: 'M12 4.5v11M7.5 11 12 15.5l4.5-4.5M5 19.2h14.2',
    undo: 'M8.5 6.5 4.8 10l3.7 3.6M5.2 10H14c3 0 5 2 5 4.6S17 19 14 19h-3',
    redo: 'M15.5 6.5 19.2 10l-3.7 3.6M18.8 10H10c-3 0-5 2-5 4.6S7 19 10 19h3',
    trash: 'M5 7h14.2M9.5 7V5h5v2M7 7.2l.9 12h8.4l.8-12M10.3 10.5v5.6M13.8 10.5v5.6',
    reset: 'M5 12a7 7 0 1 0 2.2-5.1M5 4.5v3.2h3.3',
    check: 'M5 12.6l4.3 4.2L19.2 7',
    x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
    menu: 'M4.5 7.2h15M4.5 12.1h13.2M4.5 17h15.4',
    lasso: 'M12 4.8c4.6 0 8 2.3 8 5.2s-3.4 5.1-8 5.1-8-2.2-8-5.1 3.5-5.2 8-5.2ZM8.6 14.6c-.9 1.6-.4 3.2 1.1 3.9M9.5 18.6l-1.2 1.8',
    turn: 'M18.6 8.2A7 7 0 1 0 19 13.4M19.2 4.4v4.1h-4.1',
    tri: 'M12 5.2 19.6 18.4H4.6Z', rect: 'M5 6.4h14.2v11.4H4.8Z',
    star: 'M12 4.5l2.3 4.8 5.2.6-3.9 3.6 1 5.2L12 16.2l-4.6 2.5 1-5.2-3.9-3.6 5.2-.6Z',
    plus: 'M12 5.5v13M5.5 12h13', minus: 'M5.5 12h13',
    alert: 'M12 4.6 20.2 19H3.9ZM12 10v4.2M12 16.8v.3',
    pencil: 'M15.2 5.3l3.4 3.4-9.9 9.9-4.1.7.7-4.1Z', user: 'M12 12.4a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM5 19.6c.8-3.4 3.6-5 7-5s6.2 1.6 7 5',
    book: 'M5 5.3c2.5-.6 5-.3 7 1.3v12.6c-2-1.5-4.5-1.9-7-1.3ZM19 5.3c-2.5-.6-5-.3-7 1.3v12.6c2-1.5 4.5-1.9 7-1.3Z',
    logout: 'M10 5H5.2v14H10M14 8.5l3.6 3.5-3.6 3.5M17.4 12H9.5', gear: 'M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM12 3.8v2.4M12 17.8v2.4M3.8 12h2.4M17.8 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M6.2 17.8l1.7-1.7M16.1 7.9l1.7-1.7'
  };
  function Icon(p) { return h('svg', { className: 'zf-icon', viewBox: '0 0 24 24', 'aria-hidden': true, style: p.style }, h('path', { d: IC[p.name] })); }

  /* =========================================================
     6. Controls (flat: hover = settle + tone shift, active = press 1px)
     ========================================================= */
  function Button(p) {
    var seed = useSeed(p.seed);
    var size = p.size || 'md';
    var tv = tornVars(seed, { size: size === 'lg' ? 'md' : 'sm', w: size === 'sm' ? 110 : 160, h: 44, edges: 'trbl' });
    var dis = p.disabled || p.loading;
    return h('button', { type: p.type || 'button', className: ['zf-btn zf-torn', p.variant || 'secondary', size, p.state ? 'is-' + p.state : ''].join(' '),
      'aria-disabled': dis ? 'true' : undefined, 'aria-busy': p.loading ? 'true' : undefined, onClick: dis ? undefined : p.onClick, 'aria-label': p.ariaLabel,
      style: Object.assign({ '--rot': p.variant === 'quiet' || dis ? '0deg' : seededRot(seed, 0.8) }, tv) },
      h('span', { className: 'zf-face' },
        p.loading ? h(Loader, { variant: 'typing', label: p.children }) : h(F, null, p.icon && h(Icon, { name: p.icon }), p.children),
        p.variant === 'quiet' && h(Scribble, { seed: seed }))
    );
  }
  function Chip(p) {
    var seed = useSeed(p.seed);
    return h('button', { type: 'button', role: p.role, className: 'zf-chip zf-torn ' + (p.state ? 'is-' + p.state : ''), 'aria-pressed': p.role ? undefined : String(!!p.selected),
      'aria-checked': p.role ? String(!!p.selected) : undefined, 'aria-disabled': p.disabled ? 'true' : undefined, onClick: p.onClick,
      style: Object.assign({ '--rot': seededRot(seed, 0.8) }, tornVars(seed, { size: 'xs', w: 90, h: 34 })) },
      h('span', { className: 'zf-face' },
        p.icon && h(Icon, { name: p.icon }), p.children, p.selected && !p.icon && h(Icon, { name: 'check', style: { width: 14, height: 14 } })));
  }
  function ToggleGroup(p) {
    var st = React.useState(p.value), v = p.controlled ? p.value : st[0], set = st[1];
    return h('div', { className: 'zf-toggle-group', role: 'radiogroup', 'aria-label': p.label },
      p.options.map(function (o) {
        return h(Chip, { key: o.value, seed: (p.seed || p.label) + o.value, role: 'radio', icon: o.icon, selected: v === o.value, onClick: function () { set(o.value); p.onChange && p.onChange(o.value); } }, o.label);
      }));
  }
  function TextField(p) {
    var seed = useSeed(p.seed), id = 'f' + seed;
    var cls = 'zf-field' + (p.error ? ' is-error' : '') + (p.disabled ? ' is-disabled' : '') + (p.state ? ' is-' + p.state : '');
    return h('div', { className: cls },
      h('label', { className: 'zf-field__label', htmlFor: id }, p.label),
      h('div', { className: 'zf-field__box zf-torn', style: Object.assign({ transform: 'rotate(' + seededRot(seed, 0.4) + ')', '--fiber-tone': 'var(--cream-100)' }, tornVars(seed, { size: 'sm', w: 320 })) },
        h('div', { className: 'zf-face' },
          h('input', { id: id, type: p.type || 'text', placeholder: p.placeholder, defaultValue: p.value, disabled: p.disabled, 'aria-invalid': p.error ? 'true' : undefined, 'aria-describedby': (p.hint || p.error) ? id + 'h' : undefined }),
          h(Scribble, { seed: seed, variant: p.error ? 'wave' : null }))),
      (p.error || p.hint) && h('div', { id: id + 'h', className: 'zf-field__hint' }, p.error && h(Icon, { name: 'alert', style: { width: 16, height: 16, color: 'var(--danger-mark)', marginTop: 2 } }), p.error || p.hint));
  }
  function Slider(p) {
    var seed = useSeed(p.seed), min = p.min || 0, max = p.max != null ? p.max : 100, st = React.useState(p.value), v = p.controlled ? p.value : st[0], set = st[1];
    var pct = (v - min) / (max - min) * 100;
    var shown = p.format ? p.format(v) : v + (p.unit || '');
    return h('div', { className: 'zf-slider' + (p.state ? ' is-' + p.state : '') },
      h('div', { className: 'zf-slider__top' }, h('span', null, p.label), h('output', null, shown)),
      h('div', { className: 'zf-slider__track' },
        h('svg', { viewBox: '0 0 200 28', preserveAspectRatio: 'none', 'aria-hidden': true },
          h('path', { d: scribblePath(seed, { w: 200, h: 6 }), transform: 'translate(0 11)', fill: 'none', stroke: 'var(--cocoa-800)', strokeOpacity: .35, strokeWidth: 2, strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' }),
          h('path', { d: scribblePath(seed, { w: 200, h: 6 }), transform: 'translate(0 11)', fill: 'none', stroke: 'var(--olive-500)', strokeWidth: 5, strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke', style: { clipPath: 'inset(-10px ' + (100 - pct) + '% -10px -10px)' } })),
        h('span', { className: 'zf-slider__thumb zf-torn', style: Object.assign({ left: pct + '%' }, tornVars(seed + 't', { size: 'xs', w: 22, h: 26, amp: 1.6, res: 2 })) }, h('span', { className: 'zf-face' })),
        h('input', { type: 'range', min: min, max: max, step: p.step || 1, value: v, 'aria-label': p.label, onChange: function (e) { set(+e.target.value); p.onChange && p.onChange(+e.target.value); }, style: { position: 'absolute', inset: 0, opacity: 0, width: '100%', margin: 0, cursor: 'pointer' } })));
  }
  var BORDER_COLORS = [['sheet-50', 'Paper white'], ['cream-100', 'Cream'], ['blush-100', 'Blush'], ['celery-200', 'Celery'], ['mustard-300', 'Mustard'], ['kraft-100', 'Kraft']];
  var COLOR_NAMES = { 'sheet-50': 'Paper white', 'cream-100': 'Cream', 'peach-100': 'Peach', 'blush-100': 'Blush', 'pink-200': 'Pink', 'celery-200': 'Celery', 'lime-300': 'Lime', 'mustard-300': 'Mustard', 'apricot-300': 'Apricot', 'rose-400': 'Rose', 'olive-500': 'Olive', 'tangerine-400': 'Tangerine', 'brick-600': 'Brick', 'plum-900': 'Plum', 'moss-700': 'Moss', 'cocoa-800': 'Cocoa', 'kraft-100': 'Kraft' };
  function Swatch(p) {
    return h('button', { type: 'button', role: 'radio', className: 'zf-swatch zf-torn', 'aria-checked': String(!!p.selected), 'aria-label': p.label, title: p.label, onClick: p.onClick,
      style: Object.assign({ '--rot': seededRot(p.token, 3) }, tornVars('sw' + p.token, { size: 'xs', w: 32, h: 32, res: 2 })) },
      h('span', { className: 'zf-face', style: { '--tone': hex(p.token) } }));
  }
  function ColorPicker(p) {
    var st = React.useState(p.value || 'sheet-50'), v = p.controlled ? p.value : st[0], set = st[1];
    var list = (p.colors || BORDER_COLORS).map(function (c) { return typeof c === 'string' ? [c, COLOR_NAMES[c] || c] : c; });
    var grid = h('div', { className: 'zf-swatches', role: 'radiogroup', 'aria-label': p.label || 'Border colour', style: p.columns ? { gridTemplateColumns: 'repeat(' + p.columns + ', 28px)', gap: 8 } : null },
      list.map(function (c) { return h(Swatch, { key: c[0], token: c[0], label: c[1], selected: v === c[0], onClick: function () { set(c[0]); p.onChange && p.onChange(c[0]); } }); }));
    if (!p.popover) return grid;
    return h(Paper, { seed: 'cp', size: 'md', tone: 'scrap', rotate: 0.4, inline: true, faceStyle: { padding: '18px 20px 20px' } },
      h('div', { className: 'zf-h2', style: { fontSize: 17, marginBottom: 12 } }, p.label || 'Border colour'), grid);
  }

  /* =========================================================
     6b. PatternEditor — users design tape prints and sticker-edge fills
     ========================================================= */
  var BLANK_PIXELS = ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'];
  var HEART_PIXELS = ['00000000', '01100110', '11111111', '11111111', '01111110', '00111100', '00011000', '00000000'];
  var DOODLE_STROKES = ['M8 30 C14 18 22 18 26 28 S38 38 42 24', 'M10 10 l4 4 M14 10 l-4 4', 'M34 40 a3 3 0 1 0 0.1 0'];
  function PixelGrid(p) {
    return h('div', { className: 'zf-pixels', role: 'group', 'aria-label': 'Pixel pattern, 8 by 8' },
      p.value.map(function (row, y) {
        return row.split('').map(function (c, x) {
          return h('button', { key: y + '-' + x, type: 'button', className: 'zf-pixel', 'aria-pressed': c === '1', 'aria-label': 'Row ' + (y + 1) + ' column ' + (x + 1),
            style: { background: c === '1' ? hex(p.ink) : hex(p.bg) },
            onClick: function () { var rows = p.value.slice(); rows[y] = row.slice(0, x) + (c === '1' ? '0' : '1') + row.slice(x + 1); p.onChange(rows); } });
        });
      }));
  }
  function DoodlePad(p) {
    var ref = React.useRef(null), drawing = React.useRef(null), st = React.useState(null), live = st[0], setLive = st[1];
    function pt(e) { var b = ref.current.getBoundingClientRect(); return [f1((e.clientX - b.left) / b.width * 48), f1((e.clientY - b.top) / b.height * 48)]; }
    function down(e) { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); var q = pt(e); drawing.current = 'M' + q[0] + ' ' + q[1]; setLive(drawing.current); }
    function move(e) { if (!drawing.current) return; var q = pt(e); drawing.current += ' L' + q[0] + ' ' + q[1]; setLive(drawing.current); }
    function up() { if (!drawing.current) return; p.onChange(p.value.concat([drawing.current])); drawing.current = null; setLive(null); }
    var tilePreview = { kind: 'doodle', bg: p.bg, ink: p.ink, scale: 6, weight: p.weight, strokes: p.value.concat(live ? [live] : []) };
    return h('div', { style: { display: 'flex', gap: 12, alignItems: 'start', flexWrap: 'wrap' } },
      h('svg', { ref: ref, className: 'zf-doodle-pad', viewBox: '0 0 48 48', onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerLeave: up, role: 'img', 'aria-label': 'Doodle tile: draw with your finger or mouse', style: { background: hex(p.bg) } },
        h('g', { fill: 'none', stroke: hex(p.ink), strokeWidth: 1.2 + (p.weight || .5) * 3, strokeLinecap: 'round', strokeLinejoin: 'round' },
          p.value.concat(live ? [live] : []).map(function (d, i) { return h('path', { key: i, d: d }); }))),
      h('div', { style: { display: 'grid', gap: 6 } },
        h('div', { className: 'zf-pattern-swatch', style: { width: 96, height: 96 } }, h(PatternFill, { spec: tilePreview })),
        h('div', { style: { display: 'flex', gap: 2 } },
          h(Button, { variant: 'quiet', size: 'sm', icon: 'undo', seed: 'dpu', onClick: function () { p.onChange(p.value.slice(0, -1)); } }, 'Undo'),
          h(Button, { variant: 'quiet', size: 'sm', icon: 'reset', seed: 'dpc', onClick: function () { p.onChange([]); } }, 'Clear'))));
  }
  function PatternEditor(p) {
    var st = React.useState(Object.assign({ kind: 'stripes', bg: 'mustard-300', ink: 'sheet-50', scale: 12, angle: 45, weight: 0.4, pixels: HEART_PIXELS, strokes: DOODLE_STROKES }, p.value)), s = st[0], set = st[1];
    function upd(k, v) { var n = Object.assign({}, s); n[k] = v; set(n); p.onChange && p.onChange(n); }
    var rotates = ['stripes', 'gingham', 'check', 'wave', 'dots', 'pixels', 'doodle'].indexOf(s.kind) > -1;
    return h('div', { className: 'zf-pattern-editor', style: { display: 'grid', gap: 16 } },
      h('div', null, h('div', { className: 'zf-field__label', style: { marginBottom: 8 } }, p.label || 'Pattern'),
        h(ToggleGroup, { label: p.label || 'Pattern', seed: 'pk' + (p.seed || ''), value: s.kind, options: PATTERN_KINDS.filter(function (k) { return !p.kinds || p.kinds.indexOf(k[0]) > -1; }).map(function (k) { return { value: k[0], label: k[1] }; }), onChange: function (v) { upd('kind', v); } })),
      h('div', { style: { display: 'flex', gap: 24, flexWrap: 'wrap' } },
        h('div', null, h('div', { className: 'zf-field__label', style: { marginBottom: 8 } }, s.kind === 'solid' ? 'Colour' : 'Paper'), h(ColorPicker, { label: 'Paper colour', colors: USER_COLORS, columns: 8, value: s.bg, onChange: function (v) { upd('bg', v); } })),
        s.kind !== 'solid' && h('div', null, h('div', { className: 'zf-field__label', style: { marginBottom: 8 } }, 'Ink'), h(ColorPicker, { label: 'Ink colour', colors: USER_COLORS, columns: 8, value: s.ink, onChange: function (v) { upd('ink', v); } }))),
      s.kind !== 'solid' && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 18 } },
        h(Slider, { label: 'Size', value: s.scale, min: 6, max: 28, unit: ' px', seed: 'ps' + (p.seed || ''), onChange: function (v) { upd('scale', v); } }),
        rotates && h(Slider, { label: 'Turn', value: s.angle, min: 0, max: 180, step: 5, unit: '°', seed: 'pa' + (p.seed || ''), onChange: function (v) { upd('angle', v); } }),
        s.kind !== 'check' && s.kind !== 'pixels' && h(Slider, { label: 'Weight', value: Math.round(s.weight * 100), min: 10, max: 90, unit: '%', seed: 'pw' + (p.seed || ''), onChange: function (v) { upd('weight', v / 100); } })),
      s.kind === 'pixels' && h('div', { style: { display: 'flex', gap: 14, alignItems: 'start', flexWrap: 'wrap' } },
        h(PixelGrid, { value: s.pixels, bg: s.bg, ink: s.ink, onChange: function (v) { upd('pixels', v); } }),
        h('div', { style: { display: 'grid', gap: 6 } }, h('div', { className: 'zf-pattern-swatch', style: { width: 96, height: 96 } }, h(PatternFill, { spec: Object.assign({}, s, { scale: 6 }) })),
          h(Button, { variant: 'quiet', size: 'sm', icon: 'reset', seed: 'pxc', onClick: function () { upd('pixels', BLANK_PIXELS); } }, 'Clear'))),
      s.kind === 'doodle' && h(DoodlePad, { value: s.strokes, bg: s.bg, ink: s.ink, weight: s.weight, onChange: function (v) { upd('strokes', v); } }));
  }

  /* =========================================================
     7. Overlays
     ========================================================= */
  function Dialog(p) {
    var seed = useSeed(p.seed);
    var body = h(Paper, { seed: seed, size: 'lg', tone: p.tone || 'scrap', lift: 3, rotate: 0.4, w: p.width || 460, h: 320,
      style: { width: p.width || 460, maxWidth: '100%' }, wrapperProps: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dt' + seed },
      tape: h(F, null, h(Tape, { seed: seed + 'a', x: '18%', y: '2px', color: 'tape-mustard' }), p.tapes !== 1 && h(Tape, { seed: seed + 'b', x: '84%', y: '4px', color: 'tape-pink', width: 60 })),
      faceClass: 'zf-dialog__face' },
      p.onClose !== false && h('button', { className: 'zf-close', 'aria-label': 'Close' }, h(Icon, { name: 'x' })),
      p.kicker && h('div', { className: 'zf-kicker', style: { marginBottom: 6 } }, p.kicker),
      h('h2', { id: 'dt' + seed, className: 'zf-dialog__title' }, p.title),
      p.children,
      p.actions && h('div', { className: 'zf-dialog__actions' }, p.actions));
    if (!p.overlay) return body;
    return h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 16, zIndex: 20 } }, h('div', { className: 'zf-scrim' }), body);
  }
  function Toast(p) {
    var seed = useSeed(p.seed), tone = { success: 'celery-200', error: 'blush-100', info: 'cream-100' }[p.kind || 'info'];
    var icon = { success: 'check', error: 'alert', info: 'book' }[p.kind || 'info'];
    return h(Paper, { seed: seed, size: 'md', tone: tone, lift: 2, rotate: 0.8, inline: true, className: 'zf-toast', w: 320, h: 70,
      wrapperProps: { role: p.kind === 'error' ? 'alert' : 'status' }, tape: h(Tape, { seed: seed, x: '50%', y: '0', width: 54, height: 16, color: 'tape-mustard' }) },
      h(Icon, { name: icon, style: { color: p.kind === 'error' ? 'var(--danger-mark)' : p.kind === 'success' ? 'var(--moss-700)' : 'var(--ink)', marginTop: 2 } }),
      h('div', null, h('b', { style: { color: p.kind === 'error' ? 'var(--danger)' : undefined } }, p.title), p.children),
      p.action);
  }
  function Tooltip(p) {
    return h('span', { style: { display: 'inline-grid', justifyItems: 'center', gap: 6 } },
      h(Paper, { seed: 'tt' + p.label, size: 'xs', lift: 1, inline: true, rotate: 0, className: 'zf-tooltip', wrapperProps: { role: 'tooltip' }, w: 100, h: 28 }, p.label),
      p.children);
  }
  function Avatar(p) {
    var size = p.size || 40, seed = useSeed(p.seed || p.name);
    return h('button', { className: 'zf-avatar zf-torn' + (p.state ? ' is-' + p.state : ''), 'aria-label': 'Account menu for ' + (p.name || 'you'), 'aria-haspopup': 'menu',
      style: Object.assign({ transform: 'rotate(' + seededRot(seed, 3) + ')', '--fiber-tone': 'var(--cream-100)' }, tornVars('av' + seed, { size: 'xs', w: size, h: size, amp: 1.6, res: 2 })) },
      h('span', { className: 'zf-face', style: { '--tone': 'var(--sheet-50)', padding: 3 } },
        h('span', { className: 'zf-avatar__img', style: { width: size - 6, height: size - 6, borderRadius: '50%', fontSize: size * 0.42 } },
          p.src ? h('img', { src: p.src, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } }) : (p.name ? p.name.trim()[0].toUpperCase() : h(Icon, { name: 'user' })))));
  }

  function AvatarMenu(p) {
    var items = [['book', 'My sticker book'], ['gear', 'Profile'], ['logout', 'Log out']];
    var itemClip = tornClip('mi', { size: 'xs', w: 180, h: 36 });
    return h('div', { style: { display: 'inline-grid', justifyItems: 'end', gap: 10 } },
      h(Avatar, { name: p.name, src: p.src, state: 'focus' }),
      h(Paper, { seed: 'menu', size: 'md', tone: 'scrap', lift: 3, rotate: 0.5, inline: true, className: 'zf-menu', wrapperProps: { role: 'menu' }, w: 220, h: 170 },
        h('div', { style: { padding: '6px 10px 8px' } }, h('div', { className: 'zf-h2', style: { fontSize: 17 } }, p.name || 'Mei'), h('div', { className: 'zf-muted' }, p.email || 'mei@example.com')),
        h(Divider, { seed: 'menu' }),
        items.map(function (it, i) { return h('div', { key: it[1], role: 'menuitem', className: 'zf-menu__item' + (i === 0 ? ' is-active' : ''), style: { '--clip-item': itemClip } }, h(Icon, { name: it[0] }), it[1]); })));
  }
  function Loader(p) {
    if (p.variant === 'typing') return h('span', { className: 'zf-typing', role: 'status' }, p.label || 'Loading', h('span', null, '.'), h('span', null, '.'), h('span', null, '.'));
    if (p.variant === 'skeleton') return h(Paper, { seed: p.seed || 'sk', size: 'md', lift: 1, rotate: 1.5, className: 'zf-skeleton', style: { width: p.width || 140 }, faceStyle: { height: p.height || 140 } });
    // tape reel
    return h('span', { role: 'status', style: { display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--ink)' } },
      h('svg', { width: 34, height: 34, viewBox: '0 0 34 34', 'aria-hidden': true },
        h('g', { className: 'zf-reel' },
          h('circle', { cx: 17, cy: 17, r: 14, fill: 'var(--mustard-300)', opacity: .85 }),
          h('circle', { cx: 17, cy: 17, r: 5.5, fill: 'var(--ground)' }),
          h('path', { d: 'M17 3.5c3 .2 6 1.6 8 4', stroke: 'var(--cocoa-800)', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', opacity: .6 }))),
      p.label && h('span', { className: 'zf-typing' }, p.label));
  }
  function EmptyState(p) {
    return h(Paper, { seed: p.seed || 'empty', size: 'lg', tone: p.tone || 'scrap-warm', rotate: 1.2, lift: 2, w: 420, h: 300, style: { maxWidth: p.width || 440, margin: '0 auto' },
      tape: h(Tape, { seed: 'e' + (p.seed || ''), x: '50%', y: '0', color: 'tape-celery', washi: true }), faceStyle: { padding: '36px 28px 28px', textAlign: 'center' } },
      p.art && h('div', { style: { display: 'grid', placeItems: 'center', marginBottom: 14 } }, p.art),
      p.kicker && h('div', { className: 'zf-kicker' }, p.kicker),
      h('h3', { className: 'zf-h2', style: { margin: '6px 0 8px' } }, p.title),
      h('p', { style: { margin: '0 0 20px', fontSize: 15 } }, p.children),
      p.action);
  }

  /* =========================================================
     8. Die-cut sticker (the product's core output)
     dieCut() is the SAME function for the UI and the PNG export.
     Users choose: edge shape (smooth | wobbly | torn), width, and fill
     (a colour or any PatternSpec they designed). No shadow, ever.
     ========================================================= */
  // Edge width is a FRACTION of the sticker's long side (no px clamp), so a 300px preview and a 3000px export look identical.
  var EDGE_RATIO = 0.045, PATTERN_REF = 300;   // PatternSpec.scale is in px at a 300px long side
  function stickerBorder(size, scale) { return Math.round(size * EDGE_RATIO * (scale == null ? 1 : scale)); }
  var EDGE_SHAPES = [['smooth', 'Smooth'], ['wobbly', 'Wobbly'], ['torn', 'Torn']];
  function edgeRadius(shape, seed, bw) {
    var R = rng('die' + seed);
    if (shape === 'smooth') { var s1 = vnoise(R, 5, true); return function (a) { return { r: bw * (0.94 + 0.12 * s1(a)), f: 0 }; }; }
    if (shape === 'torn') {
      var n1 = vnoise(R, 4 + Math.floor(R() * 4), true), n2 = vnoise(R, 23 + Math.floor(R() * 10), true), n3 = vnoise(R, 150, true), rough = vnoise(R, 7, true), fb = vnoise(R, 41, true);
      var bites = [], nb = 1 + Math.floor(R() * 3);
      for (var i = 0; i < nb; i++) bites.push({ a: R(), w: 0.012 + R() * 0.03, lead: 0.2 + R() * 0.6 });
      var grit = []; for (var g = 0; g < 1440; g++) grit.push(R());
      return function (a) {
        var rr = 0.35 + 0.9 * rough(a);                                   // ragged in places, calmer in others
        var r = bw * (0.45 + 0.6 * n1(a) + 0.4 * n2(a) + rr * (0.55 * n3(a) + 0.35 * grit[Math.floor(a * 1439)]) - 0.2);
        bites.forEach(function (b) { var x = (a - b.a) / b.w; if (x > -b.lead && x < 1 - b.lead) { var u = x < 0 ? 1 + x / b.lead : 1 - x / (1 - b.lead); r -= bw * 0.8 * Math.pow(u, .6); } });
        return { r: Math.max(bw * 0.15, r), f: bw * 0.4 * Math.max(0.1, fb(a) * 1.6 - 0.3) };
      };
    }
    var l1 = R() * 6.28, l2 = R() * 6.28, l3 = R() * 6.28;              // wobbly
    return function (a) { var t = a * 6.283; return { r: bw * (1 + 0.28 * (0.55 * Math.sin(3 * t + l1) + 0.3 * Math.sin(5 * t + l2) + 0.15 * Math.sin(9 * t + l3))), f: 0 }; };
  }
  function dieCutPad(bw) { return Math.ceil(bw * 1.9 + 2); }
  /**
   * dieCut(source, opts) → HTMLCanvasElement: transparent, border baked in, no shadow.
   * opts: { shape: 'smooth'|'wobbly'|'torn', border: px, color: css colour, fill: CanvasImageSource (pattern image sized to the output) | null,
   *         fiber: css colour of the torn lip (torn only), seed }
   */
  function dieCut(src, opts) {
    opts = opts || {};
    var W = src.width, H = src.height, bw = opts.border != null ? opts.border : stickerBorder(Math.max(W, H)), shape = opts.shape || 'wobbly';
    var pad = dieCutPad(bw), out = document.createElement('canvas'); out.width = W + pad * 2; out.height = H + pad * 2;
    var ctx = out.getContext('2d');
    if (bw > 0) {
      var sil = document.createElement('canvas'); sil.width = W; sil.height = H;
      var s = sil.getContext('2d'); s.drawImage(src, 0, 0, W, H); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#000'; s.fillRect(0, 0, W, H);
      var rad = edgeRadius(shape, opts.seed || '', bw), N = shape === 'torn' ? 720 : Math.max(36, Math.round(bw * 4));
      var stamp = function (withFiber) {
        var c = document.createElement('canvas'); c.width = out.width; c.height = out.height; var g = c.getContext('2d');
        for (var ring = 1; ring <= 3; ring++) for (var i = 0; i < N; i++) {
          var a = i / N, e = rad(a), r = (e.r + (withFiber ? e.f : 0)) * ring / 3;
          g.drawImage(sil, pad + Math.cos(a * 6.283) * r, pad + Math.sin(a * 6.283) * r);
        }
        g.drawImage(sil, pad, pad); return c;
      };
      var paint = function (c, color, img) { var g = c.getContext('2d'); g.globalCompositeOperation = 'source-in'; if (img) g.drawImage(img, 0, 0, c.width, c.height); else { g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); } return c; };
      if (shape === 'torn') ctx.drawImage(paint(stamp(true), opts.fiber || '#fbf6ee'), 0, 0);
      ctx.drawImage(paint(stamp(false), opts.color || '#fbf6ee', opts.fill), 0, 0);
    }
    ctx.drawImage(src, pad, pad, W, H);
    return out;
  }
  var ART = {
    pear: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 22c8 0 11 9 12 18 2 13 22 22 22 46 0 20-16 30-34 30S16 106 16 86c0-24 20-33 22-46 1-9 4-18 12-18Z" fill="#b4bc2f"/><path d="M38 60c-6 8-12 14-12 26" stroke="#dce35d" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M50 22c0-8 2-13 5-16" stroke="#6c4a3b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M55 12c8-8 20-6 24-2-8 8-18 7-24 2Z" fill="#57620d"/></svg>',
    cherry: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110"><path d="M32 72c6-20 16-44 40-62M80 74c-2-24-4-46-8-64" stroke="#57620d" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M72 10c10 0 22 6 24 16-12 2-22-4-24-16Z" fill="#b4bc2f"/><circle cx="30" cy="80" r="21" fill="#c32768"/><circle cx="80" cy="82" r="20" fill="#da3b84"/><path d="M20 72c3-4 7-6 11-6M71 74c3-4 6-5 10-5" stroke="#f4ddea" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    cup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100"><path d="M18 30h70l-6 46c-1 10-9 16-19 16H43c-10 0-18-6-19-16Z" fill="#f1a17a"/><path d="M86 40c14-4 22 4 20 13-2 10-12 14-24 12" stroke="#e57c48" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M26 48h60" stroke="#ffe4c5" stroke-width="6"/><path d="M40 22c-4-6 4-10 0-16M56 22c-4-6 4-10 0-16" stroke="#6c4a3b" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/></svg>',
    star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110"><path d="M55 8l13 30 32 3-24 21 7 32-28-17-28 17 7-32L10 41l32-3Z" fill="#edcd7e"/><path d="M55 30l6 14 15 2" stroke="#ffe4c5" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    fish: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 80"><path d="M10 40c20-30 64-34 86 0-22 34-66 30-86 0Z" fill="#efb6d5"/><path d="M94 40l28-22-6 22 6 22Z" fill="#e374a7"/><circle cx="32" cy="36" r="4" fill="#7a0e4d"/><path d="M50 24c6 10 6 22 0 32M64 24c6 10 6 22 0 32" stroke="#f4ddea" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    leaf: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 8c30 20 36 60 6 96C20 80 18 36 50 8Z" fill="#57620d"/><path d="M52 112V30M52 52l14-12M52 70l-14-12M52 86l12-10" stroke="#dce35d" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>'
  };
  function loadImg(src, cb) { var i = new Image(); i.onload = function () { cb(i); }; i.src = src; }
  /**
   * Sticker props: src | art, size, edge: { shape, scale, fill: PatternSpec }, seed, rotate, label.
   * Legacy: borderColor (token) and borderScale still work.
   */
  function Sticker(p) {
    var ref = React.useRef(null), size = p.size || 120, seed = p.seed || p.art || 'pear';
    var edge = Object.assign({ shape: 'wobbly', scale: p.borderScale != null ? p.borderScale : 1, fill: { kind: 'solid', bg: p.borderColor || 'sheet-50' } }, p.edge);
    var key = JSON.stringify(edge);
    React.useEffect(function () {
      var cv = ref.current; if (!cv) return; var dpr = Math.min(2, window.devicePixelRatio || 1), alive = true;
      loadImg(p.src || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ART[p.art || 'pear']), function (img) {
        var k = size * dpr / Math.max(img.width || 100, img.height || 100);
        var src = document.createElement('canvas'); src.width = Math.round((img.width || 100) * k); src.height = Math.round((img.height || 100) * k);
        src.getContext('2d').drawImage(img, 0, 0, src.width, src.height);
        var bw = stickerBorder(size, edge.scale) * dpr, pad = dieCutPad(bw), fill = edge.fill || { kind: 'solid', bg: 'sheet-50' };
        function done(fillImg) {
          if (!alive) return;
          var out = dieCut(src, { shape: edge.shape, border: bw, color: hex(fill.bg), fill: fillImg, seed: seed, fiber: fill.bg === 'sheet-50' ? '#e8ddd0' : '#fbf6ee' });
          cv.width = out.width; cv.height = out.height; cv.style.width = out.width / dpr + 'px'; cv.style.height = out.height / dpr + 'px';
          cv.getContext('2d').drawImage(out, 0, 0);
        }
        if (fill.kind && fill.kind !== 'solid') loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(patternSVG(fill, src.width + pad * 2, src.height + pad * 2, Math.max(src.width, src.height) / PATTERN_REF)), done);
        else done(null);
      });
      return function () { alive = false; };
    }, [p.src, p.art, size, key]);
    return h('span', { className: 'zf-sticker', style: { '--rot': p.rotate === 0 ? '0deg' : seededRot(seed, p.rotate || 4) } }, h('canvas', { ref: ref, role: 'img', 'aria-label': p.label || 'Sticker' }));
  }


  /* =========================================================
     8b. Studios — where users customise tape and sticker edges
     ========================================================= */
  var DEFAULT_TAPES = [
    { name: 'Pink dots', pattern: TAPE_PRESETS['tape-pink'], thickness: 20, opacity: 0.82, ends: 'torn' },
    { name: 'Lime stripe', pattern: TAPE_PRESETS['tape-celery'], thickness: 18, opacity: 0.85, ends: 'torn' },
    { name: 'Picnic', pattern: TAPE_PRESETS['tape-gingham'], thickness: 22, opacity: 0.9, ends: 'pinked' },
    { name: 'Masking', pattern: TAPE_PRESETS['tape-mustard'], thickness: 20, opacity: 0.78, ends: 'torn' }
  ];
  function Field(p) { return h('div', { style: p.style }, h('div', { className: 'zf-field__label', style: { marginBottom: 8 } }, p.label), p.children); }
  function TapeStudio(p) {
    var a = React.useState(p.angle != null ? p.angle : -14), angle = a[0], setAngle = a[1];
    var sp = React.useState(p.pattern || { kind: 'pixels', bg: 'blush-100', ink: 'rose-400', scale: 10, angle: 0, weight: .4, pixels: HEART_PIXELS }), spec = sp[0], setSpec = sp[1];
    var l = React.useState(130), len = l[0], setLen = l[1];
    var t = React.useState(22), thick = t[0], setThick = t[1];
    var o = React.useState(82), op = o[0], setOp = o[1];
    var e = React.useState('torn'), ends = e[0], setEnds = e[1];
    var sv = React.useState(DEFAULT_TAPES), saved = sv[0], setSaved = sv[1];
    var stageRef = React.useRef(null), drag = React.useRef(false);
    var rad = angle * Math.PI / 180, hx = Math.cos(rad) * (len / 2 + 14), hy = Math.sin(rad) * (len / 2 + 14);
    function turn(ev) {
      if (!drag.current) return; var b = stageRef.current.getBoundingClientRect();
      var dx = ev.clientX - (b.left + b.width / 2), dy = ev.clientY - (b.top + 70), d = Math.atan2(dy, dx) * 180 / Math.PI;
      if (d > 90) d -= 180; if (d < -90) d += 180; setAngle(Math.round(d));
    }
    return h('div', { className: 'zf-studio' },
      h('div', { style: { display: 'grid', gap: 24, alignContent: 'start', minWidth: 0 } },
      h('div', { className: 'zf-studio__stage zf-ground', ref: stageRef, onPointerMove: turn, onPointerUp: function () { drag.current = false; } },
        h(Paper, { seed: 'ts-scrap', size: 'md', tone: 'scrap-warm', rotate: 1.4, style: { width: '64%', margin: '70px auto 0' }, faceStyle: { height: 170, padding: '34px 22px 22px' } },
          h('div', { className: 'zf-kicker' }, 'No. 03 · Tape'), h('div', { className: 'zf-h2', style: { marginTop: 6 } }, 'Holding a page down')),
        h('div', { style: { position: 'absolute', left: '50%', top: 70 } },
          h(Tape, { pattern: spec, angle: angle, length: len, thickness: thick, opacity: op / 100, ends: ends, x: '0', y: '0', seed: 'ts' + ends }),
          h('button', { type: 'button', className: 'zf-turn-handle', 'aria-label': 'Turn tape, now ' + angle + ' degrees',
            style: { left: hx, top: hy }, onPointerDown: function (ev) { ev.preventDefault(); drag.current = true; stageRef.current.setPointerCapture && stageRef.current.setPointerCapture(ev.pointerId); },
            onKeyDown: function (ev) { if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') setAngle(Math.max(-90, angle - 5)); if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') setAngle(Math.min(90, angle + 5)); } },
            h(Icon, { name: 'turn' })))),
      h('div', null,
        h('div', { className: 'zf-kicker', style: { marginBottom: 10 } }, 'My tape roll · ' + saved.length),
        h('div', { className: 'zf-roll' }, saved.map(function (tp, i) {
          return h('button', { key: i + tp.name, type: 'button', className: 'zf-roll__item', 'aria-label': 'Use ' + tp.name, onClick: function () { setSpec(tp.pattern); setThick(tp.thickness); setOp(Math.round(tp.opacity * 100)); setEnds(tp.ends); } },
            h('span', { style: { position: 'relative', display: 'block', height: 34 } }, h(Tape, { pattern: tp.pattern, angle: -6 + (i % 3) * 5, length: 86, thickness: tp.thickness * 0.8, opacity: tp.opacity, ends: tp.ends, x: '50%', y: '17px', seed: 'roll' + i })),
            h('span', { className: 'zf-tile__meta' }, tp.name));
        })))),
      h('div', { className: 'zf-studio__controls' },
        h(Field, { label: 'Direction · ' + angle + '°' },
          h('div', { className: 'zf-toggle-group' }, [-45, -15, 0, 15, 45, 90].map(function (d) { return h(Chip, { key: d, seed: 'dir' + d, selected: angle === d, onClick: function () { setAngle(d); } }, h('span', { style: { display: 'inline-block', width: 18, height: 3, background: 'currentColor', transform: 'rotate(' + d + 'deg)', borderRadius: 2 }, 'aria-hidden': true }), (d > 0 ? '+' : '') + d + '°'); }))),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 18 } },
          h(Slider, { label: 'Length', value: len, min: 40, max: 220, unit: ' px', seed: 'tl', onChange: setLen }),
          h(Slider, { label: 'Width', value: thick, min: 12, max: 36, unit: ' px', seed: 'tw', onChange: setThick }),
          h(Slider, { label: 'See-through', value: 100 - op, min: 0, max: 50, unit: '%', seed: 'to', onChange: function (v) { setOp(100 - v); } })),
        h(Field, { label: 'Ends' }, h(ToggleGroup, { label: 'Tape ends', seed: 'te', value: ends, options: [{ value: 'torn', label: 'Torn' }, { value: 'cut', label: 'Cut' }, { value: 'pinked', label: 'Pinked' }], onChange: setEnds })),
        h(PatternEditor, { label: 'Print', seed: 'tp', value: spec, onChange: setSpec }),
        h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
          h(Button, { variant: 'primary', icon: 'plus', seed: 'tsave', onClick: function () { setSaved([{ name: 'My tape ' + (saved.length - 3), pattern: spec, thickness: thick, opacity: op / 100, ends: ends }].concat(saved)); } }, 'Add to my tape roll'))));
  }
  function StickerEdgeStudio(p) {
    var s = React.useState(p.shape || 'torn'), shape = s[0], setShape = s[1];
    var w = React.useState(p.scale != null ? p.scale * 100 : 100), sc = w[0], setSc = w[1];
    var f = React.useState(p.fill || { kind: 'solid', bg: 'sheet-50', ink: 'brick-600', scale: 8, angle: 45, weight: .35 }), fill = f[0], setFill = f[1];
    var size = p.size || 170;
    return h('div', { className: 'zf-studio' },
      h('div', { className: 'zf-studio__stage zf-ground', style: { display: 'grid', placeItems: 'center' } },
        h(Sticker, { art: p.art || 'pear', size: size, rotate: 0, seed: 'studio', edge: { shape: shape, scale: sc / 100, fill: fill } })),
      h('div', { className: 'zf-studio__controls' },
        h(Field, { label: 'Edge shape' }, h(ToggleGroup, { label: 'Edge shape', seed: 'es', value: shape, options: EDGE_SHAPES.map(function (e) { return { value: e[0], label: e[1] }; }), onChange: setShape })),
        h(Slider, { label: 'Edge width', value: sc, min: 0, max: 160, step: 10, seed: 'ew', onChange: setSc, format: function (v) { return v === 0 ? 'none' : stickerBorder(size, v / 100) + ' px'; } }),
        h(PatternEditor, { label: 'Edge fill', seed: 'ef', value: fill, onChange: setFill }),
        !p.hideActions && h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
          h(Button, { variant: 'secondary', icon: 'book', seed: 'ess' }, 'Save to book'), h(Button, { variant: 'primary', icon: 'download', seed: 'esd' }, 'Download PNG'))));
  }

  /* =========================================================
     8c. CJK pairing specimen — candidates load live from CDNs
     ========================================================= */
  var CJK_CANDIDATES = [
    { name: 'Xiaolai Mono SC · 小赖字体 等宽', family: '"Xiaolai Mono SC", "Xiaolai SC"', css: 'https://cdn.jsdelivr.net/npm/cn-fontsource-xiaolai-mono-sc-regular/font.css', pick: 'Default', note: 'Monospaced, like Courier Prime. Loose, slightly clumsy hand-written strokes (from Seto Font). OFL, 20k+ characters.' },
    { name: 'LXGW Marker Gothic · 霞鹜漫黑', family: '"LXGW Marker Gothic"', css: 'https://cdn.jsdelivr.net/npm/@fontsource/lxgw-marker-gothic/index.css', pick: 'Alt for headings', note: 'Felt-marker gothic: playful, chunky, very readable. Pairs with Special Elite labels at the same size. OFL, 13k characters.' },
    { name: 'LXGW WenKai · 霞鹜文楷', family: '"LXGW WenKai"', css: 'https://cdn.jsdelivr.net/npm/@fontsource/lxgw-wenkai/index.css', pick: 'Calmer option', note: 'Semi-handwritten kai. Gentler than the two above; closest to "journal" rather than "typewriter". OFL.' }
  ];
  function CJKSpecimen() {
    var st = React.useState({}), ok = st[0], setOk = st[1];
    React.useEffect(function () {
      CJK_CANDIDATES.forEach(function (c) {
        if (!document.querySelector('link[href="' + c.css + '"]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = c.css; document.head.appendChild(l); }
      });
      var tries = 0, iv = setInterval(function () {
        Promise.all(CJK_CANDIDATES.map(function (c) { return document.fonts.load('20px ' + c.family, '剪下来贴纸').catch(function () {}); })).then(function () {
          var r = {}, faces = []; document.fonts.forEach(function (f) { faces.push(f); });
          CJK_CANDIDATES.forEach(function (c) {
            var fam = c.family.split(',')[0].replace(/["']/g, '').trim();
            r[c.name] = faces.some(function (f) { return f.family.replace(/["']/g, '') === fam && f.status === 'loaded'; });
          });
          setOk(r);
        });
        if (++tries > 6) clearInterval(iv);
      }, 900);
      return function () { clearInterval(iv); };
    }, []);
    return h('div', { style: { display: 'grid', gap: 18 } },
      CJK_CANDIDATES.map(function (c, i) {
        return h(Paper, { key: c.name, seed: 'cjk' + i, size: 'md', tone: i === 0 ? 'scrap' : 'sheet-50', rotate: 0.4, faceStyle: { padding: '18px 22px 20px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' } },
            h('div', { className: 'zf-kicker' }, c.pick + ' · ' + c.name),
            h('span', { className: 'zf-tile__meta' }, ok[c.name] === undefined ? 'loading…' : ok[c.name] ? 'loaded' : 'not loaded here: fallback shown')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '6px 28px', marginTop: 10 } },
            h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink-deep)', lineHeight: 1.2 } }, 'Cut it out ', h('span', { style: { fontFamily: c.family } }, '剪下来')),
            h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink-deep)', alignSelf: 'center' } }, 'Download PNG · ', h('span', { style: { fontFamily: c.family } }, '下载 PNG · 我的贴纸本')),
            h('div', { style: { fontFamily: 'var(--font-body)', fontSize: 15 } }, 'Draw around the part you want to keep.'),
            h('div', { style: { fontFamily: c.family, fontSize: 15, lineHeight: 1.75 } }, '把喜欢的部分圈出来，剪成贴纸，贴进你的手账本。')),
          h('p', { className: 'zf-muted', style: { margin: '10px 0 0' } }, c.note));
      }));
  }

  function StickerTile(p) {
    return h('figure', { className: 'zf-tile', style: { margin: 0 } },
      h('div', { style: { height: (p.size || 110) + 34, display: 'grid', placeItems: 'center', position: 'relative' } },
        p.tape && h(Tape, { seed: 'st' + p.name, x: '50%', y: '10px', width: 50, height: 16 }),
        h(Sticker, { art: p.art, size: p.size || 110, seed: p.name, borderColor: p.borderColor })),
      p.renaming ? h('div', { style: { width: '100%', maxWidth: 170 } }, h(TextField, { label: 'Name', value: p.name, state: 'focus', seed: 'rn' }))
        : h('figcaption', null, h('div', { className: 'zf-tile__name' }, p.name), h('div', { className: 'zf-tile__meta' }, p.meta || 'Cut 2 Oct')),
      p.actions && h('div', { style: { display: 'flex', gap: 2 } },
        h(Button, { variant: 'quiet', size: 'sm', icon: 'pencil', seed: 'rn' + p.name }, 'Rename'),
        h(Button, { variant: 'quiet', size: 'sm', icon: 'trash', seed: 'dl' + p.name }, 'Delete')));
  }

  /* =========================================================
     9. Lasso canvas (marching ants over an arbitrary photo)
     ========================================================= */
  var PHOTO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#57620d"/><rect y="170" width="400" height="130" fill="#6c4a3b"/><rect x="0" y="0" width="140" height="170" fill="#41470e"/><rect x="300" y="20" width="90" height="120" fill="#f1e9bf"/><rect x="310" y="30" width="70" height="100" fill="#e57c48"/><ellipse cx="200" cy="232" rx="120" ry="26" fill="#fbf6ee"/><path d="M200 78c10 0 14 10 15 21 2 15 26 26 26 54 0 24-19 36-41 36s-41-12-41-36c0-28 24-39 26-54 1-11 5-21 15-21Z" fill="#b4bc2f"/><path d="M186 120c-7 10-14 17-14 32" stroke="#dce35d" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M200 78c0-9 3-15 6-19" stroke="#41470e" stroke-width="4" fill="none"/><rect x="40" y="200" width="70" height="60" fill="#c32768" opacity=".8"/><rect x="290" y="210" width="80" height="40" fill="#ecefbc"/></svg>';
  function LassoCanvas(p) {
    var mode = p.mode || 'select';
    var path = 'M200 60 C232 58 236 98 248 112 C276 140 274 196 238 210 C206 222 176 220 156 204 C126 180 136 140 158 118 C170 104 168 62 200 60 Z';
    var shapePaths = { rect: 'M120 80 L300 84 L296 222 L118 218 Z', triangle: 'M200 60 L300 222 L100 222 Z', star: 'M200 52 L222 112 L286 114 L236 152 L254 214 L200 178 L146 214 L164 152 L114 114 L178 112 Z' };
    var d = shapePaths[p.shape] || path;
    return h(Paper, { seed: 'well', size: 'md', className: 'zf-well', rotate: 0, lift: 1, w: 600, h: 440, style: p.style },
      h('div', { style: { position: 'relative', aspectRatio: '4/3', background: 'var(--field)', overflow: 'hidden', borderRadius: 2 } },
        p.empty ? h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 16 } },
          h('div', null,
            h('svg', { width: '100%', height: '100%', viewBox: '0 0 100 75', preserveAspectRatio: 'none', style: { position: 'absolute', inset: 12, width: 'calc(100% - 24px)', height: 'calc(100% - 24px)' }, 'aria-hidden': true },
              h('rect', { x: 1, y: 1, width: 98, height: 73, fill: 'none', stroke: 'var(--cocoa-800)', strokeOpacity: .45, strokeWidth: 1.4, strokeDasharray: '6 4 2 5 8 4', vectorEffect: 'non-scaling-stroke' })),
            h(Icon, { name: 'upload', style: { width: 34, height: 34, color: 'var(--ink)' } }),
            h('div', { className: 'zf-h2', style: { margin: '8px 0 4px' } }, 'Drop a photo here'),
            h('div', { className: 'zf-muted', style: { marginBottom: 14 } }, 'PNG, JPG or HEIC, up to 20 MB'),
            h(Button, { variant: 'secondary', icon: 'upload', seed: 'pick' }, 'Choose a photo')))
        : p.loading ? h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--sage-100)' } }, h(Loader, { label: p.loading }))
        : h('svg', { viewBox: '0 0 400 300', style: { position: 'absolute', inset: 0, width: '100%', height: '100%' }, role: 'img', 'aria-label': 'Photo with selection' },
          h('image', { href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PHOTO), width: 400, height: 300, preserveAspectRatio: 'xMidYMid slice' }),
          h('path', { d: 'M0 0H400V300H0Z ' + d, fill: 'rgba(65,71,14,.38)', fillRule: 'evenodd' }),
          h('path', { className: 'zf-ants halo', d: d }),
          h('path', { className: 'zf-ants a', d: d }),
          h('path', { className: 'zf-ants b' + (mode === 'deselect' ? ' deselect' : ''), d: d }),
          h('circle', { cx: 200, cy: 60, r: 4.5, fill: 'var(--sheet-50)', stroke: 'var(--loden-900)', strokeWidth: 2 }))));
  }

  /* =========================================================
     10. Masthead
     ========================================================= */
  function Wordmark(p) { return h('a', { className: 'zf-wordmark', href: '#', 'aria-label': 'Zoofus home', style: p.style }, 'Zoofus'); }
  function Masthead(p) {
    var links = [['make', 'Make a sticker'], ['book', 'Sticker book']];
    return h('header', { className: 'zf-masthead' },
      h(Paper, { seed: 'mast', size: 'xl', edges: 'b', flush: true, tone: 'peach-100', rotate: 0, lift: 2, w: 1280, h: 80, measure: true },
        h('div', { className: 'zf-masthead__row' },
          h(Wordmark),
          p.signedOut ? h('div', { className: 'zf-nav', style: { display: 'flex' } }, h(Button, { variant: 'quiet', seed: 'li' }, 'Log in'), h(Button, { variant: 'primary', size: 'sm', seed: 'su' }, 'Sign up'))
            : h(F, null,
              h('nav', { className: 'zf-nav', 'aria-label': 'Main' },
                links.map(function (l) { var cur = p.current === l[0]; return h('a', { key: l[0], href: '#', 'aria-current': cur ? 'page' : undefined }, l[1], cur && h(Scribble, { seed: 'nav' + l[0], weight: 2 })); }),
                h('span', { style: { width: 8 } }),
                h(Avatar, { name: p.name || 'Mei', src: p.avatar })),
              h('span', { className: 'zf-menu-btn' }, h(Button, { variant: 'quiet', icon: 'menu', seed: 'mb' }, h('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, 'Menu')))))),
      p.menuOpen && h('div', { style: { position: 'absolute', right: 12, top: 62, zIndex: 10 } },
        h(Paper, { seed: 'mm', size: 'md', tone: 'scrap', lift: 3, rotate: 0.6, className: 'zf-menu', w: 220, h: 200, style: { width: 230 } },
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', padding: '6px 8px' } }, h(Avatar, { name: 'Mei', size: 34 }), h('div', null, h('div', { className: 'zf-h2', style: { fontSize: 16 } }, 'Mei'), h('div', { className: 'zf-muted', style: { fontSize: 12 } }, 'mei@example.com'))),
          h(Divider, { seed: 'mm' }),
          [['lasso', 'Make a sticker'], ['book', 'Sticker book'], ['gear', 'Profile'], ['logout', 'Log out']].map(function (it, i) { return h('div', { key: it[1], className: 'zf-menu__item' + (i === 1 ? ' is-active' : ''), style: { '--clip-item': tornClip('mmi', { size: 'xs', w: 200, h: 36 }) } }, h(Icon, { name: it[0] }), it[1]); }))));
  }

  /* =========================================================
     11. Page layouts (container queries switch at 760px)
     ========================================================= */
  function Frame(p) {
    return h('div', { style: { display: 'grid', gap: 8, alignContent: 'start' } },
      h('div', { className: 'zf-kicker' }, p.label + ' · ' + p.width + 'px'),
      h('div', { className: 'zf-frame zf-ground zf-root', style: { width: p.width, height: p.height || 820, boxShadow: '0 0 0 1px rgba(108,74,59,.18)' } }, p.children));
  }
  function Collage(p) {
    var arts = p.arts || ['pear', 'cherry', 'cup', 'star', 'fish', 'leaf'];
    return h('div', { style: { position: 'relative', display: 'flex', flexWrap: 'wrap', gap: p.gap || 18, justifyContent: 'center', alignItems: 'center' } },
      arts.map(function (a, i) { return h(Sticker, { key: a, art: a, size: p.size || 92, seed: a + i }); }));
  }
  function AuthPage(p) {
    var mode = p.mode || 'login', signup = mode !== 'login';
    var form;
    if (mode === 'signup2') {
      form = h(F, null,
        h('div', { className: 'zf-kicker' }, 'Sign up · step 2 of 2'),
        h('h1', { className: 'zf-h1', style: { margin: '6px 0 18px' } }, 'Make it yours'),
        h('div', { style: { display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 } },
          h(Avatar, { size: 72, name: '' }),
          h('div', { style: { display: 'grid', gap: 4 } }, h(Button, { variant: 'secondary', size: 'sm', icon: 'upload', seed: 'ph' }, 'Add a photo'), h('span', { className: 'zf-muted' }, 'Optional. You can change it later.'))),
        h('div', { style: { display: 'grid', gap: 16 } }, h(TextField, { label: 'Nickname · 昵称', placeholder: 'What should we call you?', value: 'Mei', seed: 'nn', hint: 'Shown on your sticker book.' })),
        h('div', { style: { display: 'flex', gap: 10, marginTop: 22, alignItems: 'center', flexWrap: 'wrap' } }, h(Button, { variant: 'primary', seed: 'go' }, 'Start cutting'), h(Button, { variant: 'quiet', seed: 'bk' }, 'Back')));
    } else {
      form = h(F, null,
        h('div', { className: 'zf-kicker' }, signup ? 'Sign up · step 1 of 2' : 'Welcome back'),
        h('h1', { className: 'zf-h1', style: { margin: '6px 0 18px' } }, signup ? 'Make an account' : 'Log in'),
        p.error && h('div', { style: { marginBottom: 16 } }, h(Toast, { kind: 'error', title: 'That didn’t work', seed: 'ae' }, 'Email or password is wrong. Try again or reset your password.')),
        h('div', { style: { display: 'grid', gap: 16 } },
          h(TextField, { label: 'Email', type: 'email', value: 'mei@example.com', seed: 'em', error: p.error ? null : null }),
          h(TextField, { label: 'Password', type: 'password', value: p.error ? 'hunter22' : '', placeholder: signup ? 'At least 8 characters' : '', seed: 'pw', error: p.error ? 'Password doesn’t match this email.' : null, hint: signup ? 'At least 8 characters.' : null })),
        h('div', { style: { display: 'flex', gap: 10, marginTop: 22, alignItems: 'center', flexWrap: 'wrap' } },
          h(Button, { variant: 'primary', loading: p.loading, seed: 'sub' }, p.loading ? (signup ? 'Creating' : 'Logging in') : (signup ? 'Continue' : 'Log in')),
          !signup && h(Button, { variant: 'quiet', seed: 'fg' }, 'Forgot password?')),
        h(Divider, { seed: 'auth' }),
        h('p', { style: { margin: 0, fontSize: 15 } }, signup ? 'Already have an account? ' : 'New here? ', h('a', { href: '#', style: { color: 'var(--ink-deep)', fontFamily: 'var(--font-display)' } }, signup ? 'Log in' : 'Sign up')));
    }
    return h(F, null,
      h(Masthead, { signedOut: true }),
      h('main', { className: 'zf-page', style: { display: 'flex', gap: 56, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' } },
        h('div', { className: 'zf-hide-m', style: { width: 420 } }, h(Collage, { size: 104, gap: 22 })),
        h('div', { className: 'zf-hide-d', style: { width: '100%', marginBottom: -8 } }, h(Collage, { arts: ['pear', 'cherry', 'star'], size: 64, gap: 10 })),
        h(Paper, { seed: 'authcard' + mode, size: 'lg', tone: 'scrap', rotate: 0.4, lift: 3, w: 440, h: 460, style: { width: 440, maxWidth: '100%' },
          tape: h(Tape, { seed: 'at', x: '50%', y: '2px', color: 'tape-pink', washi: true }), faceStyle: { padding: '30px 26px 26px' } }, form)),
      p.reset && h(ResetDialog));
  }
  function ResetDialog(p) {
    return h(Dialog, { overlay: true, seed: 'reset', title: 'Reset your password', width: 420, kicker: 'Forgot it?',
      actions: h(F, null, h(Button, { variant: 'quiet', seed: 'rc' }, 'Cancel'), h(Button, { variant: 'primary', seed: 'rs' }, 'Send link')) },
      h('p', { className: 'zf-dialog__body' }, 'We’ll email you a link. It works for 30 minutes.'),
      h('div', { style: { marginBottom: 20 } }, h(TextField, { label: 'Email', value: 'mei@example.com', seed: 'rem', state: 'focus' })));
  }
  function SectionHead(p) {
    return h('div', { style: { display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' } },
      h('div', null, h('div', { className: 'zf-kicker' }, p.kicker), h('h2', { className: p.big ? 'zf-h-display' : 'zf-h1', style: { marginTop: 4 } }, p.title)), p.action);
  }
  function HomePage(p) {
    var recent = [['pear', 'Pear from the market'], ['cherry', 'Cherries'], ['cup', 'Morning cup'], ['star', 'Gold star'], ['fish', 'Koi']];
    return h(F, null,
      h(Masthead, { current: 'make', menuOpen: p.menuOpen }),
      h('main', { className: 'zf-page' },
        h('div', { style: { display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' } },
          h(Paper, { seed: 'hero', size: 'lg', tone: 'scrap', rotate: 0.6, lift: 2, w: 640, h: 300, style: { flex: '1 1 320px', maxWidth: 660 },
            tape: h(F, null, h(Tape, { seed: 'h1', x: '10%', y: '8px', rotate: -14, color: 'tape-mustard' }), h(Tape, { seed: 'h2', x: '92%', y: '6px', rotate: 10, color: 'tape-celery', washi: true })), faceStyle: { padding: '30px 28px 28px' } },
            h('div', { className: 'zf-kicker' }, 'No. 01 · Sticker maker'),
            h('h1', { className: 'zf-h-display', style: { margin: '8px 0 10px' } }, 'Cut something out'),
            h('p', { style: { margin: '0 0 22px', maxWidth: 440 } }, 'Upload a photo, draw around the part you want, and it becomes a sticker for your book.'),
            h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' } }, h(Button, { variant: 'primary', size: 'lg', icon: 'upload', seed: 'hu' }, 'Upload a photo'), h(Button, { variant: 'quiet', seed: 'hh' }, 'How it works'))),
          h('div', { className: 'zf-hide-m', style: { flex: '0 0 360px' } }, h(Collage, { arts: ['pear', 'cup', 'cherry', 'leaf'], size: 120, gap: 24 }))),
        h('div', { style: { height: 44 } }),
        h(SectionHead, { kicker: 'No. 02 · Sticker book', title: 'Recently cut', action: h(Button, { variant: 'secondary', size: 'sm', icon: 'book', seed: 'sa' }, 'See all') }),
        h('div', { className: 'zf-grid-book' }, recent.map(function (r, i) { return h('div', { key: r[0], className: i > 3 ? 'zf-hide-m' : '' }, h(StickerTile, { art: r[0], name: r[1], size: 92 })); }))));
  }
  function MakerTools(p) {
    return h('div', { style: { display: 'grid', gap: 18, alignContent: 'start' } },
      h('div', null, h('div', { className: 'zf-field__label', style: { marginBottom: 8 } }, 'Mode'),
        h(ToggleGroup, { label: 'Mode', seed: 'mode', value: p.mode || 'select', options: [{ value: 'select', label: 'Select', icon: 'plus' }, { value: 'deselect', label: 'Deselect', icon: 'minus' }] })),
      h('div', null, h('div', { className: 'zf-field__label', style: { marginBottom: 8 } }, 'Shape'),
        h(ToggleGroup, { label: 'Shape', seed: 'shape', value: p.shape || 'free', options: [{ value: 'free', label: 'Freehand', icon: 'lasso' }, { value: 'triangle', label: 'Triangle', icon: 'tri' }, { value: 'rect', label: 'Rectangle', icon: 'rect' }, { value: 'star', label: 'Star', icon: 'star' }] })),
      h(Divider, { seed: 'tools' }),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
        h(Button, { variant: 'quiet', size: 'sm', icon: 'undo', seed: 'u' }, 'Undo'), h(Button, { variant: 'quiet', size: 'sm', icon: 'redo', seed: 'r', disabled: true }, 'Redo'),
        h(Button, { variant: 'quiet', size: 'sm', icon: 'trash', seed: 'd' }, 'Delete'), h(Button, { variant: 'quiet', size: 'sm', icon: 'reset', seed: 'rs' }, 'Reset')));
  }
  function StickerMakerPage(p) {
    var st = p.stage || 'lasso';
    var title = { empty: 'Make a sticker', lasso: 'Draw around it', result: 'Your sticker', loading: 'Make a sticker', error: 'Make a sticker' }[st];
    var main = st === 'result'
      ? h(Paper, { seed: 'resw', size: 'md', className: 'zf-well', rotate: 0, lift: 1, w: 600, h: 440 },
        h('div', { style: { aspectRatio: '4/3', display: 'grid', placeItems: 'center', background: 'var(--ground)', backgroundImage: 'radial-gradient(circle at 1px 1px, var(--dot) 1.1px, transparent 1.6px)', backgroundSize: '22px 22px' } }, h(Sticker, { art: 'pear', size: 150, rotate: 0, seed: 'res' })))
      : h(LassoCanvas, { empty: st === 'empty' || st === 'error', loading: st === 'loading' ? 'Opening photo' : null, mode: p.mode });
    var tools = h(MakerTools, { mode: p.mode });
    var actions = st === 'result'
      ? h(F, null, h(Button, { variant: 'quiet', icon: 'undo', seed: 'ba' }, 'Back to editing'), h(Button, { variant: 'secondary', icon: 'book', seed: 'sv' }, 'Save to book'), h(Button, { variant: 'primary', icon: 'download', seed: 'dlp' }, 'Download PNG'))
      : h(F, null, h(Button, { variant: 'quiet', seed: 'cn' }, 'Cancel'), h(Button, { variant: 'primary', icon: 'check', disabled: st !== 'lasso', seed: 'cf' }, 'Cut it out'));
    return h(F, null,
      h(Masthead, { current: 'make' }),
      h('div', { className: 'zf-sheet-wrap' },
        h('div', { className: 'zf-scrim' }),
        h(Paper, { seed: 'maker', size: 'lg', tone: 'scrap', rotate: 0.3, lift: 3, w: 1000, h: 640, className: 'zf-sheet', measure: true,
          tape: h(F, null, h(Tape, { seed: 'mk1', x: '8%', y: '6px', rotate: -12, color: 'tape-mustard' }), h(Tape, { seed: 'mk2', x: '93%', y: '4px', rotate: 9, color: 'tape-pink', washi: true })),
          wrapperProps: { role: 'dialog', 'aria-label': title }, faceClass: 'zf-dialog__face' },
          h('button', { className: 'zf-close', 'aria-label': 'Close' }, h(Icon, { name: 'x' })),
          h('div', { className: 'zf-kicker' }, st === 'result' ? 'Step 2 of 2' : 'Step 1 of 2'),
          h('h2', { className: 'zf-dialog__title' }, title),
          st === 'error' && h('div', { style: { margin: '6px 0 14px' } }, h(Toast, { kind: 'error', title: 'We couldn’t open that file', seed: 'mkerr' }, 'Try a PNG, JPG or HEIC under 20 MB.')),
          st === 'result' ? h('div', { style: { marginTop: 10 } }, h(StickerEdgeStudio, { hideActions: true, size: 150, shape: p.edgeShape || 'torn', fill: p.edgeFill })) :
          h('div', { style: { display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 10 } },
            h('div', { style: { flex: '1 1 300px', minWidth: 0 } }, main),
            h('div', { style: { flex: '1 1 240px', maxWidth: 360 } }, tools)),
          h('div', { className: 'zf-dialog__actions', style: { marginTop: 22 } }, actions))));
  }
  function StickerBookPage(p) {
    var items = [['pear', 'Pear'], ['cherry', 'Cherries'], ['cup', 'Morning cup'], ['star', 'Gold star'], ['fish', 'Koi'], ['leaf', 'Leaf'], ['cup', 'Tea'], ['pear', 'Pear again'], ['star', 'Star 2'], ['cherry', 'Cherry pair']];
    return h(F, null,
      h(Masthead, { current: 'book' }),
      h('main', { className: 'zf-page' },
        h(SectionHead, { big: true, kicker: p.empty ? 'No. 00 · Sticker book' : 'No. 02 · ' + items.length + ' stickers', title: 'My sticker book', action: !p.empty && h(Button, { variant: 'primary', icon: 'plus', seed: 'nw' }, 'New sticker') }),
        p.empty ? h('div', { style: { paddingTop: 24 } }, h(EmptyState, { seed: 'bk', kicker: 'Nothing here yet', title: 'Your book is empty', art: h(Sticker, { art: 'star', size: 70 }), action: h(Button, { variant: 'primary', icon: 'upload', seed: 'eu' }, 'Make your first sticker') }, 'Stickers you cut out land here. Rename them, reuse them, or download them again.'))
          : h('div', { className: 'zf-grid-book' }, items.map(function (it, i) { return h(StickerTile, { key: i, art: it[0], name: it[1], size: 96, tape: i === 2 || i === 7, actions: p.actionsOn === i, renaming: p.renaming === i }); })),
        p.detail && h(Dialog, { overlay: true, seed: 'det', title: 'Pear', width: 560, kicker: 'Cut 2 Oct 2026 · 312 × 380 px',
          actions: h(F, null, h(Button, { variant: 'danger', icon: 'trash', seed: 'ddl' }, 'Delete'), h('span', { style: { flex: 1 } }), h(Button, { variant: 'secondary', icon: 'pencil', seed: 'drn' }, 'Rename'), h(Button, { variant: 'primary', icon: 'download', seed: 'ddw' }, 'Download PNG')) },
          h('div', { style: { display: 'grid', placeItems: 'center', padding: '18px 0 26px' } }, h(Sticker, { art: 'pear', size: 180, rotate: 0 })))));
  }
  function NotFoundPage() {
    return h(F, null,
      h(Masthead, {}),
      h('main', { className: 'zf-page', style: { display: 'grid', placeItems: 'center', paddingTop: 56 } },
        h('div', { style: { position: 'relative', textAlign: 'center' } },
          h('div', { className: 'zf-h-display', style: { fontSize: 120, lineHeight: 1, color: 'var(--apricot-300)', transform: 'rotate(-3deg)' }, 'aria-hidden': true }, '404'),
          h(EmptyState, { seed: '404', tone: 'scrap', kicker: 'Page missing', title: 'This page fell out of the book', art: h(Sticker, { art: 'leaf', size: 60 }), action: h(Button, { variant: 'primary', seed: 'gh' }, 'Back to the start') }, 'The link may be old, or the sticker was deleted.'))));
  }

  /* =========================================================
     exports
     ========================================================= */
  window.Zoofus = {
    // utilities
    hash: hash, rng: rng, EDGE_RATIO: EDGE_RATIO, PATTERN_REF: PATTERN_REF, vnoise: vnoise, tornClip: tornClip, tornPair: tornPair, tornVars: tornVars, TEAR: TEAR, PALETTE: PALETTE, patternMarkup: patternMarkup, patternSVG: patternSVG, edgeRadius: edgeRadius, scribblePath: scribblePath, dieCut: dieCut, stickerBorder: stickerBorder, seededRot: seededRot, ART: ART,
    // components
    Paper: Paper, Tape: Tape, Scribble: Scribble, Divider: Divider, Icon: Icon, Wordmark: Wordmark, Masthead: Masthead,
    Button: Button, Chip: Chip, ToggleGroup: ToggleGroup, TextField: TextField, Slider: Slider, ColorPicker: ColorPicker, Swatch: Swatch,
    Dialog: Dialog, Toast: Toast, Tooltip: Tooltip, Avatar: Avatar, AvatarMenu: AvatarMenu, Loader: Loader, EmptyState: EmptyState,
    Sticker: Sticker, StickerTile: StickerTile, LassoCanvas: LassoCanvas, PatternFill: PatternFill, PatternEditor: PatternEditor, TapeStudio: TapeStudio, StickerEdgeStudio: StickerEdgeStudio, CJKSpecimen: CJKSpecimen,
    // pages
    Frame: Frame, AuthPage: AuthPage, ResetDialog: ResetDialog, HomePage: HomePage, StickerMakerPage: StickerMakerPage, StickerBookPage: StickerBookPage, NotFoundPage: NotFoundPage
  };
})();
