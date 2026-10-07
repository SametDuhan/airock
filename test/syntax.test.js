// Every browser script must at least parse: one broken line (e.g. a // comment that swallows the rest of a line) stops the whole app from starting.
const test = require('node:test'), fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'src');
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
  test('parses: src/' + f, () => { new vm.Script(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f }); });
}
