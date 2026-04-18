const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Connection methods
  connectSSH: (sessionId, config) => ipcRenderer.send('ssh:connect', { sessionId, config }),
  sendInput: (sessionId, input) => ipcRenderer.send('ssh:input', { sessionId, input }),
  resize: (sessionId, cols, rows) => ipcRenderer.send('ssh:resize', { sessionId, cols, rows }),
  disconnectSSH: (sessionId) => ipcRenderer.send('ssh:disconnect', { sessionId }),
  
  // Event listeners
  onSSHOutput: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ssh:output', listener);
    return () => ipcRenderer.removeListener('ssh:output', listener);
  },
  
  onSSHEvent: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ssh:event', listener);
    return () => ipcRenderer.removeListener('ssh:event', listener);
  }
});
