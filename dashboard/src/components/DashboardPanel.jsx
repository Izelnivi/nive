import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../api/admin';
import { usersApi } from '../api/users';
import { showToast } from './Toast';

export default function DashboardPanel({ currentUser, sessionTrigger, onSessionChange }) {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timecard/Workspace state for the active logged-in employee
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const timerRef = useRef(null);

  // Leave Form state
  const [leaveForm, setLeaveForm] = useState({
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [empList, allAttendance, allLeaves] = await Promise.all([
        adminApi.getEmployees(),
        adminApi.getAllAttendance(),
        adminApi.getAllLeaves()
      ]);
      setEmployees(empList);
      setAttendance(allAttendance);
      setLeaves(allLeaves);

      if (currentUser) {
        const session = await usersApi.getActiveSession(currentUser.id);
        setActiveSession(session);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser, sessionTrigger]);

  // Stopwatch timer for logged-in user clock
  useEffect(() => {
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
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeSession]);

  const handleClockIn = async (workMode = 'Office') => {
    if (!currentUser) return;
    try {
      const session = await usersApi.clockIn(currentUser.id, workMode);
      setActiveSession(session);
      loadDashboardData();
      if (onSessionChange) onSessionChange();
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
      loadDashboardData();
      if (onSessionChange) onSessionChange();
      showToast('Clocked Out successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      return showToast('Please fill in all form fields', 'error');
    }
    try {
      await usersApi.requestLeave(currentUser.id, leaveForm);
      setLeaveForm({
        type: 'Vacation',
        startDate: '',
        endDate: '',
        reason: ''
      });
      loadDashboardData();
      if (onSessionChange) onSessionChange();
      showToast('Leave request submitted successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Calculations
  const totalEmployees = employees.length;
  
  // Calculate average rating
  const avgRating = totalEmployees > 0 
    ? (employees.reduce((acc, emp) => acc + parseFloat(emp.rating || 0), 0) / totalEmployees).toFixed(1)
    : '0.0';

  // Clocked-in today
  const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
  const clockedInToday = Object.keys(activeSessions).length;

  // Leaves active today
  const todayStr = new Date().toISOString().split('T')[0];
  const onLeaveToday = leaves.filter(l => l.status === 'Approved' && todayStr >= l.startDate && todayStr <= l.endDate).length;

  // New Joiners (within the last 12 months / 365 days)
  const newJoiners = employees.filter(emp => {
    if (!emp.joinDate) return false;
    const diff = Math.abs(new Date() - new Date(emp.joinDate));
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) <= 365;
  }).length;

  // Department Allocation stats
  const depts = ['Engineering', 'Design', 'Marketing', 'Product', 'HR'];
  const deptStats = depts.map(dept => {
    const count = employees.filter(emp => emp.department === dept).length;
    const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
    return { name: dept, count, pct };
  });

  // Active on duty lists
  const activeOnDutyEmployees = employees.filter(emp => !!activeSessions[emp.id]);

  // SVG Chart 1 calculations: Department distribution bar coordinates
  // SVG size: width 400, height 200
  const maxCount = Math.max(...deptStats.map(d => d.count)) || 1;
  const barChartWidth = 400;
  const barChartHeight = 200;
  const padding = 30;

  // SVG Chart 2 calculations: Monthly Trend (simulated attendance totals)
  // Let's count attendance logs grouped by month
  const monthlyTrendData = [
    { label: 'Jan', count: 12 },
    { label: 'Feb', count: 18 },
    { label: 'Mar', count: 24 },
    { label: 'Apr', count: 32 },
    { label: 'May', count: 40 },
    { label: 'Jun', count: attendance.length || 45 }
  ];
  const maxTrend = Math.max(...monthlyTrendData.map(d => d.count)) || 1;

  // SVG Chart 3 calculations: Leave types donut chart
  const leaveTypes = ['Vacation', 'Sick Leave', 'Personal Leave', 'Unpaid Leave'];
  const leaveStats = leaveTypes.map(type => {
    const count = leaves.filter(l => l.type === type).length;
    return { type, count };
  });
  const totalLeaves = leaves.length || 1;
  let accumulatedPercent = 0;
  const leaveSlices = leaveStats.map(stat => {
    const percent = Math.round((stat.count / totalLeaves) * 100);
    const slice = { ...stat, percent, start: accumulatedPercent };
    accumulatedPercent += percent;
    return slice;
  });

  // Upcoming Birthdays (today or next 7 days)
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDate = today.getDate();
  const upcomingBirthdays = employees.filter(emp => {
    if (!emp.birthDate) return false;
    const parts = emp.birthDate.split('-');
    if (parts.length !== 3) return false;
    const bMonth = parseInt(parts[1], 10);
    const bDay = parseInt(parts[2], 10);
    return bMonth === currentMonth && bDay >= currentDate && bDay <= currentDate + 7;
  }).slice(0, 5);

  return (
    <div className="dashboard-content animate-fade-in">
      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <div className="stat-info">
            <h3>Total Staff</h3>
            <div className="stat-value">{totalEmployees}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered accounts</span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            👥
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-info">
            <h3>Active On-Duty</h3>
            <div className="stat-value">{clockedInToday}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Currently clocked in</span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            ⏱️
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-info">
            <h3>On Leave Today</h3>
            <div className="stat-value">{onLeaveToday}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved requests</span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            📅
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
          <div className="stat-info">
            <h3>New Joiners</h3>
            <div className="stat-value">{newJoiners}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hired within 12 mos</span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
            🌟
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="main-dashboard-grid">
        {/* Left Column: Quick Workspace & SVG Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Quick Actions / Clocking Widget */}
          {currentUser && (
            <div className="glass-card" style={{ padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div 
                    className="avatar" 
                    style={{ 
                      backgroundColor: currentUser.profileColor, 
                      width: '48px', 
                      height: '48px', 
                      fontSize: '1.2rem',
                      backgroundImage: currentUser.photoUrl ? `url(${currentUser.photoUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      margin: 0
                    }}
                  >
                    {!currentUser.photoUrl && currentUser.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Quick Workspace</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Welcome back, <strong>{currentUser.name}</strong> • Role level: {currentUser.roleLevel || 'Employee'}
                    </p>
                  </div>
                </div>

                <div className={`db-status-badge ${activeSession ? 'connected' : 'fallback'}`}>
                  {activeSession ? `🟢 Shift Active (${activeSession.workMode})` : '🔴 Off Duty'}
                </div>
              </div>

              {/* Side-by-Side Clock & Timeoff */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* Stopwatch card */}
                <div className="glass-card clock-widget-container" style={{ background: 'rgba(0,0,0,0.18)', padding: '1.25rem', borderRadius: '12px', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stopwatch Timer</span>
                  <div className="clock-timer" style={{ fontSize: '2.5rem', margin: '0.35rem 0' }}>{elapsedTime}</div>
                  
                  {activeSession ? (
                    <>
                      <div className="clock-subtext" style={{ fontSize: '0.8rem', marginBottom: '0.85rem' }}>
                        <span className="pulse-ring"></span>
                        Clocked-in since {activeSession.clockInTime}
                      </div>
                      <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleClockOut}>
                        🔴 Clock Out Shift
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="clock-subtext" style={{ fontSize: '0.8rem', marginBottom: '0.85rem' }}>Start your work shift timer:</div>
                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleClockIn('Office')}>
                          🏢 Office In
                        </button>
                        <button className="btn btn-primary" style={{ flex: 1, background: '#3b82f6' }} onClick={() => handleClockIn('WFH')}>
                          🏡 WFH In
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* File leave request card */}
                <div className="glass-card" style={{ background: 'rgba(0,0,0,0.18)', padding: '1.25rem', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>File Time-off Request</span>
                  <form onSubmit={handleLeaveSubmit} style={{ marginTop: '0.5rem' }}>
                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <select 
                        className="input-control" 
                        style={{ padding: '0.45rem', fontSize: '0.8rem' }}
                        value={leaveForm.type}
                        onChange={e => setLeaveForm({...leaveForm, type: e.target.value})}
                      >
                        <option value="Vacation">Vacation</option>
                        <option value="Sick Leave">Sick Leave</option>
                        <option value="Personal Leave">Personal Leave</option>
                        <option value="Unpaid Leave">Unpaid Leave</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input 
                        type="date" 
                        className="input-control" 
                        style={{ padding: '0.45rem', fontSize: '0.75rem' }}
                        value={leaveForm.startDate}
                        onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})}
                        required
                      />
                      <input 
                        type="date" 
                        className="input-control" 
                        style={{ padding: '0.45rem', fontSize: '0.75rem' }}
                        value={leaveForm.endDate}
                        onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <textarea 
                        className="input-control" 
                        rows="1" 
                        style={{ padding: '0.45rem', fontSize: '0.8rem', resize: 'none' }}
                        placeholder="Reason..."
                        value={leaveForm.reason}
                        onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem' }}>
                      Submit Time-Off
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* SVG Charts Analytics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            
            {/* Department Headcount Bar Chart */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Headcount by Department</h4>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg width="100%" height={barChartHeight} viewBox={`0 0 ${barChartWidth} ${barChartHeight}`}>
                  {/* Grid lines */}
                  <line x1={padding} y1={padding} x2={barChartWidth - padding} y2={padding} stroke="var(--border-card)" strokeDasharray="4 4" />
                  <line x1={padding} y1={barChartHeight / 2} x2={barChartWidth - padding} y2={barChartHeight / 2} stroke="var(--border-card)" strokeDasharray="4 4" />
                  <line x1={padding} y1={barChartHeight - padding} x2={barChartWidth - padding} y2={barChartHeight - padding} stroke="var(--border-card)" />

                  {/* Render bars */}
                  {deptStats.map((d, index) => {
                    const barWidth = 35;
                    const spacing = (barChartWidth - padding * 2) / deptStats.length;
                    const x = padding + index * spacing + (spacing - barWidth) / 2;
                    const height = ((barChartHeight - padding * 2) * d.count) / maxCount || 10;
                    const y = barChartHeight - padding - height;
                    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
                    const color = colors[index % colors.length];

                    return (
                      <g key={d.name}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="4"
                          fill={color}
                          opacity="0.8"
                          style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                        />
                        {/* Hover value label */}
                        <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="var(--text-main)" fontSize="0.75rem" fontWeight="bold">
                          {d.count}
                        </text>
                        {/* Label name */}
                        <text x={x + barWidth / 2} y={barChartHeight - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="0.7rem">
                          {d.name.substring(0, 5)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Monthly Attendance Trend Line Chart */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Monthly Attendance Trend</h4>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg width="100%" height={barChartHeight} viewBox={`0 0 ${barChartWidth} ${barChartHeight}`}>
                  {/* Grid Lines */}
                  <line x1={padding} y1={padding} x2={barChartWidth - padding} y2={padding} stroke="var(--border-card)" strokeDasharray="4 4" />
                  <line x1={padding} y1={barChartHeight / 2} x2={barChartWidth - padding} y2={barChartHeight / 2} stroke="var(--border-card)" strokeDasharray="4 4" />
                  <line x1={padding} y1={barChartHeight - padding} x2={barChartWidth - padding} y2={barChartHeight - padding} stroke="var(--border-card)" />

                  {/* Draw points & line */}
                  {(() => {
                    const spacing = (barChartWidth - padding * 2) / (monthlyTrendData.length - 1);
                    const points = monthlyTrendData.map((d, index) => {
                      const x = padding + index * spacing;
                      const y = barChartHeight - padding - ((barChartHeight - padding * 2) * d.count) / maxTrend;
                      return { x, y, ...d };
                    });

                    const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

                    return (
                      <g>
                        {/* Draw connection path */}
                        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" opacity="0.8" />
                        
                        {/* Render dots and labels */}
                        {points.map((p, index) => (
                          <g key={index}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="hsl(var(--primary))" strokeWidth="2.5" />
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--text-main)" fontSize="0.75rem" fontWeight="bold">
                              {p.count}
                            </text>
                            <text x={p.x} y={barChartHeight - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="0.75rem">
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Leave Analytics Distribution Donut Chart */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Leaves by Category</h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
                {/* SVG Donut */}
                <svg width="130" height="130" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-card)" strokeWidth="10" />
                  {leaveSlices.map((slice, index) => {
                    const radius = 40;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDasharray = circumference;
                    const strokeDashoffset = circumference - (circumference * slice.percent) / 100;
                    const rotation = (slice.start / 100) * 360;
                    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b'];
                    const color = colors[index % colors.length];

                    if (slice.percent === 0) return null;

                    return (
                      <circle
                        key={slice.type}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth="10"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        transform={`rotate(${rotation - 90} 50 50)`}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      />
                    );
                  })}
                  <text x="50" y="55" textAnchor="middle" fill="var(--text-main)" fontSize="0.75rem" fontWeight="bold">
                    {leaves.length} Total
                  </text>
                </svg>

                {/* Legends */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem' }}>
                  {leaveSlices.map((slice, index) => {
                    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b'];
                    const color = colors[index % colors.length];
                    return (
                      <div key={slice.type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                        <span style={{ color: 'var(--text-muted)' }}>{slice.type}:</span>
                        <strong>{slice.count} ({slice.percent}%)</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Active Staff, Birthdays & System Log Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Shift Workers avatars list */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Active Personnel</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>Employees currently clocked in</p>
            
            {activeOnDutyEmployees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                🟢 No employees currently clocked in.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {activeOnDutyEmployees.map(emp => {
                  const sess = activeSessions[emp.id] || {};
                  return (
                    <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.45rem 0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)' }}>
                      <div 
                        className="avatar" 
                        style={{ 
                          backgroundColor: emp.profileColor, 
                          width: '32px', 
                          height: '32px', 
                          fontSize: '0.8rem', 
                          margin: 0,
                          backgroundImage: emp.photoUrl ? `url(${emp.photoUrl})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {!emp.photoUrl && emp.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                          <span>{emp.role}</span>
                          <span>•</span>
                          <span style={{ color: 'hsl(var(--success))' }}>{sess.workMode || 'Office'}</span>
                        </div>
                      </div>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Birthdays widget */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Upcoming Birthdays</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>Upcoming staff birthdays (next 7 days)</p>
            
            {upcomingBirthdays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                🎂 No birthdays in the next 7 days.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {upcomingBirthdays.map(emp => {
                  const parts = emp.birthDate.split('-');
                  return (
                    <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.45rem 0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-card)' }}>
                      <div 
                        className="avatar" 
                        style={{ 
                          backgroundColor: emp.profileColor, 
                          width: '32px', 
                          height: '32px', 
                          fontSize: '0.8rem', 
                          margin: 0,
                          backgroundImage: emp.photoUrl ? `url(${emp.photoUrl})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {!emp.photoUrl && emp.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{emp.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.department}</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>
                        🎁 {parts[1]}-{parts[2]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Combined Recent Activity log list */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Activity Feed</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>Recent clock-ins and leave requests</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {attendance.slice(0, 4).map(log => {
                const emp = employees.find(e => e.id === log.employeeId) || { name: 'Personnel' };
                return (
                  <div className="log-item-row" key={log.id}>
                    <div className="log-info-text">
                      <span className="main" style={{ fontSize: '0.85rem' }}>⏱️ {emp.name} clocked out ({log.workMode || 'Office'})</span>
                      <span className="sub">{log.date} @ {log.clockIn} - {log.clockOut}</span>
                    </div>
                    <div className="log-amount positive" style={{ fontSize: '0.85rem' }}>
                      {log.totalHours} hrs
                    </div>
                  </div>
                );
              })}

              {leaves.slice(0, 2).map(req => (
                <div className="log-item-row" key={req.id}>
                  <div className="log-info-text">
                    <span className="main" style={{ fontSize: '0.85rem' }}>📅 Leave Requested: {req.employeeName}</span>
                    <span className="sub">{req.startDate} to {req.endDate} ({req.type})</span>
                  </div>
                  <div className={`log-amount badge badge-${req.status.toLowerCase()}`} style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}>
                    {req.status}
                  </div>
                </div>
              ))}

              {attendance.length === 0 && leaves.length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>No recent events recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
