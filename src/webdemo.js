// Browser (web demo) build only: the free live feeds do not allow requests from web pages (no CORS), so the web page runs in demo mode.
// This file adds what demo flights need to show the turbulence feature: simulated SIGMET-style advisories, judged by the same code as the real data.
(function (root) {
  const adv = (sev, name, poly, base = 15000, top = 42000) => ({ sev, name, poly, base, top, lv: `FL${base / 100}–FL${top / 100}` });
  // Fixed demo areas over the busy corridors the demo flights use (Turkey, the Aegean, the Alps, Italy, the Eastern Mediterranean, the North Sea)
  const ADV = [
    adv(2, 'Demo advisory · Central Anatolia', [[40.6, 30.2], [40.9, 35.8], [38.2, 36.4], [37.9, 31.0]]),
    adv(3, 'Demo advisory · Aegean', [[39.6, 23.2], [39.9, 26.6], [37.4, 27.3], [37.2, 23.8]], 20000, 40000),
    adv(2, 'Demo advisory · Alps', [[47.8, 6.4], [48.0, 11.8], [45.9, 12.2], [45.6, 6.9]]),
    adv(2, 'Demo advisory · Central Italy', [[43.6, 11.2], [43.4, 15.2], [41.0, 15.6], [40.8, 12.0]]),
    adv(3, 'Demo advisory · Eastern Mediterranean', [[35.8, 29.4], [36.2, 34.6], [33.6, 35.2], [33.2, 30.0]], 22000, 41000),
    adv(2, 'Demo advisory · North Sea', [[55.8, 0.2], [55.6, 6.2], [53.4, 6.0], [53.2, 0.6]])
  ];
  const D = root.SkyData;
  root.SKY_WEB = true;
  if (!D) return;
  D.turbMap = async () => ({ ok: true, adv: ADV.map(a => ({ ...a, poly: a.poly.map(p => p.slice()) })) });
  D.turb = async (pts, altFt) => {
    if (!Array.isArray(pts) || !pts.length || !Number.isFinite(+altFt)) return { ok: false, error: 'invalid input' };
    const r = D.turbAssess(pts, +altFt, ADV, []); return { ok: true, ...r, adv: ADV.length, pireps: 0 };
  };
  if (typeof module === 'object' && module.exports) module.exports = { ADV };
  if (typeof document === 'undefined') return;
  // always start in demo mode; hide the Live switch (it cannot work from a web page) and say where to get the real thing
  try { localStorage.setItem('sky.live', 'false'); } catch {}
  const tr = /^tr/i.test(navigator.language || '');
  const T = tr ? { msg: 'Bu bir demo: uçuşlar ve türbülans alanları simüle edilmiştir.', cta: 'Canlı veri için uygulamayı indir' }
    : { msg: 'This is a demo: flights and turbulence areas are simulated.', cta: 'Get the app for live data' };
  const st = document.createElement('style');
  st.textContent = '#mLive{display:none!important}#webBar{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:2000;display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 24px);padding:8px 8px 8px 14px;border:1px solid #ffffff22;border-radius:10px;background:#1c1c1cf2;color:#f0e6d2;font:13px system-ui,sans-serif;box-shadow:0 6px 24px #0008}#webBar a{background:#f5c431;color:#1a1500;font-weight:700;text-decoration:none;border-radius:7px;padding:7px 12px}';
  document.head.appendChild(st);
  const bar = document.createElement('div'); bar.id = 'webBar';
  const s = document.createElement('span'); s.textContent = T.msg;
  const a = document.createElement('a'); a.href = '../#download'; a.textContent = T.cta;
  bar.append(s, a); document.body.appendChild(bar);
})(typeof window !== 'undefined' ? window : globalThis);
