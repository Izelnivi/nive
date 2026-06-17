import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../api/admin';
import { usersApi } from '../api/users';

export default function DirectoryPanel({ currentUser, sessionTrigger, onSessionChange }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Add Employee Modal State (Moved from Admin Panel)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: '',
    role: 'Junior Developer',
    department: 'Engineering',
    email: '',
    baseSalary: '$5,000/mo',
    phone: '',
    rating: '5.0',
    profileColor: '#6366f1'
  });

  // Modal State for employee workspace
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Stopwatch states
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const timerRef = useRef(null);

  // Leave Form state
  const [leaveForm, setLeaveForm] = useState({
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const list = await adminApi.getEmployees();
      setEmployees(list);
    } catch (err) {
      console.error('Failed to load employee list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Background sync for session updates
  useEffect(() => {
    const refreshData = async () => {
      try {
        const list = await adminApi.getEmployees();
        setEmployees(list);
        if (selectedEmp) {
          const [session, leaveList, logs] = await Promise.all([
            usersApi.getActiveSession(selectedEmp.id),
            usersApi.getLeaves(selectedEmp.id),
            usersApi.getAttendanceHistory(selectedEmp.id)
          ]);
          setActiveSession(session);
          setLeaves(leaveList);
          setAttendance(logs);
        }
      } catch (err) {
        console.warn('Background refresh failed:', err);
      }
    };
    refreshData();
  }, [sessionTrigger]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deptFilter, ratingFilter, salaryFilter, itemsPerPage]);

  // Load modal data when an employee is clicked
  const handleRowClick = async (emp) => {
    setSelectedEmp(emp);
    setModalLoading(true);
    try {
      const [session, leaveList, logs] = await Promise.all([
        usersApi.getActiveSession(emp.id),
        usersApi.getLeaves(emp.id),
        usersApi.getAttendanceHistory(emp.id)
      ]);
      setActiveSession(session);
      setLeaves(leaveList);
      setAttendance(logs);
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedEmp(null);
    setActiveSession(null);
    setLeaves([]);
    setAttendance([]);
    clearInterval(timerRef.current);
  };

  // Stopwatch timer handler
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

  // Clock actions inside Modal
  const handleClockIn = async () => {
    if (!selectedEmp) return;
    try {
      const session = await usersApi.clockIn(selectedEmp.id);
      setActiveSession(session);
      if (onSessionChange) onSessionChange();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClockOut = async () => {
    if (!selectedEmp) return;
    try {
      await usersApi.clockOut(selectedEmp.id);
      setActiveSession(null);
      const logs = await usersApi.getAttendanceHistory(selectedEmp.id);
      setAttendance(logs);
      if (onSessionChange) onSessionChange();
    } catch (err) {
      alert(err.message);
    }
  };

  // Leave submission inside Modal
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      return alert('Please fill in all form fields');
    }
    try {
      await usersApi.requestLeave(selectedEmp.id, leaveForm);
      setLeaveForm({
        type: 'Vacation',
        startDate: '',
        endDate: '',
        reason: ''
      });
      const leaveList = await usersApi.getLeaves(selectedEmp.id);
      setLeaves(leaveList);
      if (onSessionChange) onSessionChange();
    } catch (err) {
      alert(err.message);
    }
  };

  // Add Employee registration handler
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.email) return alert('Name and Email are required');
    try {
      // In Supabase mode, it handles credentials insertion.
      // In LocalStorage fallback, it adds credentials using helper.
      // Call adminApi
      await adminApi.addEmployee({
        ...newEmp,
        phone: newEmp.phone || '+1 (555) 000-0000',
        rating: newEmp.rating || '5.0'
      });
      setShowAddModal(false);
      setNewEmp({
        name: '',
        role: 'Junior Developer',
        department: 'Engineering',
        email: '',
        baseSalary: '$5,000/mo',
        phone: '',
        rating: '5.0',
        profileColor: '#6366f1'
      });
      loadEmployees();
      alert('Employee successfully registered!');
    } catch (err) {
      alert(err.message);
    }
  };

  // Excel (CSV) Export
  const handleExportExcel = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Base Salary', 'Phone', 'Join Date', 'Performance Rating', 'Status'];
    const rows = employees.map(emp => [
      emp.id,
      emp.name,
      emp.email,
      emp.role,
      emp.department,
      emp.baseSalary,
      emp.phone || '',
      emp.joinDate || '',
      emp.rating || '',
      emp.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `employees_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export
  const handleExportPDF = () => {
    window.print();
  };

  // Filter Logic
  const filteredEmployees = employees.filter(emp => {
    // 1. Search Query (Name, Role, Email, Department)
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.role.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query);

    // 2. Department filter
    const matchesDept = !deptFilter || emp.department === deptFilter;

    // 3. Rating filter (minimum rating threshold)
    let matchesRating = true;
    if (ratingFilter) {
      const val = parseFloat(emp.rating || 0);
      matchesRating = val >= parseFloat(ratingFilter);
    }

    // 4. Salary filter
    let matchesSalary = true;
    if (salaryFilter) {
      const num = parseInt((emp.baseSalary || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) {
        if (salaryFilter === 'low') matchesSalary = num < 6000;
        else if (salaryFilter === 'mid') matchesSalary = num >= 6000 && num <= 8000;
        else if (salaryFilter === 'high') matchesSalary = num > 8000;
      }
    }

    return matchesSearch && matchesDept && matchesRating && matchesSalary;
  });

  // Pagination Logic
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Check if current user is an Admin/HR
  const userRole = currentUser?.role || '';
  const isAdmin = userRole.toLowerCase().includes('hr') || 
                  userRole.toLowerCase().includes('admin') || 
                  userRole.toLowerCase().includes('director');

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-content animate-fade-in">
      {/* Directory Table Card */}
      <div className="glass-card printable-section">
        
        {/* Actions header with download & add buttons */}
        <div className="directory-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 className="directory-title" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Staff Roster</h3>
            <p className="directory-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>View workspaces, timecards, and profiles of portal staff.</p>
          </div>
          
          <div className="action-buttons-row no-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)} title="Register Employee">
              ➕ Add Employee
            </button>
            <button className="btn btn-secondary" onClick={handleExportExcel} title="Export Excel (CSV)">
              📊 Excel Export
            </button>
            <button className="btn btn-secondary" onClick={handleExportPDF} title="Export PDF">
              📄 PDF Export
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Search, Department, Salary, Rating, Pagination limit) */}
        <div className="filter-toolbar no-print">
          {/* Search Input */}
          <div className="filter-item search-box-wrapper" style={{ flex: '2 1 250px' }}>
            <input 
              type="text" 
              className="input-control" 
              placeholder="🔍 Search name, email, role..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Department Filter */}
          <div className="filter-item">
            <select 
              className="select-dropdown" 
              value={deptFilter} 
              onChange={e => setDeptFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Product">Product</option>
              <option value="HR">HR</option>
            </select>
          </div>

          {/* Salary Filter */}
          <div className="filter-item">
            <select 
              className="select-dropdown" 
              value={salaryFilter} 
              onChange={e => setSalaryFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Salaries</option>
              <option value="low">Under $6,000/mo</option>
              <option value="mid">$6,000 - $8,000/mo</option>
              <option value="high">Over $8,000/mo</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="filter-item">
            <select 
              className="select-dropdown" 
              value={ratingFilter} 
              onChange={e => setRatingFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Ratings</option>
              <option value="4.8">⭐ 4.8+ Stars</option>
              <option value="4.5">⭐ 4.5+ Stars</option>
              <option value="4.0">⭐ 4.0+ Stars</option>
            </select>
          </div>

          {/* Rows limit */}
          <div className="filter-item rows-limit-wrapper">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Show:</span>
            <select 
              className="select-dropdown" 
              value={itemsPerPage} 
              onChange={e => setItemsPerPage(parseInt(e.target.value, 10))}
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="table-responsive" style={{ minHeight: '300px' }}>
          {paginatedEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              🔍 No employees found matching the filters.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Dept & Role</th>
                  <th>Salary</th>
                  <th>Phone</th>
                  <th>Join Date</th>
                  <th>Rating</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map(emp => (
                  <tr key={emp.id} onClick={() => handleRowClick(emp)} style={{ cursor: 'pointer' }} className="employee-row-item">
                    <td>
                      <div className="employee-meta-row">
                        <div className="avatar" style={{ backgroundColor: emp.profileColor }}>
                          {emp.name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div className="employee-name-title">
                          <span className="name">{emp.name}</span>
                          <span className="role">{emp.email}</span>
                        </div>
                      </div>
                    </td>
                    <td><code>{emp.id}</code></td>
                    <td>
                      <div className="employee-name-title">
                        <span className="name" style={{ fontWeight: '500' }}>{emp.department}</span>
                        <span className="role">{emp.role}</span>
                      </div>
                    </td>
                    <td>{emp.baseSalary}</td>
                    <td>{emp.phone || '+1 (555) 000-0000'}</td>
                    <td>{emp.joinDate}</td>
                    <td>
                      <span style={{ color: '#fbbf24', marginRight: '3px' }}>★</span>
                      <strong>{emp.rating || '5.0'}</strong>
                    </td>
                    <td>
                      <span className="badge badge-active">
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls Footer */}
        {totalItems > 0 && (
          <div className="pagination-footer no-print">
            <div className="pagination-stats">
              Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> employees
            </div>
            
            <div className="pagination-buttons">
              <button 
                className="btn btn-secondary btn-pagination" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
              >
                ◀ Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  className={`btn-page-number ${activePage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button 
                className="btn btn-secondary btn-pagination" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Employee Profile & Timecard Modal */}
      {selectedEmp && (
        <div className="modal-overlay no-print">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <h3>Employee Workspace</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            {modalLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                
                {/* Left Col: Profile Details, Timecards, Leaves */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Profile Summary */}
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div className="avatar avatar-large" style={{ backgroundColor: selectedEmp.profileColor, margin: 0 }}>
                      {selectedEmp.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedEmp.name}</h4>
                      <p style={{ color: 'hsl(var(--primary))', fontWeight: 600, fontSize: '0.9rem' }}>
                        {selectedEmp.role} • {selectedEmp.department}
                      </p>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Joined {selectedEmp.joinDate}</span>
                    </div>
                  </div>
 
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div>📧 <strong>Email:</strong> {selectedEmp.email}</div>
                    <div>📞 <strong>Phone:</strong> {selectedEmp.phone || '+1 (555) 000-0000'}</div>
                    <div>💰 <strong>Base Salary:</strong> {selectedEmp.baseSalary}</div>
                    <div>⭐ <strong>Rating:</strong> {selectedEmp.rating || '5.0'} / 5</div>
                  </div>

                  {/* Attendance Log Table */}
                  <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Timecards History</h4>
                    <div className="table-responsive" style={{ maxHeight: '150px' }}>
                      <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>In - Out</th>
                            <th>Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No logs.</td></tr>
                          ) : (
                            attendance.map(log => (
                              <tr key={log.id}>
                                // Standard display
                                <td>{log.date}</td>
                                <td><code>{log.clockIn} - {log.clockOut || '--'}</code></td>
                                <td style={{ color: 'hsl(var(--success))', fontWeight: 600 }}>{log.totalHours} hrs</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Leave history list */}
                  <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Leave History</h4>
                    <div className="table-responsive" style={{ maxHeight: '150px' }}>
                      <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Dates</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaves.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No requests.</td></tr>
                          ) : (
                            leaves.map(req => (
                              <tr key={req.id}>
                                <td><strong>{req.type}</strong></td>
                                <td>{req.startDate} to {req.endDate}</td>
                                <td>
                                  <span className={`badge badge-${req.status.toLowerCase()}`}>
                                    {req.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Right Col: Clock Widget & Leave Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Attendance Clock Card */}
                  <div className="glass-card clock-widget-container" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '1rem' }}>Shift Timecard</h4>
                    
                    <div className="clock-timer" style={{ fontSize: '2.25rem', margin: '0.5rem 0' }}>{elapsedTime}</div>
                    
                    {activeSession ? (
                      <>
                        <div className="clock-subtext" style={{ marginBottom: '1rem' }}>
                          <span className="pulse-ring"></span>
                          Clocked-in since {activeSession.clockInTime}
                        </div>
                        {currentUser?.id === selectedEmp.id && (
                          <button className="btn btn-danger" style={{ width: '100%', padding: '0.5rem' }} onClick={handleClockOut}>
                            🔴 Clock Out
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="clock-subtext" style={{ marginBottom: '1rem' }}>Currently clocked out</div>
                        {currentUser?.id === selectedEmp.id && (
                          <button className="btn btn-success" style={{ width: '100%', padding: '0.5rem' }} onClick={handleClockIn}>
                            🟢 Clock In
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Request Leave Form (Only show for self) */}
                  {currentUser?.id === selectedEmp.id && (
                    <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem' }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Request Time-off</h4>
                      <form onSubmit={handleLeaveSubmit}>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <select 
                            className="input-control" 
                            style={{ padding: '0.5rem' }}
                            value={leaveForm.type}
                            onChange={e => setLeaveForm({...leaveForm, type: e.target.value})}
                          >
                            <option value="Vacation">Vacation</option>
                            <option value="Sick Leave">Sick Leave</option>
                            <option value="Personal Leave">Personal Leave</option>
                            <option value="Unpaid Leave">Unpaid Leave</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <input 
                            type="date" 
                            className="input-control" 
                            style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                            value={leaveForm.startDate}
                            onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})}
                            required
                          />
                          <input 
                            type="date" 
                            className="input-control" 
                            style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                            value={leaveForm.endDate}
                            onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})}
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <textarea 
                            className="input-control" 
                            rows="2" 
                            style={{ padding: '0.5rem', resize: 'none' }}
                            placeholder="Reason for leave..."
                            value={leaveForm.reason}
                            onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                            required
                          />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>
                          Submit Request
                        </button>
                      </form>
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Employee Modal (Triggered by + Add Employee button) */}
      {showAddModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register Employee Account</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. David Miller" 
                    value={newEmp.name}
                    onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="input-control" 
                    placeholder="e.g. david.miller@company.com" 
                    value={newEmp.email}
                    onChange={e => setNewEmp({...newEmp, email: e.target.value.toLowerCase()})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Initial Login Password</label>
                  <input 
                    type="password" 
                    className="input-control" 
                    placeholder="e.g. password123" 
                    value={newEmp.password || ''}
                    onChange={e => setNewEmp({...newEmp, password: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. +1 (555) 062-1109" 
                    value={newEmp.phone}
                    onChange={e => setNewEmp({...newEmp, phone: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Department</label>
                    <select 
                      className="input-control" 
                      value={newEmp.department}
                      onChange={e => setNewEmp({...newEmp, department: e.target.value})}
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Product">Product</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Performance Rating</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1.0" 
                      max="5.0"
                      className="input-control" 
                      value={newEmp.rating}
                      onChange={e => setNewEmp({...newEmp, rating: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Role / Job Title</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Product Manager" 
                    value={newEmp.role}
                    onChange={e => setNewEmp({...newEmp, role: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Base Salary</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. $6,500/mo" 
                    value={newEmp.baseSalary}
                    onChange={e => setNewEmp({...newEmp, baseSalary: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Profile Theme Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'].map(color => (
                      <button
                        type="button"
                        key={color}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          border: newEmp.profileColor === color ? '3px solid #fff' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => setNewEmp({...newEmp, profileColor: color})}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Employee</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
