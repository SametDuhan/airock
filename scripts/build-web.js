// Builds the browser demo into site/app/ from the same files the desktop app uses (plus src/webdemo.js).
// Run: npm run build:web   (the result is committed so GitHub Pages can serve it as it is)
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src'), out = path.join(__dirname, '..', 'site', 'app');
const JS = ['geo', 'fuel', 'data', 'webdemo', 'i18n', 'langs', 'airports', 'airports-more', 'airports-tiny', 'renderer', 'extras', 'layers', 'features', 'tools', 'trip'];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const n of JS) fs.copyFileSync(path.join(src, n + '.js'), path.join(out, n + '.js'));
const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet';
let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const rep = (a, b) => { if (!html.includes(a)) throw new Error('build-web: not found in src/index.html: ' + a.slice(0, 60)); html = html.replace(a, b); };
// a web page is not file://, and Leaflet comes from the CDN
html = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")([^"]*)"/, (_, a, csp) => a + csp.replace(/ file:/g, '') + '"');
rep('../node_modules/leaflet/dist/leaflet.css', LEAFLET + '.css');
rep('<title>SkyTrack</title>', '<title>SkyTrack — Web demo</title>\n<meta name="description" content="Try SkyTrack in your browser: a demo with simulated flights and turbulence areas. Download the free desktop app for live data.">\n<link rel="icon" type="image/svg+xml" href="../favicon.svg">');
rep('<script src="loader.js"></script>', '<script src="' + LEAFLET + '.js"></script>\n' + JS.map(n => `<script src="${n}.js"></script>`).join('\n'));
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('site/app built:', JS.length + 1, 'files');
