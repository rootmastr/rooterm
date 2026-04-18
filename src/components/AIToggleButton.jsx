import React, { useContext } from 'react';
import { AIContext } from '../context/AIContext.jsx';
import { Bot } from 'lucide-react';

export const AIToggleButton = () => {
  const { isOpen, toggle, hasSuggestion } = useContext(AIContext);

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all border relative ${
        isOpen
          ? 'bg-accent/10 border-accent text-accent shadow-[0_0_15px_rgba(88,166,255,0.3)]'
          : 'bg-surface/50 border-border text-text-secondary hover:text-white hover:border-text-secondary'
      }`}
    >
      <div className="relative">
        <Bot size={14} className={isOpen ? 'animate-pulse' : ''} />
        {hasSuggestion && !isOpen && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-surface animate-bounce" />
        )}
      </div>
      AI Assistant
    </button>
  );
};
