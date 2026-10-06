// Extra features: settings (tray, notifications), flight diary, share image, altitude / speed profile.
// Loaded after extras.js; it plugs into the card hooks in the `X` object.

/* ---------- settings: run in the tray, desktop notifications ---------- */
{ const tr = $('sTray'), nt = $('sNot');
  tr.checked = !!LS('sky.tray', false); nt.checked = !!LS('sky.notif', true);
  try { window.api?.tray?.(tr.checked); } catch {}
  if (!window.api?.tray) tr.closest('label').style.display = 'none'; // browser build: no tray
  tr.onchange = () => { save('sky.tray', tr.checked); try { window.api?.tray?.(tr.checked); } catch {} if (tr.checked) toast(t('SkyTrack keeps running in the tray when you close the window')); };
  nt.onchange = () => save('sky.notif', nt.checked); }

/* ---------- helpers ---------- */
const saveFile = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const fmtDur = s => { const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h ? h + t(' h ') + m + t(' min') : m + t(' min'); };
const co2pp = d => d * (d < 1500 ? .13 : d < 4000 ? .10 : .09); // kg CO2 per passenger (rough economy-class average)

/* ---------- flight diary ---------- */
let diary = LS('sky.diary', []);
const saveDiary = () => save('sky.diary', diary);
const dyEl = document.createElement('div'); dyEl.id = 'dy'; $('app').appendChild(dyEl);
const apPos = c => knownAps.get(apCode(c || ''));
function diaryAdd(e) {
  const a = apPos(e.from), b = apPos(e.to); if (!a || !b || a === b) return false;
  diary.push({ id: Date.now() + Math.random(), date: e.date || new Date().toISOString().slice(0, 10), from: a.code, to: b.code, fl: (e.fl || '').toUpperCase().trim(), type: (e.type || '').toUpperCase().trim(), km: Math.round(km(a.lat, a.lon, b.lat, b.lon)) });
  diary.sort((x, y) => y.date.localeCompare(x.date) || y.id - x.id); saveDiary(); return true;
}
function renderDiary() {
  const km_ = diary.reduce((s, x) => s + x.km, 0), co2 = diary.reduce((s, x) => s + co2pp(x.km), 0), n = v => Math.round(v).toLocaleString(LOC());
  const tiles = [[t('Flights'), diary.length], [t('Distance'), n(km_) + ' km'], [t('Around the Earth'), (km_ / 40075).toFixed(2) + '×'], ['CO₂ ' + t('(est.)'), n(co2) + ' kg']];
  dyEl.innerHTML = `<div class="bx"><div class="hd"><h2>${t('Flight diary')}</h2><button class="ib" data-x aria-label="${t('Close')}" title="${t('Close')}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg></button></div>`
    + `<div class="st4">${tiles.map(x => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('')}</div>`
    + `<form id="dyf"><input id="dyD" type="date" value="${new Date().toISOString().slice(0, 10)}" required><input id="dyA" list="apList" placeholder="${t('From')}" autocomplete="off" required><input id="dyB" list="apList" placeholder="${t('To')}" autocomplete="off" required>`
    + `<input id="dyN" placeholder="${t('Flight no.')}" autocomplete="off"><input id="dyT" placeholder="${t('Aircraft type')}" autocomplete="off"><button class="bt2" type="submit">${t('Add')}</button></form><div class="rtx" id="dyE"></div>`
    + `<div class="ls">${diary.length ? diary.map(x => `<div class="de"><span class="dd">${esc(x.date)}</span><b>${esc(x.from)} → ${esc(x.to)}</b><span class="dm">${esc([x.fl, x.type].filter(Boolean).join(' · '))}</span><span class="dk">${x.km.toLocaleString(LOC())} km</span><button class="wx2" data-del="${x.id}" title="${t('Remove')}">✕</button></div>`).join('')
      : `<div class="none">${t('Your diary is empty. Add a flight above, or open a flight on the map and press “Add to diary”.')}</div>`}</div>`
    + `<div class="ft"><button class="bt2" data-csv>${t('Export CSV')}</button></div></div>`;
}
function openDiary() { renderDiary(); dyEl.classList.add('show'); }
dyEl.onclick = e => {
  if (e.target === dyEl || e.target.closest('[data-x]')) return dyEl.classList.remove('show');
  const d = e.target.closest('[data-del]'); if (d) { diary = diary.filter(x => String(x.id) !== d.dataset.del); saveDiary(); return renderDiary(); }
  if (e.target.closest('[data-csv]')) { const rows = [['date', 'from', 'to', 'flight', 'aircraft', 'km', 'co2_kg_per_passenger'], ...diary.map(x => [x.date, x.from, x.to, x.fl, x.type, x.km, co2pp(x.km).toFixed(0)])];
    saveFile(new Blob(['﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')], { type: 'text/csv' }), 'skytrack-diary.csv'); }
};
dyEl.onsubmit = e => { e.preventDefault(); const v = id => $(id).value;
  if (diaryAdd({ date: v('dyD'), from: v('dyA'), to: v('dyB'), fl: v('dyN'), type: v('dyT') })) renderDiary(); else $('dyE').textContent = t('Unknown airport: use an IATA or ICAO code, e.g. IST or LTFM'); };
$('bDiary').onclick = openDiary;
document.addEventListener('keydown', e => { if (e.key === 'Escape') dyEl.classList.remove('show'); });

/* ---------- share image ---------- */
function shareImage(f) {
  const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), ac = f.ac || {}, F = "'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif";
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1d1d1d'); g.addColorStop(1, '#0d0d0d'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rg = x.createRadialGradient(W * .78, H * .3, 10, W * .78, H * .3, 520); rg.addColorStop(0, 'rgba(245,196,49,.20)'); rg.addColorStop(1, 'rgba(245,196,49,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  x.fillStyle = '#f2c230'; x.font = "800 30px Cambria,Georgia,serif"; x.textBaseline = 'alphabetic'; x.letterSpacing = '6px'; x.fillText('SKYTRACK', 60, 76); x.letterSpacing = '0px';
  x.fillStyle = '#8d877c'; x.font = `600 22px ${F}`; x.textAlign = 'right'; x.fillText(new Date().toLocaleString(LOC(), { dateStyle: 'medium', timeStyle: 'short' }), W - 60, 74); x.textAlign = 'left';
  x.fillStyle = '#fff'; x.font = `800 92px ${F}`; x.fillText(f.cs, 56, 190);
  x.fillStyle = '#cfc7b6'; x.font = `500 30px ${F}`; x.fillText([f.route?.airline || ac.owner, ac.type || f.type].filter(Boolean).join(' · ').slice(0, 56), 60, 236);
  const r = f.route, y0 = 400;
  if (r) {
    x.font = `800 84px ${F}`; x.fillStyle = '#f2c230'; x.fillText(r.org.code, 60, 360); x.textAlign = 'right'; x.fillText(r.dst.code, W - 60, 360); x.textAlign = 'left';
    x.font = `500 22px ${F}`; x.fillStyle = '#8d877c'; x.fillText((r.org.name || '').slice(0, 28), 62, 394); x.textAlign = 'right'; x.fillText((r.dst.name || '').slice(0, 28), W - 62, 394); x.textAlign = 'left';
    const ax = 330, bx = W - 330, ay = 335, cy = 215, pt = k => { const u = 1 - k; return { x: u * u * ax + 2 * u * k * (W / 2) + k * k * bx, y: u * u * ay + 2 * u * k * cy + k * k * ay }; };
    const a = km(r.org.lat, r.org.lon, f.lat, f.lon), b = km(f.lat, f.lon, r.dst.lat, r.dst.lon), prog = Math.max(.04, Math.min(.96, a / (a + b || 1)));
    x.lineCap = 'round'; x.setLineDash([2, 12]); x.lineWidth = 4; x.strokeStyle = '#ffffff40'; x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo(W / 2, cy, bx, ay); x.stroke(); x.setLineDash([]);
    x.strokeStyle = '#f2c230'; x.lineWidth = 5; x.beginPath(); for (let k = 0; k <= 40; k++) { const p = pt(prog * k / 40); k ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); } x.stroke();
    [0, 1].forEach(k => { const p = pt(k); x.fillStyle = '#fff'; x.beginPath(); x.arc(p.x, p.y, 9, 0, 7); x.fill(); x.fillStyle = '#f2c230'; x.beginPath(); x.arc(p.x, p.y, 5, 0, 7); x.fill(); });
    const p = pt(prog), q = pt(Math.min(1, prog + .01)), hdg = Math.atan2(q.x - p.x, -(q.y - p.y)) * 180 / Math.PI; x.lineWidth = 1; x.strokeStyle = '#000'; icon(x, p, hdg, 64, '#fff', kindOf(f));
  } else { x.font = `600 40px ${F}`; x.fillStyle = '#f2c230'; x.fillText(f.lat.toFixed(2) + ', ' + f.lon.toFixed(2), 60, 330); }
  const vs = Math.round(f.vr * 196.85), TL = TILE_L[LANG] || TILE_L.en, tiles = [[TL[0], f.ground ? t('on ground') : Math.round(f.alt * 3.281).toLocaleString(LOC()) + ' ft'], [TL[1], Math.round(f.spd * 1.944) + ' kt'], [t('Heading'), Math.round(f.hdg) + '°'], [TL[2], (vs > 0 ? '+' : vs < 0 ? '−' : '') + Math.abs(vs).toLocaleString(LOC()) + ' ft/min']];
  tiles.forEach(([k, v], i) => { const tx = 60 + i * 280; x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.roundRect(tx, 450, 255, 100, 16); x.fill();
    x.fillStyle = '#8d877c'; x.font = `700 17px ${F}`; x.letterSpacing = '2px'; x.fillText(String(k).toUpperCase(), tx + 22, 487); x.letterSpacing = '0px'; x.fillStyle = '#fff'; x.font = `800 34px ${F}`; x.fillText(v, tx + 22, 531); });
  x.fillStyle = '#6f6a60'; x.font = `600 20px ${F}`; x.fillText(t('Free flight tracker · no account, no ads'), 60, 594); x.textAlign = 'right'; x.fillText('sametduhan.github.io/airock', W - 60, 594); x.textAlign = 'left';
  c.toBlob(async blob => { saveFile(blob, `SkyTrack-${f.cs}.png`); try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast(t('Image saved and copied to the clipboard')); } catch { toast(t('Image saved')); } }, 'image/png');
}

/* ---------- altitude / speed profile in the card ---------- */
function profSvg(p) {
  const W = 238, H = 92, L = 4, B = 14, T = 6, tm = p[p.length - 1][0] || 1, ma = Math.max(1000, ...p.map(r => r[1])), ms = Math.max(50, ...p.map(r => r[2] || 0));
  const X_ = s => L + s / tm * (W - L * 2), YA = a => H - B - a / ma * (H - B - T), YS = v => H - B - v / ms * (H - B - T);
  const al = p.map(r => `${X_(r[0]).toFixed(1)},${YA(r[1]).toFixed(1)}`).join(' '), sp = p.filter(r => r[2] != null).map(r => `${X_(r[0]).toFixed(1)},${YS(r[2]).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%"><polygon points="${X_(0)},${H - B} ${al} ${X_(tm)},${H - B}" fill="rgba(242,194,48,.18)"/><polyline points="${sp}" fill="none" stroke="#5aa9ff" stroke-width="1.4" opacity=".85"/><polyline points="${al}" fill="none" stroke="#f2c230" stroke-width="2" stroke-linejoin="round"/>`
    + `<circle cx="${X_(tm)}" cy="${YA(p[p.length - 1][1])}" r="3.5" fill="#fff" stroke="#f2c230" stroke-width="1.5"/><text x="${L}" y="${H - 2}" class="ax">0</text><text x="${W - L}" y="${H - 2}" class="ax" text-anchor="end">${fmtDur(tm)}</text></svg>`
    + `<div class="lg2"><span><i style="background:#f2c230"></i>${t('Altitude')} · ${t('max')} ${Math.round(ma / 100) * 100} ft</span><span><i style="background:#5aa9ff"></i>${t('Speed')} · ${t('max')} ${ms} kt</span></div>`;
}
const drawProf = f => { const el = $('prf'); if (!el) return; const p = f.prof; if (!(p?.length > 5)) { el.innerHTML = ''; el.dataset.k = ''; return; }
  const k = f.id + p.length; if (el.dataset.k === k) return; el.dataset.k = k; el.innerHTML = `<div class="lbl" style="margin-top:14px">${t('Altitude & speed')}</div>` + profSvg(p); };

/* ---------- card hooks ---------- */
const b2 = X.bottom2, sync = X.sync, clk = X.click;
X.bottom2 = f => `<div class="bt"><button id="shb">📷 ${t('Share image')}</button>${f.route ? `<button id="dyb">📓 ${t('Add to diary')}</button>` : ''}</div><div id="prf"></div>` + b2(f);
X.sync = f => { sync(f); drawProf(f); };
X.click = e => {
  const f = flights.get(selected);
  if (f && e.target.id === 'shb') { shareImage(f); return true; }
  if (f && e.target.id === 'dyb') { if (f.route && diaryAdd({ from: f.route.org.code, to: f.route.dst.code, fl: f.cs, type: f.ac?.icaoType || f.type })) toast(t('Added to your diary')); return true; }
  return clk(e);
};
