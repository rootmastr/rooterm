import React, { useState } from 'react';
import { X, Server, User, Hash, Lock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AddHostModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '22',
    username: '',
    group: 'Default',
    authType: 'password'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
    setFormData({ name: '', host: '', port: '22', username: '', group: 'Default', authType: 'password' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-surface border border-border w-full max-w-md rounded-xl overflow-hidden shadow-2xl shadow-accent/5"
        >
          <div className="p-6 border-b border-border flex items-center justify-between bg-background/30 backdrop-blur-md">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Server size={22} className="text-accent" />
              New Host
            </h3>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-white hover:bg-border/40 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Friendly Name</label>
              <div className="relative group">
                <input
                  required
                  type="text"
                  placeholder="e.g. My API Server"
                  className="w-full bg-background border border-border rounded-lg py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-text-muted"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Host/IP Address</label>
                <input
                  required
                  type="text"
                  placeholder="192.168.1.100"
                  className="w-full bg-background border border-border rounded-lg py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-text-muted"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Port</label>
                <input
                  required
                  type="number"
                  placeholder="22"
                  className="w-full bg-background border border-border rounded-lg py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-text-muted"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Username</label>
              <div className="relative group">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  required
                  type="text"
                  placeholder="root"
                  className="w-full bg-background border border-border rounded-lg py-3 pl-11 pr-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-text-muted"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Group</label>
              <div className="relative group">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Production"
                  className="w-full bg-background border border-border rounded-lg py-3 pl-11 pr-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-text-muted"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-border/40 hover:bg-border/60 text-text-primary py-3 px-4 rounded-xl text-sm font-bold transition-all border border-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] bg-accent hover:bg-accent-dark text-background py-3 px-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-accent/20 active:scale-95"
              >
                Create Host
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
