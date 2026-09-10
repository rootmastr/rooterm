import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Shield, Zap, Terminal } from 'lucide-react';
import { API_URL } from '../config';

export const StatusBar = ({ activeTab, host }) => {
  const [latency, setLatency] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const measureLatency = async () => {
      const start = performance.now();
      try {
        await fetch(`${API_URL}/health`, { 
          method: 'GET',
          cache: 'no-store'
        });
        const end = performance.now();
        setLatency(Math.round(end - start));
      } catch {
        setLatency(null);
      }
    };

    if (activeTab && host) {
      measureLatency();
      intervalRef.current = setInterval(measureLatency, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTab, host]);

  const getLatencyColor = () => {
    if (latency === null) return 'text-text-muted';
    if (latency < 100) return 'text-green-400';
    if (latency < 300) return 'text-yellow-400';
    return 'text-red-400';
  };

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
        <span className={`flex items-center gap-1.5 ${getLatencyColor()}`}>
           <Zap size={12} /> Latency: {latency !== null ? `${latency}ms` : '...'}
        </span>
      </div>
    </div>
  );
};
