// Tracking link page: shows one flight (by callsign, ?cs=THY1) from the live feeds through the SkyTrack proxy. Turbulence ahead is judged by the same code as the app.
(() => {
  const $ = id => document.getElementById(id), D = window.SkyData, G = window.SkyGeo;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const cs = (new URLSearchParams(location.search).get('cs') || '').trim().toUpperCase();
  const say = h => { $('info').innerHTML = h; };
  const back = '<a class="btn" href="../">Get SkyTrack</a>';
  if (!/^[A-Z0-9]{2,8}$/.test(cs)) return say(`<div class="msg">No flight in this link.</div>${back}`);
  if (!D.shareBase) return say(`<div class="msg">Live tracking links are not switched on yet. The SkyTrack desktop app shows this flight live.</div>${back}`);
  const map = L.map('map', { zoomControl: true, worldCopyJump: true }).setView([45, 20], 4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  let mk = null, line = null, route = null, routeFor = '', tb = null, tbAt = 0, first = true;
  const planeIcon = h => L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15],
    html: `<svg width="30" height="30" viewBox="0 0 24 24" style="transform:rotate(${h}deg)"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="#f5c431" stroke="#000" stroke-width="1"/></svg>` });
  const kmFmt = k => Math.round(k).toLocaleString() + ' km', hm = h => h < 1 ? Math.round(h * 60) + ' min' : Math.floor(h) + ' h ' + Math.round(h % 1 * 60) + ' min';
  async function tick() {
    const r = await D.find(cs);
    if (!r.ok) { if (first) say(`<div class="msg">Could not reach the flight data right now. Trying again…</div>`); return; }
    const f = r.flights.find(x => x.cs.toUpperCase() === cs && !x.ground) || r.flights.find(x => x.cs.toUpperCase() === cs);
    first = false;
    if (!f) return say(`<h1>${esc(cs)}</h1><div class="msg">Not in the air right now. It may not have departed yet, or it has already landed.</div>${back}`);
    if (routeFor !== cs) { routeFor = cs; const rr = await D.route(cs); route = rr.ok ? rr.route : null; }
    const dest = route?.dst ? [route.dst.lat, route.dst.lon] : null;
    if (!f.ground && !tb || Date.now() - tbAt > 300e3) { const tr = await D.turb(G.ahead(f.lat, f.lon, f.hdg, dest), f.alt * 3.281); tb = tr.ok ? tr : null; tbAt = Date.now(); }
    const left = dest ? G.km(f.lat, f.lon, dest[0], dest[1]) : null, flown = route?.org ? G.km(route.org.lat, route.org.lon, f.lat, f.lon) : null;
    const pct = left != null && flown != null ? Math.max(0, Math.min(100, flown / (flown + left) * 100)) : 0, kmh = f.spd * 3.6;
    const eta = left != null && kmh > 100 ? new Date(Date.now() + left / kmh * 3600e3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const tbc = f.ground ? ['x', 'On the ground'] : !tb ? ['x', 'Turbulence information unavailable'] : tb.level >= 3 ? ['r', `High turbulence risk ahead (~${kmFmt(tb.km || 0)})`] : tb.level === 2 ? ['y', `Moderate turbulence possible ahead (~${kmFmt(tb.km || 0)})`] : ['g', 'No turbulence reported or forecast on the route ahead'];
    say(`<h1>${esc(f.cs)}</h1><div class="air">${esc(route?.airline || '')}</div>`
      + (route ? `<div class="rt"><div><b>${esc(route.org.code)}</b><small>${esc(route.org.name)}</small></div><div style="text-align:right"><b>${esc(route.dst.code)}</b><small>${esc(route.dst.name)}</small></div></div><div class="pg"><i style="width:${pct.toFixed(0)}%"></i></div>` : '')
      + (left != null ? `<div class="kv"><span>Distance left</span><b>${kmFmt(left)}${kmh > 100 ? ' · ~' + hm(left / kmh) : ''}</b></div>` : '') + (eta ? `<div class="kv"><span>Arrives (est.)</span><b>${eta}</b></div>` : '')
      + `<div class="kv"><span>Altitude</span><b>${f.ground ? 'ground' : Math.round(f.alt * 3.281).toLocaleString() + ' ft'}</b></div><div class="kv"><span>Speed</span><b>${Math.round(f.spd * 1.944)} kt</b></div>`
      + `<div class="tb ${tbc[0]}">${tbc[1]}</div><div class="note">Based on SIGMET / G-AIRMET advisories and pilot reports. Nothing reported is not a guarantee.</div>${back}`);
    $('upd').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ll = [f.lat, f.lon]; if (mk) mk.setLatLng(ll).setIcon(planeIcon(f.hdg)); else mk = L.marker(ll, { icon: planeIcon(f.hdg), interactive: false }).addTo(map);
    line && line.remove(); if (route && dest) line = L.polyline(G.unwrap(G.gc(ll, dest, 40).map(p => p.slice())), { color: '#2f8cff', weight: 3, dashArray: '8 8' }).addTo(map);
    if (!map._moved) { map.setView(ll, 6); map._moved = true; }
  }
  tick(); setInterval(tick, 15000);
})();
