import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../api/admin';

export default function CommandPalette({
  isOpen,
  onClose,
  setCurrentView,
  onClockIn,
  onClockOut,
  onToggleTheme,
  onLogout,
  isAdmin
}) {
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Load employee list for fuzzy search
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const list = await adminApi.getEmployees();
          setEmployees(list);
        } catch (err) {
          console.warn('Failed to load employees for command palette:', err);
        }
      };
      loadData();
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation inside the palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, query, employees]);

  if (!isOpen) return null;

  // Roster of commands
  const defaultCommands = [
    { id: 'nav-dash', type: 'nav', title: 'Go to Dashboard', icon: '📊', action: () => setCurrentView('dashboard') },
    { id: 'nav-dir', type: 'nav', title: 'Go to Employee Directory', icon: '👥', action: () => setCurrentView('directory') },
    { id: 'nav-prof', type: 'nav', title: 'Go to My Workspace Profile', icon: '👤', action: () => setCurrentView('profile') },
    ...(isAdmin ? [
      { id: 'nav-admin', type: 'nav', title: 'Go to Admin Control Center', icon: '🔑', action: () => setCurrentView('admin') },
      { id: 'nav-audit', type: 'nav', title: 'Go to System Audit Logs', icon: '📜', action: () => setCurrentView('audit') }
    ] : []),
    { id: 'act-clock-office', type: 'action', title: 'Clock In (Office Mode)', icon: '🟢', action: () => onClockIn('Office') },
    { id: 'act-clock-wfh', type: 'action', title: 'Clock In (Work From Home)', icon: '🏡', action: () => onClockIn('WFH') },
    { id: 'act-clock-out', type: 'action', title: 'Clock Out Shift', icon: '🔴', action: onClockOut },
    { id: 'act-theme', type: 'action', title: 'Toggle Light/Dark Theme', icon: '🌓', action: onToggleTheme },
    { id: 'act-logout', type: 'action', title: 'Sign Out Account', icon: '🚪', action: onLogout }
  ];

  // Filter items matching query
  const matchingEmployees = query.trim()
    ? employees
        .filter(emp => emp.name.toLowerCase().includes(query.toLowerCase()) || emp.role.toLowerCase().includes(query.toLowerCase()) || emp.department.toLowerCase().includes(query.toLowerCase()))
        .map(emp => ({
          id: `emp-${emp.id}`,
          type: 'employee',
          title: `View ${emp.name} (${emp.role})`,
          icon: '👤',
          action: () => {
            setCurrentView('directory');
            // We can dispatch a custom event to open the employee modal in the Directory tab!
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-employee-modal', { detail: { employee: emp } }));
            }, 100);
          }
        }))
    : [];

  const filteredItems = [
    ...defaultCommands.filter(c => c.title.toLowerCase().includes(query.toLowerCase())),
    ...matchingEmployees
  ];

  const handleSelect = (item) => {
    item.action();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div 
        className="glass-card" 
        onClick={e => e.stopPropagation()} 
        style={{
          maxWidth: '600px',
          width: '90%',
          padding: '0',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)'
        }}
      >
        {/* Search header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-card)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '1.25rem', opacity: 0.8 }}>⌨️</span>
          <input
            ref={inputRef}
            type="text"
            className="input-control"
            placeholder="Type a command or search employee name..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.1rem',
              width: '100%',
              padding: '0',
              boxShadow: 'none'
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border-card)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>ESC</span>
        </div>

        {/* Results body */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No commands or personnel matching "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? 'hsla(var(--primary), 0.15)' : 'transparent',
                    color: isSelected ? 'hsl(var(--primary))' : 'var(--text-main)',
                    fontWeight: isSelected ? '600' : '400',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <span style={{ flex: 1, fontSize: '0.95rem' }}>{item.title}</span>
                  {isSelected && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>↩ ENTER</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
