const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', { flights: bounds => ipcRenderer.invoke('flights', bounds) });
