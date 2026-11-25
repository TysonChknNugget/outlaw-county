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
  win.loadFile(path.join(__dirname, '..', 'game', 'index.html'));
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
  if (!app.isPackaged || !autoUpdater) return;
  const canInstall = installedWithSetup();
  autoUpdater.autoDownload = canInstall;
  autoUpdater.autoInstallOnAppQuit = canInstall;
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

ipcMain.handle('oc:version', () => app.getVersion());
ipcMain.handle('oc:update-state', () => updateState);
ipcMain.on('oc:install-update', () => { if (autoUpdater && updateState && updateState.state === 'ready') autoUpdater.quitAndInstall(true, true); });
ipcMain.on('oc:open-site', () => shell.openExternal(WEBSITE));
ipcMain.on('oc:quit', () => app.quit());
ipcMain.on('oc:fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); });

app.whenReady().then(() => { createWindow(); setupUpdates(); });
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
