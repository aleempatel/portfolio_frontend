/* Signature hero visual: a slowly rotating 3D "data orb" (plain canvas, no libraries) that sits behind the code card,
   plus a smooth cross-fade when the theme is switched.
   - runs only while the hero is on screen and the tab is visible (it is not drawn at all on phones, where the hero card is hidden)
   - with "reduce motion" turned on it draws one still frame instead of animating */
(function () {
  const root = document.documentElement, th = document.getElementById('th');

  /* theme cross-fade: colours ease between light and dark instead of snapping */
  if (th) th.addEventListener('click', () => {
    root.classList.add('theme-fade'); clearTimeout(root._tf);
    root._tf = setTimeout(() => root.classList.remove('theme-fade'), 700);
  });

  const cv = document.getElementById('orb');
  if (!cv || !cv.getContext) return;
  const cx = cv.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let W = 0, H = 0, dpr = 1, colA = [166, 107, 255], colB = [79, 209, 255];

  /* colours come from the site's own --ac / --ac2 tokens, so the orb follows the theme */
  const hex = (v, f) => {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((v || '').trim()); if (!m) return f;
    let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
  };
  const readColours = () => { const s = getComputedStyle(root); colA = hex(s.getPropertyValue('--ac'), colA); colB = hex(s.getPropertyValue('--ac2'), colB); };
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  readColours();

  /* geometry: points spread evenly over a sphere (Fibonacci spiral), joined to their near neighbours */
  const N = 96, pts = [], edges = [];
  for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), a = i * 2.399963; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], dz = pts[i][2] - pts[j][2];
    if (dx * dx + dy * dy + dz * dz < .25) edges.push([i, j]);
  }
  const pulses = Array.from({ length: 6 }, () => ({ e: (Math.random() * edges.length) | 0, t: Math.random(), s: .0005 + Math.random() * .0006 }));
  const rings = [{ r: 1.34, tilt: .55, sat: 0 }, { r: 1.2, tilt: -.95, sat: 2.2 }];

  let rotY = 0.6, tiltX = .32, mx = .5, my = .5, offY = 0, offX = 0, clock = 0;
  const proj = new Array(N);

  function draw() {
    if (!W) return;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    const R = W * .33, ox = W / 2, oy = H / 2, fov = 3.4;
    const ry = rotY + offY, rx = tiltX + offX, ca = Math.cos(ry), sa = Math.sin(ry), cb = Math.cos(rx), sb = Math.sin(rx);
    const P = (x, y, z) => { // rotate around Y, then tilt around X, then perspective
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca, y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb, k = fov / (fov - z2);
      return [ox + x1 * R * k, oy + y2 * R * k, (z2 + 1) / 2];
    };
    for (let i = 0; i < N; i++) proj[i] = P(pts[i][0], pts[i][1], pts[i][2]);

    /* soft core glow */
    const g = cx.createRadialGradient(ox, oy, 0, ox, oy, R * 1.25);
    g.addColorStop(0, rgba(colA, .16)); g.addColorStop(.6, rgba(colA, .05)); g.addColorStop(1, rgba(colA, 0));
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);

    /* orbit rings: thin ellipses with a small satellite */
    rings.forEach((rg) => {
      const ct = Math.cos(rg.tilt), st = Math.sin(rg.tilt), SEG = 56; let prev = null;
      const at = (th) => { const x = Math.cos(th) * rg.r, z = Math.sin(th) * rg.r; return P(x * ct, x * st, z); };
      for (let s = 0; s <= SEG; s++) {
        const p = at(s / SEG * 6.2832);
        if (prev) { cx.strokeStyle = rgba(colB, .05 + .2 * ((p[2] + prev[2]) / 2)); cx.lineWidth = .8; cx.beginPath(); cx.moveTo(prev[0], prev[1]); cx.lineTo(p[0], p[1]); cx.stroke(); }
        prev = p;
      }
      const sp = at(clock * .0006 + rg.sat), sr = 1.6 + 2 * sp[2];
      cx.fillStyle = rgba(colB, .25 + .65 * sp[2]); cx.beginPath(); cx.arc(sp[0], sp[1], sr, 0, 6.2832); cx.fill();
    });

    /* edges, batched into 4 depth bands (far = faint, near = brighter) */
    const bands = [[], [], [], []];
    edges.forEach((e) => { const d = (proj[e[0]][2] + proj[e[1]][2]) / 2; bands[Math.min(3, (d * 4) | 0)].push(e); });
    bands.forEach((list, b) => {
      cx.strokeStyle = rgba(colB, .07 + b * .11); cx.lineWidth = .6 + b * .25; cx.beginPath();
      list.forEach((e) => { cx.moveTo(proj[e[0]][0], proj[e[0]][1]); cx.lineTo(proj[e[1]][0], proj[e[1]][1]); });
      cx.stroke();
    });

    /* nodes: bigger and brighter when closer to the viewer, with a halo on the nearest ones */
    for (let i = 0; i < N; i++) {
      const p = proj[i], d = p[2];
      if (d > .72) { cx.fillStyle = rgba(colA, .1 * d); cx.beginPath(); cx.arc(p[0], p[1], 7 * d, 0, 6.2832); cx.fill(); }
      cx.fillStyle = rgba(colA, .22 + .78 * d); cx.beginPath(); cx.arc(p[0], p[1], .9 + 2.1 * d, 0, 6.2832); cx.fill();
    }

    /* data pulses travelling along random edges */
    pulses.forEach((u) => {
      const e = edges[u.e], a = proj[e[0]], b = proj[e[1]], x = a[0] + (b[0] - a[0]) * u.t, y = a[1] + (b[1] - a[1]) * u.t, d = (a[2] + b[2]) / 2;
      cx.fillStyle = rgba(colB, .18 * d + .05); cx.beginPath(); cx.arc(x, y, 6, 0, 6.2832); cx.fill();
      cx.fillStyle = rgba([255, 255, 255], .5 + .5 * d); cx.beginPath(); cx.arc(x, y, 1.6 + d, 0, 6.2832); cx.fill();
    });
  }

  let running = false, vis = true, raf = 0, last = 0;
  function frame(t) {
    raf = 0; if (!running) return;
    const dt = Math.min(50, t - last || 16); last = t; clock += dt;
    rotY += dt * .00038;
    offY += ((mx - .5) * .9 - offY) * .04; offX += ((my - .5) * .45 - offX) * .04; // gentle follow of the pointer
    pulses.forEach((u) => { u.t += dt * u.s * 2; if (u.t > 1) { u.t = 0; u.e = (Math.random() * edges.length) | 0; } });
    draw(); raf = requestAnimationFrame(frame);
  }
  const start = () => { if (running || reduce || document.hidden || !vis || !W) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

  function size() {
    W = cv.clientWidth; H = cv.clientHeight; if (!W) { stop(); return; }
    dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    draw(); start();
  }
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv); else { addEventListener('resize', size); size(); }
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) start(); else stop(); }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  new MutationObserver(() => { readColours(); if (!running) draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (matchMedia('(pointer:fine)').matches) addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; }, { passive: true });
})();
