import React, { useState } from 'react';
import { X, Server, User, Globe, Hash, Lock, ChevronRight, MoreHorizontal, Terminal, Shield, Play, Briefcase, Zap, Settings2, Folder, FolderPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}
import { motion, AnimatePresence } from 'framer-motion';

const SectionHeader = ({ title }) => (
  <div className="px-4 py-2 mt-4 first:mt-0">
    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{title}</h4>
  </div>
);

const InputGroup = ({ icon: Icon, placeholder, value, onChange, type = "text", label, extra }) => (
  <div className="px-4 py-1.5">
    <div className="relative group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60 group-focus-within:text-accent transition-colors flex items-center gap-2">
        <Icon size={14} />
        {label && <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{label}</span>}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full bg-surface border border-border/60 hover:border-border rounded-lg py-2 pl-9 pr-4 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-text-muted/40"
        value={value}
        onChange={onChange}
      />
      {extra && <div className="absolute right-3 top-1/2 -translate-y-1/2">{extra}</div>}
    </div>
  </div>
);

const ActionItem = ({ icon: Icon, label, value, color = "text-text-muted" }) => (
  <div className="px-4 py-1.5">
    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/40 hover:bg-surface border border-border/40 hover:border-border transition-all cursor-pointer group">
      <div className="flex items-center gap-3">
        <Icon size={14} className={color} />
        <span className="text-[10px] font-bold text-text-secondary group-hover:text-text-primary transition-colors uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{value}</span>
    </div>
  </div>
);

export const AddHostPanel = ({ isOpen, onClose, onAdd, onUpdate, editHost, hosts = [] }) => {
  const isEditMode = !!editHost;

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '22',
    username: '',
    password: '',
    group: 'Personal vault',
    authType: 'password'
  });

  // Update form when editHost changes
  React.useEffect(() => {
    if (editHost) {
      setFormData({
        name: editHost.name || '',
        host: editHost.host || '',
        port: String(editHost.port || '22'),
        username: editHost.username || '',
        password: editHost.password || '',
        group: editHost.group || 'Personal vault',
        authType: editHost.authType || 'password'
      });
    } else {
      setFormData({ name: '', host: '', port: '22', username: '', password: '', group: 'Personal vault', authType: 'password' });
    }
  }, [editHost, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.host || !formData.username) return;
    
    if (isEditMode) {
      onUpdate(editHost.id, formData);
    } else {
      onAdd(formData);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 bottom-0 w-96 bg-background border-l border-border z-[60] flex flex-col shadow-2xl overflow-hidden font-sans"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white">{isEditMode ? 'Edit Host' : 'New Host'}</h3>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors text-text-muted">
              <span className="text-[10px] font-bold uppercase tracking-widest">{formData.group}</span>
              <ChevronRight size={10} className="rotate-90" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-text-muted hover:text-white rounded-md hover:bg-border/40 transition-all">
            <MoreHorizontal size={18} />
          </button>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-md hover:bg-white/10 transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <SectionHeader title="Address" />
        <InputGroup 
          icon={Globe} 
          placeholder="IP or Hostname" 
          value={formData.host}
          onChange={(e) => setFormData({ ...formData, host: e.target.value })}
        />

        <SectionHeader title="General" />
        <InputGroup 
          icon={Server} 
          placeholder="Label" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <div className="px-4 py-1.5 pt-4">
           <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 block ml-1">Parent Group</label>
           <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {[...new Set(['Personal vault', ...hosts.map(h => h.group)])].filter(Boolean).slice(0, 5).map(g => (
                  <button
                    key={`group-btn-${g}`}
                    type="button"
                    onClick={() => setFormData({ ...formData, group: g })}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                      formData.group === g 
                        ? "bg-accent/20 border-accent text-accent shadow-[0_0_10px_rgba(88,166,255,0.2)]" 
                        : "bg-surface border-border/40 text-text-muted hover:border-border"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="relative group">
                <FolderPlus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
                <input 
                  placeholder="Or type a new group name..."
                  className="w-full bg-surface border border-border/60 hover:border-border rounded-lg py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/40 transition-all font-medium"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                />
              </div>
           </div>
        </div>
        <ActionItem icon={Hash} label="Tags" value="None" />
        <div className="px-4 py-1.5 flex items-center justify-between opacity-50">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-2">Backspace</span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mr-2">Default</span>
        </div>

        <SectionHeader title={`SSH on ${formData.port} port`} />
        <div className="px-4 py-1.5">
           <input 
             type="number"
             className="w-20 bg-surface border border-border/60 rounded py-1 px-2 text-[10px] text-accent font-bold"
             value={formData.port}
             onChange={(e) => setFormData({ ...formData, port: e.target.value })}
           />
        </div>

        <SectionHeader title="Credentials" />
        <InputGroup 
          icon={User} 
          placeholder="Username" 
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        />
        <InputGroup 
          icon={Lock} 
          type="password"
          placeholder="Password" 
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        <div className="px-4 py-2">
          <button type="button" className="text-[10px] font-bold text-accent hover:text-accent-light transition-colors flex items-center gap-2">
            <Plus size={12} /> SSH.id, Key, Certificate, FIDO2
          </button>
        </div>

        <SectionHeader title="Advanced" />
        <ActionItem icon={Shield} label="Agent Forwarding" value="Disabled" />
        <ActionItem icon={Play} label="Startup Command" value="None" />
        <ActionItem icon={Hash} label="Host Chaining" value="None" />
        <ActionItem icon={Settings2} label="Proxy" value="None" />
        <ActionItem icon={Zap} label="Mosh" value="Disabled" color="text-yellow-400" />
      </form>

      {/* Footer / Theme Preview */}
      <div className="p-4 border-t border-border bg-surface/30">
        <div className="p-3 bg-background border border-border rounded-lg flex items-center gap-3 group cursor-pointer hover:border-accent/40 transition-all">
          <div className="w-10 h-10 rounded bg-[#0D1117] border border-border flex items-center justify-center">
            <Terminal size={20} className="text-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">Termius Dark</span>
            <span className="text-[10px] text-text-muted uppercase tracking-widest">Active Theme</span>
          </div>
        </div>
        
        <div className="mt-4 flex gap-3">
           <button 
             type="button" 
             onClick={onClose}
             className="flex-1 px-4 py-2 bg-surface hover:bg-border/60 border border-border rounded-lg text-[10px] font-black text-text-muted uppercase tracking-widest transition-all"
           >
             Cancel
           </button>
            <button 
              onClick={handleSubmit}
              className="flex-[2] px-4 py-2 bg-accent hover:bg-accent-dark text-background rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-95"
            >
              {isEditMode ? 'Update Host' : 'Create Host'}
            </button>
        </div>
      </div>
    </motion.div>
  );
};

const Plus = ({ size, ...props }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
