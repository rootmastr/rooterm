import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Terminal, Trash2, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config';

export const AIPanel = ({ isOpen, onClose, onRunCommand, sessionId }) => {
  const scrollRef = useRef(null);
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: 'Hello! I am your RooTerm AI Assistant. How can I help you manage your servers today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const commandCards = [
    { id: 1, title: 'Check System Status', command: 'top -n 1', icon: Terminal },
    { id: 2, title: 'List Active Ports', command: 'netstat -tulpn', icon: Terminal },
    { id: 3, title: 'Memory Usage', command: 'free -m', icon: Terminal },
  ];

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    const msgId = Date.now();
    const newUserMsg = { id: msgId, type: 'user', text: userMessage };
    
    // Create an empty AI message that we will fill with stream data
    const aiResponseId = msgId + 1;
    const initialAIResponse = { 
      id: aiResponseId, 
      type: 'ai', 
      text: '', 
      isStreaming: true 
    };

    setMessages(prev => [...prev, newUserMsg, initialAIResponse]);
    setInput('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('rootmastr_token');
      const response = await fetch(`${API_URL}/ai/stream`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage, sessionId }),
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let lineBuffer = ''; // Line buffer for fragmented SSE chunks
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || ''; // Keep incomplete line
        
        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;
          const dataStr = cleanLine.replace('data: ', '').trim();
          if (!dataStr) continue;
          
          try {
            const data = JSON.parse(dataStr);
            
            if (data.chunk) {
              fullText += data.chunk;
              
              // Clean up JSON tags from the visible text for a better experience
              let visibleText = fullText;
              
              const explanationMatch = fullText.match(/"explanation":\s*"([^"]*)"/);
              if (explanationMatch && explanationMatch[1]) {
                visibleText = explanationMatch[1];
              } else if (fullText.includes('{')) {
                // If it looks like JSON but no explanation yet, show progress
                visibleText = fullText.replace(/\{[\s\S]*/, '').trim() || 'Analyzing results...';
              } else {
                // If it's just raw text, show as is
                visibleText = fullText;
              }

              setMessages(prev => prev.map(m => 
                m.id === aiResponseId ? { ...m, text: visibleText } : m
              ));
            }

            if (data.done) {
              setMessages(prev => prev.map(m => 
                m.id === aiResponseId ? { 
                  ...m, 
                  isStreaming: false,
                  suggestedCommand: data.command,
                  confidence: data.confidence,
                  safety: data.safety
                } : m
              ));
            }

            if (data.error) {
               throw new Error(data.error);
            }
          } catch (e) {
            console.error('Error parsing stream chunk', e);
          }
        }
      }
    } catch (error) {
      console.error('AI Stream Error:', error);
      setMessages(prev => prev.map(m => 
        m.id === aiResponseId ? { 
          ...m, 
          isStreaming: false,
          text: `Error: ${error.message || "Failed to reach AI Core. Check if the Ollama server at 111.68.31.232 is accessible."}` 
        } : m
      ));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
      className="fixed right-0 top-0 h-full w-[320px] sm:w-[400px] bg-surface border-l border-border z-40 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/20">
            <Sparkles size={18} className="text-accent animate-pulse" />
          </div>
          <h2 className="font-bold text-white tracking-tight">AI Assistant</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-md text-text-muted hover:text-white transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar scroll-smooth"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.type === 'user' 
                ? 'bg-accent text-background rounded-tr-none font-medium' 
                : 'bg-white/5 border border-white/10 text-text-secondary rounded-tl-none'
            }`}>
              {msg.text}
              
              {msg.suggestedCommand && (
                <div className="mt-3 p-3 bg-black/40 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent">Suggested Command</span>
                      {msg.confidence && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent-light border border-accent/20 font-bold">
                          {Math.round(msg.confidence * 100)}% Match
                        </span>
                      )}
                    </div>
                    <Terminal size={12} className="text-accent/50" />
                  </div>
                  
                  <code className="block text-xs font-mono text-accent-light break-all bg-black/20 p-2 rounded">
                    {msg.suggestedCommand}
                  </code>

                  {msg.safety?.isDangerous && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-500 mb-1">
                        <AlertTriangle size={12} />
                        <span className="text-[9px] font-black uppercase tracking-[0.1em]">Security Warning</span>
                      </div>
                      <p className="text-[10px] text-red-400/80 leading-tight">
                        {msg.safety.description}
                      </p>
                    </div>
                  )}

                  <button 
                    onClick={() => onRunCommand?.(msg.suggestedCommand)}
                    className={`w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      msg.safety?.isDangerous 
                        ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-500'
                        : 'bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent'
                    }`}
                  >
                    {msg.safety?.isDangerous ? 'Execute Anyway' : 'Run Command'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        
        {/* Command Cards */}
        {messages.length === 1 && (
          <div className="pt-4 space-y-3">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Quick Commands</p>
            <div className="grid grid-cols-1 gap-2">
              {commandCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => {
                    setInput(card.title);
                    handleSend();
                  }}
                  className="group flex items-center gap-3 p-3 bg-white/5 hover:bg-accent/5 border border-white/10 hover:border-accent/30 rounded-xl transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface border border-white/10 flex items-center justify-center text-text-muted group-hover:text-accent group-hover:bg-accent/10 transition-all">
                    <card.icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-accent transition-all">{card.title}</h4>
                    <p className="text-[10px] text-text-muted group-hover:text-accent/60 transition-all font-mono">{card.command}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-surface/80 backdrop-blur-md">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI for commands..."
            className="w-full bg-black/40 border border-border focus:border-accent/40 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-text-muted/40 focus:outline-none transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent text-background rounded-lg disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-[9px] font-bold text-text-muted uppercase tracking-widest">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">Enter</kbd> to send</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">Esc</kbd> to close</span>
        </div>
      </div>
    </motion.div>
  );
};
