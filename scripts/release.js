/* Outlaw County — publish a new version.
 *
 *   1. Raise "version" in package.json (for example 1.1.0 -> 1.2.0).
 *   2. Run:  npm run release -- "What changed in this version"
 *
 * `npm run release` builds the Windows installer and ZIP, then this script:
 *   - creates GitHub Release v<version> with the installer, ZIP, latest.yml and
 *     blockmap (latest.yml is what installed copies check to auto-update),
 *   - points the website's Download buttons at the new files,
 *   - commits and pushes, which redeploys the website.
 * Requires the GitHub CLI (`gh`) signed in to the repository owner's account. */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const pub = pkg.build.publish[0];
const v = pkg.version, tag = 'v' + v;
const base = `https://github.com/${pub.owner}/${pub.repo}/releases/download/${tag}/`;
const setup = `OutlawCounty-Setup-${v}.exe`, zip = `OutlawCounty-${v}-win-x64.zip`;
const files = [setup, zip, 'latest.yml', setup + '.blockmap'].map(f => path.join(root, 'dist', f));
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
const mb = f => Math.round(fs.statSync(f).size / 1048576) + ' MB';

for (const f of files) if (!fs.existsSync(f)) { console.error(`Missing ${path.relative(root, f)} — run "npm run release", not this script directly.`); process.exit(1); }

const notes = process.argv.slice(2).join(' ') || `Outlaw County ${v}.`;
const body = `${notes}\n\nAlready installed? The game updates itself — you'll see a notice in the game.\n\n` +
  `- **${setup}** — installer\n- **${zip}** — portable (doesn't auto-update)\n\n` +
  `Not code-signed: if Windows warns, choose **More info → Run anyway**.`;
run('gh', ['release', 'create', tag, ...files, '--repo', `${pub.owner}/${pub.repo}`, '--title', `Outlaw County ${v}`, '--notes', body]);

// refresh the game-content bundle too, so installed copies can update without an installer
const content = require('./content');
content.upload(content.build());

// website download links
const manifest = path.join(root, 'downloads', 'manifest.js');
fs.writeFileSync(manifest, `/* Download links for the website, written by scripts/release.js for ${tag}.\n * The builds are GitHub Release assets (GitHub won't store files over 100 MB in a repository). */\n` +
  `window.OC_DOWNLOADS = ${JSON.stringify({ windows: { file: base + setup, size: mb(files[0]), version: v }, zip: { file: base + zip, size: mb(files[1]), version: v } }, null, 2)};\n`);
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/https:\/\/github\.com\/[^"]+\/releases\/download\/v[\d.]+\/OutlawCounty-[\d.]+-win-x64\.zip/g, base + zip)
  .replace(/<dd>\d+ MB installer, or a portable ZIP<\/dd>/, `<dd>${mb(files[0])} installer, or a portable ZIP</dd>`);
fs.writeFileSync(indexPath, html);

run('git', ['add', '-A']);
run('git', ['commit', '-m', `Release ${tag}\n\n${notes}` + (process.env.COMMIT_TRAILER ? `\n\n${process.env.COMMIT_TRAILER}` : '')]);
run('git', ['push']);
console.log(`\nReleased ${tag}. Installed copies will offer the update the next time they start (or within 3 hours).`);
