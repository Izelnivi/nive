import { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { showToast } from './Toast';

export default function AdminPanel({ currentUser }) {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active sub-tab: 'leaves', 'calendar', 'performance', 'attendance'
  const [activeTab, setActiveTab] = useState('leaves');

  // Leave approval comments state
  const [approvalComment, setApprovalComment] = useState({});

  // Performance submission states
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState('Q2 2026');
  const [reviewRating, setReviewRating] = useState('5.0');
  const [reviewComments, setReviewComments] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Calendar states
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Roster filters
  const [leaveFilter, setLeaveFilter] = useState('All');

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, leaveList, logList] = await Promise.all([
        adminApi.getEmployees(),
        adminApi.getAllLeaves(),
        adminApi.getAllAttendance()
      ]);
      setEmployees(empList);
      setLeaves(leaveList);
      setAttendance(logList);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLeaveDecision = async (leaveId, decision) => {
    const comments = approvalComment[leaveId] || 'Decision finalized by administrator.';
    try {
      await adminApi.updateLeaveStatus(leaveId, decision);
      // Log the decision in audit logs via mock wrapper
      showToast(`Leave request successfully ${decision}!`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) return showToast('Please select an employee.', 'error');
    if (!reviewComments.trim()) return showToast('Please write comments.', 'error');

    try {
      setSubmittingReview(true);
      await adminApi.addPerformanceReview(selectedEmpId, {
        reviewerId: currentUser.id,
        reviewerName: currentUser.name,
        period: reviewPeriod,
        rating: reviewRating,
        comments: reviewComments.trim()
      });
      showToast('Performance review logged successfully!', 'success');
      setSelectedEmpId('');
      setReviewComments('');
      setReviewRating('5.0');
    } catch (err) {
      showToast('Failed to log review: ' + err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Helper stats
  const totalEmployees = employees.length;
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
  
  // Calculate clocked-in today
  const activeSessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
  const clockedInToday = Object.keys(activeSessions).length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Filter leaves
  const filteredLeaves = leaves.filter(req => {
    if (leaveFilter === 'All') return true;
    return req.status === leaveFilter;
  });

  // Calendar dates generation
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayLeaves = leaves.filter(l => l.status === 'Approved' && dateStr >= l.startDate && dateStr <= l.endDate);
    calendarDays.push({ day, dateStr, leaves: dayLeaves });
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="dashboard-content animate-fade-in">
      {/* Stats Cards Row */}
      <div className="stats-grid no-print">
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <div className="stat-info">
            <h3>Total Staff</h3>
            <div className="stat-value">{totalEmployees}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            👥
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-info">
            <h3>Active On-Duty</h3>
            <div className="stat-value">{clockedInToday}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            ⏱️
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-info">
            <h3>Pending Requests</h3>
            <div className="stat-value">{pendingLeaves}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            ⏳
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
          <div className="stat-info">
            <h3>System Status</h3>
            <div className="stat-value">Nominal</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
            ⚡
          </div>
        </div>
      </div>

      {/* Admin Visual Tabs Bar */}
      <div className="role-toggle-group no-print" style={{ marginBottom: '1.5rem', width: 'fit-content' }}>
        <button className={`role-btn ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>
          📝 Leaves Approvals ({pendingLeaves})
        </button>
        <button className={`role-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          🗓️ Team Leave Calendar
        </button>
        <button className={`role-btn ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
          ⭐ Performance Manager
        </button>
        <button className={`role-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          ⏱️ System Timecards
        </button>
      </div>

      {/* Leave Approval workflow Tab */}
      {activeTab === 'leaves' && (
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Leave Approval Workflow</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Review requests and approve with optional coordinator comments.</p>
            </div>
            {/* Filter buttons */}
            <div className="role-toggle-group" style={{ padding: '2px' }}>
              {['All', 'Pending', 'Approved', 'Rejected'].map(opt => (
                <button
                  key={opt}
                  className={`role-btn ${leaveFilter === opt ? 'active' : ''}`}
                  onClick={() => setLeaveFilter(opt)}
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {filteredLeaves.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No leave requests found.</p>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Decision Notes / Comments</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map(req => (
                    <tr key={req.id}>
                      <td><strong>{req.employeeName}</strong></td>
                      <td><code>{req.type}</code></td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{req.startDate} to {req.endDate}</td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden' }} title={req.reason}>
                        {req.reason}
                      </td>
                      <td>
                        {req.status === 'Pending' ? (
                          <input
                            type="text"
                            placeholder="Add coordinator notes..."
                            className="input-control"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', minWidth: '150px' }}
                            value={approvalComment[req.id] || ''}
                            onChange={e => setApprovalComment({ ...approvalComment, [req.id]: e.target.value })}
                          />
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Notes locked</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${req.status.toLowerCase()}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleLeaveDecision(req.id, 'Approved')}>
                              Approve
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleLeaveDecision(req.id, 'Rejected')}>
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Decision log</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Team Leave Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Team Leave Calendar</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Staff schedule mapping for tracking company coverage.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))}>
                ◀ Prev
              </button>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', minWidth: '120px', textAlign: 'center' }}>
                {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </span>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))}>
                Next ▶
              </button>
            </div>
          </div>

          {/* Grid view */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ fontWeight: '600', padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{day}</div>
            ))}
            
            {calendarDays.map((d, index) => {
              if (!d) return <div key={`empty-${index}`} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }} />;
              const hasLeaves = d.leaves.length > 0;

              return (
                <div 
                  key={d.dateStr} 
                  style={{
                    minHeight: '85px',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    boxSizing: 'border-box'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'flex-start' }}>{d.day}</span>
                  
                  {/* Miniature list of employees on leave */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem' }}>
                    {hasLeaves && d.leaves.map(req => {
                      const emp = employees.find(e => e.id === req.employeeId) || {};
                      return (
                        <div
                          key={req.id}
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px',
                            background: emp.profileColor || '#6366f1',
                            color: '#fff',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textAlign: 'left'
                          }}
                          title={`${req.employeeName} (${req.type})`}
                        >
                          🌴 {req.employeeName.split(' ')[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance reviews logs manager tab */}
      {activeTab === 'performance' && (
        <div className="glass-card animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
          {/* Roster of reviews */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Performance Reviews Feed</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Active staff performance reviews catalog.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
              {employees.map(emp => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div 
                      className="avatar" 
                      style={{ 
                        backgroundColor: emp.profileColor, 
                        width: '36px', 
                        height: '36px', 
                        fontSize: '0.85rem',
                        backgroundImage: emp.photoUrl ? `url(${emp.photoUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        margin: 0
                      }}
                    >
                      {!emp.photoUrl && emp.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.role} • {emp.department}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#fbbf24', marginRight: '3px' }}>★</span>
                    <strong>{emp.rating} / 5.0</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logging review form */}
          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.15)', height: 'fit-content' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Log Employee Review</h4>
            <form onSubmit={handleReviewSubmit}>
              <div className="form-group">
                <label>Select Employee</label>
                <select className="input-control" value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} required>
                  <option value="">Choose Personnel...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Review Period</label>
                  <select className="input-control" value={reviewPeriod} onChange={e => setReviewPeriod(e.target.value)}>
                    <option value="Q1 2026">Q1 2026</option>
                    <option value="Q2 2026">Q2 2026</option>
                    <option value="Q3 2026">Q3 2026</option>
                    <option value="Q4 2026">Q4 2026</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Rating (1.0 to 5.0)</label>
                  <input type="number" step="0.1" min="1.0" max="5.0" className="input-control" value={reviewRating} onChange={e => setReviewRating(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label>Review Comments</label>
                <textarea className="input-control" rows="3" placeholder="Provide feedback comments..." style={{ resize: 'none' }} value={reviewComments} onChange={e => setReviewComments(e.target.value)} required />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingReview}>
                {submittingReview ? 'Logging Review...' : 'Submit Evaluation Report'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Attendance logs catalog tab */}
      {activeTab === 'attendance' && (
        <div className="glass-card animate-fade-in">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>System Attendance Logs</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Complete history of clocked shifts for all company personnel.</p>
          
          <div className="table-responsive">
            <table className="custom-table" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Clock-In</th>
                  <th>Clock-Out</th>
                  <th>Hours Worked</th>
                  <th>Overtime</th>
                  <th>Late status</th>
                  <th>Work Mode</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No timecards logged.</td></tr>
                ) : (
                  attendance.map(log => {
                    const emp = employees.find(e => e.id === log.employeeId) || { name: 'Personnel', id: log.employeeId };
                    return (
                      <tr key={log.id}>
                        <td>
                          <strong>{emp.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {emp.id}</div>
                        </td>
                        <td>{log.date}</td>
                        <td><code>{log.clockIn}</code></td>
                        <td><code>{log.clockOut || '--'}</code></td>
                        <td style={{ color: 'hsl(var(--success))', fontWeight: 600 }}>{log.totalHours} hrs</td>
                        <td>{log.overtimeHours ? `${log.overtimeHours} hrs` : '--'}</td>
                        <td>
                          <span className="badge" style={{
                            background: log.lateStatus === 'Late' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: log.lateStatus === 'Late' ? 'var(--warning)' : 'var(--success)'
                          }}>
                            {log.lateStatus || 'Ontime'}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: log.workMode === 'WFH' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: log.workMode === 'WFH' ? 'var(--info)' : 'var(--success)'
                          }}>
                            {log.workMode || 'Office'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
