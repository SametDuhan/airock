// Tools: settings (units, time, tray), alert rules, "overhead" mode, worldwide search, first-run tour, update bar.
// Loaded after features.js.

const closeX = () => `<button class="ib" data-x aria-label="${t('Close')}" title="${t('Close')}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg></button>`;
const modal = (el, on) => { el.classList.toggle('show', on); };
const refreshAll = () => { clock(); renderList(); applyF(); if (selected) renderCard(true); if (apSel) renderAp(); renderWatch(); if (typeof renderOver === 'function') renderOver(); redraw(); };

/* ---------- settings ---------- */
const stm = $('stm');
const UNIT_ROWS = [['dist', 'Distance', [['km', 'km'], ['mi', 'mi'], ['nm', 'nm']]], ['alt', 'Altitude', [['ft', 'ft'], ['m', 'm']]], ['spd', 'Speed', [['kt', 'kt'], ['kmh', 'km/h'], ['mph', 'mph']]],
  ['temp', 'Temperature', [['c', '°C'], ['f', '°F']]], ['h24', 'Time', [[true, '24 h'], [false, '12 h']]]];
function renderSettings() {
  stm.innerHTML = `<div class="bx"><div class="hd"><h2>${t('Settings')}</h2>${closeX()}</div><h3>${t('Units')}</h3>`
    + UNIT_ROWS.map(([k, l, o]) => `<div class="sr"><span>${t(l)}</span><div class="btns seg">${o.map(([v, tx]) => `<button data-u="${k}" data-v="${v}" class="${U[k] === v ? 'on' : ''}">${tx}</button>`).join('')}</div></div>`).join('')
    + `<h3>${t('App')}</h3><label class="ck" id="lTray"><input id="sTray" type="checkbox"> ${t('Keep running in the tray')}</label><label class="ck"><input id="sNot" type="checkbox"> ${t('Desktop notifications')}</label>`
    + `<div style="margin-top:14px"><button class="bt2" id="tourAgain">${t('Show the tour again')}</button></div><div class="vrs">${esc($('ver').textContent)}</div></div>`;
  const tr = $('sTray'), nt = $('sNot'); tr.checked = !!LS('sky.tray', false); nt.checked = !!LS('sky.notif', true);
  if (!window.api?.tray) $('lTray').style.display = 'none';
  tr.onchange = () => { save('sky.tray', tr.checked); try { window.api.tray(tr.checked); } catch {} if (tr.checked) toast(t('SkyTrack keeps running in the tray when you close the window')); };
  nt.onchange = () => save('sky.notif', nt.checked);
}
stm.onclick = e => {
  if (e.target === stm || e.target.closest('[data-x]')) return modal(stm, false);
  const b = e.target.closest('[data-u]'); if (b) { U[b.dataset.u] = b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v; save('sky.units', U); renderSettings(); refreshAll(); return; }
  if (e.target.id === 'tourAgain') { modal(stm, false); startTour(); }
};
$('bSet').onclick = () => { renderSettings(); modal(stm, true); };
try { window.api?.tray?.(!!LS('sky.tray', false)); } catch {}

/* ---------- alert rules ---------- */
let rules = LS('sky.rules', []); const alm = $('alm'), alerted = new Set();
const saveRules = () => save('sky.rules', rules);
const RULE_T = [['type', 'Aircraft type'], ['airline', 'Airline code'], ['reg', 'Registration'], ['call', 'Callsign contains'], ['heli', 'Helicopters'], ['mil', 'Military aircraft']];
const ruleLabel = r => r.type === 'heli' || r.type === 'mil' ? t(RULE_T.find(x => x[0] === r.type)[1]) : `${t(RULE_T.find(x => x[0] === r.type)[1])}: ${r.val}`;
const ruleHit = (r, f) => { const v = r.val;
  switch (r.type) { case 'type': return acCode(f).startsWith(v); case 'airline': return airCode(f) === v || f.cs.toUpperCase().startsWith(v); case 'reg': return (f.ac?.reg || f.reg || '').toUpperCase().includes(v);
    case 'call': return f.cs.toUpperCase().includes(v); case 'heli': return kindOf(f) === 'heli'; case 'mil': return !!f.mil; } return false; };
function renderAlerts() {
  alm.innerHTML = `<div class="bx"><div class="hd"><h2>${t('Alerts')}</h2>${closeX()}</div><div class="rtx">${t('Get a notification when an aircraft you care about shows up on the map.')}</div>`
    + `<div class="ch2">${[['type', 'A388'], ['type', 'B748'], ['type', 'A225'], ['mil', ''], ['heli', '']].map(([ty, v]) => `<button data-q="${ty}|${v}">+ ${ruleLabel({ type: ty, val: v }).replace(/^[^:]+: /, '')}</button>`).join('')}</div>`
    + `<form class="af"><select id="alT">${RULE_T.filter(x => x[0] !== 'heli' && x[0] !== 'mil').map(x => `<option value="${x[0]}">${t(x[1])}</option>`).join('')}</select><input id="alV" placeholder="${t('e.g. A388, THY, TC-JNA')}" autocomplete="off" required><button class="bt2" type="submit">${t('Add')}</button></form>`
    + (rules.length ? rules.map(r => `<div class="ar2"><b>${esc(ruleLabel(r))}</b><button data-rm="${r.id}" title="${t('Remove')}">✕</button></div>`).join('') : `<div class="none">${t('No alerts yet. Add one above.')}</div>`) + `</div>`;
}
const addRule = (type, val) => { val = (val || '').toUpperCase().trim(); if (!['heli', 'mil'].includes(type) && !val) return; if (rules.some(r => r.type === type && r.val === val)) return;
  const r = { id: Date.now() + Math.random(), type, val }; rules.push(r); saveRules(); flights.forEach(f => { if (ruleHit(r, f)) alerted.add(f.id + '|' + r.id); }); renderAlerts(); }; // what is already on the map does not alert
alm.onclick = e => {
  if (e.target === alm || e.target.closest('[data-x]')) return modal(alm, false);
  const q = e.target.closest('[data-q]'); if (q) { const [ty, v] = q.dataset.q.split('|'); return addRule(ty, v); }
  const rm = e.target.closest('[data-rm]'); if (rm) { rules = rules.filter(r => String(r.id) !== rm.dataset.rm); saveRules(); renderAlerts(); }
};
alm.onsubmit = e => { e.preventDefault(); addRule($('alT').value, $('alV').value); };
$('bAlerts').onclick = () => { renderAlerts(); modal(alm, true); };
let pend = [], pendT = null;
const baseEvent = X.event;
X.event = f => { baseEvent(f);
  if (!rules.length || f.gone) return;
  for (const r of rules) { const k = f.id + '|' + r.id; if (alerted.has(k) || !ruleHit(r, f)) continue; alerted.add(k); pend.push({ f, r }); }
  if (pend.length && !pendT) pendT = setTimeout(() => { const p = pend; pend = []; pendT = null;
    p.slice(0, 3).forEach(({ f, r }) => toast(`✈ ${f.cs} · ${ruleLabel(r)}`, f.id)); if (p.length > 3) toast(t('{0} more aircraft match your alerts', p.length - 3)); }, 1500); };

/* ---------- overhead: what is flying above me ---------- */
const ovp = $('ovp'); let ov = LS('sky.over', null), ovPlacing = false, ovLayer = L.layerGroup().addTo(map), ovRad = LS('sky.overR', 20);
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], compass = d => COMPASS[Math.round(d / 45) % 8];
function drawOver() { ovLayer.clearLayers(); if (!ov) return;
  L.marker([ov.lat, ov.lon], { icon: L.divIcon({ className: '', html: '<div class="ovm"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(ovLayer);
  L.circle([ov.lat, ov.lon], { radius: ovRad * 1000, color: '#2f8cff', weight: 1.5, fillOpacity: .06, dashArray: '4 6', interactive: false }).addTo(ovLayer); }
function overList() { if (!ov) return [];
  return [...flights.values()].filter(f => !f.gone && !f.ground && vis(f)).map(f => { const d = km(ov.lat, ov.lon, f.lat, f.lon); return { f, d, b: brg(ov.lat, ov.lon, f.lat, f.lon), el: Math.atan2(f.alt, d * 1000) * 180 / Math.PI }; })
    .filter(x => x.d <= ovRad).sort((a, b) => a.d - b.d); }
function renderOver() { if (!ovp.classList.contains('show')) return;
  if (document.activeElement?.id === 'ovA') return; // do not rebuild while typing
  const list = overList(), [rmax, ru] = uDist(50), [rv] = uDist(ovRad);
  ovp.innerHTML = `<div class="ch"><div class="cn"><h2>${t('Overhead')}</h2><small>${ov ? t('Aircraft within {0} of your spot', fmtDist(ovRad)) : t('Choose where you are')}</small></div><button class="ib" id="ovx" title="${t('Close')}">✕</button></div>`
    + `<div class="ctl"><button id="ovPick">📍 ${t(ov ? 'Move my spot' : 'Click the map')}</button><input id="ovA" placeholder="${t('Airport code')}" autocomplete="off"></div>`
    + `<div class="rg"><span>${t('Radius')}</span><input id="ovR" type="range" min="5" max="50" step="5" value="${ovRad}"><b>${fmtDist(ovRad)}</b></div>`
    + (ov ? (list.length ? list.map(({ f, d, b, el }) => `<div class="ov" data-id="${esc(f.id)}"><div class="dir"><span>${compass(b)}</span><small>${Math.round(el)}°↑</small></div><div class="rm"><b>${esc(f.cs)}</b><small>${esc([f.route ? f.route.org.code + '→' + f.route.dst.code : '', acCode(f), f.route?.airline].filter(Boolean).join(' · '))}</small></div><div class="rs">${fmtDist(d, 1)}<br>${fmtAlt(f.alt * 3.281, 100)}</div></div>`).join('')
      : `<div class="none">${t('Nothing overhead right now.')}</div>`) : `<div class="none">${t('Click the map where you are, or type an airport code. SkyTrack lists the aircraft flying around that spot, with the direction to look and how high in the sky.')}</div>`);
}
function setOver(lat, lon, move = true) { document.activeElement?.blur?.(); ov = { lat, lon }; save('sky.over', ov); drawOver(); if (move) map.setView([lat, lon], Math.max(map.getZoom(), 9)); ovp.classList.add('show'); renderOver(); }
ovp.onclick = e => {
  if (e.target.id === 'ovx') { ovp.classList.remove('show'); return; }
  if (e.target.id === 'ovPick') { ovPlacing = true; document.body.classList.add('placing'); toast(t('Click the map to set your spot')); return; }
  const r = e.target.closest('.ov'); if (r) select(r.dataset.id);
};
ovp.oninput = e => { if (e.target.id === 'ovR') { ovRad = +e.target.value; save('sky.overR', ovRad); drawOver(); renderOver(); } };
ovp.onkeydown = e => { if (e.target.id === 'ovA' && e.key === 'Enter') { const a = knownAps.get(apCode(e.target.value)); if (a) setOver(a.lat, a.lon); else toast(t('Unknown airport: use an IATA or ICAO code, e.g. IST or LTFM')); } };
map.on('click', e => { if (!ovPlacing) return; ovPlacing = false; document.body.classList.remove('placing'); setOver(e.latlng.lat, e.latlng.lng, false); select(null); });
$('bOver').onclick = () => { if (ovp.classList.contains('show')) { ovp.classList.remove('show'); return; } select(null); if (apSel) closeAp(); ovp.classList.add('show'); drawOver(); renderOver(); if (ov) map.setView([ov.lat, ov.lon], Math.max(map.getZoom(), 9)); };
setInterval(renderOver, 2500); drawOver();

/* ---------- worldwide search (callsign / registration / type / airport) ---------- */
let remote = { q: '', flights: [] }, srchT = null;
const apMatches = q => { q = q.toUpperCase(); if (q.length < 2) return []; const out = [];
  for (const a of knownAps.values()) { const c = a.code === q ? 0 : a.code.startsWith(q) || (a.icao || '').startsWith(q) ? 1 : a.name.toUpperCase().includes(q) ? 2 : 9; if (c < 9) out.push([c, a]); }
  return out.sort((x, y) => x[0] - y[0]).slice(0, 5).map(x => x[1]); };
window.searchExtra = (q, local) => { q = q.trim(); let h = '';
  const aps = apMatches(q); if (aps.length) h += `<div class="sh">${t('Airports')}</div>` + aps.map(a => `<div class="row ap" data-ap="${esc(a.code)}"><span class="ai">🛫</span><div class="rm"><b>${esc(a.code)}</b><small>${esc(a.name)}</small></div></div>`).join('');
  const ids = new Set(local.map(f => f.id)), rem = remote.q === q.toUpperCase() ? remote.flights.filter(f => !ids.has(f.id)).slice(0, 8) : [];
  if (rem.length) h += `<div class="sh">${t('Worldwide')}</div>` + rem.map(d => { const sh = SHAPES[kindOf(d)] || SHAPES.gen; return `<div class="row rw" data-hex="${esc(d.id)}"><svg class="ri" viewBox="0 0 24 24" fill="${color(d.alt)}" stroke="#000" stroke-width=".6"><path d="${sh.b}"/>${sh.e ? `<path d="${sh.e}"/>` : ''}</svg><div class="rm"><b>${esc(d.cs)}</b><small>${esc([d.reg, d.type].filter(Boolean).join(' · '))}</small></div><span>${d.ground ? t('on ground') : fmtAlt(d.alt * 3.281, 100)}</span></div>`; }).join('');
  return h; };
$('q').addEventListener('input', () => { clearTimeout(srchT); const q = $('q').value.trim().toUpperCase(); if (q.length < 3 || !live) { remote = { q: '', flights: [] }; return; }
  srchT = setTimeout(async () => { const r = await DATA.find(q); if ($('q').value.trim().toUpperCase() !== q) return; remote = { q, flights: r.ok ? r.flights : [] }; renderList(); }, 450); });
$('list').addEventListener('pointerdown', e => {
  const a = e.target.closest('.row.ap'), w = e.target.closest('.row.rw'); if (!a && !w) return; e.stopImmediatePropagation();
  if (a) { const ap = knownAps.get(a.dataset.ap); if (ap) { map.setView([ap.lat, ap.lon], 11); openAp(ap); } return; }
  const d = remote.flights.find(f => f.id === w.dataset.hex); if (d) { const f = upsert(d); map.setView([f.lat, f.lon], Math.max(map.getZoom(), 8)); select(f.id); redraw(); }
}, true);

/* ---------- first-run tour ---------- */
const TOUR = [
  { s: null, h: 'Welcome to SkyTrack', p: 'A free flight tracker: no account, no ads. Here is a quick tour of what you can do.' },
  { s: '#lang', h: 'Your language', p: 'Switch the whole app between English, Turkish, Spanish, German and French.' },
  { s: '#map', h: 'Click any aircraft', p: 'Click a plane to see its route, photo, altitude, speed and more. Click an airport (yellow dot) for its weather and arrivals.', pos: 'center' },
  { s: '#srch', h: 'Search the whole world', p: 'Type a callsign, registration, aircraft type or airport. Results are not limited to the part of the map you see.' },
  { s: '.flt', h: 'Filters', p: 'Narrow the map by altitude, speed, airport, airline or aircraft type.' },
  { s: '#bDiary', h: 'Your tools', p: 'Keep a flight diary, set alerts for rare aircraft, see what is flying overhead, and change units in Settings.', grow: '#bSet' },
  { s: '#open', h: 'Menu button', p: 'Hide or show the menu any time. Enjoy the sky!' }];
let tourI = 0, tourEl = null;
function startTour() { tourI = 0; if (!tourEl) { tourEl = document.createElement('div'); tourEl.id = 'tour'; tourEl.innerHTML = '<div class="spot"></div><div class="tip"></div>'; document.body.appendChild(tourEl); tourEl.onclick = tourClick; } setMenu(true); setTimeout(showTour, 380); }
function showTour() { const st = TOUR[tourI], sp = tourEl.querySelector('.spot'), tip = tourEl.querySelector('.tip'); let r;
  if (st.s) { const el = document.querySelector(st.s); if (el && el.offsetParent !== null || el?.id === 'map') { el.scrollIntoView?.({ block: 'center' }); r = el.getBoundingClientRect(); if (st.grow) { const e2 = document.querySelector(st.grow).getBoundingClientRect(); r = { left: Math.min(r.left, e2.left), top: Math.min(r.top, e2.top), right: Math.max(r.right, e2.right), bottom: Math.max(r.bottom, e2.bottom), width: 0, height: 0 }; r.width = r.right - r.left; r.height = r.bottom - r.top; } } }
  const W = innerWidth, H = innerHeight;
  if (r && st.pos === 'center') r = { left: W / 2 - 150, top: H / 2 - 60, width: 300, height: 120, right: W / 2 + 150, bottom: H / 2 + 60 };
  if (r) { sp.style.cssText = `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;opacity:1`; } else sp.style.cssText = `left:${W / 2}px;top:${H / 2}px;width:0;height:0;opacity:1`;
  tip.innerHTML = `<h4>${t(st.h)}</h4><p>${t(st.p)}</p><div class="nv"><div class="dots">${TOUR.map((_, i) => `<i class="${i === tourI ? 'on' : ''}"></i>`).join('')}</div><button class="sk" data-a="skip">${t('Skip')}</button>${tourI ? `<button data-a="back">${t('Back')}</button>` : ''}<button class="pr" data-a="next">${t(tourI === TOUR.length - 1 ? 'Done' : 'Next')}</button></div>`;
  let x, y; const tw = 300, th = tip.offsetHeight || 170;
  if (!r) { x = W / 2 - tw / 2; y = H / 2 - th / 2; } else if (r.right + 20 + tw < W - 10 && st.pos !== 'center') { x = r.right + 20; y = Math.max(12, Math.min(H - th - 12, r.top)); } else { x = Math.max(12, Math.min(W - tw - 12, r.left + r.width / 2 - tw / 2)); y = r.bottom + 18 + th < H ? r.bottom + 18 : Math.max(12, r.top - th - 18); }
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
function tourClick(e) { const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
  if (a === 'skip' || (a === 'next' && tourI === TOUR.length - 1)) { tourEl.remove(); tourEl = null; save('sky.tour', true); return; }
  tourI += a === 'next' ? 1 : -1; showTour(); }
addEventListener('resize', () => { if (tourEl) showTour(); });
if (!LS('sky.tour', false)) setTimeout(() => { if (!LS('sky.tour', false)) startTour(); }, 1800);

/* ---------- update bar ---------- */
const upd = $('upd');
try { window.api?.onUpdate?.(u => { upd.hidden = false;
  if (u.state === 'downloading') upd.innerHTML = `<span>⬇ ${t('Downloading update {0}…', u.version)}</span><i class="pbar" style="width:0"></i>`;
  else if (u.state === 'progress') { const b = upd.querySelector('.pbar'); if (b) b.style.width = u.percent + '%'; }
  else if (u.state === 'ready') upd.innerHTML = `<span>✓ ${t('Update {0} is ready', u.version)}</span><button id="updGo">${t('Restart')}</button>`;
  else if (u.state === 'manual') upd.innerHTML = `<span>${t('New version {0} available', u.version)}</span><button id="updGo" data-url="${esc(u.url)}">${t('Download')}</button>`; }); } catch {}
upd.onclick = e => { if (e.target.id !== 'updGo') return; const u = e.target.dataset.url; if (u) window.open(u); else try { window.api.installUpdate(); } catch {} };

document.addEventListener('keydown', e => { if (e.key === 'Escape') { modal(stm, false); modal(alm, false); } });

refreshAll();
