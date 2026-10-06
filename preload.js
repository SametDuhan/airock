const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  flights: bounds => ipcRenderer.invoke('flights', bounds),
  route: cs => ipcRenderer.invoke('route', cs),
  aircraft: hex => ipcRenderer.invoke('aircraft', hex),
  photos: hex => ipcRenderer.invoke('photos', hex),
  trace: hex => ipcRenderer.invoke('trace', hex),
  airport: (lat, lon) => ipcRenderer.invoke('airport', lat, lon),
  watch: hexes => ipcRenderer.invoke('watch', hexes),
  legs: hex => ipcRenderer.invoke('legs', hex),
  metar: (lat, lon) => ipcRenderer.invoke('metar', lat, lon),
  radar: () => ipcRenderer.invoke('radar')
});
