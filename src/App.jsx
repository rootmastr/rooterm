import React, { useState, useEffect, useRef, useContext } from 'react';
import { AIProvider, AIContext } from './context/AIContext.jsx';
import { X, Terminal as TerminalIcon, Plus, Trash2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';
import { TerminalTab } from './components/TerminalTab';
import { AIPanel } from './components/AIPanel';
import { Overlay } from './components/Overlay';
import { AddHostPanel } from './components/AddHostPanel';
import { useHostStore } from './hooks/useHostStore';
import { motion, AnimatePresence } from 'framer-motion';

import { AuthContext } from './context/AuthContext.jsx';
import { Login } from './components/Login.jsx';

function App() {
  const { user, loading, logout } = useContext(AuthContext);
  const {
    hosts,
    addHost,
    updateHost,
    activeTabs,
    activeTabId,
    setActiveTabId,
    connectToHost,
    closeTab,
    closeAllTabsForHost,
    deleteHost,
    renameGroup,
    deleteGroup
  } = useHostStore();

  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [editingHost, setEditingHost] = useState(null);
  const [hostToDelete, setHostToDelete] = useState(null);
  const { isOpen: isAIPanelOpen, toggle: toggleAIPanel, close: closeAIPanel } = useContext(AIContext);  

  // Keyboard shortcuts for Add Host (Ctrl+N)
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+N (or Cmd+N on mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingHost(null);
        setIsAddPanelOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0D1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted font-black text-[10px] uppercase tracking-widest">Initializing Secure Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const activeTab = activeTabs.find(t => t.id === activeTabId);
  const activeHost = activeTab ? hosts.find(h => h.id === activeTab.hostId) : null;

  const confirmDeleteHost = () => {
    if (!hostToDelete) return;
    const id = hostToDelete;
    
    // 1. Close all tabs for this host
    closeAllTabsForHost(id);
    
    // 2. Delete host from store
    deleteHost(id);
    setHostToDelete(null);
  };

  const handleRunAICommand = (command) => {
    if (!activeTabId) {
      alert('Please connect to a host first to run commands.');
      return;
    }
    
    // In a real app, we'd emit an event or use a ref-dispatch system.
    // For this demo, we can use a custom event.
    const event = new CustomEvent('terminal-run-command', { 
      detail: { tabId: activeTabId, command } 
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary overflow-hidden select-none font-sans">
      <TopBar 
        onAddHost={() => {
          setEditingHost(null);
          setIsAddPanelOpen(true);
        }}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          hosts={hosts} 
          activeHostId={activeHost?.id}
          onConnect={connectToHost} 
          onEdit={(id) => {
            const host = hosts.find(h => h.id === id);
            if (host) {
              setEditingHost(host);
              setIsAddPanelOpen(true);
            }
          }}
          onDelete={(id) => setHostToDelete(id)}
          onRenameGroup={renameGroup}
          onDeleteGroup={deleteGroup}
        />
        
        <main className={`flex-1 flex flex-col min-w-0 bg-background transition-all duration-300 ${isAIPanelOpen ? 'pr-[320px] sm:pr-[400px]' : 'pr-0'}`}>
          {/* Tabs Bar */}
          <div className="h-10 flex items-center bg-surface/20 border-b border-border overflow-x-auto no-scrollbar">
            <AnimatePresence>
              {activeTabs.map(tab => (
                <motion.div
                  key={tab.id}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 160, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className={`
                    group flex items-center gap-2 px-3 h-full border-r border-border cursor-pointer transition-all relative
                    ${activeTabId === tab.id ? 'bg-background border-b-2 border-b-accent' : 'hover:bg-surface/40'}
                  `}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <TerminalIcon size={14} className={activeTabId === tab.id ? 'text-accent' : 'text-text-muted'} />
                  <span className={`text-xs truncate flex-1 ${activeTabId === tab.id ? 'text-white' : 'text-text-secondary'}`}>
                    {tab.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-border text-text-muted hover:text-white transition-all"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {activeTabs.length > 0 && (
              <button 
                onClick={() => setIsAddPanelOpen(true)}
                className="p-2 text-text-muted hover:text-white transition-all"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Terminal Area */}
          <div className="flex-1 relative bg-[#0D1117]">
            {activeTabs.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
                <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6 shadow-2xl text-text-muted">
                  <TerminalIcon size={40} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Ready to connect</h1>
                <p className="text-text-secondary max-w-xs mb-8 font-medium">
                  Choose a host from the sidebar or add a new one to start your session.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="px-4 py-2 rounded bg-surface border border-border text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-4">
                    <span>Quick Add Host</span>
                    <span className="bg-background px-1.5 py-0.5 rounded border border-border">Ctrl + N</span>
                  </div>
                  <div className="px-4 py-2 rounded bg-surface border border-border text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-4">
                    <span>AI Assistant</span>
                    <span className="bg-background px-1.5 py-0.5 rounded border border-border">Ctrl + K</span>
                  </div>
                </div>
              </div>
            ) : (
                activeTabs.map(tab => (
                  <TerminalTab
                    key={tab.id}
                    host={hosts.find(h => h.id === tab.hostId)}
                    active={activeTabId === tab.id}
                    tabId={tab.id}
                  />
                ))
            )}
          </div>
        </main>

        <AnimatePresence>
          {isAIPanelOpen && (
              <AIPanel 
                isOpen={isAIPanelOpen} 
                onClose={closeAIPanel} 
                onRunCommand={handleRunAICommand}
                sessionId={activeTabId}
              />
          )}
        </AnimatePresence>
      </div>

      <StatusBar activeTab={activeTab} host={activeHost} />

      <AddHostPanel 
        isOpen={isAddPanelOpen} 
        onClose={() => {
          setIsAddPanelOpen(false);
          setEditingHost(null);
        }} 
        onAdd={addHost}
        onUpdate={updateHost}
        editHost={editingHost}
        hosts={hosts}
      />

      <AnimatePresence>
        {hostToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-red-400/10 flex items-center justify-center mb-4 text-red-500 border border-red-500/20">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Delete Connection?</h3>
                <p className="text-sm text-text-muted mb-6">
                  Are you sure you want to remove <span className="text-white font-medium">{hosts.find(h => h.id === hostToDelete)?.name}</span>? 
                  This action cannot be undone and will close all active sessions.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHostToDelete(null)}
                    className="flex-1 px-4 py-2 bg-surface hover:bg-border/60 border border-border rounded-lg text-xs font-bold text-text-muted uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteHost}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

