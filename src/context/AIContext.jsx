import React, { createContext, useState, useCallback, useEffect } from 'react';

export const AIContext = createContext({
  isOpen: false,
  hasSuggestion: false,
  toggle: () => {},
  close: () => {},
  setHasSuggestion: () => {}
});

export const AIProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('isAIOpen');
    return saved === 'true';
  });

  const [hasSuggestion, setHasSuggestion] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      localStorage.setItem('isAIOpen', next);
      if (next) setHasSuggestion(false);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem('isAIOpen', 'false');
  }, []);

  // Keyboard shortcuts: Ctrl+K to toggle, Esc to close
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+K (or Cmd+K on mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
      // Escape to close
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle, close]);

  return (
    <AIContext.Provider value={{ isOpen, hasSuggestion, toggle, close, setHasSuggestion }}>
      {children}
    </AIContext.Provider>
  );
};
