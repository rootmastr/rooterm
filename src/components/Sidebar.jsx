import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, Server, Folder, MoreVertical, Edit2, Trash2, FolderPlus, Monitor, Shield, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ContextMenu = ({ x, y, onClose, onEdit, onDelete, type = "host" }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      style={{ top: y, left: x }}
      className="fixed z-[100] w-44 bg-[#161B22]/95 border border-[#30363D] rounded-xl shadow-2xl py-1.5 overflow-hidden backdrop-blur-xl"
    >
      <div className="px-3 py-1 mb-1 border-b border-border/30">
        <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Management</span>
      </div>
      <button
        onClick={() => { onEdit(); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2 text-xs text-text-primary hover:bg-accent/10 hover:text-accent transition-all group"
      >
        <Edit2 size={13} className="text-text-muted group-hover:text-accent" />
        {type === 'host' ? 'Edit Connection' : 'Rename Group'}
      </button>
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-all group"
      >
        <Trash2 size={13} className="text-red-400 group-hover:scale-110 transition-transform" />
        {type === 'host' ? 'Remove Host' : 'Delete Group'}
      </button>
    </motion.div>
  );
};

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  children, 
  hasChildren, 
  depth = 0,
  count,
  onContextMenu 
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-0.5">
      <div
        className={cn(
          "group flex items-center px-4 py-2 text-xs cursor-pointer transition-all duration-200 relative mx-2 rounded-lg",
          active 
            ? "bg-accent/15 text-accent font-bold" 
            : "text-text-secondary hover:bg-surface/60 hover:text-text-primary",
          depth > 0 && "ml-6 mr-2"
        )}
        onClick={() => {
          if (hasChildren) setIsOpen(!isOpen);
          else if (onClick) onClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (onContextMenu) onContextMenu(e);
        }}
      >
        {active && (
           <motion.div 
             layoutId="activeHostHighlight"
             className="absolute left-0 top-1 bottom-1 w-1 bg-accent rounded-full shadow-[0_0_12px_rgba(88,166,255,0.6)]" 
           />
        )}
        
        <span className={cn(
          "mr-2.5 transition-colors",
          active ? "text-accent" : "text-text-muted group-hover:text-text-secondary"
        )}>
          {hasChildren ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <Icon size={14} strokeWidth={2.5} />
          )}
        </span>

        <span className="flex-1 truncate uppercase tracking-wider text-[11px] font-medium">
          {label}
        </span>

        {hasChildren && count !== undefined && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-surface-dark/50 text-text-muted group-hover:bg-accent/10 group-hover:text-accent transition-all">
            {count}
          </span>
        )}

        {!hasChildren && (
          <button 
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-border/60 rounded-md text-text-muted hover:text-text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
          >
            <MoreVertical size={12} />
          </button>
        )}
      </div>
      
      {hasChildren && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-l border-border/10 ml-5"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export const Sidebar = ({ 
  hosts, 
  activeHostId, 
  onConnect, 
  onEdit, 
  onDelete,
  onRenameGroup,
  onDeleteGroup 
}) => {
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  
  // Extract all unique groups, ensuring empty group becomes "Ungrouped"
  const rawGroups = [...new Set(hosts.map(h => h.group || 'Ungrouped'))];
  // Sort groups, but keep Ungrouped at the end
  const sortedGroups = rawGroups.sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });

  const filteredHosts = hosts.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase()) || 
    h.host.toLowerCase().includes(search.toLowerCase())
  );

  const handleHostContextMenu = (e, host) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'host',
      id: host.id
    });
  };

  const handleGroupContextMenu = (e, groupName) => {
    if (groupName === 'Ungrouped') return; // Can't manage virtual ungrouped
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'group',
      id: groupName
    });
  };

  const [renamingGroup, setRenamingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');

  const handleRenameGroup = (oldName) => {
    setRenamingGroup(oldName);
    setNewGroupName(oldName);
  };

  const submitRename = () => {
    if (newGroupName.trim() && newGroupName.trim() !== renamingGroup) {
      onRenameGroup(renamingGroup, newGroupName.trim());
    }
    setRenamingGroup(null);
  };

  const handleDeleteGroup = (groupName) => {
    setDeletingGroup(groupName);
  };

  const confirmDeleteGroup = () => {
    onDeleteGroup(deletingGroup);
    setDeletingGroup(null);
  };

  return (
    <div className="w-64 h-full bg-[#0D1117] border-r border-[#30363D] flex flex-col pt-4 select-none relative group/sidebar shadow-2xl z-50">
      <div className="px-5 mb-8">
        <div className="flex items-center justify-between mb-5">
           <h2 className="text-[10px] font-black text-white uppercase tracking-[0.25em] opacity-80">Explorer</h2>
           <button className="text-text-muted hover:text-accent transition-colors">
              <FolderPlus size={14} />
           </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/40 group-focus-within/sidebar:text-accent/60 transition-colors" size={13} />
          <input
            type="text"
            placeholder="Search connections..."
            className="w-full bg-[#161B22] border border-[#30363D] rounded-xl py-2 pl-9 pr-4 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all placeholder:text-text-muted/30 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {sortedHosts(sortedGroups, filteredHosts).map(({ group, items }) => (
          <SidebarItem 
            key={`group-${group}`} 
            icon={Folder} 
            label={group} 
            hasChildren 
            count={items.length}
            onContextMenu={(e) => handleGroupContextMenu(e, group)}
          >
            {items.map(host => (
              <SidebarItem
                key={host.id}
                icon={Monitor}
                label={host.name}
                depth={1}
                active={activeHostId === host.id}
                onClick={() => onConnect(host)}
                onContextMenu={(e) => handleHostContextMenu(e, host)}
              />
            ))}
          </SidebarItem>
        ))}
        
        {filteredHosts.length === 0 && search && (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-border/30">
               <Monitor size={20} className="text-text-muted/20" />
            </div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-relaxed">No matching<br/>hosts found</p>
          </div>
        )}
      </div>

      {/* Persistence / Stats Footer */}
      <div className="px-5 py-4 border-t border-border/30 bg-[#161B22]/50 backdrop-blur-md">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Shield size={12} className="text-green-500/60" />
               <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Vault Secure</span>
            </div>
            <span className="text-[9px] font-black text-text-muted opacity-50">{hosts.length} Hosts</span>
         </div>
      </div>

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            type={contextMenu.type}
            onClose={() => setContextMenu(null)}
            onEdit={() => {
              if (contextMenu.type === 'host') onEdit && onEdit(contextMenu.id);
              else handleRenameGroup(contextMenu.id);
            }}
            onDelete={() => {
              if (contextMenu.type === 'host') onDelete && onDelete(contextMenu.id);
              else handleDeleteGroup(contextMenu.id);
            }}
          />
        )}

        {renamingGroup && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Rename Group</h3>
              <input 
                autoFocus
                className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent transition-all mb-6"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') setRenamingGroup(null);
                }}
              />
              <div className="flex gap-3">
                <button onClick={() => setRenamingGroup(null)} className="flex-1 px-4 py-2 bg-surface hover:bg-border/60 border border-border rounded-lg text-[10px] font-black text-text-muted uppercase tracking-widest transition-all">Cancel</button>
                <button onClick={submitRename} className="flex-1 px-4 py-2 bg-accent hover:bg-accent-dark text-background rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Save</button>
              </div>
            </motion.div>
          </div>
        )}

        {deletingGroup && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">Delete Group?</h3>
              <p className="text-xs text-text-muted mb-6">Are you sure you want to delete <span className="text-white">"{deletingGroup}"</span>? All hosts will be moved to Ungrouped.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingGroup(null)} className="flex-1 px-4 py-2 bg-surface hover:bg-border/60 border border-border rounded-lg text-[10px] font-black text-text-muted uppercase tracking-widest transition-all">Cancel</button>
                <button onClick={confirmDeleteGroup} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper to group hosts
function sortedHosts(groups, hosts) {
  return groups.map(group => {
    const groupItems = hosts.filter(h => (h.group || 'Ungrouped') === group);
    return { group, items: groupItems };
  }).filter(g => g.items.length > 0);
}

