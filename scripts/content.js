/* Outlaw County — publish a game-content update (no installer).
 *
 * Usage:
 *   1. Raise "version" in package.json (for example 2.8.0 -> 2.8.1).
 *   2. Run:  npm run content -- "What changed"
 *
 * It packs game/ (and the icon it uses) into dist/content.json, uploads it to
 * the "content" pre-release on GitHub, then commits and pushes. Installed
 * copies (v2.8.0 and newer) pick it up within half an hour, or on the next
 * start, and just reload; Windows never sees a new program to block.
 *
 * scripts/release.js calls upload() too, so every full release also refreshes
 * the content bundle. Requires the GitHub CLI (`gh`) signed in. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const MIN_SHELL = '2.8.0';   // keep in sync with SHELL_VERSION in electron/main.js
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, Object.assign({ cwd: root, stdio: 'inherit' }, opts));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

function build() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const files = {};
  for (const abs of walk(path.join(root, 'game')).concat([path.join(root, 'assets', 'icon.png')])) {
    const rel = path.relative(root, abs).split(path.sep).join('/'), data = fs.readFileSync(abs);
    files[rel] = { sha256: crypto.createHash('sha256').update(data).digest('hex'), b64: data.toString('base64') };
  }
  const bundle = { version: pkg.version, minShell: MIN_SHELL, built: new Date().toISOString(), files };
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const out = path.join(root, 'dist', 'content.json');
  fs.writeFileSync(out, JSON.stringify(bundle));
  console.log(`Packed ${Object.keys(files).length} files for v${pkg.version} (${Math.round(fs.statSync(out).size / 1024)} KB).`);
  return out;
}

function upload(file) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const pub = pkg.build.publish[0], repo = `${pub.owner}/${pub.repo}`;
  let exists = true;
  try { execFileSync('gh', ['release', 'view', 'content', '--repo', repo], { cwd: root, stdio: 'ignore' }); } catch (e) { exists = false; }
  if (!exists) run('gh', ['release', 'create', 'content', '--repo', repo, '--prerelease', '--title', 'Game content (automatic updates)',
    '--notes', 'The installed game downloads content.json from here to update itself without an installer. Download the game from the website, not here.']);
  run('gh', ['release', 'upload', 'content', file, '--repo', repo, '--clobber']);
  console.log(`Uploaded content v${pkg.version}.`);
}

module.exports = { build, upload };

if (require.main === module) {
  const notes = process.argv.slice(2).join(' ');
  upload(build());
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  run('git', ['add', '-A']);
  try { run('git', ['commit', '-m', `Content update v${pkg.version}` + (notes ? `\n\n${notes}` : '') + (process.env.COMMIT_TRAILER ? `\n\n${process.env.COMMIT_TRAILER}` : '')]); } catch (e) { /* nothing to commit */ }
  run('git', ['push']);
  console.log(`\nPublished content v${pkg.version}. Installed games will reload into it.`);
}
