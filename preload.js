const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  version: () => ipcRenderer.invoke('version'),
  tray: on => ipcRenderer.invoke('tray', on),
  show: () => ipcRenderer.invoke('show'),
  onUpdate: cb => ipcRenderer.on('update', (_, d) => cb(d)),
  installUpdate: () => ipcRenderer.invoke('installUpdate'),
  flights: bounds => ipcRenderer.invoke('flights', bounds),
  route: cs => ipcRenderer.invoke('route', cs),
  aircraft: hex => ipcRenderer.invoke('aircraft', hex),
  photos: hex => ipcRenderer.invoke('photos', hex),
  trace: hex => ipcRenderer.invoke('trace', hex),
  airport: (lat, lon) => ipcRenderer.invoke('airport', lat, lon),
  find: q => ipcRenderer.invoke('find', q),
  watch: hexes => ipcRenderer.invoke('watch', hexes),
  legs: hex => ipcRenderer.invoke('legs', hex),
  metar: (lat, lon) => ipcRenderer.invoke('metar', lat, lon),
  radar: () => ipcRenderer.invoke('radar'),
  turbMap: () => ipcRenderer.invoke('turbMap'),
  wind: (b, hpa) => ipcRenderer.invoke('wind', b, hpa),
  turb: (pts, altFt) => ipcRenderer.invoke('turb', pts, altFt)
});
