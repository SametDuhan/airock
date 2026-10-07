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
    + `<h3>${t('Replay history')}</h3><div class="sr"><span>${t('How far back you can rewind')}</span><div class="btns seg">${[[5, '1 h'], [15, '3 h'], [30, '6 h']].map(([v, tx]) => `<button data-h="${v}" class="${HSTEP === v ? 'on' : ''}">${tx}</button>`).join('')}</div></div>`
    + (window.api?.openskySet ? `<h3>${t('OpenSky account (optional)')}</h3><div class="rtx">${t('A free OpenSky API client gives the wide view a much higher daily limit. Create one in your OpenSky account. It is stored encrypted on this computer.')}</div><div class="rtx">${t('1) Sign up at opensky-network.org (free)  2) Account page → create an API client  3) Paste Client ID and secret here.')} <a href="https://opensky-network.org/my-opensky/account" target="_blank">${t('Open OpenSky account page')}</a></div><div class="os"><input id="osId" placeholder="Client ID" autocomplete="off"><input id="osSec" type="password" placeholder="Client secret" autocomplete="off"><button class="bt2" id="osSave">${t('Save')}</button></div><div class="rtx" id="osSt"></div>` : '')
    + `<h3>${t('App')}</h3><label class="ck" id="lTray"><input id="sTray" type="checkbox"> ${t('Keep running in the tray')}</label><label class="ck"><input id="sNot" type="checkbox"> ${t('Desktop notifications')}</label><label class="ck"><input id="sToast" type="checkbox"> ${t('In-app notifications')}</label><label class="ck"><input id="sThin" type="checkbox"> ${t('Thin out crowded areas when zoomed out')}</label>`
    + (window.api?.checkUpdate ? `<div class="sr"><span>${esc($('ver').textContent)}</span><button class="bt2" id="updCheck">${t('Check for updates')}</button></div><div class="rtx" id="updSt"></div>` : '')
    + `<div style="margin-top:14px"><button class="bt2" id="tourAgain">${t('Show the tour again')}</button></div></div>`;
  if (window.api?.openskyGet) window.api.openskyGet().then(r => { if ($('osSt')) { $('osSt').textContent = r.set ? t('Connected as {0}', r.id) : ''; if (r.set && $('osId')) $('osId').placeholder = r.id; } });
  const tr = $('sTray'), nt = $('sNot'); tr.checked = !!LS('sky.tray', false); nt.checked = !!LS('sky.notif', true);
  if (!window.api?.tray) $('lTray').style.display = 'none';
  tr.onchange = () => { save('sky.tray', tr.checked); try { window.api.tray(tr.checked); } catch {} if (tr.checked) toast(t('SkyTrack keeps running in the tray when you close the window')); };
  nt.onchange = () => save('sky.notif', nt.checked);
  const tt = $('sToast'); tt.checked = LS('sky.toast', true); tt.onchange = () => { save('sky.toast', tt.checked); if (!tt.checked) $('toast').replaceChildren(); };
  const th = $('sThin'); th.checked = thinOn; th.onchange = () => { thinOn = th.checked; save('sky.thin', thinOn); redraw(); };
}
stm.onclick = e => {
  if (e.target === stm || e.target.closest('[data-x]')) return modal(stm, false);
  const b = e.target.closest('[data-u]'); if (b) { U[b.dataset.u] = b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v; save('sky.units', U); renderSettings(); refreshAll(); return; }
  const hb = e.target.closest('[data-h]'); if (hb) { HSTEP = +hb.dataset.h; save('sky.hstep', HSTEP); renderSettings(); return; }
  if (e.target.id === 'osSave') { const id = $('osId').value.trim(), sec = $('osSec').value.trim(); window.api.openskySet(id, sec).then(r => { if (r.ok) osSet = !!r.set; toast(r.ok ? t(r.set ? 'OpenSky account saved' : 'OpenSky account removed') : t('Could not store the credentials')); renderSettings(); }); return; }
  if (e.target.id === 'updCheck') { const st = $('updSt'); st.textContent = t('Checking…'); window.api.checkUpdate().then(r => { st.textContent = r.state === 'none' ? t('You are up to date.') : r.state === 'available' ? t(r.manual ? 'Version {0} is available: use the bar at the bottom of the menu.' : 'Version {0} found, downloading…', r.version) : t('Could not check for updates: {0}', r.error || ''); }); return; }
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
    p.slice(0, 2).forEach(({ f, r }) => toastEv(`✈ ${f.cs} · ${ruleLabel(r)}`, f.id)); if (p.length > 2) toastEv(t('{0} more aircraft match your alerts', p.length - 2)); }, 1500); };

/* ---------- overhead: what is flying above me ---------- */
const ovp = $('ovp'); let ov = LS('sky.over', null), ovPlacing = false, ovLayer = L.layerGroup().addTo(map), ovRad = LS('sky.overR', 20);
const OV_MIN = 2, OV_MAX = 50; ovRad = Math.max(OV_MIN, Math.min(OV_MAX, Math.round(+ovRad) || 20)); // radius in km, any whole number from 2 to 50
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], compass = d => COMPASS[Math.round(d / 45) % 8];
function drawOver() { ovLayer.clearLayers(); if (!ov) return;
  const mk = L.marker([ov.lat, ov.lon], { icon: L.divIcon({ className: '', html: '<div class="ovm"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: false }).addTo(ovLayer);
  const box = document.createElement('div'), tt = document.createElement('b'), rm = document.createElement('button'); box.className = 'ovpop'; tt.textContent = '📍 ' + t('Your spot'); rm.textContent = '✕ ' + t('Remove my spot'); rm.onclick = clearOver; box.append(tt, rm);
  mk.bindPopup(box, { closeButton: false, offset: [0, -4] }); // click the marker on the map to remove the spot
  L.circle([ov.lat, ov.lon], { radius: ovRad * 1000, color: '#2f8cff', weight: 1.5, fillOpacity: .06, dashArray: '4 6', interactive: false }).addTo(ovLayer); }
function overList() { if (!ov) return [];
  return [...flights.values()].filter(f => !f.gone && !f.ground && vis(f)).map(f => { const d = km(ov.lat, ov.lon, f.lat, f.lon); return { f, d, b: brg(ov.lat, ov.lon, f.lat, f.lon), el: Math.atan2(f.alt, d * 1000) * 180 / Math.PI }; })
    .filter(x => x.d <= ovRad).sort((a, b) => a.d - b.d); }
// The panel is built once and only its parts are updated: rebuilding it on every change (as before) threw away the slider while it was being dragged
let ovBuilt = '';
function buildOver() {
  ovp.innerHTML = `<div class="ch"><div class="cn"><h2>${t('Overhead')}</h2><small id="ovSub"></small></div><button class="ib" id="ovx" title="${t('Close')}">✕</button></div>`
    + `<div class="ctl"><button id="ovPick"></button><input id="ovA" placeholder="${t('Airport code')}" autocomplete="off"></div>`
    + `<div class="rg"><span>${t('Radius')}</span><input id="ovR" type="range" min="${OV_MIN}" max="${OV_MAX}" step="1" aria-label="${t('Radius')}"><b id="ovRv"></b></div>`
    + `<div class="ctl"><button id="ovRm" class="ovrm">✕ ${t('Remove my spot')}</button></div><div id="ovL"></div>`;
  ovBuilt = LANG + U.dist;
}
function renderOver() {
  if (!ovp.classList.contains('show')) return;
  if (ovBuilt !== LANG + U.dist || !$('ovL')) buildOver();
  $('ovSub').textContent = ov ? t('Aircraft within {0} of your spot', fmtDist(ovRad, U.dist === 'km' ? 0 : 1)) : t('Choose where you are');
  $('ovPick').textContent = '📍 ' + t(ov ? 'Move my spot' : 'Click the map');
  const r = $('ovR'); if (+r.value !== ovRad) r.value = ovRad; $('ovRv').textContent = fmtDist(ovRad, U.dist === 'km' ? 0 : 1);
  $('ovRm').style.display = ov ? '' : 'none';
  const list = overList();
  $('ovL').innerHTML = ov ? (list.length ? list.map(({ f, d, b, el }) => `<div class="ov" data-id="${esc(f.id)}"><div class="dir"><span>${compass(b)}</span><small>${Math.round(el)}°↑</small></div><div class="rm"><b>${esc(f.cs)}</b><small>${esc([f.route ? f.route.org.code + '→' + f.route.dst.code : '', acCode(f), f.route?.airline].filter(Boolean).join(' · '))}</small></div><div class="rs">${fmtDist(d, 1)}<br>${fmtAlt(f.alt * 3.281, 100)}</div></div>`).join('')
      : `<div class="none">${t('Nothing overhead right now.')}</div>`) : `<div class="none">${t('Click the map where you are, or type an airport code. SkyTrack lists the aircraft flying around that spot, with the direction to look and how high in the sky.')}</div>`;
}
// Remove the spot (from the panel, from its marker on the map, or from the left menu)
const syncOvMenu = () => { $('ovRmRow').style.display = ov ? '' : 'none'; };
function clearOver() { ov = null; save('sky.over', null); ovPlacing = false; document.body.classList.remove('placing'); map.closePopup(); drawOver(); renderOver(); syncOvMenu(); toast(t('Overhead spot removed')); }
function setOver(lat, lon, move = true) { document.activeElement?.blur?.(); ov = { lat, lon }; save('sky.over', ov); drawOver(); if (move) map.setView([lat, lon], Math.max(map.getZoom(), 9)); ovp.classList.add('show'); renderOver(); syncOvMenu(); }
ovp.onclick = e => {
  if (e.target.id === 'ovx') { ovp.classList.remove('show'); return; }
  if (e.target.id === 'ovRm') return clearOver();
  if (e.target.id === 'ovPick') { ovPlacing = true; document.body.classList.add('placing'); toast(t('Click the map to set your spot')); return; }
  const r = e.target.closest('.ov'); if (r) select(r.dataset.id);
};
ovp.oninput = e => { if (e.target.id === 'ovR') { ovRad = Math.max(OV_MIN, Math.min(OV_MAX, Math.round(+e.target.value) || OV_MIN)); save('sky.overR', ovRad); drawOver(); renderOver(); } };
ovp.onkeydown = e => { if (e.target.id === 'ovA' && e.key === 'Enter') { const a = knownAps.get(apCode(e.target.value)); if (a) setOver(a.lat, a.lon); else toast(t('Unknown airport: use an IATA or ICAO code, e.g. IST or LTFM')); } };
map.on('click', e => { if (!ovPlacing) return; ovPlacing = false; document.body.classList.remove('placing'); setOver(e.latlng.lat, e.latlng.lng, false); select(null); });
$('bOver').onclick = () => { if (ovp.classList.contains('show')) { ovp.classList.remove('show'); return; } select(null); if (apSel) closeAp(); ovp.classList.add('show'); drawOver(); renderOver(); if (ov) map.setView([ov.lat, ov.lon], Math.max(map.getZoom(), 9)); };
$('bOverRm').onclick = clearOver; setInterval(renderOver, 2500); drawOver(); syncOvMenu();

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
// First run: a welcome screen in English with the language choice (the tour then speaks the chosen language), then the tour
function showWelcome(done) {
  const w = document.createElement('div'); w.id = 'welcome';
  const draw = () => { w.innerHTML = `<div class="wc"><div class="wl">SKYTRACK</div><h3>${t('Welcome to SkyTrack')}</h3><p>${t('Thank you for choosing SkyTrack.')}</p><div class="wq">${t('Choose your language')}</div>`
    + `<div class="wg9">${LANGS.map(l => `<button data-l="${l.c}" class="${l.c === LANG ? 'on' : ''}" lang="${l.c}"><img src="https://flagcdn.com/w40/${l.f}.png" alt="" onerror="this.remove()">${esc(l.n)}</button>`).join('')}</div><button class="go" data-go>${t('Continue')}</button></div>`; w.querySelector('[data-go]').focus(); };
  w.onclick = e => { const b = e.target.closest('[data-l]'); if (b) { setLang(b.dataset.l); draw(); return; } if (e.target.closest('[data-go]')) { save('sky.lang', LANG); w.remove(); done(); } };
  draw(); document.body.appendChild(w);
}
if (!LS('sky.tour', false)) setTimeout(() => { if (!LS('sky.tour', false)) showWelcome(startTour); }, 1200);

/* ---------- update bar ---------- */
const upd = $('upd');
try { window.api?.onUpdate?.(u => { upd.hidden = false;
  if (u.state === 'downloading') upd.innerHTML = `<span>⬇ ${t('Downloading update {0}…', u.version)}</span><i class="pbar" style="width:0"></i>`;
  else if (u.state === 'progress') { const b = upd.querySelector('.pbar'); if (b) b.style.width = u.percent + '%'; }
  else if (u.state === 'ready') upd.innerHTML = `<span>✓ ${t('Update {0} is ready', u.version)}</span><button id="updGo">${t('Restart')}</button>`;
  else if (u.state === 'downloaded') upd.innerHTML = `<span>✓ ${t('Update {0} downloaded', u.version)}</span><button id="updInst">${t('Install')}</button>`;
  else if (u.state === 'manualError') upd.innerHTML = `<span title="${esc(u.error || '')}">${t('Update download failed')}</span><button id="updGo" data-url="${esc(u.url)}">${t('Open the download page')}</button>`;
  else if (u.state === 'manual') upd.innerHTML = `<span>${t('New version {0} available', u.version)}</span>` + (u.canDownload && window.api.downloadUpdate ? `<button id="updDl">${t('Download and install')}</button>` : `<button id="updGo" data-url="${esc(u.url)}">${t('Download')}</button>`); }); } catch {}
upd.onclick = e => {
  if (e.target.id === 'updDl') { e.target.disabled = true; try { window.api.downloadUpdate(); } catch {} return; }
  if (e.target.id === 'updInst') { window.api.installDownloaded().then(x => { if (x?.platform === 'darwin') toast(t('The disk image was opened: drag SkyTrack to Applications')); else if (x?.platform === 'linux') toast(t('The AppImage is in your Downloads folder: make it executable and run it')); }); return; }
  if (e.target.id !== 'updGo') return; const u = e.target.dataset.url; if (u) window.open(u); else try { window.api.installUpdate(); } catch {} };

document.addEventListener('keydown', e => { if (e.key === 'Escape') { modal(stm, false); modal(alm, false); modal(stt, false); } });

/* ---------- stats: what SkyTrack currently sees ---------- */
const stt = $('stt'); let sttT = null;
function statsHtml() {
  const L = [...flights.values()].filter(f => !f.gone), air = L.filter(f => !f.ground), top = (m, n = 5) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const hi = air.reduce((b, f) => (!b || f.alt > b.alt ? f : b), null), fa = air.reduce((b, f) => (!b || f.spd > b.spd ? f : b), null);
  const al = new Map(), ty = new Map(), ap = new Map(); let emg = 0;
  L.forEach(f => { const c = airCode(f); if (c) al.set(c, (al.get(c) || 0) + 1); const k = acCode(f); if (k) ty.set(k, (ty.get(k) || 0) + 1); if (isEmg(f)) emg++;
    if (f.alt * 3.281 < 4000) { const a = nearAp(f.lat, f.lon); if (a) ap.set(a, (ap.get(a) || 0) + 1); } });
  const bars = (arr, lab) => { const mx = Math.max(1, ...arr.map(x => x[1])); return arr.length ? arr.map(([k, n]) => `<div class="bar2"><span>${esc(lab(k))}</span><i style="width:${Math.round(n / mx * 100)}%"></i><b>${n}</b></div>`).join('') : `<div class="none">—</div>`; };
  const tiles = [[t('In the air'), air.length], [t('On the ground'), L.length - air.length], [t('Highest'), hi ? fmtAlt(hi.alt * 3.281, 100) : '—', hi?.cs], [t('Fastest'), fa ? fmtSpd(fa.spd * 1.944) : '—', fa?.cs]];
  return `<div class="bx"><div class="hd"><h2>${t('Stats')}</h2>${closeX()}</div><div class="rtx">${t('Based on the aircraft SkyTrack has loaded around the map.')}</div>`
    + `<div class="st4">${tiles.map(x => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b>${x[2] ? `<small>${esc(x[2])}</small>` : ''}</div>`).join('')}</div>`
    + (emg ? `<div class="emgn">⚠ ${t('{0} aircraft with an emergency code', emg)}</div>` : '')
    + `<div class="cols"><div><h3>${t('Top airlines')}</h3>${bars(top(al), k => AIRLINE[k]?.[0] || k)}</div><div><h3>${t('Top aircraft types')}</h3>${bars(top(ty), k => k)}</div><div><h3>${t('Busiest airports')}</h3>${bars(top(ap), k => k)}</div></div></div>`; }
const renderStats = () => { if (stt.classList.contains('show')) stt.innerHTML = statsHtml(); };
stt.onclick = e => { if (e.target === stt || e.target.closest('[data-x]')) { modal(stt, false); clearInterval(sttT); } };
$('bStats').onclick = () => { renderStats(); modal(stt, true); stt.innerHTML = statsHtml(); clearInterval(sttT); sttT = setInterval(renderStats, 3000); };

refreshAll();
