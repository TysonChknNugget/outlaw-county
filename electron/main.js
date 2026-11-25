/* Outlaw County — Electron main process.
 * Opens the game/index.html in its own window and keeps the game up to date.
 * Saves use the renderer's localStorage, which Electron keeps on disk in the
 * user's app-data folder, so progress persists offline between sessions.
 *
 * Updates: the installed version checks the GitHub Releases of
 * TysonChknNugget/outlaw-county, downloads a newer version in the background
 * and installs it when the player clicks "Restart & update" (or on quit).
 * The portable ZIP version can't replace itself, so it only shows a notice. */
'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const WEBSITE = 'https://tysonchknnugget.github.io/outlaw-county/';
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch (e) { /* updater unavailable (dev without deps) */ }

let win = null;
let updateState = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    title: 'Outlaw County',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#120b06',
    autoHideMenuBar: true,
    fullscreenable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  });
  win.removeMenu();
  win.loadFile(gameIndex());
  win.once('ready-to-show', () => win.show());

  // F11 toggles fullscreen even though there is no menu bar
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
  });

  // never navigate the game window away from the game; open web links in the browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });

  win.on('closed', () => { win = null; });
}

/* ---------------- content updates ----------------
 * Most updates only change the game's own files (HTML, JS, CSS), not this
 * program. Those are published as one bundle, content.json, on the "content"
 * release. The app downloads it into its data folder and simply reloads the
 * window. No installer runs, so Windows has nothing to block. */
const CONTENT_URL = 'https://github.com/TysonChknNugget/outlaw-county/releases/download/content/content.json';
const SHELL_VERSION = '2.8.0';   // the oldest app that can run today's content bundles
const contentRoot = () => path.join(app.getPath('userData'), 'content');
const verNum = v => String(v || '0').split('.').map(n => parseInt(n, 10) || 0);
const newer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
function readMeta() { try { return JSON.parse(fs.readFileSync(path.join(contentRoot(), 'current', 'meta.json'), 'utf8')); } catch (e) { return null; } }
function contentUsable(meta) {
  return meta && newer(meta.version, app.getVersion()) && !newer(meta.minShell, SHELL_VERSION) && fs.existsSync(path.join(contentRoot(), 'current', 'game', 'index.html'));
}
let loadedContent = null;   // version of the content bundle in the window, or null for the built-in game
function gameIndex() {
  const meta = readMeta();
  if (contentUsable(meta)) { loadedContent = meta.version; return path.join(contentRoot(), 'current', 'game', 'index.html'); }
  loadedContent = null;
  return path.join(__dirname, '..', 'game', 'index.html');
}
function currentVersion() { return loadedContent || app.getVersion(); }

async function checkContent() {
  const { net } = require('electron');
  const crypto = require('crypto');
  try {
    const res = await net.fetch(CONTENT_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const bundle = await res.json();
    if (!bundle || !bundle.files || !newer(bundle.version, currentVersion()) || newer(bundle.minShell, SHELL_VERSION)) return;
    const meta = readMeta();
    if (meta && meta.version === bundle.version) { sendUpdate({ state: 'ready', version: bundle.version, content: true }); return; }
    sendUpdate({ state: 'downloading', version: bundle.version, percent: 50, content: true });
    const root = contentRoot(), next = path.join(root, 'next'), cur = path.join(root, 'current'), old = path.join(root, 'old');
    fs.rmSync(next, { recursive: true, force: true });
    for (const [rel, f] of Object.entries(bundle.files)) {
      if (rel.includes('..') || path.isAbsolute(rel)) throw new Error('bad path in bundle: ' + rel);
      const data = Buffer.from(f.b64, 'base64');
      if (crypto.createHash('sha256').update(data).digest('hex') !== f.sha256) throw new Error('corrupt file in bundle: ' + rel);
      const out = path.join(next, rel);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, data);
    }
    fs.writeFileSync(path.join(next, 'meta.json'), JSON.stringify({ version: bundle.version, minShell: bundle.minShell || '0' }));
    fs.rmSync(old, { recursive: true, force: true });
    if (fs.existsSync(cur)) fs.renameSync(cur, old);
    fs.renameSync(next, cur);
    fs.rmSync(old, { recursive: true, force: true });
    sendUpdate({ state: 'ready', version: bundle.version, content: true });
  } catch (e) {
    console.error('Content update failed:', e && e.message);
    if (updateState && updateState.content && updateState.state === 'downloading') sendUpdate({ state: 'error', version: updateState.version, content: true });
  }
}

/* ---------------- updates ---------------- */
// The NSIS installer leaves an uninstaller next to the exe; the portable ZIP doesn't.
function installedWithSetup() {
  return fs.existsSync(path.join(path.dirname(process.execPath), 'Uninstall Outlaw County.exe'));
}

function sendUpdate(state) {
  updateState = state;
  if (win) win.webContents.send('oc:update', state);
}

function setupUpdates() {
  if (!app.isPackaged) return;
  // game-file updates work for both the installed and the portable copy
  setTimeout(checkContent, 3000);
  setInterval(checkContent, 30 * 60 * 1000);
  if (!autoUpdater) return;
  const canInstall = installedWithSetup();
  autoUpdater.autoDownload = canInstall;
  // Never run the installer on its own when the game closes: if Windows blocks it,
  // the game just wouldn't come back. Installs only happen when the player clicks.
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('update-available', info => sendUpdate({ state: canInstall ? 'downloading' : 'available', version: info.version, percent: 0 }));
  autoUpdater.on('download-progress', p => sendUpdate({ state: 'downloading', version: updateState && updateState.version, percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', info => sendUpdate({ state: 'ready', version: info.version }));
  autoUpdater.on('error', err => {
    console.error('Update check failed:', err && err.message);
    if (updateState && updateState.state === 'downloading') sendUpdate({ state: 'error', version: updateState.version });
  });
  const check = () => autoUpdater.checkForUpdates().catch(() => { /* offline: try again later */ });
  setTimeout(check, 4000);
  setInterval(check, 3 * 60 * 60 * 1000);
}

ipcMain.handle('oc:version', () => currentVersion());
ipcMain.handle('oc:update-state', () => updateState);
ipcMain.on('oc:install-update', () => {
  if (!updateState || updateState.state !== 'ready') return;
  if (updateState.content) { updateState = null; if (win) win.loadFile(gameIndex()); return; }   // just reload the window
  if (autoUpdater) autoUpdater.quitAndInstall(true, true);
});
ipcMain.on('oc:open-site', () => shell.openExternal(WEBSITE));
ipcMain.on('oc:quit', () => app.quit());
ipcMain.on('oc:fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); });

app.whenReady().then(() => { createWindow(); setupUpdates(); });
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
