import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

class SSHClient {
  constructor() {
    this.isElectron = !!window.electronAPI;
    const token = localStorage.getItem('rootmastr_token');
    
    this.socket = !this.isElectron ? io(SOCKET_URL, {
      auth: { token }
    }) : null;
    
    // Listen for global Electron context events if available
    if (this.isElectron) {
      this.electronCallbacks = new Map();
      window.electronAPI.onSSHOutput((data) => {
        const { sessionId, data: raw } = data;
        this.emit(`ssh:data:${sessionId}`, raw);
      });
      window.electronAPI.onSSHEvent((data) => {
        const { sessionId, event, message } = data;
        this.emit(`ssh:event:${sessionId}`, { event, message });
      });
    } else {
      // One global listener that routes all data/events to internal callbacks
      this.socket.on('connect', () => console.log('[SSH] WebSocket connected!'));
      this.socket.onAny((event, data) => {
        // Log all incoming events for debugging
        if (event.startsWith('ssh:event:')) {
          console.log(`[DEBUG] Received SSH Event: ${event}`, data);
          this.emit(event, data);
        }
        if (event.startsWith('ssh:data:')) {
          this.emit(event, data);
        }
      });
    }
  }

  setToken(token) {
    if (this.socket) {
      if (this.socket.auth.token === token) return;
      
      this.socket.auth.token = token;
      this.socket.disconnect().connect();
      console.log('[SSH] Socket reconnected with new token');
    }
  }

  // Internal event emitter for listeners
  callbacks = new Map();
  on(event, cb) {
    if (!this.callbacks.has(event)) this.callbacks.set(event, []);
    this.callbacks.get(event).push(cb);
  }
  emit(event, data) {
    (this.callbacks.get(event) || []).forEach(cb => cb(data));
  }
  off(event) {
    this.callbacks.delete(event);
  }

  /**
   * Connect to SSH via Electron IPC or Socket.io bridge.
   */
  async connect(sessionId, config, onData, onEvent) {
    this.off(`ssh:data:${sessionId}`);
    this.off(`ssh:event:${sessionId}`);
    this.on(`ssh:data:${sessionId}`, onData);
    this.on(`ssh:event:${sessionId}`, (data) => onEvent(data.event, data.message));

    if (this.isElectron) {
      window.electronAPI.connectSSH(sessionId, config);
    } else {
      this.socket.emit('ssh:connect', { sessionId, config });
    }
  }

  sendInput(sessionId, input) {
    if (this.isElectron) {
      window.electronAPI.sendInput(sessionId, input);
    } else {
      this.socket.emit('ssh:input', { sessionId, input });
    }
  }

  resize(sessionId, cols, rows) {
    if (this.isElectron) {
      window.electronAPI.resize(sessionId, cols, rows);
    } else {
      this.socket.emit('ssh:resize', { sessionId, cols, rows });
    }
  }

  disconnect(sessionId) {
    if (this.isElectron) {
      window.electronAPI.disconnectSSH(sessionId);
    } else {
      this.socket.emit('ssh:disconnect', { sessionId });
    }
    this.off(`ssh:data:${sessionId}`);
    this.off(`ssh:event:${sessionId}`);
  }
}

export default new SSHClient();
