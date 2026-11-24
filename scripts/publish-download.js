/* Outlaw County — copies the built Windows installer and ZIP from dist/ into
 * downloads/ and rewrites downloads/manifest.js so the website's
 * "Download for Windows" button links to the real file.
 * Run automatically by `npm run dist`, or on its own with `npm run publish-download`. */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const dist = path.join(root, 'dist');
const out = path.join(root, 'downloads');
const version = pkg.version;

const setupName = `OutlawCounty-Setup-${version}.exe`;
const zipName = `OutlawCounty-${version}-win-x64.zip`;

function human(bytes) {
  return bytes > 1048576 ? (bytes / 1048576).toFixed(0) + ' MB' : (bytes / 1024).toFixed(0) + ' KB';
}

function publish(name) {
  const src = path.join(dist, name);
  if (!fs.existsSync(src)) return null;
  fs.copyFileSync(src, path.join(out, name));
  const size = human(fs.statSync(src).size);
  console.log(`Published downloads/${name} (${size})`);
  return { file: name, size, version };
}

fs.mkdirSync(out, { recursive: true });
const windows = publish(setupName);
const zip = publish(zipName);

if (!windows && !zip) {
  console.error(`No build found in dist/. Run "npm run build:win" first (expected dist/${setupName}).`);
  process.exit(1);
}

const manifest = `/* Written by scripts/publish-download.js on ${new Date().toISOString()}. */\n` +
  `window.OC_DOWNLOADS = ${JSON.stringify({ windows: windows || zip, zip }, null, 2)};\n`;
fs.writeFileSync(path.join(out, 'manifest.js'), manifest);
console.log('Updated downloads/manifest.js — the website Download button now points at the build.');
