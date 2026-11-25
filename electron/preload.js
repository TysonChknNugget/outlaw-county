/* Outlaw County — preload bridge. Exposes only what the game needs:
 * quit, fullscreen, the app version and update notices. */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ocDesktop', {
  isDesktop: true,
  quit: () => ipcRenderer.send('oc:quit'),
  toggleFullscreen: () => ipcRenderer.send('oc:fullscreen'),
  getVersion: () => ipcRenderer.invoke('oc:version'),
  getUpdate: () => ipcRenderer.invoke('oc:update-state'),
  onUpdate: cb => ipcRenderer.on('oc:update', (_e, state) => cb(state)),
  installUpdate: () => ipcRenderer.send('oc:install-update'),
  openDownloadPage: () => ipcRenderer.send('oc:open-site')
});
