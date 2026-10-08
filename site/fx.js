/* SkyTrack site — interactions: flight-network background, tilt, spotlight, counters, radar demo */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ---- scroll progress, sticky header state, active nav link ---- */
  const prog = $('#prog'), hdr = $('header');
  let maxS = 1, tick0 = false, stuck = false, tt = null, ring = null, links = [];
  const calc = () => { maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  const onScroll = () => { tick0 = false;
    if (prog) prog.style.transform = `scaleX(${Math.min(1, scrollY / maxS).toFixed(4)})`;
    const sh = scrollY > 900; if (tt && sh !== tt._s) { tt._s = sh; tt.classList.toggle('show', sh); } if (tt && sh) ring.style.strokeDashoffset = (150.8 * (1 - Math.min(1, scrollY / maxS))).toFixed(1);
    if (scrollY < 300) links.forEach(a => a.classList.remove('act'));
    const s = scrollY > 30; if (hdr && s !== stuck) { stuck = s; hdr.classList.toggle('stuck', s); } };
  addEventListener('scroll', () => { if (!tick0) { tick0 = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { calc(); onScroll(); }); addEventListener('load', () => { calc(); onScroll(); }); calc(); onScroll();
  links = $$('nav a.l[href^="#"]'); const secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && secs.length) {
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('act', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => so.observe(s));
  }

  /* ---- dividers between sections ---- */
  const PL = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12 3 4.5v5L13 12 3 14.5v5z"/></svg>';
  $$('main > section').forEach((sec, i) => { if (!i) return; const d = document.createElement('div'); d.className = 'flightline reveal0'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = PL; sec.parentNode.insertBefore(d, sec); });
  const fio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); fio.unobserve(e.target); } }), { threshold: .5 }) : null;
  $$('.flightline').forEach(d => fio ? fio.observe(d) : d.classList.add('in'));

  /* ---- back to top ---- */
  tt = document.createElement('button'); tt.className = 'totop'; tt.setAttribute('aria-label', 'Top'); tt.innerHTML = '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/></svg><i></i>';
  document.body.appendChild(tt); tt.onclick = () => scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
  ring = tt.querySelector('circle');

  /* ---- numbered feature groups ---- */
  $$('.group-title').forEach((g, i) => g.dataset.n = String(i + 1).padStart(2, '0'));

  /* ---- brand motif on every card: the dotted trail that grows toward the plane ---- */
  const MOTIF = '<span class="ci"><svg viewBox="0 0 46 30" fill="currentColor" aria-hidden="true"><circle class="d" cx="5" cy="15" r="1.7"/><circle class="d" cx="13" cy="15" r="2.4"/><circle class="d" cx="22" cy="15" r="3.1"/><path class="pl" d="M43 15 29 7v4.2l8 3.8-8 3.8V23z"/></svg></span>';
  $$('.grid .card').forEach(c => { if (c.closest('#turbulence') || c.querySelector('.wico')) return; const h = c.querySelector('h3'); if (h) c.insertAdjacentHTML('afterbegin', MOTIF); });

  /* ---- wrap screenshots for glow + tilt ---- */
  $$('.shotbox').forEach(b => { const w = document.createElement('div'); w.className = 'shotwrap' + (b.classList.contains('narrow') ? ' narrowwrap' : ''); b.parentNode.insertBefore(w, b); w.appendChild(b); });
  const attachTilt = (host, max) => {
    if (!fine || RM) return;
    host.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      host.classList.add('tilting'); const t = host.firstElementChild;
      t.style.setProperty('--ry', (x * max).toFixed(2) + 'deg'); t.style.setProperty('--rx', (-y * max).toFixed(2) + 'deg');
    });
    host.addEventListener('pointerleave', () => { host.classList.remove('tilting'); const t = host.firstElementChild; t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
  };
  $$('.shotwrap').forEach(w => attachTilt(w, 9));
  const frame = $('.hero .frame');
  if (frame) {
    const st = document.createElement('div'); st.className = 'stage'; frame.parentNode.insertBefore(st, frame); st.appendChild(frame);
    st.insertAdjacentHTML('beforeend',
      '<div class="chip3d c1"><span class="ic">✈</span><span><b>IST → JFK</b>TK11 · FL380</span></div>' +
      '<div class="chip3d c2"><i class="led y"></i><span><b>FL340</b>+ 412 km</span></div>' +
      '<div class="chip3d c3"><i class="led g"></i><span><b>15 s</b>live refresh</span></div>');
    attachTilt(st, 6);
  }

  /* ---- click a screenshot to see it large ---- */
  const lb = document.createElement('div'); lb.className = 'lightbox'; lb.hidden = true; lb.innerHTML = '<img alt=""><button aria-label="Close">×</button>'; document.body.appendChild(lb);
  const lbi = lb.querySelector('img'), closeLb = () => { lb.hidden = true; document.documentElement.style.overflow = ''; };
  $$('.shotbox img').forEach(im => { im.style.cursor = 'zoom-in'; im.addEventListener('click', () => { lbi.src = im.currentSrc || im.src; lbi.alt = im.alt; lb.hidden = false; document.documentElement.style.overflow = 'hidden'; }); });
  lb.addEventListener('click', closeLb); addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* ---- card spotlight follows the pointer ---- */
  if (fine) { let pe = null, pq = false;
    document.addEventListener('pointermove', e => { pe = e; if (pq) return; pq = true; requestAnimationFrame(() => { pq = false;
      const t = pe.target.closest && pe.target.closest('.card,.box,.nw,.stats div'); if (!t) return;
      const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (pe.clientX - r.left) + 'px'); t.style.setProperty('--my', (pe.clientY - r.top) + 'px'); }); }, { passive: true }); }

  /* ---- soft light that follows the cursor ---- */
  const cg = $('#cg');
  if (cg && fine && !RM) {
    let tx = 0, ty = 0, cx = 0, cy = 0, run = false;
    const loop = () => { cx += (tx - cx) * .12; cy += (ty - cy) * .12; cg.style.transform = `translate(${cx}px,${cy}px)`; if (Math.abs(tx - cx) + Math.abs(ty - cy) > .5) requestAnimationFrame(loop); else run = false; };
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cg.classList.add('on'); if (!run) { run = true; requestAnimationFrame(loop); } }, { passive: true });
    document.addEventListener('pointerleave', () => cg.classList.remove('on'));
  }

  /* ---- count-up numbers ---- */
  $$('.stats b').forEach(b => {
    const m = /^([\d.,]+)$/.exec(b.textContent.trim()); if (!m) return;
    const end = parseInt(m[1].replace(/[^0-9]/g, ''), 10), sep = /,/.test(m[1]); b.dataset.end = end; b.dataset.sep = sep ? 1 : 0;
    const fmt = n => sep ? n.toLocaleString('en-US') : String(n); b.textContent = RM ? fmt(end) : '0';
    if (RM || !('IntersectionObserver' in window)) { b.textContent = fmt(end); return; }
    const o = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; o.disconnect(); const t0 = performance.now(), D = 1600;
      const step = t => { const k = Math.min(1, (t - t0) / D), v = Math.round(end * (1 - Math.pow(1 - k, 4))); b.textContent = fmt(v); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: .6 }); o.observe(b);
  });

  /* ---- turbulence radar: a plane flies a route, SkyTrack looks ahead and lights up the matching card ---- */
  const radar = $('#radarSvg');
  if (radar) {
    const path = $('#rPath'), plane = $('#rPlane'), trail = $('#rTrail'), led = $('#rLed'), info = $('#rInfo'), look = $('#rLook');
    const cards = $$('#turbulence .grid .card'), cols = ['#4ade80', '#facc15', '#f87171'];
    const L = path.getTotalLength(), NP = 480, TAB = Array.from({ length: NP + 1 }, (_, i) => { const q = path.getPointAtLength(L * i / NP); return [q.x, q.y]; }), at = d => { const f = Math.max(0, Math.min(1, d / L)) * NP, i = Math.min(NP - 1, Math.floor(f)), k = f - i, a = TAB[i], b = TAB[i + 1]; return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k }; }, KM = 1850, ZONES = [{ c: .43, w: .075, lvl: 1 }, { c: .72, w: .06, lvl: 2 }];
    const dots = []; for (let i = 0; i < 10; i++) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); trail.appendChild(c); dots.push(c); }
    let last = -1;
    const status = t => {
      let lvl = 0, dist = null;
      for (const z of ZONES) { if (t > z.c + z.w) continue; const d = Math.max(0, z.c - z.w - t); if (d > .34) continue; if (z.lvl > lvl) { lvl = z.lvl; dist = d; } }
      return { lvl, dist };
    };
    const draw = t => {
      const p = at(t * L), q = at(Math.min(L, t * L + 6)), a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      plane.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${a.toFixed(1)})`);
      dots.forEach((d, i) => { const k = 1 - i / dots.length, pt = at(Math.max(0, t * L - (i + 1) * 24));
        d.setAttribute('cx', pt.x.toFixed(1)); d.setAttribute('cy', pt.y.toFixed(1)); d.setAttribute('r', (1 + 2.4 * k).toFixed(2)); d.setAttribute('opacity', (.08 + .8 * k * k).toFixed(2)); });
      const s = status(t); const aheadEnd = at(Math.min(L, (t + .34) * L));
      look.setAttribute('d', `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${aheadEnd.x.toFixed(1)} ${aheadEnd.y.toFixed(1)}`);
      look.setAttribute('stroke', cols[s.lvl]);
      if (s.lvl !== last) { last = s.lvl; led.style.background = cols[s.lvl]; led.style.color = cols[s.lvl] + '88';
        cards.forEach((c, i) => { c.classList.toggle('hot', i === s.lvl); c.style.setProperty('--hc', cols[i]); }); }
      const km = s.dist === null ? null : Math.round(s.dist * KM / 10) * 10;
      info.textContent = `FL${s.lvl === 2 ? 380 : s.lvl === 1 ? 360 : 340}${km === null ? '' : ' · ' + km + ' km'}`;
    };
    let t0 = performance.now(), vis = true; const DUR = 16000, HOLD = 1400;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) { t0 = performance.now() - (t0Prog * DUR); requestAnimationFrame(tick); } }).observe(radar);
    let t0Prog = .05;
    const tick = now => { if (!vis) return; const ph = ((now - t0) % (DUR + HOLD)) / DUR; t0Prog = Math.min(1, ph); draw(t0Prog); requestAnimationFrame(tick); };
    if (RM) { last = -1; draw(.3); } else requestAnimationFrame(tick);
  }

  const hv = $('#heroVid');
  if (hv && 'IntersectionObserver' in window && !RM) new IntersectionObserver(es => { es[0].isIntersecting ? hv.play().catch(() => {}) : hv.pause(); }, { threshold: .05 }).observe(hv);

  /* ---- flight network canvas ---- */
  const cv = $('#net'); if (!cv) return;
  const ctx = cv.getContext('2d'); let W = 0, H = 0, dpr = 1, accent = '245,196,49', mx = 0, my = 0, smx = 0, smy = 0;
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].join(','); };
  const readTheme = () => { const a = css('--accent'); accent = a.startsWith('#') ? hex2rgb(a) : '245,196,49'; };
  const AP = [[.58, .33], [.48, .27], [.27, .34], [.13, .38], [.64, .43], [.76, .55], [.88, .36], [.9, .8], [.34, .72], [.58, .78], [.7, .4], [.5, .31], [.2, .46], [.8, .3], [.42, .42], [.66, .3]];
  let flights = [];
  const mk = () => { const a = Math.floor(Math.random() * AP.length); let b = Math.floor(Math.random() * AP.length); if (b === a) b = (a + 3) % AP.length;
    return { a, b, t: Math.random(), v: .018 + Math.random() * .02, bend: (Math.random() < .5 ? -1 : 1) * (.12 + Math.random() * .12) }; };
  const resize = () => { dpr = Math.min(1.25, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = W < 700 ? 4 : 8; flights = Array.from({ length: n }, mk); };
  const pos = (f, t) => { const A = AP[f.a], B = AP[f.b], ax = A[0] * W, ay = A[1] * H, bx = B[0] * W, by = B[1] * H, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const cx = (ax + bx) / 2 + (-dy / len) * len * f.bend, cy = (ay + by) / 2 + (dx / len) * len * f.bend - len * .08, u = 1 - t;
    return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by]; };
  const frameDraw = (dt, still) => {
    ctx.clearRect(0, 0, W, H); smx += (mx - smx) * .05; smy += (my - smy) * .05; ctx.save(); ctx.translate(smx * -14, smy * -10);
    for (const p of AP) { const x = p[0] * W, y = p[1] * H; ctx.fillStyle = `rgba(${accent},.35)`; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.3); ctx.fill(); }
    for (const f of flights) {
      if (!still) { f.t += f.v * dt; if (f.t >= 1) Object.assign(f, mk(), { t: 0 }); }
      const t = f.t, fade = Math.min(1, t * 6, (1 - t) * 6);
      ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${accent},${.05 * fade})`; ctx.beginPath(); for (let k = 0; k <= 12; k++) { const q = pos(f, k / 12); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke();
      for (let i = 8; i >= 1; i--) { const tt = t - i * .02; if (tt < 0) continue; const q = pos(f, tt), k = 1 - i / 8; ctx.fillStyle = `rgba(${accent},${(.06 + .5 * k * k) * fade})`; ctx.beginPath(); ctx.arc(q[0], q[1], .8 + 1.8 * k, 0, 6.3); ctx.fill(); }
      const p = pos(f, t), n = pos(f, Math.min(1, t + .004)), ang = Math.atan2(n[1] - p[1], n[0] - p[0]);
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); ctx.fillStyle = `rgba(${accent},${.75 * fade})`;
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-7, -6.5); ctx.lineTo(-7, -2.2); ctx.lineTo(-1, 0); ctx.lineTo(-7, 2.2); ctx.lineTo(-7, 6.5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  };
  readTheme(); resize(); addEventListener('resize', resize);
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: light)').addEventListener && matchMedia('(prefers-color-scheme: light)').addEventListener('change', readTheme);
  if (fine) addEventListener('pointermove', e => { mx = e.clientX / W - .5; my = e.clientY / H - .5; }, { passive: true });
  if (RM) { frameDraw(0, true); return; }
  let prev = performance.now(), on = true; document.addEventListener('visibilitychange', () => { on = !document.hidden; prev = performance.now(); if (on) requestAnimationFrame(loop); });
  const loop = now => { if (!on) return; requestAnimationFrame(loop); if (now - prev < 33) return; const dt = Math.min(.08, (now - prev) / 1000); prev = now; frameDraw(dt); };
  requestAnimationFrame(loop);
})();
