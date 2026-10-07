// Extras on top of the map: emergency alerts, watchlist, today's flights, rain radar, plane spotter mode (logbook) and the language switch.
// Loaded after renderer.js; it plugs into the hooks in the `X` object there.
const hhmm = s => new Date(s * 1000).toLocaleTimeString(LOC(), TF({ hour: '2-digit', minute: '2-digit' }));
const nearAp = (lat, lon) => { let b = '', m = 40; knownAps.forEach(a => { const d = km(lat, lon, a.lat, a.lon); if (d < m) { m = d; b = a.code; } }); return b; };
const HEX6 = /^[0-9a-f]{6}$/i;

/* ---------- emergencies + watchlist events (called after every position update) ---------- */
const emgSeen = new Set(), wlState = new Map(); // wlState: id → { ground, t } (survives the aircraft leaving the map)
X.event = f => {
  if (live && isEmg(f) && !emgSeen.has(f.id + emgCode(f))) { emgSeen.add(f.id + emgCode(f)); toastEv(`⚠ ${f.cs}: ${t(EMG[emgCode(f)])} (${emgCode(f)})`, f.id); }
  if (watch.has(f.id)) {
    const st = wlState.get(f.id);
    if (st && st.ground !== f.ground) toastEv(t(f.ground ? '{0} landed' : '{0} took off', f.cs));
    wlState.set(f.id, { ground: f.ground, t: Date.now() });
  }
};
X.arrive = f => { if (watch.has(f.id)) toastEv(t('{0} landed', f.cs)); }; // demo flights "land" when they reach their destination

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
  es: ['¿Qué significa?', '¿Cuándo se usa?', '¿Qué ocurre después?', 'Conviene saber', 'Cerrar'], de: ['Was bedeutet das?', 'Wann wird er gesetzt?', 'Was passiert dann?', 'Gut zu wissen', 'Schließen'], fr: ['Que signifie-t-il ?', 'Quand est-il utilisé ?', 'Que se passe-t-il ensuite ?', 'À savoir', 'Fermer'],
  ar: ["ماذا يعني؟", "متى يُستخدم؟", "ماذا يحدث بعد ذلك؟", "من الجيد أن تعرف", "إغلاق"], zh: ["这是什么意思？", "什么时候使用？", "之后会发生什么？", "值得了解", "关闭"], ja: ["どういう意味？", "いつ使われる？", "その後どうなる？", "知っておくと良いこと", "閉じる"], ko: ["무슨 뜻인가요?", "언제 사용하나요?", "그 후에는 어떻게 되나요?", "알아두면 좋은 점", "닫기"] ,
  it: ["Cosa significa?", "Quando si usa?", "Cosa succede dopo?", "Da sapere", "Chiudi"], ru: ["Что это значит?", "Когда используется?", "Что происходит дальше?", "Полезно знать", "Закрыть"], pt: ["O que significa?", "Quando é usado?", "O que acontece a seguir?", "Bom saber", "Fechar"], pl: ["Co to oznacza?", "Kiedy jest używany?", "Co dzieje się potem?", "Warto wiedzieć", "Zamknij"], fa: ["چه معنایی دارد؟", "چه زمانی استفاده می‌شود؟", "بعد چه اتفاقی می‌افتد؟", "خوب است بدانید", "بستن"], sw: ["Inamaanisha nini?", "Hutumika lini?", "Nini hutokea baadaye?", "Vizuri kujua", "Funga"] };
Object.assign(EMG_INFO[7700], { ar: ["طوارئ عامة", "الرمز 7700 هو الرمز الدولي للطوارئ العامة. يضبطه الطاقم عندما تكون الطائرة أو من على متنها في خطر جسيم ويحتاجون إلى أولوية من الملاحة الجوية.", "عطل في المحرك، حريق أو دخان، حالة طبية طارئة، فقدان ضغط المقصورة، وقود منخفض جدًا، أضرار هيكلية أو بسبب الطقس.", "يُخلي المراقبون المجال الجوي ويمنحون الطائرة أولوية الهبوط، وتنتظر فرق الإطفاء والإنقاذ عند المدرج. تنتهي معظم هذه الرحلات بهبوط عادي.", "لا يعني دائمًا كارثة. غالبًا ما يعلن الطاقم الطوارئ مبكرًا للاحتياط، وأحيانًا يُضبط الرمز بالخطأ."], zh: ["一般紧急情况", "7700 是国际通用的一般紧急情况应答机码。当飞机或机上人员处于严重危险、需要空中交通管制优先处理时，机组会设置此码。", "发动机故障、起火或冒烟、医疗急救、客舱失压、燃油极低、结构或天气造成的损坏。", "管制员会清空空域，给予该飞机优先降落权，消防和救援人员在跑道旁待命。这类航班大多以正常降落结束。", "这并不总是意味着灾难。机组常常为稳妥起见提前宣布，有时也会误设此码。"], ja: ["一般緊急事態", "7700 は一般緊急事態を示す国際的なスクォークコードです。機体や搭乗者が重大な危機にあり、航空管制の優先対応を必要とするときに乗務員が設定します。", "エンジン故障、火災や煙、急病人、機内の与圧喪失、燃料の極端な不足、構造的または気象による損傷など。", "管制官が空域を空け、機体に着陸の優先権を与え、消防・救助隊が滑走路で待機します。こうしたフライトの多くは通常どおり着陸して終わります。", "必ずしも大事故を意味するわけではありません。乗務員は念のため早めに宣言することが多く、コードを誤って設定してしまうこともあります。"], ko: ["일반 비상", "7700은 일반 비상을 뜻하는 국제 스퀵 코드입니다. 항공기나 탑승자가 심각한 위험에 처해 항공 교통 관제의 우선 지원이 필요할 때 승무원이 설정합니다.", "엔진 고장, 화재나 연기, 응급 환자, 객실 기압 상실, 연료 부족, 구조적 손상 또는 기상으로 인한 손상.", "관제사가 공역을 비우고 항공기에 착륙 우선권을 주며, 소방 및 구조대가 활주로에서 대기합니다. 이런 비행의 대부분은 정상 착륙으로 끝납니다.", "항상 재난을 뜻하는 것은 아닙니다. 승무원은 안전을 위해 일찍 선언하는 경우가 많고, 코드를 실수로 설정하기도 합니다."] });
Object.assign(EMG_INFO[7600], { ar: ["عطل في الراديو", "الرمز 7600 يعني أن الطائرة فقدت الاتصال اللاسلكي مع مراقبة الحركة الجوية.", "تعطل الراديو أو سماعة الرأس، أو أن الطاقم على تردد خاطئ، أو أن الراديو خارج النطاق.", "يتبع الطاقم إجراءات فقدان الاتصال المحددة: يواصلون المسار المقدَّم، وتُبعد المراقبة الحركة الأخرى، وتهبط الطائرة كما هو مخطط، وعادةً مع مراقبة الإشارات الضوئية من البرج.", "عادةً ما يكون غير ضار ويُصلَح غالبًا خلال دقائق، ثم يُعاد الرمز إلى وضعه السابق."], zh: ["无线电故障", "7600 表示飞机与空中交通管制失去了无线电联系。", "无线电或耳机损坏、机组调错频率，或无线电超出通信范围。", "机组会遵循既定的失联程序：按已申报的航路继续飞行，管制员疏导其他交通，飞机按计划降落，通常会留意塔台的灯光信号。", "通常无害，往往几分钟内就能修复，随后恢复原来的代码。"], ja: ["無線故障", "7600 は、機体が航空管制との無線連絡を失ったことを意味します。", "無線機やヘッドセットの故障、誤った周波数への設定、無線の通信圏外など。", "乗務員は所定の通信途絶時の手順に従います。提出済みの経路を飛び続け、管制は他の機を遠ざけ、機体は予定どおり着陸します。通常は管制塔からの灯火信号にも注意します。", "通常は無害で、数分以内に直ることも多く、その後コードは元に戻されます。"], ko: ["무선 통신 장애", "7600은 항공기가 항공 교통 관제와의 무선 교신을 잃었다는 뜻입니다.", "무전기나 헤드셋 고장, 잘못된 주파수 사용, 또는 무전기가 통신 범위를 벗어난 경우.", "승무원은 정해진 통신 두절 절차를 따릅니다. 제출한 경로를 계속 비행하고, 관제는 다른 항공기를 비켜 가게 하며, 항공기는 계획대로 착륙합니다. 보통 관제탑의 신호등을 주시합니다.", "대개 무해하며 몇 분 안에 고쳐지는 경우가 많고, 그 후 코드는 원래대로 돌아옵니다."] });
Object.assign(EMG_INFO[7500], { ar: ["اختطاف", "الرمز 7500 هو رمز التدخل غير المشروع، أي اختطاف الطائرة أو محاولة السيطرة عليها.", "يمكن للطاقم ضبطه بصمت دون التحدث عبر الراديو، فلا يلاحظ الخاطف ذلك.", "تتعامل المراقبة مع الرحلة كحادث أمني، وتُخلي المجال الجوي حولها بهدوء وتُبلغ السلطات. يتجنب المراقبون السؤال عن ذلك عبر الراديو.", "نادر جدًا. قد يحدث إدخال الرمز بالخطأ، لذا فظهور 7500 على الخريطة ليس دليلًا على اختطاف حقيقي."], zh: ["劫机", "7500 是非法干扰代码，表示飞机被劫持或有人企图控制飞机。", "机组可以不通过无线电讲话悄悄设置，这样劫机者不会察觉。", "管制部门将该航班视为安全事件，悄悄清空周围空域并通知有关当局。管制员避免通过无线电询问此事。", "非常罕见。误输入的情况也会发生，所以地图上出现 7500 并不能证明真的发生了劫机。"], ja: ["ハイジャック", "7500 は不法妨害を示すコードで、ハイジャックまたは機体の乗っ取りの試みを意味します。", "乗務員は無線で話さずに静かに設定でき、犯人に気づかれません。", "管制はこのフライトを保安上の事案として扱い、周囲の空域を静かに空けて当局に連絡します。管制官は無線でこの件を尋ねないようにします。", "非常にまれです。誤入力も起こるため、マップ上の 7500 が本物のハイジャックの証拠とは限りません。"], ko: ["하이재킹", "7500은 불법 간섭 코드로, 항공기 납치 또는 조종권 탈취 시도를 뜻합니다.", "승무원은 무선으로 말하지 않고 조용히 설정할 수 있어 납치범이 눈치채지 못합니다.", "관제는 해당 비행을 보안 사건으로 다루며 주변 공역을 조용히 비우고 당국에 알립니다. 관제사는 무선으로 이에 대해 묻지 않습니다.", "매우 드뭅니다. 실수로 입력되는 경우도 있어서, 지도에 7500이 보인다고 실제 하이재킹이라는 증거는 아닙니다."] });
Object.assign(EMG_INFO[7700], { it: ["Emergenza generale", "Il codice 7700 è il codice internazionale per l'emergenza generale. L'equipaggio lo imposta quando l'aereo o le persone a bordo sono in seria difficoltà e hanno bisogno di priorità dal controllo del traffico aereo.", "Guasto a un motore, fuoco o fumo, emergenza medica, perdita di pressurizzazione, carburante molto basso, danni strutturali o causati dal maltempo.", "I controllori liberano lo spazio aereo, danno all'aereo la priorità di atterraggio e i vigili del fuoco e i soccorsi attendono in pista. La maggior parte di questi voli finisce con un atterraggio normale.", "Non significa sempre un disastro. Gli equipaggi spesso dichiarano l'emergenza in anticipo per sicurezza, e a volte il codice viene impostato per errore."], ru: ["Общая аварийная ситуация", "Код 7700 — международный код общей аварийной ситуации. Экипаж включает его, когда самолёт или люди на борту в серьёзной опасности и нуждаются в приоритете от управления воздушным движением.", "Отказ двигателя, пожар или дым, медицинская помощь, потеря давления в салоне, очень малый остаток топлива, повреждения конструкции или от непогоды.", "Диспетчеры освобождают воздушное пространство, дают самолёту приоритет на посадку, а пожарные и спасатели ждут у полосы. Большинство таких рейсов заканчиваются обычной посадкой.", "Это не всегда означает катастрофу. Экипажи часто объявляют аварию заранее для безопасности, а иногда код ставят по ошибке."], pt: ["Emergência geral", "O código 7700 é o código internacional de emergência geral. A tripulação define-o quando a aeronave ou as pessoas a bordo estão em sério perigo e precisam de prioridade do controlo de tráfego aéreo.", "Falha de motor, fogo ou fumo, emergência médica, perda de pressurização da cabina, combustível muito baixo, danos estruturais ou causados pelo tempo.", "Os controladores libertam o espaço aéreo, dão prioridade de aterragem à aeronave e os bombeiros e as equipas de socorro esperam na pista. A maioria destes voos termina com uma aterragem normal.", "Nem sempre significa um desastre. As tripulações declaram muitas vezes cedo por precaução, e o código é por vezes definido por engano."], pl: ["Ogólna sytuacja awaryjna", "Kod 7700 to międzynarodowy kod ogólnej sytuacji awaryjnej. Załoga ustawia go, gdy samolot lub osoby na pokładzie są w poważnym niebezpieczeństwie i potrzebują pierwszeństwa od kontroli ruchu lotniczego.", "Awaria silnika, pożar lub dym, nagły problem zdrowotny, utrata ciśnienia w kabinie, bardzo mało paliwa, uszkodzenia konstrukcji lub spowodowane pogodą.", "Kontrolerzy zwalniają przestrzeń powietrzną, dają samolotowi pierwszeństwo lądowania, a straż pożarna i ratownicy czekają przy pasie. Większość takich lotów kończy się normalnym lądowaniem.", "To nie zawsze oznacza katastrofę. Załogi często ogłaszają alarm wcześniej dla bezpieczeństwa, a kod bywa ustawiony przez pomyłkę."], fa: ["وضعیت اضطراری عمومی", "کد ۷۷۰۰ کد بین‌المللی وضعیت اضطراری عمومی است. خدمه آن را وقتی تنظیم می‌کنند که هواپیما یا افراد داخل آن در خطر جدی باشند و از کنترل ترافیک هوایی اولویت بخواهند.", "خرابی موتور، آتش یا دود، اورژانس پزشکی، افت فشار کابین، سوخت بسیار کم، آسیب سازه‌ای یا آسیب ناشی از آب‌وهوا.", "کنترل‌کنندگان آسمان را خالی می‌کنند، به هواپیما اولویت فرود می‌دهند و آتش‌نشانی و نجات کنار باند منتظر می‌مانند. بیشتر این پروازها با فرود عادی تمام می‌شوند.", "همیشه به معنای فاجعه نیست. خدمه اغلب برای احتیاط زود اعلام می‌کنند و گاهی کد اشتباهی تنظیم می‌شود."], sw: ["Dharura ya jumla", "Msimbo 7700 ni msimbo wa kimataifa wa dharura ya jumla. Wafanyakazi huuweka ndege au watu waliomo wanapokuwa katika hatari kubwa na wanahitaji kipaumbele kutoka kwa udhibiti wa trafiki ya anga.", "Hitilafu ya injini, moto au moshi, dharura ya kiafya, kupoteza shinikizo la kabini, mafuta kidogo sana, uharibifu wa muundo au wa hali ya hewa.", "Wadhibiti hufuta anga, huipa ndege kipaumbele cha kutua, na wazima moto na waokoaji hungoja kwenye njia ya kurukia. Safari nyingi kati ya hizi huisha kwa kutua kwa kawaida.", "Haimaanishi maafa kila wakati. Wafanyakazi mara nyingi hutangaza mapema kwa tahadhari, na wakati mwingine msimbo huwekwa kimakosa."] });
Object.assign(EMG_INFO[7600], { it: ["Guasto radio", "Il codice 7600 significa che l'aereo ha perso il contatto radio con il controllo del traffico aereo.", "La radio o le cuffie si guastano, l'equipaggio è sulla frequenza sbagliata oppure la radio è fuori portata.", "L'equipaggio segue le procedure previste per la perdita di comunicazioni: continua sulla rotta prevista, il controllo allontana gli altri aerei e l'aereo atterra come pianificato, di solito osservando i segnali luminosi della torre.", "Di solito è innocuo e spesso si risolve in pochi minuti, dopodiché il codice viene reimpostato."], ru: ["Отказ радиосвязи", "Код 7600 означает, что самолёт потерял радиосвязь с управлением воздушным движением.", "Вышла из строя радиостанция или гарнитура, экипаж на неверной частоте или радио вне зоны действия.", "Экипаж действует по установленной процедуре при потере связи: продолжает полёт по заявленному маршруту, диспетчеры отводят другие самолёты, а самолёт садится по плану, обычно следя за световыми сигналами с вышки.", "Обычно это безвредно и часто устраняется за несколько минут, после чего код возвращают обратно."], pt: ["Falha de rádio", "O código 7600 significa que a aeronave perdeu o contacto rádio com o controlo de tráfego aéreo.", "O rádio ou os auscultadores avariam, a tripulação está na frequência errada ou o rádio está fora de alcance.", "A tripulação segue os procedimentos definidos para perda de comunicações: continua na rota submetida, o controlo afasta o restante tráfego e a aeronave aterra conforme planeado, normalmente atenta aos sinais luminosos da torre.", "Costuma ser inofensivo e é muitas vezes resolvido em minutos, após o que o código volta ao normal."], pl: ["Awaria radia", "Kod 7600 oznacza, że samolot utracił łączność radiową z kontrolą ruchu lotniczego.", "Radio lub słuchawki się zepsuły, załoga jest na złej częstotliwości albo radio jest poza zasięgiem.", "Załoga stosuje ustalone procedury utraty łączności: leci dalej zgłoszoną trasą, kontrola odsuwa inny ruch, a samolot ląduje zgodnie z planem, zwykle wypatrując sygnałów świetlnych z wieży.", "Zwykle jest to niegroźne i często naprawiane w ciągu kilku minut, po czym kod wraca do normy."], fa: ["قطع رادیو", "کد ۷۶۰۰ یعنی هواپیما ارتباط رادیویی خود را با کنترل ترافیک هوایی از دست داده است.", "رادیو یا هدست خراب شده، خدمه روی فرکانس اشتباه هستند یا رادیو خارج از برد است.", "خدمه طبق روال مشخص قطع ارتباط عمل می‌کنند: در مسیر اعلام‌شده ادامه می‌دهند، کنترل ترافیک دیگر را دور می‌کند و هواپیما طبق برنامه فرود می‌آید و معمولاً مراقب علامت‌های نوری برج است.", "معمولاً بی‌خطر است و اغلب ظرف چند دقیقه رفع می‌شود و سپس کد به حالت قبل برمی‌گردد."], sw: ["Hitilafu ya redio", "Msimbo 7600 unamaanisha ndege imepoteza mawasiliano ya redio na udhibiti wa trafiki ya anga.", "Redio au vifaa vya kusikilizia vimeharibika, wafanyakazi wako kwenye masafa yasiyo sahihi, au redio iko nje ya masafa.", "Wafanyakazi hufuata taratibu zilizowekwa za kupotea kwa mawasiliano: huendelea na njia iliyowasilishwa, udhibiti huondoa trafiki nyingine na ndege hutua kama ilivyopangwa, kwa kawaida ikitazama ishara za taa kutoka mnara.", "Kwa kawaida haina madhara na mara nyingi hurekebishwa ndani ya dakika, kisha msimbo hurudishwa."] });
Object.assign(EMG_INFO[7500], { it: ["Dirottamento", "Il codice 7500 indica un'interferenza illecita, cioè un dirottamento o un tentativo di prendere il controllo dell'aereo.", "L'equipaggio può impostarlo in silenzio, senza parlare alla radio, così il dirottatore non se ne accorge.", "Il controllo tratta il volo come un incidente di sicurezza, libera con discrezione lo spazio aereo intorno e informa le autorità. I controllori evitano di fare domande in radio.", "È molto raro. Capitano anche inserimenti accidentali, quindi un 7500 sulla mappa non è la prova di un vero dirottamento."], ru: ["Угон", "Код 7500 обозначает незаконное вмешательство, то есть угон самолёта или попытку захватить управление.", "Экипаж может ввести его тихо, не говоря по радио, чтобы угонщик не заметил.", "Диспетчерская служба считает рейс инцидентом безопасности, тихо освобождает вокруг него воздушное пространство и информирует власти. Диспетчеры избегают расспросов по радио.", "Это очень редко. Случайный ввод тоже бывает, поэтому 7500 на карте не доказывает настоящего угона."], pt: ["Sequestro", "O código 7500 é o código de interferência ilícita, ou seja, um sequestro ou uma tentativa de tomar o controlo da aeronave.", "A tripulação pode defini-lo em silêncio, sem falar no rádio, para o sequestrador não dar conta.", "O controlo trata o voo como um incidente de segurança, liberta discretamente o espaço aéreo à sua volta e informa as autoridades. Os controladores evitam fazer perguntas por rádio.", "É muito raro. Também há introduções acidentais, por isso um 7500 no mapa não prova um sequestro real."], pl: ["Porwanie", "Kod 7500 oznacza bezprawną ingerencję, czyli porwanie samolotu lub próbę przejęcia nad nim kontroli.", "Załoga może go ustawić po cichu, bez mówienia przez radio, aby porywacz nie zauważył.", "Kontrola traktuje lot jako incydent bezpieczeństwa, po cichu zwalnia wokół niego przestrzeń powietrzną i informuje władze. Kontrolerzy unikają pytań przez radio.", "To bardzo rzadkie. Zdarzają się też przypadkowe wpisy, więc 7500 na mapie nie dowodzi prawdziwego porwania."], fa: ["هواپیماربایی", "کد ۷۵۰۰ کد مداخلهٔ غیرقانونی است، یعنی هواپیماربایی یا تلاش برای در دست گرفتن کنترل هواپیما.", "خدمه می‌توانند آن را بی‌سروصدا و بدون صحبت با رادیو تنظیم کنند تا هواپیماربا متوجه نشود.", "کنترل پرواز را یک رخداد امنیتی در نظر می‌گیرد، آرام آسمان اطراف آن را خالی می‌کند و مقامات را مطلع می‌سازد. کنترل‌کنندگان از پرسیدن دربارهٔ آن از طریق رادیو خودداری می‌کنند.", "بسیار نادر است. ورود تصادفی کد هم پیش می‌آید، بنابراین دیدن ۷۵۰۰ روی نقشه دلیل بر هواپیماربایی واقعی نیست."], sw: ["Utekaji nyara", "Msimbo 7500 ni msimbo wa uingiliaji haramu, yaani utekaji nyara wa ndege au jaribio la kuchukua udhibiti wa ndege.", "Wafanyakazi wanaweza kuuweka kimya kimya bila kuzungumza kwenye redio, ili mtekaji asigundue.", "Udhibiti huichukulia safari kama tukio la usalama, hufuta anga linalozunguka kwa utulivu na kuwajulisha mamlaka. Wadhibiti huepuka kuuliza kuhusu hilo kwenye redio.", "Ni nadra sana. Pia kuna kuingiza kwa bahati mbaya, kwa hivyo 7500 kwenye ramani si ushahidi wa utekaji nyara halisi."] });
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
  LANG = l; save('sky.lang', l); applyLang(); document.documentElement.lang = l; window.webBarUpdate?.(); $('lang').querySelector('.lc').textContent = l.toUpperCase();
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
