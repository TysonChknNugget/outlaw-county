/* Outlaw County — preload bridge. Exposes only quit and fullscreen to the game. */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ocDesktop', {
  isDesktop: true,
  quit: () => ipcRenderer.send('oc:quit'),
  toggleFullscreen: () => ipcRenderer.send('oc:fullscreen')
});
