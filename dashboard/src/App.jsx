import { useState, useEffect } from 'react';
import DirectoryPanel from './components/DirectoryPanel';
import AdminPanel from './components/AdminPanel';
import DashboardPanel from './components/DashboardPanel';
import UserPanel from './components/UserPanel';
import AuditPanel from './components/AuditPanel';
import AuthPage from './components/AuthPage';
import ToastContainer, { showToast } from './components/Toast';
import CommandPalette from './components/CommandPalette';
import { isSupabaseConfigured, hasSupabaseKeys, setSupabaseActive, supabase } from './api/supabaseClient';
import { authApi } from './api/auth';
import { usersApi } from './api/users';
import { adminApi } from './api/admin';
import './index.css';
import './app.css';
import './style.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'directory', 'profile', 'admin', 'audit'
  const [theme, setTheme] = useState('dark');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer open
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop collapsed sidebar
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [sessionTrigger, setSessionTrigger] = useState(0);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  // Notification Drawer state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Check login session and Supabase connection availability on mount
  useEffect(() => {
    const initApp = async () => {
      if (hasSupabaseKeys() && supabase) {
        try {
          const { error } = await supabase
            .from('employees')
            .select('id')
            .limit(1);
            
          if (!error) {
            setSupabaseActive(true);
            console.log('⚡ Supabase Cloud connection successfully verified!');
          } else {
            console.warn('⚠️ Supabase schema missing. Falling back to LocalStorage.', error.message);
            setSupabaseActive(false);
          }
        } catch (err) {
          console.warn('⚠️ Supabase client failed connection. Falling back to LocalStorage.', err);
          setSupabaseActive(false);
        }
      } else {
        setSupabaseActive(false);
      }

      // Restore session
      const user = authApi.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
      setSessionLoading(false);
    };

    initApp();
  }, []);

  // Sync active session when trigger or user changes
  useEffect(() => {
    const checkSession = async () => {
      if (currentUser) {
        try {
          const session = await usersApi.getActiveSession(currentUser.id);
          setActiveSession(session);
        } catch (err) {
          console.warn('Failed to load active session:', err);
        }
      }
    };
    checkSession();
  }, [currentUser, sessionTrigger]);

  // Load notifications (reminders, approvals, announcements)
  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const list = [];
      const userRoleLevel = currentUser.roleLevel || 'Employee';
      const isAdminOrManager = userRoleLevel === 'Admin' || userRoleLevel === 'HR' || userRoleLevel === 'Manager';

      // 1. Fetch pending leaves if manager/admin
      if (isAdminOrManager) {
        const allLeaves = await adminApi.getAllLeaves();
        const pending = allLeaves.filter(l => l.status === 'Pending');
        pending.forEach(req => {
          list.push({
            id: `leave-${req.id}`,
            icon: '📅',
            title: 'Leave Request Pending',
            body: `${req.employeeName} requested ${req.type} on ${req.startDate}`,
            time: req.requestDate,
            action: () => { setCurrentView('admin'); setNotificationsOpen(false); }
          });
        });
      }

      // 2. Fetch employee birthdays & anniversaries
      const employees = await adminApi.getEmployees();
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDate = today.getDate();

      employees.forEach(emp => {
        if (emp.birthDate) {
          const birthParts = emp.birthDate.split('-');
          if (birthParts.length === 3) {
            const bMonth = parseInt(birthParts[1], 10);
            const bDay = parseInt(birthParts[2], 10);
            
            // Birthday today or in the next 7 days
            if (bMonth === currentMonth && bDay >= currentDate && bDay <= currentDate + 7) {
              const daysLeft = bDay - currentDate;
              list.push({
                id: `bday-${emp.id}`,
                icon: '🎂',
                title: daysLeft === 0 ? "Birthday Today! 🎉" : "Upcoming Birthday 🎂",
                body: `${emp.name}'s birthday is ${daysLeft === 0 ? 'today' : `in ${daysLeft} days`} (${birthParts[1]}-${birthParts[2]})`,
                time: 'Annually',
                action: () => { setCurrentView('directory'); setNotificationsOpen(false); }
              });
            }
          }
        }

        // Anniversaries (joinDate anniversary)
        if (emp.joinDate) {
          const joinParts = emp.joinDate.split('-');
          if (joinParts.length === 3) {
            const jMonth = parseInt(joinParts[1], 10);
            const jDay = parseInt(joinParts[2], 10);
            if (jMonth === currentMonth && jDay >= currentDate && jDay <= currentDate + 7) {
              const daysLeft = jDay - currentDate;
              const years = today.getFullYear() - parseInt(joinParts[0], 10);
              if (years > 0) {
                list.push({
                  id: `anniv-${emp.id}`,
                  icon: '🌟',
                  title: daysLeft === 0 ? "Work Anniversary Today! 🌟" : "Upcoming Work Anniversary",
                  body: `${emp.name} celebrates ${years} ${years === 1 ? 'year' : 'years'} with Apex ${daysLeft === 0 ? 'today' : `in ${daysLeft} days`}!`,
                  time: 'Annually',
                  action: () => { setCurrentView('directory'); setNotificationsOpen(false); }
                });
              }
            }
          }
        }
      });

      setNotifications(list);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Add event listener to refresh notifications on leave/clocks
    window.addEventListener('show-toast', loadNotifications);
    return () => window.removeEventListener('show-toast', loadNotifications);
  }, [currentUser, sessionTrigger]);

  // Global Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to open-employee-modal custom event from Command Palette
  useEffect(() => {
    const handleOpenEmp = () => {
      // Handled by DirectoryPanel
    };
    window.addEventListener('open-employee-modal', handleOpenEmp);
    return () => window.removeEventListener('open-employee-modal', handleOpenEmp);
  }, []);

  // Sidebar live clock stopwatch
  useEffect(() => {
    let timer = null;
    if (activeSession) {
      const updateTimer = () => {
        const diffMs = Date.now() - activeSession.timestamp;
        const diffSecs = Math.floor(diffMs / 1000);
        const hours = String(Math.floor(diffSecs / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diffSecs % 3600) / 60)).padStart(2, '0');
        const secs = String(diffSecs % 60).padStart(2, '0');
        setElapsedTime(`${hours}:${mins}:${secs}`);
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(timer);
  }, [activeSession]);

  const handleClockIn = async (workMode = 'Office') => {
    if (!currentUser) return;
    try {
      const session = await usersApi.clockIn(currentUser.id, workMode);
      setActiveSession(session);
      setSessionTrigger((prev) => prev + 1);
      showToast(`Clocked In successfully (${workMode})!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleClockOut = async () => {
    if (!currentUser) return;
    try {
      await usersApi.clockOut(currentUser.id);
      setActiveSession(null);
      setSessionTrigger((prev) => prev + 1);
      showToast('Clocked Out successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('apex_portal_session', JSON.stringify(updatedUser));
    showToast('Profile updated successfully!', 'success');
  };

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setCurrentView('dashboard');
    setActiveSession(null);
    showToast('Signed out successfully.', 'info');
  };

  if (sessionLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // If not authenticated, render login/signup screen
  if (!currentUser) {
    return <AuthPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const userRoleLevel = currentUser.roleLevel || 'Employee';
  const isAdmin = userRoleLevel === 'Admin' || userRoleLevel === 'HR';
  const isManager = userRoleLevel === 'Manager';
  const hasAccessToAdmin = isAdmin || isManager;
  const isCloud = isSupabaseConfigured();

  return (
    <div className={`portal-app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Top Header (Hidden on Desktop) */}
      <header className="mobile-portal-header no-print">
        <button className="burger-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
          ☰
        </button>
        <div className="portal-brand">
          <span className="brand-icon">💼</span>
          <span>Apex Portal</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="theme-toggle" onClick={() => setNotificationsOpen(true)} title="Notifications" style={{ width: '32px', height: '32px', position: 'relative' }}>
            🔔
            {notifications.length > 0 && (
              <span className="notif-badge">{notifications.length}</span>
            )}
          </button>
          <button className="theme-toggle" onClick={handleThemeToggle} title="Toggle Theme" style={{ width: '32px', height: '32px' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <div className={`portal-sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`portal-sidebar no-print ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="portal-brand">
            <span className="brand-icon">💼</span>
            <span className="brand-text">Apex Portal</span>
          </div>
          <span 
            className={`db-status-badge ${isCloud ? 'connected' : 'fallback'}`} 
            title={isCloud ? 'Connected to Supabase cloud database' : 'Running in offline mode using LocalStorage.'}
          >
            {isCloud ? '⚡ Cloud' : '📁 Local'}
          </span>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        {/* Quick stopwatch clock widget */}
        <div className="sidebar-clock-widget">
          <div className="clock-header">
            <span className="widget-label">Shift Timer</span>
            <span className={`status-dot ${activeSession ? 'active' : ''}`}></span>
          </div>
          <div className="sidebar-elapsed-time">{elapsedTime}</div>
          {activeSession ? (
            <button className="btn btn-danger btn-sidebar-clock" onClick={handleClockOut}>
              🔴 <span className="btn-text">Clock Out</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="btn btn-success btn-sidebar-clock" onClick={() => handleClockIn('Office')} style={{ flex: 1, padding: '0.4rem' }}>
                🏢 <span className="btn-text">Office</span>
              </button>
              <button className="btn btn-primary btn-sidebar-clock" onClick={() => handleClockIn('WFH')} style={{ flex: 1, padding: '0.4rem', background: '#3b82f6' }}>
                🏡 <span className="btn-text">WFH</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
            title="Dashboard"
          >
            <span className="icon">📊</span> <span className="item-text">Dashboard</span>
          </button>
          <button 
            className={`sidebar-nav-item ${currentView === 'directory' ? 'active' : ''}`}
            onClick={() => { setCurrentView('directory'); setSidebarOpen(false); }}
            title="Directory"
          >
            <span className="icon">👥</span> <span className="item-text">Directory Roster</span>
          </button>
          <button 
            className={`sidebar-nav-item ${currentView === 'profile' ? 'active' : ''}`}
            onClick={() => { setCurrentView('profile'); setSidebarOpen(false); }}
            title="My Workspace"
          >
            <span className="icon">👤</span> <span className="item-text">My Workspace</span>
          </button>
          {hasAccessToAdmin && (
            <button 
              className={`sidebar-nav-item ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => { setCurrentView('admin'); setSidebarOpen(false); }}
              title="Admin Control"
            >
              <span className="icon">🔑</span> <span className="item-text">Admin Panel</span>
            </button>
          )}
          {isAdmin && (
            <button 
              className={`sidebar-nav-item ${currentView === 'audit' ? 'active' : ''}`}
              onClick={() => { setCurrentView('audit'); setSidebarOpen(false); }}
              title="Audit Logs"
            >
              <span className="icon">📜</span> <span className="item-text">Audit Logs</span>
            </button>
          )}
        </nav>

        {/* Desktop Sidebar Collapse Toggle */}
        <button 
          className="sidebar-collapse-toggle no-print" 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            padding: '0.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '1rem',
            borderTop: '1px solid var(--border-card)',
            marginTop: '0.5rem'
          }}
        >
          {sidebarCollapsed ? '»' : '« Collapse'}
        </button>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-profile-widget-sidebar">
            <div 
              className="avatar" 
              style={{ 
                backgroundColor: currentUser.profileColor, 
                width: '36px', 
                height: '36px', 
                fontSize: '0.85rem', 
                margin: 0,
                backgroundImage: currentUser.photoUrl ? `url(${currentUser.photoUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 0 8px rgba(255,255,255,0.1)'
              }}
              title={`${currentUser.name} (${currentUser.role})`}
            >
              {!currentUser.photoUrl && currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="user-meta">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role">{currentUser.role}</span>
            </div>
          </div>

          <div className="sidebar-footer-actions">
            <button className="theme-toggle" onClick={() => setNotificationsOpen(true)} title="Open Notification Center" style={{ width: '32px', height: '32px', position: 'relative' }}>
              🔔
              {notifications.length > 0 && (
                <span className="notif-badge">{notifications.length}</span>
              )}
            </button>
            <button className="theme-toggle" onClick={handleThemeToggle} title="Toggle Theme" style={{ width: '32px', height: '32px' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn btn-secondary btn-signout" onClick={handleLogout} title="Sign Out">
              🚪 <span className="btn-text">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="portal-main-content">
        
        {/* Top search & utilities header bar (Desktop) */}
        <div className="desktop-top-utility-bar no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
          <div 
            onClick={() => setCommandPaletteOpen(true)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'rgba(0,0,0,0.15)', 
              padding: '0.45rem 1rem', 
              borderRadius: '8px', 
              color: 'var(--text-muted)', 
              fontSize: '0.85rem',
              cursor: 'pointer',
              width: '280px',
              border: '1px solid var(--border-card)'
            }}
          >
            <span>🔍 Global search...</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }}>Ctrl+K</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role Level: <strong>{userRoleLevel}</strong></span>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-card)' }}></div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Shift Status: <strong>{activeSession ? '🟢 Clocked In' : '🔴 Clocked Out'}</strong></span>
          </div>
        </div>

        {/* Dynamic Title area */}
        <div className="dashboard-header no-print">
          <div className="dashboard-title-area">
            <h2>
              {currentView === 'admin' 
                ? 'Administrative Control' 
                : currentView === 'directory' 
                ? 'Employee Directory Roster' 
                : currentView === 'profile' 
                ? 'My Employee Workspace'
                : currentView === 'audit'
                ? 'System Audit Logs'
                : 'System Dashboard'}
            </h2>
            <p>
              {currentView === 'admin' 
                ? 'Review company analytics, personnel details, manager calendar, and leaves.'
                : currentView === 'directory'
                ? 'Interactive company directory. View profiles, clock timecards, or request time-off.'
                : currentView === 'profile'
                ? 'Manage your personal work profile, documents, and view attendance timecard logs.'
                : currentView === 'audit'
                ? 'Read-only security transaction trail of portal clockings and leave decisions.'
                : `Real-time platform summaries, headcount insights, and shift time tracking.`
              }
            </p>
          </div>
        </div>

        {/* View Router */}
        {currentView === 'admin' && hasAccessToAdmin ? (
          <AdminPanel currentUser={currentUser} sessionTrigger={sessionTrigger} onSessionChange={() => setSessionTrigger(p => p + 1)} />
        ) : currentView === 'directory' ? (
          <DirectoryPanel currentUser={currentUser} sessionTrigger={sessionTrigger} onSessionChange={() => setSessionTrigger(p => p + 1)} />
        ) : currentView === 'profile' ? (
          <UserPanel employeeId={currentUser.id} sessionTrigger={sessionTrigger} onSessionChange={() => setSessionTrigger(p => p + 1)} onUserUpdate={handleUserUpdate} />
        ) : currentView === 'audit' && isAdmin ? (
          <AuditPanel />
        ) : (
          <DashboardPanel currentUser={currentUser} sessionTrigger={sessionTrigger} onSessionChange={() => setSessionTrigger(p => p + 1)} />
        )}
      </main>

      {/* Slide-out Notification Center Drawer */}
      {notificationsOpen && (
        <>
          <div className="notif-drawer-overlay no-print" onClick={() => setNotificationsOpen(false)}></div>
          <div className="notif-drawer glass-card no-print">
            <div className="notif-drawer-header">
              <h3>Notification Center</h3>
              <button className="close-btn" onClick={() => setNotificationsOpen(false)}>×</button>
            </div>
            <div className="notif-drawer-body">
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                  <span>All caught up! No new notifications.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className="notif-card-item" 
                      onClick={() => notif.action()}
                      style={{
                        padding: '0.85rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                      }}
                    >
                      <span style={{ fontSize: '1.25rem', marginTop: '0.1rem' }}>{notif.icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{notif.title}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{notif.body}</span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', fontWeight: 500, marginTop: '0.25rem' }}>{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating Toast Container */}
      <ToastContainer />

      {/* Floating Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        setCurrentView={setCurrentView}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        onToggleTheme={handleThemeToggle}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />
    </div>
  );
}
