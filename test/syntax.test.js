// Every browser script must at least parse: one broken line (e.g. a // comment that swallows the rest of a line) stops the whole app from starting.
const test = require('node:test'), fs = require('fs'), path = require('path'), vm = require('vm');
for (const d of ['src', 'site']) {
  const dir = path.join(__dirname, '..', d);
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
    test('parses: ' + d + '/' + f, () => { new vm.Script(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f }); });
  }
}
