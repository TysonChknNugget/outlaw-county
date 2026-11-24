/* Outlaw County — Electron main process.
 * Opens the same game/index.html the website serves, in its own window.
 * Saves use the renderer's localStorage, which Electron keeps on disk in the
 * user's app-data folder, so progress persists offline between sessions. */
'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let win = null;

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

ipcMain.on('oc:quit', () => app.quit());
ipcMain.on('oc:fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
