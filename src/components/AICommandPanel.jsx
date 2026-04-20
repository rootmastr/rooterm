import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, Copy, Play, Terminal, HelpCircle, Info, AlertCircle, Server, Shield, Activity, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';

export const AICommandPanel = ({ isOpen, onClose, onRunCommand, sessionId }) => {
  const [input, setInput] = useState('');
  const [chatAnswer, setChatAnswer] = useState(null);
  const [suggestedCommand, setSuggestedCommand] = useState(null);
  const [isDangerous, setIsDangerous] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const [autoRun, setAutoRun] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);

  // Fetch Server Context on Open
  useEffect(() => {
    if (isOpen && sessionId) {
      const token = localStorage.getItem('rootmastr_token');
      fetch(`${API_URL}/server/context/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setServerInfo(data))
        .catch(e => console.error("Failed to load server context", e));
    }
  }, [isOpen, sessionId]);

  // Debounce suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (input.length > 3) {
        try {
          const token = localStorage.getItem('rootmastr_token');
          const res = await fetch(`${API_URL}/ai/suggest`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ input, sessionId })
          });
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        } catch (e) {}
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [input]);

  const handleGenerate = async (presetQuery = null) => {
    const query = presetQuery || input;
    if (!query.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setChatAnswer('');
    setSuggestedCommand(null);
    setIsDangerous(false);
    setShowSuggestions(false);
    if (!presetQuery) setInput(query);

    try {
      const token = localStorage.getItem('rootmastr_token');
      const response = await fetch(`${API_URL}/ai/stream`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: query, sessionId })
      });

      if (!response.body) throw new Error('AI Core connection failed');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullRawText = '';
      let lineBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;
          const dataStr = cleanLine.replace('data: ', '').trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (data.chunk) {
              fullRawText += data.chunk;
              
              // Heuristic extract explanation for live display
              let visibleText = fullRawText;
              const explanationMatch = fullRawText.match(/"explanation":\s*"([^"]*)"/);
              if (explanationMatch && explanationMatch[1]) {
                visibleText = explanationMatch[1];
              } else if (fullRawText.includes('{')) {
                visibleText = fullRawText.replace(/\{[\s\S]*/, '').trim() || 'Analyzing...';
              }
              
              setChatAnswer(visibleText);
            }

            if (data.done) {
              setSuggestedCommand(data.command);
              setIsDangerous(data.safety?.isDangerous || false);
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            console.error('Stream parse error', e);
          }
        }
      }
    } catch (err) {
      console.error('AI Stream Error:', err);
      setError(`Failed to reach AI Core: ${err.message}. Ensure the backend is running and Ollama at 111.68.31.232 is accessible.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(suggestions.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0) {
        e.preventDefault();
        setInput(suggestions[selectedIndex]);
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      } else if (!e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Feedback loop listener
  useEffect(() => {
    const handleErrorDetected = (e) => {
      const { tabId, errorOutput } = e.detail;
      if (tabId === sessionId) {
        setChatAnswer(`I detected an error in your terminal: "${errorOutput.slice(0, 50)}...". Would you like me to analyze it?`);
        setSuggestedCommand(null);
        setInput(`Explain this error and suggest a fix: ${errorOutput}`);
      }
    };
    window.addEventListener('terminal-error-detected', handleErrorDetected);
    return () => window.removeEventListener('terminal-error-detected', handleErrorDetected);
  }, [sessionId]);

  const handleCopy = () => {
    if (suggestedCommand) navigator.clipboard.writeText(suggestedCommand);
  };

  const QUICK_ACTIONS = [
    { label: 'Update System', query: 'Update all packages on this Linux system', icon: Activity },
    { label: 'Install Docker', query: 'How to install the latest Docker engine', icon: Server },
    { label: 'Setup Nginx', query: 'Setup nginx as reverse proxy', icon: Globe },
    { label: 'Security Scan', query: 'Simple shell script to check open ports and security', icon: Shield },
  ];

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="fixed top-14 right-0 bottom-8 w-[400px] bg-[#0D1117] border-l border-[#30363D] z-40 flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.6)]"
    >
      {/* Header */}
      <div className="p-5 border-b border-[#30363D] flex items-center justify-between bg-[#161B22]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-xl border border-accent/30 shadow-[0_0_15px_rgba(33,212,253,0.2)]">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-0.5">Server Assistant</h3>
            <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest leading-none">Management & Scripts</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-text-muted hover:text-white rounded-xl hover:bg-white/5 transition-all">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
        {/* Server Info Panel */}
        {serverInfo && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-accent/5 border border-accent/20 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                <Server size={10} /> Active Node Context
              </span>
              <span className="text-[8px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Linked</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
               {[
                 { l: 'OS', v: serverInfo.os },
                 { l: 'Kernel', v: serverInfo.kernel },
                 { l: 'RAM', v: serverInfo.ram },
                 { l: 'Disk', v: serverInfo.disk }
               ].map(item => (
                 <div key={item.l}>
                   <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-0.5">{item.l}</p>
                   <p className="text-[10px] text-white font-bold truncate">{item.v || 'Gathering...'}</p>
                 </div>
               ))}
            </div>
          </motion.div>
        )}
        {/* Input Block */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Server Request</label>
            <HelpCircle size={12} className="text-text-muted/40" />
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-accent-dark/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
            <textarea
              className="relative w-full bg-[#161B22] border border-[#30363D] rounded-2xl p-5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all min-h-[120px] resize-none placeholder:text-text-muted/30 font-medium"
              placeholder="e.g. Script untuk install Webmin terbaru di Ubuntu 22.04"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-2xl z-50">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); setShowSuggestions(false); setSuggestions([]); }}
                    className={`w-full text-left px-4 py-3 text-xs font-medium border-b border-[#30363D] last:border-0 transition-all ${i === selectedIndex ? 'bg-accent/20 text-accent' : 'text-text-muted hover:bg-white/5'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <button 
                onClick={() => setAutoRun(!autoRun)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${autoRun ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 text-text-muted border border-white/10'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${autoRun ? 'bg-accent animate-pulse' : 'bg-text-muted opacity-40'}`} />
                Auto Execute: {autoRun ? 'ON' : 'OFF'}
              </button>
            </div>
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !input.trim()}
              className="absolute bottom-4 right-4 p-2.5 bg-accent hover:bg-accent-dark text-background rounded-xl shadow-xl shadow-accent/20 transition-all disabled:opacity-20 active:scale-95"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4"
            >
              <AlertCircle size={18} className="text-red-500 mt-0.5" />
              <p className="text-xs text-red-200 font-medium leading-relaxed">{error}</p>
            </motion.div>
          )}

          {(chatAnswer || suggestedCommand) ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {isDangerous && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-start gap-4 animate-pulse">
                  <Shield size={20} className="text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Potentially Dangerous Command</h4>
                    <p className="text-[10px] text-orange-200 font-medium leading-relaxed">This command may cause data loss or system interruption. Please verify before running.</p>
                  </div>
                </div>
              )}

              {chatAnswer && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 px-1">
                    <Info size={14} className="text-accent" />
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Assistant Analysis</label>
                  </div>
                  <div className="bg-[#161B22]/60 border border-[#30363D] rounded-2xl p-5 text-sm text-text-secondary leading-relaxed font-medium">
                    {chatAnswer}
                  </div>
                </div>
              )}

              {suggestedCommand && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Suggested Script</label>
                    <button onClick={handleCopy} className="text-[10px] font-black text-text-muted hover:text-white transition-all uppercase tracking-widest flex items-center gap-2">
                       <Copy size={12} /> Copy
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-accent/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    <div className="relative bg-[#0D1117] border border-[#30363D] rounded-2xl p-5 font-mono text-xs text-accent-light break-all leading-relaxed shadow-inner">
                      <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
                        <Terminal size={12} />
                      </div>
                      {suggestedCommand}
                    </div>
                  </div>
                  <button
                    onClick={() => onRunCommand(suggestedCommand)}
                    className="w-full flex items-center justify-center gap-3 bg-accent hover:bg-accent-dark text-background py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-accent/10 active:scale-[0.98]"
                  >
                    <Terminal size={15} />
                    Run in Terminal
                  </button>
                </div>
              )}

              <button 
                onClick={() => { setChatAnswer(null); setSuggestedCommand(null); setInput(''); }}
                className="w-full text-center text-[10px] font-bold text-text-muted hover:text-white uppercase tracking-widest transition-colors py-4 border-t border-[#30363D]"
              >
                Clear and New Query
              </button>
            </motion.div>
          ) : !isGenerating && (
            <motion.div
              key="presets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2 mb-8">
                <p className="text-xs font-bold text-text-muted/60 uppercase tracking-widest">Management Presets</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {QUICK_ACTIONS.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGenerate(action.query)}
                    className="flex items-center gap-4 p-5 bg-[#161B22] hover:bg-surface/40 border border-[#30363D] hover:border-accent/40 rounded-2xl transition-all group text-left"
                  >
                    <div className="p-3 bg-surface border border-[#30363D] group-hover:bg-accent/10 group-hover:border-accent/30 rounded-xl transition-all">
                      <action.icon size={18} className="text-text-muted group-hover:text-accent transition-all" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">{action.label}</h4>
                      <p className="text-[10px] text-text-muted font-medium line-clamp-1">{action.query}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-[#30363D] bg-[#161B22]/50">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold tracking-[0.2em] uppercase">
             <div className="w-1 h-1 rounded-full bg-accent" /> RooEngine v2.2
           </div>
           <div className="flex gap-1">
             {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#30363D]" />)}
           </div>
        </div>
      </div>
    </motion.div>
  );
};
