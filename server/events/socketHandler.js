import sshService from '../services/sshService.js';

export const handleSocketConnection = (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Track all sessions opened by this socket for cleanup
  const socketSessions = new Set();

  // Create SSH Connection
  socket.on('ssh:connect', async (data) => {
    const { sessionId, config } = data;
    console.log(`[SOCKET HANDLER] Received ssh:connect for session ${sessionId}`);
    console.log(`[SSH] Creating session ${sessionId} for ${config.host}:${config.port || 22}`);
    socketSessions.add(sessionId);

    try {
      console.log(`[SOCKET HANDLER] Calling sshService.createSession for ${sessionId}`);
      await sshService.createSession(
        sessionId,
        config,
        (chunk) => {
          // Send raw SSH data to frontend
          socket.emit(`ssh:data:${sessionId}`, chunk);
        },
        (event, payload) => {
          // Send connection lifecycle events (READY, ERROR, CLOSED)
          console.log(`[SSH] Event [${sessionId}]: ${event} - ${payload?.message || ''}`);
          socket.emit(`ssh:event:${sessionId}`, { event, ...payload });
          if (event === 'CLOSED' || event === 'DISCONNECTED') {
            socketSessions.delete(sessionId);
          }
        }
      );
    } catch (error) {
      console.error(`[SSH] Failed to connect session ${sessionId}: ${error.message}`);
      socket.emit(`ssh:event:${sessionId}`, { event: 'ERROR', message: error.message });
      socketSessions.delete(sessionId);
    }
  });

  // Handle Terminal Input (keystrokes)
  socket.on('ssh:input', (data) => {
    const { sessionId, input } = data;
    sshService.sendData(sessionId, input);
  });

  // Handle Window Resize
  socket.on('ssh:resize', (data) => {
    const { sessionId, cols, rows } = data;
    sshService.resize(sessionId, cols, rows);
  });

  // Handle Disconnect Request from frontend
  socket.on('ssh:disconnect', (data) => {
    const { sessionId } = data;
    sshService.disconnect(sessionId);
    socketSessions.delete(sessionId);
    console.log(`[SSH] Session ${sessionId} disconnected manually.`);
  });

  // Cleanup ALL sessions when browser client disconnects
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (reason: ${reason})`);
    for (const sessionId of socketSessions) {
      console.log(`[SSH] Cleaning up session ${sessionId} due to socket disconnect`);
      sshService.disconnect(sessionId);
    }
    socketSessions.clear();
  });
};
