const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  flights: bounds => ipcRenderer.invoke('flights', bounds),
  route: cs => ipcRenderer.invoke('route', cs),
  aircraft: hex => ipcRenderer.invoke('aircraft', hex)
});
