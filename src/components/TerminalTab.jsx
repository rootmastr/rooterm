import React, { useRef, useEffect, useState, useCallback } from 'react';
import XTermTerminal from './XTermTerminal';
import sshClient from '../services/sshClient';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';

export const TerminalTab = ({ host, active, tabId }) => {
  const terminalRef = useRef(null);
  const [status, setStatus] = useState('connecting'); // connecting, ready, error
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // AI Command listener
  useEffect(() => {
    const handleRunCommand = (e) => {
      const { tabId: targetTabId, command } = e.detail;
      if (targetTabId === tabId && terminalRef.current) {
        sshClient.sendInput(tabId, command + '\r');
        terminalRef.current.focus();
      }
    };
    window.addEventListener('terminal-run-command', handleRunCommand);
    return () => window.removeEventListener('terminal-run-command', handleRunCommand);
  }, [tabId]);

  const connectedHostRef = useRef(null);
  const connectionInProgressRef = useRef(false);
  const currentStatusRef = useRef(status);

  // Sync ref with state
  useEffect(() => {
    currentStatusRef.current = status;
  }, [status]);

  // Handle connection
  const connect = useCallback(() => {
    if (!terminalRef.current) return;
    if (!host) {
      console.warn('[SSH] No host provided to TerminalTab');
      return;
    }
    
    const hostKey = `${host.host}:${host.port}:${host.username}`;
    
    // 1. If we're already ready for this host, do absolutely nothing.
    // This prevents the "refresh" flicker when switching between already connected tabs.
    if (connectedHostRef.current === hostKey && currentStatusRef.current === 'ready') {
      console.log(`[DEBUG] Session ${tabId} already ready for ${hostKey}, skipping re-connect.`);
      return;
    }

    // 2. If a connection for this specific host key is already in progress, don't start another.
    if (connectionInProgressRef.current && connectedHostRef.current === hostKey) {
      console.log(`[DEBUG] Connection to ${hostKey} already in progress for session ${tabId}`);
      return;
    }
    
    console.log(`[DEBUG] Initiating connection to ${hostKey} for session ${tabId}`);
    
    // IMPORTANT: Only clear and set status if we are actually starting a NEW connection
    // or if we were in an error state.
    if (currentStatusRef.current !== 'ready' || connectedHostRef.current !== hostKey) {
      connectedHostRef.current = hostKey;
      connectionInProgressRef.current = true;
      setStatus('connecting');
      setError(null);
      terminalRef.current.clear();
    }
    
    // Safety Timeout: If authentication takes longer than 15s, show error
    const authTimeout = setTimeout(() => {
      if (currentStatusRef.current === 'connecting') {
        console.error('[SSH] Connection timeout after 15s');
        setStatus('error');
        setError('Connection timed out. The server might be unreachable or taking too long to respond.');
        connectionInProgressRef.current = false;
        connectedHostRef.current = null;
      }
    }, 15000);

    sshClient.connect(
      tabId,
      {
        host: host.host,
        port: host.port,
        username: host.username,
        password: host.password,
      },
      (data) => {
        if (terminalRef.current) terminalRef.current.write(data);
        
        // Simple Real-Time Feedback Loop: Detect errors in output
        const lowerData = data.toLowerCase();
        const errors = ['command not found', 'permission denied', 'no such file', 'cannot access', 'error:'];
        if (errors.some(err => lowerData.includes(err))) {
          window.dispatchEvent(new CustomEvent('terminal-error-detected', { 
            detail: { tabId, errorOutput: data.trim() } 
          }));
        }
      },
      (event, message) => {
        clearTimeout(authTimeout);
        console.log(`[DEBUG] TerminalTab [${tabId}] status event:`, event, message);
        if (event === 'READY') {
          setStatus('ready');
          connectionInProgressRef.current = false;
          const token = localStorage.getItem('rootmastr_token');
          fetch(`${API_URL}/server/context/${tabId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(e => console.error("Context fetch failed", e));
        }
        if (event === 'ERROR') {
          console.error('[SSH ERROR]:', message);
          setStatus('error');
          setError(message);
          connectedHostRef.current = null;
          connectionInProgressRef.current = false;
        }
        if (event === 'DISCONNECTED' || event === 'CLOSED') {
          setStatus('error');
          setError(message || 'The remote connection was closed.');
          connectedHostRef.current = null;
          connectionInProgressRef.current = false;
        }
      }
    );
  }, [host, tabId]); // Logic uses Refs for status and progress to avoid stale closures and re-runs

  // Lifecycle for connection
  useEffect(() => {
    connect();
    return () => {
      // Only disconnect if we are actually cleaning up the tab, 
      // not just re-rendering
    };
  }, [connect, tabId, retryCount]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log(`[DEBUG] Unmounting TerminalTab ${tabId}, disconnecting...`);
      sshClient.disconnect(tabId);
    };
  }, [tabId]);

  // Handle visibility changes (tab switching)
  useEffect(() => {
    if (active && terminalRef.current) {
      // Small delay to ensure DOM is updated and visible
      const timer = setTimeout(() => {
        terminalRef.current.fit();
        terminalRef.current.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [active]);

  const handleData = (data) => {
    sshClient.sendInput(tabId, data);
  };

  const handleResize = useCallback(({ cols, rows }) => {
    if (cols > 0 && rows > 0) {
      sshClient.resize(tabId, cols, rows);
    }
  }, [tabId]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div 
      className={`absolute inset-0 transition-opacity duration-200 ${active ? 'opacity-100 z-10 visible' : 'opacity-0 z-0 invisible pointer-events-none'}`}
      style={{ backfaceVisibility: 'hidden' }}
    >
      <div className="w-full h-full relative overflow-hidden bg-[#0D1117]">
        <XTermTerminal 
          ref={terminalRef}
          onData={handleData}
          onResize={handleResize}
        />
      </div>

      <AnimatePresence>
        {status !== 'ready' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center z-10"
          >
            <AnimatePresence mode="wait">
              {status === 'connecting' ? (
                <motion.div 
                  key="connecting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative mb-6">
                    <Loader2 className="w-12 h-12 text-accent animate-spin" strokeWidth={1.5} />
                    <div className="absolute inset-0 blur-xl bg-accent/20 animate-pulse" />
                  </div>
                  <p className="text-sm font-black text-white uppercase tracking-[0.2em] mb-1">Authenticating</p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest px-8">
                    {host.username}@{host.host}:{host.port}
                  </p>
                </motion.div>
              ) : status === 'error' ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center max-w-sm text-center px-10"
                >
                  <div className="w-16 h-16 rounded-2xl bg-red-400/10 flex items-center justify-center mb-6 border border-red-400/20">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Connection Blocked</h3>
                  <p className="text-xs text-text-muted font-medium mb-8 leading-relaxed">
                    {error || "Access denied or network timeout. Please verify your host credentials and port settings."}
                  </p>
                  <button 
                    onClick={handleRetry}
                    className="group flex items-center gap-3 px-8 py-3 bg-white text-background rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:bg-accent hover:text-white active:scale-95"
                  >
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                    Reconnect Session
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



