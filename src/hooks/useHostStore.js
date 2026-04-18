import { useState, useEffect } from 'react';

const INITIAL_HOSTS = [
  {
    id: '1',
    name: 'api-server',
    host: '192.168.1.10',
    port: 22,
    username: 'root',
    group: 'Production'
  },
  {
    id: '2',
    name: 'db-server',
    host: '192.168.1.11',
    port: 22,
    username: 'root',
    group: 'Production'
  },
  {
    id: '3',
    name: 'ubuntu-dev',
    host: 'localhost',
    port: 2222,
    username: 'sun',
    group: 'Local Servers'
  },
  {
    id: '4',
    name: 'raspberry-pi',
    host: '192.168.1.50',
    port: 22,
    username: 'pi',
    group: 'Local Servers'
  },
  {
    id: '5',
    name: 'ServerLab AI',
    host: '120.120.120.85',
    port: 22,
    username: 'paksun',
    password: 'adminskawas',
    group: 'ServerLab'
  }
];

export function useHostStore() {
  const [hosts, setHosts] = useState(() => {
    const saved = localStorage.getItem('rooterm_hosts');
    if (!saved) return INITIAL_HOSTS;
    
    try {
      const parsed = JSON.parse(saved);
      return parsed;
    } catch (e) {
      console.error('Failed to parse hosts from localStorage', e);
      return INITIAL_HOSTS;
    }
  });

  const [activeTabs, setActiveTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  useEffect(() => {
    localStorage.setItem('rooterm_hosts', JSON.stringify(hosts));
  }, [hosts]);

  const addHost = (host) => {
    const newHost = { ...host, id: Math.random().toString(36).substr(2, 9) };
    setHosts(current => [...current, newHost]);
  };

  const deleteHost = (id) => {
    setHosts(current => current.filter(h => h.id !== id));
  };

  const updateHost = (id, updates) => {
    setHosts(current => current.map(h => (h.id === id ? { ...h, ...updates } : h)));
  };

  const renameGroup = (oldName, newName) => {
    const trimmedOld = oldName?.trim();
    const trimmedNew = newName?.trim();
    if (!trimmedNew) return;
    
    console.log(`Renaming group from "${trimmedOld}" to "${trimmedNew}"`);
    setHosts(current => {
      const updated = current.map(h => {
        const hostGroup = (h.group || 'Ungrouped').trim();
        if (hostGroup === trimmedOld) {
          return { ...h, group: trimmedNew };
        }
        return h;
      });
      console.log('Updated hosts:', updated);
      return updated;
    });
  };

  const deleteGroup = (groupName) => {
    // Delete the group name from hosts, making them "Ungrouped"
    setHosts(current => current.map(h => (h.group === groupName ? { ...h, group: '' } : h)));
  };

  const connectToHost = (host) => {
    // Check if already open
    const existing = activeTabs.find(t => t.hostId === host.id);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const newTab = {
      id: Math.random().toString(36).substr(2, 9),
      hostId: host.id,
      name: host.name,
      connected: true, // Mocking connection
    };
    setActiveTabs([...activeTabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId) => {
    setActiveTabs(current => {
      const newTabs = current.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
  };

  const closeAllTabsForHost = (hostId) => {
    setActiveTabs(current => {
      const newTabs = current.filter(t => t.hostId !== hostId);
      // If the current tab is being closed, find a new one
      setActiveTabId(currentId => {
        const isActiveTabBeingClosed = current.find(t => t.id === currentId)?.hostId === hostId;
        if (isActiveTabBeingClosed) {
          return newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }
        return currentId;
      });
      return newTabs;
    });
  };

  return {
    hosts,
    addHost,
    activeTabs,
    activeTabId,
    setActiveTabId,
    connectToHost,
    closeTab,
    closeAllTabsForHost,
    deleteHost,
    updateHost,
    renameGroup,
    deleteGroup
  };
}
