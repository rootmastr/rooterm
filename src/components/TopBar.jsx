import { Plus, Settings, Sparkles, Terminal as TerminalIcon, LogOut } from 'lucide-react';
import { AIToggleButton } from './AIToggleButton';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const TopBar = ({ onAddHost, onToggleAI, isAIPanelOpen }) => {
  const { logout, user } = useContext(AuthContext);

  return (
    <div className="h-14 border-b border-border bg-surface/30 backdrop-blur-sm flex items-center justify-between px-6 select-none relative z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-background shadow-lg shadow-accent/20">
          <TerminalIcon size={20} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-white leading-tight">RooTerm</span>
          <span className="text-[10px] text-text-muted font-black uppercase tracking-widest leading-none">
            {user?.role === 'admin' ? 'Cloud Admin' : 'Standard'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
          <AIToggleButton />
        <div className="w-px h-4 bg-border mx-1" />
        <button 
          onClick={onAddHost}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-background px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-95"
        >
          <Plus size={16} />
          Add Host
        </button>
        <button 
          onClick={logout}
          className="flex items-center gap-2 p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all group"
          title="Logout"
        >
          <LogOut size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block">Logout</span>
        </button>
        <button className="p-2 text-text-secondary hover:text-white hover:bg-border/40 rounded-md transition-all">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};

