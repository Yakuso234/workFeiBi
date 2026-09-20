const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('workFeiBi', {
  getState: () => ipcRenderer.invoke('get-state'),
  onState: (callback) => ipcRenderer.on('state', (_event, value) => callback(value)),
  onPetEvent: (callback) => ipcRenderer.on('pet-event', (_event, value) => callback(value)),
  petClick: () => ipcRenderer.send('pet-click'),
  openSettings: () => ipcRenderer.send('open-settings'),
  contextMenu: () => ipcRenderer.send('context-menu'),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  hitTest: (interactive) => ipcRenderer.send('hit-test', interactive),
  timerAction: (action) => ipcRenderer.send('timer-action', action),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
});
