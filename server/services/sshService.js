import { Client } from 'ssh2';

class SSHService {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Connect to a remote SSH server
   * @param {string} sessionId 
   * @param {object} config 
   * @param {function} onData 
   * @param {function} onEvent 
   */
  async createSession(sessionId, config, onData, onEvent) {
    // 1. Clean up any existing session with this ID
    this.disconnect(sessionId);

    return new Promise((resolve, reject) => {
      const conn = new Client();
      
      // Store the connection immediately so it can be cleaned up if disconnect is called
      // even before it's 'ready'
      console.log(`[SSH SERVICE] Creating new connection instance for ${sessionId}`);
      this.sessions.set(sessionId, { conn });

      conn.on('ready', () => {
        console.log(`[SSH SERVICE] Connection READY for ${sessionId}`);
        const current = this.sessions.get(sessionId);
        if (!current || current.conn !== conn) {
          console.warn(`[SSH SERVICE] Ignoring READY event for stale connection on ${sessionId}`);
          return;
        }

        onEvent('READY', { message: 'SSH Connection established.' });
        
        // Request an interactive shell with a PTY (xterm)
        conn.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
          if (err) {
            const innerCurrent = this.sessions.get(sessionId);
            if (innerCurrent && innerCurrent.conn === conn) {
              console.error(`[SSH] Shell error for ${sessionId}:`, err);
              onEvent('ERROR', { message: `Shell error: ${err.message}` });
              this.disconnect(sessionId);
            }
            return reject(err);
          }

          console.log(`[SSH] Shell stream created for session ${sessionId}`);
          
          // Update the session with the stream
          const session = this.sessions.get(sessionId);
          if (session && session.conn === conn) {
            session.stream = stream;
          } else {
            // If session was disconnected or replaced while we were waiting for shell
            stream.end();
            return;
          }

          stream.on('data', (data) => {
            const dCurrent = this.sessions.get(sessionId);
            if (dCurrent && dCurrent.conn === conn) {
              onData(data.toString('utf-8'));
            }
          });

          stream.on('close', () => {
            const cCurrent = this.sessions.get(sessionId);
            if (cCurrent && cCurrent.conn === conn) {
              onEvent('CLOSED', { message: 'Stream closed.' });
              this.disconnect(sessionId);
            }
          });

          onEvent('DATA', { message: 'Shell stream ready.' });
          resolve();
        });
      });

      conn.on('error', (err) => {
        console.error(`[SSH SERVICE] Connection ERROR for ${sessionId}:`, err.message);
        const eCurrent = this.sessions.get(sessionId);
        if (eCurrent && eCurrent.conn === conn) {
          onEvent('ERROR', { message: `SSH error: ${err.message}` });
          this.disconnect(sessionId);
        }
        reject(err);
      });

      conn.on('end', () => {
        console.log(`[SSH SERVICE] Connection END for ${sessionId}`);
        const nCurrent = this.sessions.get(sessionId);
        if (nCurrent && nCurrent.conn === conn) {
          onEvent('DISCONNECTED', { message: 'SSH Connection ended.' });
          this.sessions.delete(sessionId);
        }
      });

      conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        // Many servers use keyboard-interactive instead of simple password
        if (prompts.length > 0 && config.password) {
          finish([config.password]);
        } else {
          finish([]);
        }
      });

      // Avoid logging credentials
      const sshConfig = {
        host: config.host,
        port: parseInt(config.port) || 22,
        username: config.username,
        readyTimeout: 20000,
        tryKeyboard: true,       // enable keyboard-interactive auth (needed for many servers)
        keepaliveInterval: 5000, // keep connection alive
        keepaliveCountMax: 3,
      };

      if (config.privateKey) {
        sshConfig.privateKey = config.privateKey;
      } else {
        sshConfig.password = config.password;
      }

      conn.connect(sshConfig);
    });
  }

  /**
   * Send data to a specific session
   * @param {string} sessionId 
   * @param {string} data 
   */
  sendData(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session && session.stream) {
      session.stream.write(data);
    }
  }

  /**
   * Execute a background command (non-interactive)
   * @param {string} sessionId 
   * @param {string} command 
   */
  async execCommand(sessionId, command) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.conn) throw new Error('No active SSH connection found for this session');

    return new Promise((resolve, reject) => {
      // Add timeout to prevent hanging the whole AI system
      const timeout = setTimeout(() => {
        reject(new Error(`Command timed out: ${command}`));
      }, 5000);

      session.conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          return reject(err);
        }
        
        let output = '';
        let errorOutput = '';

        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        stream.on('close', (code, signal) => {
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(errorOutput || `Command failed with code ${code}`));
          } else {
            resolve(output.trim());
          }
        });
      });
    });
  }

  /**
   * Resize the pty for a session
   * @param {string} sessionId 
   * @param {number} cols 
   * @param {number} rows 
   */
  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (session && session.stream) {
      session.stream.setWindow(rows, cols);
    }
  }

  /**
   * Disconnect a session
   * @param {string} sessionId 
   */
  disconnect(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.stream) session.stream.end();
      if (session.conn) session.conn.end();
      this.sessions.delete(sessionId);
    }
  }
}

export default new SSHService();
