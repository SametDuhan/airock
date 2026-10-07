// Extras on top of the map: emergency alerts, watchlist, today's flights, rain radar, plane spotter mode (logbook) and the language switch.
// Loaded after renderer.js; it plugs into the hooks in the `X` object there.
const hhmm = s => new Date(s * 1000).toLocaleTimeString(LOC(), TF({ hour: '2-digit', minute: '2-digit' }));
const nearAp = (lat, lon) => { let b = '', m = 40; knownAps.forEach(a => { const d = km(lat, lon, a.lat, a.lon); if (d < m) { m = d; b = a.code; } }); return b; };
const HEX6 = /^[0-9a-f]{6}$/i;

/* ---------- emergencies + watchlist events (called after every position update) ---------- */
const emgSeen = new Set(), wlState = new Map(); // wlState: id → { ground, t } (survives the aircraft leaving the map)
X.event = f => {
  if (live && isEmg(f) && !emgSeen.has(f.id + emgCode(f))) { emgSeen.add(f.id + emgCode(f)); toast(`⚠ ${f.cs}: ${t(EMG[emgCode(f)])} (${emgCode(f)})`, f.id); }
  if (watch.has(f.id)) {
    const st = wlState.get(f.id);
    if (st && st.ground !== f.ground) toast(t(f.ground ? '{0} landed' : '{0} took off', f.cs));
    wlState.set(f.id, { ground: f.ground, t: Date.now() });
  }
};
X.arrive = f => { if (watch.has(f.id)) toast(t('{0} landed', f.cs)); }; // demo flights "land" when they reach their destination

/* ---------- watchlist ---------- */
const saveWatch = () => save('sky.watch', [...watch]);
function toggleWatch(f) {
  if (watch.has(f.id)) watch.delete(f.id); else { watch.set(f.id, { cs: f.cs, reg: f.ac?.reg || f.reg || '' }); wlState.set(f.id, { ground: f.ground, t: Date.now() }); toast(t('Watching {0}: you will be notified when it takes off or lands', f.cs)); }
  saveWatch(); renderWatch(); renderCard(); pollWatch();
}
function renderWatch() {
  const el = $('wls'); el.style.display = watch.size ? '' : 'none'; if (!watch.size) return;
  el.innerHTML = `<div class="lbl">${t('Watchlist')}</div>` + [...watch].map(([id, w]) => {
    const f = flights.get(id), st = wlState.get(id);
    const s = w.pending ? t('waiting for departure') : f ? (f.ground ? t('on ground') : ft(f.alt)) : st ? t('last seen {0} min ago', Math.max(1, Math.round((Date.now() - st.t) / 60000))) : t('not seen yet');
    return `<div class="wr" data-w="${esc(id)}"><b>${esc(w.cs)}${w.reg ? ' · ' + esc(w.reg) : ''}</b><span>${esc(s)}</span><button class="wx2" data-rm="${esc(id)}" title="${t('Remove')}">✕</button></div>`; }).join('');
}
$('wls').onclick = e => {
  const rm = e.target.closest('[data-rm]'); if (rm) { watch.delete(rm.dataset.rm); saveWatch(); renderWatch(); if (selected) renderCard(); return; }
  const r = e.target.closest('.wr'); if (!r) return;
  if (flights.has(r.dataset.w)) select(r.dataset.w); else { toast(t('Not on the map right now')); pollWatch(); }
};
// Live: ask for the watched aircraft anywhere in the world (one request), not only those inside the visible area
async function pollWatch() {
  if (!live || !watch.size) return; const ids = [...watch.keys()].filter(id => HEX6.test(id)); if (!ids.length) return;
  const r = await DATA.watch(ids); if (!r.ok || !live) return;
  r.flights.forEach(upsert); redraw(); renderWatch();
}
setInterval(pollWatch, 45000); setInterval(renderWatch, 2000);

/* ---------- today's flights of one aircraft ---------- */
const legLayer = L.layerGroup().addTo(map);
X.sel = () => legLayer.clearLayers();
async function loadLegs(f) {
  f.legs = 'loading'; if (f.id === selected) renderCard(true);
  const r = await DATA.legs(f.id); f.legs = r.ok ? r.legs : 'err'; if (f.id === selected) renderCard(true);
}
function legsHtml(f) {
  if (!live || !HEX6.test(f.id)) return '';
  if (!f.legs) return `<button id="lgb" class="sm">${t("Today's flights")}</button>`;
  if (f.legs === 'loading') return `<div class="rtx" style="margin-top:12px">${t('Loading…')}</div>`;
  if (f.legs === 'err') return `<div class="rtx" style="margin-top:12px">${t("Couldn't load today's flights")}</div>`;
  if (!f.legs.length) return `<div class="rtx" style="margin-top:12px">${t('No flights recorded today')}</div>`;
  return `<div class="lbl" style="margin-top:14px">${t("Today's flights")}</div>` + f.legs.map((l, i) => ({ l, i })).reverse().map(({ l, i }) =>
    `<div class="lg" data-i="${i}"><b>${esc(nearAp(...l.from) || '?')} → ${l.open ? t('in flight') : esc(nearAp(...l.to) || '?')}</b>`
    + `<span>${hhmm(l.t0)}–${l.open ? t('now') : hhmm(l.t1)} · ${fmtDist(l.km)} · ${fmtAlt(l.maxAlt)}</span></div>`).join('');
}
function drawLeg(f, i) {
  const l = Array.isArray(f.legs) && f.legs[i]; if (!l) return; legLayer.clearLayers();
  const line = L.polyline(unwrap(l.pts.map(p => [p[0], p[1]])), { color: '#4cd964', weight: 3.5, opacity: .95, dashArray: '2 8', lineCap: 'round', interactive: false }).addTo(legLayer);
  map.fitBounds(line.getBounds().pad(.15), { maxZoom: 9 });
}

/* ---------- rain radar (RainViewer) ---------- */
let radarLayer = null, radarT = 0;
async function setRadar(on) {
  $('bRd').classList.toggle('on', on);
  if (!on) { radarLayer && radarLayer.remove(); radarLayer = null; clearInterval(radarT); return; }
  const r = await DATA.radar(); if (!$('bRd').classList.contains('on')) return;
  if (!r.ok) { toast(t('Radar unavailable')); $('bRd').classList.remove('on'); return; }
  radarLayer && radarLayer.remove();
  radarLayer = L.tileLayer(`${r.host}${r.path}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: .6, zIndex: 5, maxNativeZoom: 7, maxZoom: 19, attribution: 'Radar &copy; RainViewer' }).addTo(map);
  $('bRd').title = t('Rain radar') + ' · ' + new Date(r.time * 1000).toLocaleTimeString(LOC(), TF());
  clearInterval(radarT); radarT = setInterval(() => setRadar(true), 600e3); // radar images update about every 10 minutes
}
$('bRd').onclick = () => setRadar(!radarLayer);

/* ---------- satellite imagery with clouds (NASA GIBS, VIIRS true color, the latest daily image; free, no key) ---------- */
let cloudLayer = null;
function setClouds(on) {
  $('bCl').classList.toggle('on', on);
  if (!on) { cloudLayer && cloudLayer.remove(); cloudLayer = null; return; }
  cloudLayer = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    { opacity: .75, zIndex: 4, maxNativeZoom: 9, maxZoom: 19, className: 'sat-tiles', attribution: 'Imagery &copy; NASA GIBS' }).addTo(map);
}
$('bCl').onclick = () => setClouds(!cloudLayer);

/* ---------- trails button: off / short (5 min) / long (30 min) ---------- */
function setTrail(m) { TRAIL = m; save('sky.trail', m); $('bTr').classList.toggle('on', m > 0); $('bTr').textContent = t('Trails') + (m === 1 ? ' · 5 min' : m === 2 ? ' · 30 min' : ''); redraw(); }
$('bTr').onclick = () => setTrail((TRAIL + 1) % 3);
setTrail(TRAIL);

/* ---------- plane spotter mode: logbook ---------- */
let spot = LS('sky.spot', false), logb = LS('sky.log', []);
const saveLog = () => save('sky.log', logb.slice(-5000));
const seenReg = f => { const r = f.ac?.reg || f.reg; return logb.some(e => e.id === f.id || (r && e.reg === r)); };
const seenType = f => { const c = acCode(f); return !c || logb.some(e => e.icao === c); };
const loggedNow = f => logb.some(e => e.id === f.id && Date.now() - e.t < 3600e3);
function setSpot(on) {
  spot = on; save('sky.spot', on); $('mSpot').classList.toggle('on', on); $('mNorm').classList.toggle('on', !on); renderSpt(); if (selected) renderCard(true);
}
$('mSpot').onclick = () => setSpot(true); $('mNorm').onclick = () => setSpot(false);
function logSighting(f) {
  if (loggedNow(f)) return toast(t('Already logged'));
  const ac = f.ac || {}, fresh = [!seenReg(f) && t('new aircraft'), !seenType(f) && t('new type')].filter(Boolean);
  logb.push({ id: f.id, cs: f.cs, reg: ac.reg || f.reg || '', type: ac.type || f.type || '', icao: acCode(f), air: f.route?.airline || ac.owner || '', c: ac.country || '',
    rt: f.route ? f.route.org.code + '→' + f.route.dst.code : '', alt: f.ground ? 0 : Math.round(f.alt * 3.281), lat: +f.lat.toFixed(3), lon: +f.lon.toFixed(3), t: Date.now() });
  saveLog(); renderSpt(); renderCard(); toast(t('Logged {0}', f.cs) + (fresh.length ? ' · ' + fresh.join(', ') : ''));
}
const stats = () => ({ n: new Set(logb.map(e => e.id)).size, ty: new Set(logb.map(e => e.icao).filter(Boolean)).size, al: new Set(logb.map(e => e.air).filter(Boolean)).size });
function renderSpt() {
  const el = $('spt'); el.style.display = spot ? '' : 'none'; if (!spot) return; const s = stats();
  el.innerHTML = `<div class="lbl">${t('Logbook')}</div><div class="sg"><div><b>${s.n}</b><span>${t('aircraft')}</span></div><div><b>${s.ty}</b><span>${t('types')}</span></div><div><b>${s.al}</b><span>${t('airlines')}</span></div></div>`
    + `<div class="btns"><button id="lbo">${t('Open logbook')}</button><button id="lbe">${t('Export CSV')}</button></div>`;
}
$('spt').onclick = e => { if (e.target.id === 'lbo') openLog(); else if (e.target.id === 'lbe') exportCsv(); };
function exportCsv() {
  if (!logb.length) return toast(t('The logbook is empty'));
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', cols = ['t', 'cs', 'reg', 'id', 'type', 'icao', 'air', 'rt', 'alt', 'lat', 'lon'];
  const csv = ['time,callsign,registration,icao24,type,type_code,airline,route,altitude_ft,lat,lon', ...logb.map(e => cols.map(c => q(c === 't' ? new Date(e.t).toISOString() : e[c])).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'skytrack-logbook.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function openLog() {
  const s = stats();
  $('lb').innerHTML = `<div class="bx"><div class="hd"><h2>${t('Logbook')}</h2><button class="bt2" data-a="csv">${t('Export CSV')}</button><button class="ib" data-a="x" title="${t('Close')}">✕</button></div>`
    + `<div class="sg" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;text-align:center"><div><b style="font:700 20px ui-monospace,monospace;color:var(--ac)">${s.n}</b><br><small>${t('aircraft')}</small></div>`
    + `<div><b style="font:700 20px ui-monospace,monospace;color:var(--ac)">${s.ty}</b><br><small>${t('types')}</small></div><div><b style="font:700 20px ui-monospace,monospace;color:var(--ac)">${s.al}</b><br><small>${t('airlines')}</small></div></div>`
    + `<input id="lbq" placeholder="${t('Search the logbook…')}" autocomplete="off"><div class="ls" id="lbl"></div></div>`;
  $('lb').classList.add('show'); renderLogList(); $('lbq').oninput = renderLogList;
}
function renderLogList() {
  const q = ($('lbq')?.value || '').trim().toLowerCase();
  const rows = logb.filter(e => !q || [e.cs, e.reg, e.type, e.icao, e.air, e.rt].join(' ').toLowerCase().includes(q)).slice(-300).reverse();
  $('lbl').innerHTML = rows.length ? rows.map(e => `<div class="le"><span>${new Date(e.t).toLocaleString(LOC(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>`
    + `<div><b>${esc(e.cs)}</b> <span>${esc(e.reg)}</span></div><div>${esc(e.type || e.icao || '—')}<br><span>${esc([e.air, e.rt].filter(Boolean).join(' · '))}</span></div>`
    + `<button class="wx2" data-del="${e.t}" title="${t('Remove')}" style="background:transparent;border:0;color:var(--mut);cursor:pointer">✕</button></div>`).join('')
    : `<div class="rtx" style="padding:14px 4px">${t(logb.length ? 'Nothing matches' : 'The logbook is empty. Open a flight and press “Log sighting”.')}</div>`;
}
$('lb').onclick = e => {
  if (e.target.id === 'lb' || e.target.dataset.a === 'x') return $('lb').classList.remove('show');
  if (e.target.dataset.a === 'csv') return exportCsv();
  const d = e.target.closest('[data-del]'); if (d) { logb = logb.filter(x => String(x.t) !== d.dataset.del); saveLog(); renderLogList(); renderSpt(); }
};

/* ---------- card parts ---------- */
/* ---------- emergency code explainer ---------- */
const EMG_INFO = {
  7700: { en: ['General emergency', 'Squawk 7700 is the international code for a general emergency. The crew sets it when the aircraft or the people on board are in serious trouble and need priority from air traffic control.',
      'Engine failure, fire or smoke, a medical emergency, loss of cabin pressure, very low fuel, structural or weather damage.',
      'Controllers clear the airspace, give the aircraft priority to land and have fire and rescue crews wait at the runway. Most of these flights end with a normal landing.',
      'It does not always mean a disaster. Crews often declare early to be safe, and the code is sometimes set by mistake.'],
    tr: ['Genel acil durum', '7700, uluslararası genel acil durum kodudur. Mürettebat, uçak ya da yolcular ciddi bir tehlikedeyse ve hava trafik kontrolünden öncelik istiyorsa bunu girer.',
      'Motor arızası, yangın veya duman, yolcuda sağlık sorunu, kabin basıncı kaybı, çok düşük yakıt, yapısal veya hava koşullarından kaynaklanan hasar.',
      'Kontrolörler hava sahasını boşaltır, uçağa iniş önceliği verir ve itfaiye ile kurtarma ekipleri pistte bekler. Bu uçuşların çoğu normal inişle biter.',
      'Her zaman felaket anlamına gelmez. Mürettebat çoğu zaman önlem olarak erkenden ilan eder, kod bazen yanlışlıkla da girilir.'] },
  7600: { en: ['Radio failure', 'Squawk 7600 means the aircraft has lost radio contact with air traffic control.',
      'The radio or headset breaks, the crew is on the wrong frequency, or the radio is out of range.',
      'The crew follows set lost-communication procedures: they keep flying the filed route, ATC clears other traffic away and the aircraft lands as planned, usually watching for light signals from the tower.',
      'It is usually harmless and often fixed within minutes, after which the code is changed back.'],
    tr: ['Telsiz arızası', '7600, uçağın hava trafik kontrolüyle telsiz bağlantısını kaybettiği anlamına gelir.',
      'Telsiz ya da kulaklık bozulduğunda, yanlış frekansa geçildiğinde veya telsiz menzil dışında kaldığında.',
      'Mürettebat önceden belirlenmiş haberleşme kaybı prosedürünü uygular: planlanan rotada uçmaya devam eder, kontrol diğer trafiği uzaklaştırır ve uçak planlandığı gibi iner. Genelde kule ışık sinyalleri izlenir.',
      'Genellikle zararsızdır ve çoğu zaman dakikalar içinde düzelir, ardından kod eski haline getirilir.'] },
  7500: { en: ['Hijacking', 'Squawk 7500 is the code for unlawful interference, meaning a hijacking or an attempt to take control of the aircraft.',
      'The crew can set it silently, without speaking on the radio, so it does not alert the hijacker.',
      'ATC treats the flight as a security incident, quietly clears the airspace around it and informs the authorities. Controllers avoid asking about it on the radio.',
      'It is very rare. Accidental entries do happen, so a 7500 on the map is not proof of a real hijacking.'],
    tr: ['Kaçırma', '7500, hukuka aykırı müdahale kodudur: uçağın kaçırılması veya kontrolünün ele geçirilmeye çalışılması anlamına gelir.',
      'Mürettebat bunu telsizle konuşmadan, sessizce girebilir; böylece kaçıran kişi fark etmez.',
      'Kontrol uçuşu güvenlik olayı olarak ele alır, çevresindeki hava sahasını sessizce boşaltır ve yetkilileri bilgilendirir. Kontrolörler telsizden bu konuda soru sormaz.',
      'Çok nadirdir. Kod yanlışlıkla da girilebildiği için haritada 7500 görmek gerçek bir kaçırma olduğunu kanıtlamaz.'] }
};
Object.assign(EMG_INFO[7700], {
  es: ['Emergencia general', 'El código 7700 es el código internacional de emergencia general. La tripulación lo activa cuando el avión o las personas a bordo corren un peligro serio y necesitan prioridad del control aéreo.',
    'Fallo de motor, fuego o humo, emergencia médica, pérdida de presión en cabina, combustible muy bajo, daños estructurales o por el tiempo.',
    'Los controladores despejan el espacio aéreo, dan prioridad de aterrizaje y los bomberos esperan en la pista. La mayoría de estos vuelos terminan con un aterrizaje normal.',
    'No siempre significa una catástrofe. Muchas tripulaciones lo declaran pronto por precaución, y a veces el código se introduce por error.'],
  de: ['Allgemeiner Notfall', 'Squawk 7700 ist der internationale Code für einen allgemeinen Notfall. Die Crew setzt ihn, wenn das Flugzeug oder die Personen an Bord in ernster Gefahr sind und Vorrang von der Flugsicherung brauchen.',
    'Triebwerksausfall, Feuer oder Rauch, medizinischer Notfall, Druckverlust in der Kabine, sehr wenig Treibstoff, Struktur- oder Wetterschäden.',
    'Die Lotsen räumen den Luftraum, geben Landevorrang und die Feuerwehr wartet an der Piste. Die meisten dieser Flüge enden mit einer normalen Landung.',
    'Es bedeutet nicht immer eine Katastrophe. Crews erklären oft vorsorglich früh einen Notfall, und manchmal wird der Code versehentlich gesetzt.'],
  fr: ['Urgence générale', 'Le code 7700 est le code international d\'urgence générale. L\'équipage l\'affiche lorsque l\'avion ou les personnes à bord sont en danger sérieux et ont besoin de la priorité du contrôle aérien.',
    'Panne moteur, feu ou fumée, urgence médicale, perte de pressurisation, carburant très bas, dommages structurels ou liés à la météo.',
    'Les contrôleurs dégagent l\'espace aérien, donnent la priorité à l\'atterrissage et les pompiers attendent sur la piste. La plupart de ces vols se terminent par un atterrissage normal.',
    'Cela ne signifie pas toujours une catastrophe. Les équipages déclarent souvent tôt par précaution, et le code est parfois saisi par erreur.'] });
Object.assign(EMG_INFO[7600], {
  es: ['Fallo de radio', 'El código 7600 significa que la aeronave ha perdido el contacto por radio con el control de tráfico aéreo.',
    'La radio o los auriculares se averían, la tripulación está en la frecuencia equivocada o la radio está fuera de alcance.',
    'La tripulación sigue los procedimientos de pérdida de comunicaciones: continúa por la ruta prevista, el control aparta al resto del tráfico y la aeronave aterriza según lo previsto, normalmente atenta a las señales luminosas de la torre.',
    'Suele ser inofensivo y a menudo se resuelve en minutos, tras lo cual se vuelve a cambiar el código.'],
  de: ['Funkausfall', 'Squawk 7600 bedeutet, dass das Flugzeug den Funkkontakt zur Flugsicherung verloren hat.',
    'Funkgerät oder Headset fallen aus, die Crew ist auf der falschen Frequenz oder außer Reichweite.',
    'Die Crew folgt den festgelegten Verfahren bei Funkausfall: Sie fliegt die geplante Route weiter, die Flugsicherung hält anderen Verkehr fern und das Flugzeug landet wie geplant, meist mit Blick auf Lichtsignale des Towers.',
    'Meist harmlos und oft nach Minuten behoben, danach wird der Code zurückgesetzt.'],
  fr: ['Panne radio', 'Le code 7600 signifie que l\'appareil a perdu le contact radio avec le contrôle aérien.',
    'La radio ou le casque tombe en panne, l\'équipage est sur la mauvaise fréquence ou hors de portée.',
    'L\'équipage applique les procédures de perte de communication : il poursuit la route prévue, le contrôle écarte les autres avions et l\'appareil atterrit comme prévu, en surveillant les signaux lumineux de la tour.',
    'C\'est généralement sans gravité et souvent réglé en quelques minutes, après quoi le code est remis comme avant.'] });
Object.assign(EMG_INFO[7500], {
  es: ['Secuestro', 'El código 7500 indica interferencia ilícita: un secuestro o un intento de tomar el control de la aeronave.',
    'La tripulación puede activarlo en silencio, sin hablar por radio, para no alertar al secuestrador.',
    'El control trata el vuelo como un incidente de seguridad, despeja discretamente el espacio aéreo y avisa a las autoridades. Los controladores evitan preguntar por radio.',
    'Es muy raro. También se introduce por error, así que un 7500 en el mapa no prueba un secuestro real.'],
  de: ['Entführung', 'Squawk 7500 steht für unrechtmäßigen Eingriff: eine Entführung oder den Versuch, die Kontrolle über das Flugzeug zu übernehmen.',
    'Die Crew kann ihn lautlos setzen, ohne Funkspruch, damit der Entführer nichts bemerkt.',
    'Die Flugsicherung behandelt den Flug als Sicherheitsvorfall, räumt unauffällig den Luftraum und informiert die Behörden. Lotsen fragen nicht per Funk nach.',
    'Sehr selten. Auch versehentliche Eingaben kommen vor, ein 7500 auf der Karte ist also kein Beweis für eine echte Entführung.'],
  fr: ['Détournement', 'Le code 7500 signale une intervention illicite : un détournement ou une tentative de prise de contrôle de l\'appareil.',
    'L\'équipage peut l\'afficher discrètement, sans parler à la radio, pour ne pas alerter le pirate.',
    'Le contrôle traite le vol comme un incident de sûreté, dégage discrètement l\'espace aérien et prévient les autorités. Les contrôleurs évitent de poser des questions à la radio.',
    'C\'est très rare. Des saisies accidentelles existent, donc un 7500 sur la carte ne prouve pas un vrai détournement.'] });
const EMG_L = { en: ['What does it mean?', 'When is it used?', 'What happens next?', 'Good to know', 'Close'], tr: ['Ne anlama gelir?', 'Ne zaman verilir?', 'Sonrasında ne olur?', 'Bilmekte fayda var', 'Kapat'],
  es: ['¿Qué significa?', '¿Cuándo se usa?', '¿Qué ocurre después?', 'Conviene saber', 'Cerrar'], de: ['Was bedeutet das?', 'Wann wird er gesetzt?', 'Was passiert dann?', 'Gut zu wissen', 'Schließen'], fr: ['Que signifie-t-il ?', 'Quand est-il utilisé ?', 'Que se passe-t-il ensuite ?', 'À savoir', 'Fermer'] };
function showEmg(code) {
  const i = EMG_INFO[code]; if (!i) return; const [ti, what, when, next, note] = i[LANG] || i.en;
  const L = EMG_L[LANG] || EMG_L.en;
  let m = document.getElementById('emgm'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'emgm';
  m.innerHTML = `<div class="bx"><div class="hd"><span class="cd">${code}</span><h2>${esc(ti)}</h2><button class="ib" data-x aria-label="${L[4]}" title="${L[4]}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg></button></div>`
    + [[L[0], what], [L[1], when], [L[2], next]].map(([h, b]) => `<h3>${h}</h3><p>${esc(b)}</p>`).join('') + `<div class="nt"><b>${L[3]}</b> ${esc(note)}</div></div>`;
  m.onclick = e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); };
  document.body.appendChild(m);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('emgm')?.remove(); });
X.top = f => {
  const c = [];
  if (isEmg(f)) c.push(`<button class="chip emg" data-emg="${emgCode(f)}" title="${esc(t('What does this code mean?'))}">⚠ ${esc(t(EMG[emgCode(f)]))} · ${emgCode(f)} <i>?</i></button>`);
  if (spot) { if (!seenReg(f) && (f.ac?.reg || f.reg)) c.push(`<span class="chip new">${t('NEW AIRCRAFT')}</span>`); if (!seenType(f)) c.push(`<span class="chip new">${t('NEW TYPE')}</span>`); }
  return c.length ? `<div class="bd">${c.join('')}</div>` : '';
};
X.rows = (f, rows) => {
  const at = rows.findIndex(r => r[0] === 'Position'), add = [];
  if (spot) add.push(['ICAO24', f.id.toUpperCase()], ['Squawk', f.sq || '—'], ['Category', f.cat || '—'], ...(f.ac?.country ? [['Country', f.ac.country]] : []));
  else if (isEmg(f)) add.push(['Squawk', f.sq || '—']);
  rows.splice(at < 0 ? rows.length : at, 0, ...add);
};
X.bottom = f => legsHtml(f);
X.bottom2 = f => spot ? `<button id="slog" class="sm"></button>` : '';
X.sync = f => { $('wt').textContent = watch.has(f.id) ? t('🔔 Watching') : t('🔔 Watch'); if ($('slog')) $('slog').textContent = loggedNow(f) ? t('✓ Logged') : t('📓 Log sighting'); };
X.click = e => {
  const f = flights.get(selected); if (!f) return false;
  const eb = e.target.closest('[data-emg]'); if (eb) { showEmg(+eb.dataset.emg); return true; }
  if (e.target.id === 'wt') { toggleWatch(f); return true; }
  if (e.target.id === 'slog') { logSighting(f); return true; }
  if (e.target.id === 'lgb') { loadLegs(f); return true; }
  const lg = e.target.closest('.lg'); if (lg) { drawLeg(f, +lg.dataset.i); return true; }
  return false;
};

/* ---------- language ---------- */
const lm = $('lmenu');
lm.innerHTML = LANGS.map(l => `<button data-l="${l.c}"><i>${l.c.toUpperCase()}</i>${l.n}</button>`).join('');
function setLang(l) {
  LANG = l; save('sky.lang', l); applyLang(); document.documentElement.lang = l; $('lang').querySelector('.lc').textContent = l.toUpperCase();
  lm.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.l === l));
  if (!live) $('st').textContent = t('demo (30x speed)');
  renderSpt(); renderWatch(); renderList(); applyF(); if (selected) renderCard(true); if (apSel) renderAp();
  if ($('lb').classList.contains('show')) openLog();
  if (typeof renderDiary === 'function' && $('dy')?.classList.contains('show')) renderDiary();
}
const lmToggle = open => { lm.hidden = !open; $('lang').setAttribute('aria-expanded', open); };
$('lang').onclick = e => { e.stopPropagation(); lmToggle(lm.hidden); };
lm.onclick = e => { const b = e.target.closest('button'); if (b) { setLang(b.dataset.l); lmToggle(false); } };
document.addEventListener('click', e => { if (!lm.hidden && !e.target.closest('#lmenu')) lmToggle(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') lmToggle(false); });
$('lang').querySelector('.lc').textContent = LANG.toUpperCase(); lm.querySelector(`[data-l="${LANG}"]`).classList.add('on');

setSpot(spot); renderWatch(); renderSpt(); if (LANG !== 'en') setLang(LANG);

/* ---------- history slider fill ---------- */
{ const sl = $('rpS'), fill = () => sl.style.setProperty('--p', (+sl.max ? sl.value / sl.max * 100 : 100) + '%'); sl.addEventListener('input', fill); setInterval(fill, 400); fill(); }
