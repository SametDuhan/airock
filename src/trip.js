// Trip tools: seat tips on the flight card, route check (turbulence between two airports), turbulence alerts for watched flights,
// watching a flight by number before it departs, and tracking links. Loaded after tools.js.

/* ---------- seat tips ---------- */
// The sun side comes from the real sun position (SkyGeo.sunSide); the turbulence tip appears when the route ahead has advisories (level 2+)
const baseRows = X.rows;
X.rows = (f, rows) => {
  baseRows(f, rows); if (f.ground) return;
  const at = rows.findIndex(r => r[0] === 'Position'), add = [];
  if (f.tbs === 'ok' && f.tb.level >= 2) add.push(['Seat tip', t('Over the wings you feel turbulence least, the back rows most.')]);
  const sn = SkyGeo.sunSide(f.lat, f.lon, f.hdg);
  if (sn.side) add.push(['Sun side', sn.side === 'right' ? t('Right side') : t('Left side')]);
  rows.splice(at < 0 ? rows.length : at, 0, ...add);
};

/* ---------- route check ---------- */
const rcm = $('rcm'), RC_FL = [280, 340, 390]; let rc = LS('sky.rc', { a: '', b: '' }), rcOut = '', rcLine = null;
const rcLevel = l => l >= 3 ? ['r', 'High turbulence risk'] : l === 2 ? ['y', 'Moderate turbulence possible'] : ['g', 'Nothing reported'];
function renderRc() {
  rcm.innerHTML = `<div class="bx"><div class="hd"><h2>${t('Route check')}</h2>${closeX()}</div><div class="rtx">${t('Is there turbulence on a route? Pick two airports to see what is reported along the way at three cruise altitudes.')}</div>`
    + `<div class="os rcf"><input id="rcA" list="apList" placeholder="${t('From')}" value="${esc(rc.a)}" autocomplete="off"><input id="rcB" list="apList" placeholder="${t('To')}" value="${esc(rc.b)}" autocomplete="off"><button class="bt2" id="rcGo">${t('Check route')}</button></div>`
    + `<div class="ch2">${selected && flights.get(selected)?.route ? `<button id="rcSel">${t('Use selected flight')}</button>` : ''}</div><div id="rcOut">${rcOut}</div></div>`;
}
const rcAp = v => { const c = apCode(v || ''); return knownAps.get(c) || null; };
async function runRc() {
  const A = rcAp($('rcA').value), B = rcAp($('rcB').value);
  if (!A || !B) return toast(t('Unknown airport: use an IATA or ICAO code, e.g. IST or LTFM'));
  if (A === B) return;
  rc = { a: A.code, b: B.code }; save('sky.rc', rc); $('rcOut').innerHTML = `<div class="none">${t('Loading…')}</div>`;
  const path = SkyGeo.gc([A.lat, A.lon], [B.lat, B.lon], 60), dist = SkyGeo.km(A.lat, A.lon, B.lat, B.lon);
  const res = await Promise.all(RC_FL.map(fl => DATA.turb(path, fl * 100)));
  const rows = res.map((r, i) => { if (!r.ok) return `<div class="rcr"><span class="dots"><i></i></span><b>FL${RC_FL[i]}</b><span>${t('Turbulence data unavailable')}</span></div>`;
    const [c, txt] = rcLevel(r.level), more = r.level >= 2 && r.km != null ? ` · ${t('first about {0} from {1}', fmtDist(r.km), A.code)}` : '';
    return `<div class="rcr"><span class="dots"><i class="${c}"></i></span><b>FL${RC_FL[i]}</b><span>${t(txt)}${more}</span></div>`; });
  rcOut = `<h3>${esc(A.code)} → ${esc(B.code)} · ${fmtDist(dist)}</h3>${rows.join('')}<div class="rtx" style="margin-top:12px">${t('Based on SIGMET / G-AIRMET advisories and pilot reports from the last 2 hours. Nothing reported is not a guarantee.')}</div>`
    + `<div class="ch2"><button id="rcMap">${t('Show on map')}</button></div>`;
  $('rcOut').innerHTML = rcOut; drawRc(path);
}
function drawRc(path) { rcLine && rcLine.remove(); rcLine = L.polyline(SkyGeo.unwrap(path.map(p => p.slice())), { color: '#2f8cff', weight: 3, dashArray: '8 8', interactive: false }).addTo(map); }
rcm.onclick = e => {
  if (e.target === rcm || e.target.closest('[data-x]')) return modal(rcm, false);
  if (e.target.id === 'rcGo') return runRc();
  if (e.target.id === 'rcSel') { const f = flights.get(selected); if (f?.route) { rc = { a: f.route.org.code, b: f.route.dst.code }; $('rcA').value = rc.a; $('rcB').value = rc.b; runRc(); } return; }
  if (e.target.id === 'rcMap') { if (rcLine) { modal(rcm, false); map.fitBounds(rcLine.getBounds().pad(.2)); if (!$('bTb').classList.contains('on')) $('bTb').click(); } }
};
rcm.onkeydown = e => { if (e.key === 'Enter' && /^rc[AB]$/.test(e.target.id)) runRc(); };
$('bRoute').onclick = () => { rcOut = ''; renderRc(); modal(rcm, true); };

/* ---------- turbulence alerts for watched flights ---------- */
const tbLast = new Map();
async function tbWatchTick() {
  if (!live || !navigator.onLine) return;
  for (const id of [...watch.keys()]) {
    const f = flights.get(id); if (!f || f.ground || f.gone) { tbLast.delete(id); continue; }
    await loadTurb(f); if (f.tbs !== 'ok') continue;
    const lv = f.tb.level, prev = tbLast.get(id) ?? 0, w = watch.get(id);
    if (lv >= 2 && lv > prev) toastEv((lv >= 3 ? '⚠ ' : '') + (lv >= 3 ? t('{0}: high turbulence risk ahead (~{1}). Keep your seat belt fastened.', w.cs, fmtDist(f.tb.km || 0)) : t('{0}: moderate turbulence possible ahead (~{1}). Keep your seat belt fastened.', w.cs, fmtDist(f.tb.km || 0))), id);
    else if (lv === 0 && prev >= 2) toastEv(t('{0}: nothing reported on the route ahead any more', w.cs), id);
    tbLast.set(id, lv);
  }
}
setInterval(tbWatchTick, 60000); setTimeout(tbWatchTick, 8000);

/* ---------- watch a flight by number, before it departs ---------- */
// "TK1" → THY1 (ICAO callsign) for common airlines; anything else is used as typed
const IATA2ICAO = { TK: 'THY', PC: 'PGT', VF: 'AJA', XQ: 'SXS', W6: 'WZZ', KL: 'KLM', LH: 'DLH', BA: 'BAW', EK: 'UAE', AZ: 'AZA', AF: 'AFR', LX: 'SWR', OS: 'AUA', QR: 'QTR', EY: 'ETD', LO: 'LOT',
  IB: 'IBE', FR: 'RYR', U2: 'EZY', AY: 'FIN', SK: 'SAS', TP: 'TAP', SQ: 'SIA', AA: 'AAL', DL: 'DAL', UA: 'UAL' };
const toCallsign = v => { v = String(v || '').toUpperCase().replace(/\s/g, ''); const m = /^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/.exec(v); return m && IATA2ICAO[m[1]] && !/^[A-Z]{3}/.test(v) ? IATA2ICAO[m[1]] + m[2] : v; };
function addPending(raw) {
  const cs = toCallsign(raw); if (!/^[A-Z0-9]{3,8}$/.test(cs)) return toast(t('Enter a flight number, e.g. TK1 or THY1'));
  const key = 'cs:' + cs; if (watch.has(key)) return;
  watch.set(key, { cs, reg: '', pending: true }); saveWatch(); renderWatch(); renderAlerts(); toast(t('Watching {0}: SkyTrack tells you when it is in the air, and about turbulence ahead', cs)); checkPending();
}
async function checkPending() {
  if (!live) return; const pend = [...watch].filter(([k, w]) => w.pending);
  for (const [key, w] of pend) {
    const r = await DATA.find(w.cs); if (!r.ok) continue;
    const f = r.flights.find(x => x.cs.toUpperCase() === w.cs && !x.ground); if (!f) continue;
    watch.delete(key); watch.set(f.id, { cs: f.cs, reg: f.ac?.reg || f.reg || '' }); wlState.set(f.id, { ground: false, t: Date.now() }); saveWatch(); upsert(f); redraw(); renderWatch(); renderAlerts();
    toastEv(t('{0} is in the air: watching', f.cs), f.id);
  }
}
setInterval(checkPending, 45000);
const baseAlerts = renderAlerts;
renderAlerts = function () { baseAlerts();
  const pend = [...watch].filter(([k, w]) => w.pending), bx = alm.querySelector('.bx'); if (!bx) return;
  bx.insertAdjacentHTML('beforeend', `<h3>${t('Watch a flight')}</h3><div class="rtx">${t('Enter a flight number. You get a notification when it is in the air and when there is turbulence ahead.')}</div>`
    + `<div class="os wff"><input id="wfN" placeholder="${t('Flight number, e.g. TK1')}" autocomplete="off"><button class="bt2" id="wfAdd" type="button">${t('Watch')}</button></div>`
    + pend.map(([k, w]) => `<div class="ar2"><b>${esc(w.cs)}</b><span>${t('waiting for departure')}</span><button data-rm="${esc(k)}" title="${t('Remove')}">✕</button></div>`).join(''));
};
alm.addEventListener('click', e => { if (e.target.id === 'wfAdd') addPending($('wfN').value); const rm = e.target.closest('[data-rm]'); if (rm && watch.has(rm.dataset.rm)) { watch.delete(rm.dataset.rm); saveWatch(); renderWatch(); renderAlerts(); } });
alm.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'wfN') { e.preventDefault(); addPending(e.target.value); } });

/* ---------- tracking link (needs the proxy: see proxy/README.md) ---------- */
const SHARE = (window.SkyData && window.SkyData.shareBase) || '';
const baseB2 = X.bottom2, baseClick = X.click;
X.bottom2 = f => baseB2(f) + (SHARE && live && f.cs ? `<div class="bt"><button id="lnk">🔗 ${t('Copy tracking link')}</button></div>` : '');
X.click = e => {
  if (e.target.id === 'lnk') { const f = flights.get(selected); if (f) { const u = SHARE + '?cs=' + encodeURIComponent(f.cs.trim());
    (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast(t('Tracking link copied')), () => toast(u)); } return true; }
  return baseClick(e);
};
renderWatch();
