import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

/**
 * A reusable XTerm.js terminal component for React.
 * 
 * Props:
 * @param {Object} options - XTerm.js terminal options
 * @param {Object} theme - Custom terminal theme
 * @param {Function} onData - Callback for user input
 * @param {Function} onResize - Callback for terminal resize ({ cols, rows })
 * @param {string} className - Additional CSS classes for the container
 */
const XTermTerminal = forwardRef(({ 
  options = {}, 
  theme = {}, 
  onData, 
  onResize,
  className = "" 
}, ref) => {
  const terminalElement = useRef(null);
  const xterm = useRef(null);
  const fitAddon = useRef(null);

  // Expose terminal methods to parent via ref
  useImperativeHandle(ref, () => ({
    write: (data) => xterm.current?.write(data),
    writeln: (data) => xterm.current?.writeln(data),
    clear: () => xterm.current?.clear(),
    focus: () => xterm.current?.focus(),
    refresh: () => {
      const rows = xterm.current?.rows || 0;
      if (rows > 0) xterm.current?.refresh(0, rows - 1);
    },
    fit: () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        // After fitting, trigger a slight delay and refresh to ensure crisp rendering
        setTimeout(() => {
          const rows = xterm.current?.rows || 0;
          if (rows > 0) xterm.current?.refresh(0, rows - 1);
        }, 50);
      }
    },
    terminal: xterm.current
  }));

  useEffect(() => {
    if (!terminalElement.current) return;

    // Initialize Terminal
    const term = new Terminal({
      cursorBlink: true,
      scrollback: 10000,
      allowProposedApi: true,
      theme: {
        background: '#0D1117',
        foreground: '#C9D1D9',
        cursor: '#58A6FF',
        selection: '#1F6FEB',
        ...theme
      },
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
      fontSize: 14,
      ...options
    });

    // Initialize Fit Addon
    const fit = new FitAddon();
    term.loadAddon(fit);
    
    // Open terminal in the DOM
    term.open(terminalElement.current);
    
    // Initial fit
    fit.fit();

    xterm.current = term;
    fitAddon.current = fit;

    // Handle User Input
    if (onData) {
      term.onData(onData);
    }

    // Handle special keys to ensure proper escape sequences
    term.attachCustomKeyEventHandler((e) => {
      // Allow all keys to pass through
      return true;
    });

    // Handle Resize logic
    if (onResize) {
      term.onResize((size) => {
        onResize(size);
      });
    }

    // Handle ResizeObserver to trigger Fit
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (fitAddon.current) {
          fitAddon.current.fit();
          const rows = xterm.current?.rows || 0;
          if (rows > 0) xterm.current?.refresh(0, rows - 1);
        }
      }, 150);
    });
    resizeObserver.observe(terminalElement.current);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []); // Only run on mount

  return (
    <div 
      className={`w-full h-full min-h-0 bg-background overflow-hidden ${className}`}
      ref={terminalElement}
    />
  );
});


XTermTerminal.displayName = 'XTermTerminal';

export default XTermTerminal;
