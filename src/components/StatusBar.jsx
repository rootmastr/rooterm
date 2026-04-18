import React from 'react';
import { Wifi, Shield, Zap, Terminal } from 'lucide-react';

export const StatusBar = ({ activeTab, host }) => {
  if (!activeTab || !host) {
    return (
      <div className="h-8 bg-background border-t border-border flex items-center px-4 justify-between text-[10px] text-text-muted font-medium uppercase tracking-wider">
        <span>No active session</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><Zap size={12} /> Ready</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-8 bg-background border-t border-border flex items-center px-4 justify-between text-[10px] text-text-muted font-medium uppercase tracking-wider">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-green-500">
           <Wifi size={12} /> Connected: {host.name}
        </span>
        <span className="flex items-center gap-1.5">
           <Terminal size={12} /> {host.username}@{host.host}:{host.port}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-accent">
           <Shield size={12} /> Auth: Password
        </span>
        <span className="flex items-center gap-1.5 text-green-400">
           <Zap size={12} /> Latency: 12ms
        </span>
      </div>
    </div>
  );
};
