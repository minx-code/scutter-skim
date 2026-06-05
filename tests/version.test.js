const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('manifest.json has placeholder version', () => {
    const manifestPath = path.join(__dirname, '../manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifest.version, '0.0.0', 'manifest.json must have placeholder version 0.0.0');
});

test('package.json has placeholder version', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    assert.strictEqual(pkg.version, '0.0.0', 'package.json must have placeholder version 0.0.0');
});
