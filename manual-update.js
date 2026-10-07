// In-app update for the builds that electron-updater cannot update by itself: a build run from source (npm start) and macOS (unsigned).
// It finds the installer of this platform in the latest release, downloads it with progress, checks its SHA-512 against the latest*.yml file of the same release
// (the file that electron-updater itself trusts) and only then hands it to main.js to run. Nothing here touches Electron, so it is tested on its own (test/manual-update.test.js).
const crypto = require('crypto'), fs = require('fs'), path = require('path');

const RELEASES = 'https://github.com/SametDuhan/airock/releases/download/';
const NAME = /^SkyTrack[A-Za-z0-9._-]*\.(exe|dmg|AppImage)$/;

// The installer of this platform among the assets of a release (GitHub API: [{ name, browser_download_url, size }]) and the update file that holds its checksum
function pickAsset(assets, platform, arch) {
  const want = platform === 'win32' ? /^SkyTrack-Setup\.exe$/ : platform === 'darwin' ? (arch === 'arm64' ? /^SkyTrack-mac-arm64\.dmg$/ : /^SkyTrack-mac-x64\.dmg$/) : platform === 'linux' ? /^SkyTrack-linux-[a-z0-9_]+\.AppImage$/ : null;
  const yml = platform === 'win32' ? 'latest.yml' : platform === 'darwin' ? 'latest-mac.yml' : 'latest-linux.yml';
  const list = Array.isArray(assets) ? assets : [], a = want && list.find(x => want.test(x.name || '')), y = list.find(x => x.name === yml);
  return a && y ? { name: a.name, url: a.browser_download_url, size: a.size || 0, ymlUrl: y.browser_download_url } : null;
}

// "files: - url: SkyTrack-Setup.exe  sha512: ...  size: ..." from latest*.yml → the base64 sha512 of that file (or null)
function parseSha512(yml, name) {
  const lines = String(yml).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*-?\s*url:\s*(\S+)\s*$/.exec(lines[i]);
    if (m && m[1] === name) for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) { const s = /^\s*sha512:\s*(\S+)\s*$/.exec(lines[j]); if (s) return s[1]; if (/^\s*-?\s*url:/.test(lines[j])) break; }
  }
  return null;
}

// Downloads asset.url into dir, verified. onProgress(percent 0-100). Returns the path. Throws (and leaves no file) when anything is wrong.
async function downloadVerified({ asset, dir, onProgress, fetchFn = fetch }) {
  if (!asset || !NAME.test(asset.name || '') || !String(asset.url).startsWith(RELEASES) || !String(asset.ymlUrl).startsWith(RELEASES)) throw new Error('not a SkyTrack release file');
  const yr = await fetchFn(asset.ymlUrl, { headers: { 'User-Agent': 'SkyTrack' } }); if (!yr.ok) throw new Error('update file: HTTP ' + yr.status);
  const want = parseSha512(await yr.text(), asset.name); if (!want) throw new Error('no checksum for ' + asset.name + ' in the update file');
  const r = await fetchFn(asset.url, { headers: { 'User-Agent': 'SkyTrack' } }); if (!r.ok || !r.body) throw new Error('download: HTTP ' + r.status);
  const total = +r.headers.get('content-length') || asset.size || 0, dest = path.join(dir, asset.name), part = dest + '.part', hash = crypto.createHash('sha512');
  fs.mkdirSync(dir, { recursive: true });
  let got = 0, last = -1; const out = fs.createWriteStream(part);
  try {
    const rd = r.body.getReader();
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      hash.update(value); got += value.length; if (!out.write(value)) await new Promise(ok => out.once('drain', ok));
      const pct = total ? Math.min(99, Math.floor(got / total * 100)) : 0; if (pct !== last) { last = pct; if (onProgress) onProgress(pct); }
    }
    await new Promise((ok, no) => out.end(err => err ? no(err) : ok()));
    if (total && got !== total) throw new Error(`incomplete download (${got} of ${total} bytes)`);
    if (hash.digest('base64') !== want) throw new Error('the file does not match its checksum');
    fs.rmSync(dest, { force: true }); fs.renameSync(part, dest); if (onProgress) onProgress(100);
    return dest;
  } catch (e) { out.destroy(); fs.rmSync(part, { force: true }); throw e; }
}

module.exports = { pickAsset, parseSha512, downloadVerified, RELEASES };
