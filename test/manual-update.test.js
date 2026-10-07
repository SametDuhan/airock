const test = require('node:test'), assert = require('node:assert'), crypto = require('crypto'), fs = require('fs'), os = require('os'), path = require('path');
const M = require('../manual-update.js');
const R = M.RELEASES + 'v0.7.4/';
const ASSETS = [['latest.yml', 300], ['latest-mac.yml', 400], ['latest-linux.yml', 300], ['SkyTrack-Setup.exe', 81e6], ['SkyTrack-mac-arm64.dmg', 95e6], ['SkyTrack-mac-x64.dmg', 99e6], ['SkyTrack-linux-x86_64.AppImage', 104e6], ['SkyTrack-Setup.exe.blockmap', 90e3]]
  .map(([name, size]) => ({ name, size, browser_download_url: R + name }));

test('pickAsset: the installer of this platform and its update file', () => {
  assert.equal(M.pickAsset(ASSETS, 'win32', 'x64').name, 'SkyTrack-Setup.exe'); assert.equal(M.pickAsset(ASSETS, 'win32', 'x64').ymlUrl, R + 'latest.yml');
  assert.equal(M.pickAsset(ASSETS, 'darwin', 'arm64').name, 'SkyTrack-mac-arm64.dmg'); assert.equal(M.pickAsset(ASSETS, 'darwin', 'x64').name, 'SkyTrack-mac-x64.dmg'); assert.equal(M.pickAsset(ASSETS, 'darwin', 'x64').ymlUrl, R + 'latest-mac.yml');
  assert.equal(M.pickAsset(ASSETS, 'linux', 'x64').name, 'SkyTrack-linux-x86_64.AppImage');
  assert.equal(M.pickAsset(ASSETS, 'freebsd', 'x64'), null); assert.equal(M.pickAsset([], 'win32', 'x64'), null); assert.equal(M.pickAsset(ASSETS.filter(a => a.name !== 'latest.yml'), 'win32', 'x64'), null); // no checksum file: nothing to verify against
});

test('parseSha512: the checksum of one file in a latest*.yml', () => {
  const yml = 'version: 0.7.4\nfiles:\n  - url: SkyTrack-mac-arm64.dmg\n    sha512: AAAA==\n    size: 5\n  - url: SkyTrack-mac-x64.dmg\n    sha512: BBBB==\n    size: 6\npath: SkyTrack-mac-x64.dmg\nsha512: BBBB==\nreleaseDate: x\n';
  assert.equal(M.parseSha512(yml, 'SkyTrack-mac-x64.dmg'), 'BBBB=='); assert.equal(M.parseSha512(yml, 'SkyTrack-mac-arm64.dmg'), 'AAAA=='); assert.equal(M.parseSha512(yml, 'SkyTrack-Setup.exe'), null);
  assert.equal(M.parseSha512('files:\r\n  - url: SkyTrack-Setup.exe\r\n    sha512: CCCC==\r\n', 'SkyTrack-Setup.exe'), 'CCCC=='); // Windows line ends
});

// a fake fetch: the update file and the installer, the installer in 4 chunks
function fake(content, yml, status = 200) {
  const calls = [];
  const fetchFn = async url => { calls.push(url);
    if (url.endsWith('.yml')) return { ok: true, status: 200, text: async () => yml };
    const parts = [0, 1, 2, 3].map(i => new Uint8Array(content.subarray(Math.floor(content.length * i / 4), Math.floor(content.length * (i + 1) / 4)))); let k = 0;
    return { ok: status === 200, status, headers: { get: h => h === 'content-length' ? String(content.length) : null }, body: { getReader: () => ({ read: async () => k < 4 ? { done: false, value: parts[k++] } : { done: true } }) } }; };
  return { fetchFn, calls };
}
const sha = b => crypto.createHash('sha512').update(b).digest('base64');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'skytrack-upd-'));

test('downloadVerified: downloads, reports progress, checks the checksum, leaves one file', async () => {
  const content = Buffer.from('SkyTrack installer '.repeat(5000)), dir = tmp(), seen = [];
  const { fetchFn } = fake(content, `files:\n  - url: SkyTrack-Setup.exe\n    sha512: ${sha(content)}\n    size: ${content.length}\n`);
  const f = await M.downloadVerified({ asset: M.pickAsset(ASSETS, 'win32', 'x64'), dir, fetchFn, onProgress: p => seen.push(p) });
  assert.equal(f, path.join(dir, 'SkyTrack-Setup.exe')); assert.deepEqual(fs.readFileSync(f), content); assert.deepEqual(fs.readdirSync(dir), ['SkyTrack-Setup.exe']);
  assert.ok(seen.length >= 4 && seen[seen.length - 1] === 100 && seen.every((p, i) => !i || p >= seen[i - 1]), 'progress ' + seen);
});

test('downloadVerified: a file that does not match its checksum is deleted and never returned', async () => {
  const content = Buffer.from('tampered'.repeat(1000)), dir = tmp();
  const { fetchFn } = fake(content, 'files:\n  - url: SkyTrack-Setup.exe\n    sha512: ' + sha(Buffer.from('the real file')) + '\n');
  await assert.rejects(() => M.downloadVerified({ asset: M.pickAsset(ASSETS, 'win32', 'x64'), dir, fetchFn }), /checksum/);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('downloadVerified: no checksum in the update file, HTTP errors, and files that are not from the SkyTrack releases are refused', async () => {
  const content = Buffer.from('x'.repeat(100)), dir = tmp(), good = M.pickAsset(ASSETS, 'win32', 'x64');
  await assert.rejects(() => M.downloadVerified({ asset: good, dir, fetchFn: fake(content, 'files:\n  - url: Other.exe\n    sha512: AA==\n').fetchFn }), /no checksum/);
  await assert.rejects(() => M.downloadVerified({ asset: good, dir, fetchFn: fake(content, 'files:\n  - url: SkyTrack-Setup.exe\n    sha512: ' + sha(content) + '\n', 502).fetchFn }), /HTTP 502/);
  for (const bad of [{ ...good, url: 'https://evil.example/SkyTrack-Setup.exe' }, { ...good, ymlUrl: 'https://evil.example/latest.yml' }, { ...good, name: '..\\..\\evil.exe', url: R + '..\\..\\evil.exe' }, { ...good, name: 'notskytrack.exe' }, null])
    await assert.rejects(() => M.downloadVerified({ asset: bad, dir, fetchFn: fake(content, '').fetchFn }), /not a SkyTrack release file/);
  assert.deepEqual(fs.readdirSync(dir), []);
});
