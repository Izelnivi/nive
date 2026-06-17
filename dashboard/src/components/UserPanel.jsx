import { useState, useEffect, useRef } from 'react';
import { usersApi } from '../api/users';
import { adminApi } from '../api/admin';
import { showToast } from './Toast';

export default function UserPanel({ employeeId, sessionTrigger, onSessionChange, onUserUpdate }) {
  const [profile, setProfile] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'overview', 'calendar', 'documents', 'reviews'
  const [activeTab, setActiveTab] = useState('overview');

  // Stopwatch timer state
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const timerRef = useRef(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    profileColor: '',
    skills: '',
    certifications: '',
    emergencyName: '',
    emergencyPhone: '',
    reportingManagerId: '',
    birthDate: '',
    workMode: 'Office'
  });

  // Document upload state
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Calendar states
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const loadUserData = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const [userProfile, session, leaveList, logs, docsList, revList, empList] = await Promise.all([
        usersApi.getProfile(employeeId),
        usersApi.getActiveSession(employeeId),
        usersApi.getLeaves(employeeId),
        usersApi.getAttendanceHistory(employeeId),
        usersApi.getDocuments(employeeId),
        usersApi.getPerformanceReviews(employeeId),
        adminApi.getEmployees()
      ]);
      setProfile(userProfile);
      setActiveSession(session);
      setLeaves(leaveList);
      setAttendance(logs);
      setDocuments(docsList);
      setReviews(revList);
      setEmployees(empList);
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    return () => clearInterval(timerRef.current);
  }, [employeeId, sessionTrigger]);

  // Stopwatch ticking logic
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
    try {
      const session = await usersApi.clockIn(employeeId, workMode);
      setActiveSession(session);
      if (onSessionChange) onSessionChange();
      showToast(`Clocked In successfully (${workMode})!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      await usersApi.clockOut(employeeId);
      setActiveSession(null);
      const logs = await usersApi.getAttendanceHistory(employeeId);
      setAttendance(logs);
      if (onSessionChange) onSessionChange();
      showToast('Clocked Out successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      return showToast('Please fill in all form fields', 'error');
    }
    try {
      await usersApi.requestLeave(employeeId, leaveForm);
      setLeaveForm({
        type: 'Vacation',
        startDate: '',
        endDate: '',
        reason: ''
      });
      const leaveList = await usersApi.getLeaves(employeeId);
      setLeaves(leaveList);
      if (onSessionChange) onSessionChange();
      showToast('Leave request filed successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditForm({
        name: profile.name || '',
        phone: profile.phone || '',
        profileColor: profile.profileColor || '#6366f1',
        skills: profile.skills || '',
        certifications: profile.certifications || '',
        emergencyName: profile.emergencyName || '',
        emergencyPhone: profile.emergencyPhone || '',
        reportingManagerId: profile.reportingManagerId || '',
        birthDate: profile.birthDate || '1990-01-01',
        workMode: profile.workMode || 'Office'
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      return showToast('Display name cannot be empty.', 'error');
    }
    try {
      setIsSaving(true);
      const updatedProfile = await usersApi.updateProfileDetails(employeeId, editForm);
      setProfile(updatedProfile);
      setIsEditing(false);
      if (onUserUpdate) {
        onUserUpdate(updatedProfile);
      }
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Profile photo base64 upload handler
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        const updated = await usersApi.updateProfileDetails(employeeId, { photoUrl: base64Data });
        setProfile(updated);
        if (onUserUpdate) onUserUpdate(updated);
        showToast('Photo uploaded successfully!', 'success');
      } catch (err) {
        showToast('Photo upload failed: ' + err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Base64 file document upload handler
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!docName.trim() || !docFile) {
      return showToast('Please enter a document name and choose a file.', 'error');
    }

    try {
      setUploadingDoc(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const extension = docFile.name.split('.').pop() || 'dat';
        try {
          const doc = await usersApi.uploadDocument(employeeId, {
            name: docName.trim(),
            type: extension,
            fileData: base64Data
          });
          setDocuments(prev => [doc, ...prev]);
          setDocName('');
          setDocFile(null);
          showToast('Document uploaded successfully!', 'success');
        } catch (err) {
          showToast('Upload failed: ' + err.message, 'error');
        } finally {
          setUploadingDoc(false);
        }
      };
      reader.readAsDataURL(docFile);
    } catch (err) {
      showToast(err.message, 'error');
      setUploadingDoc(false);
    }
  };

  // Trigger base64 download
  const handleDownloadDoc = (doc) => {
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloading document...', 'info');
  };

  // Leave stats summary calculations
  const getDaysDiff = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const leaveStats = leaves.reduce((acc, leave) => {
    const days = getDaysDiff(leave.startDate, leave.endDate);
    if (leave.status === 'Approved') {
      if (leave.type === 'Vacation') acc.vacationApproved += days;
      else if (leave.type === 'Sick Leave') acc.sickApproved += days;
      else acc.otherApproved += days;
    } else if (leave.status === 'Pending') {
      acc.pending += days;
    }
    return acc;
  }, { vacationApproved: 0, sickApproved: 0, otherApproved: 0, pending: 0 });

  // Reporting manager name resolver
  const manager = employees.find(emp => emp.id === profile?.reportingManagerId);

  // Custom Calendar Generator
  const generateCalendarDays = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Day of the week the month starts on
    const startDay = new Date(year, month, 1).getDay();
    // Number of days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = [];

    // Empty spaces before the 1st
    for (let i = 0; i < startDay; i++) {
      calendarDays.push(null);
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Look up attendance
      const dayClockings = attendance.filter(log => log.date === dateStr);
      // Look up approved leaves
      const activeLeave = leaves.find(l => l.status === 'Approved' && dateStr >= l.startDate && dateStr <= l.endDate);

      calendarDays.push({
        day,
        dateStr,
        clockings: dayClockings,
        leave: activeLeave
      });
    }

    return calendarDays;
  };

  if (loading || !profile) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="dashboard-content">
      {/* Subpage Visual Tabs bar */}
      <div className="role-toggle-group no-print" style={{ marginBottom: '1.5rem', width: 'fit-content' }}>
        <button className={`role-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          👤 Workspace Overview
        </button>
        <button className={`role-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          📅 Calendar & Attendance
        </button>
        <button className={`role-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          📁 Documents Locker ({documents.length})
        </button>
        <button className={`role-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
          ⭐ Performance Reviews ({reviews.length})
        </button>
      </div>

      {/* Tab contents router */}
      {activeTab === 'overview' && (
        <div className="main-dashboard-grid animate-fade-in">
          {/* Left Side: Profile info, Skills, emergency contacts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Profile Summary Card */}
            <div className="glass-card">
              {!isEditing ? (
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Photo upload avatar widget */}
                  <div style={{ position: 'relative', cursor: 'pointer' }}>
                    <div 
                      className="avatar avatar-large" 
                      style={{ 
                        backgroundColor: profile.profileColor, 
                        margin: 0,
                        backgroundImage: profile.photoUrl ? `url(${profile.photoUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}
                    >
                      {!profile.photoUrl && profile.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <label style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      background: 'hsl(var(--primary))',
                      color: 'var(--text-inverse)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifycontent: 'center',
                      fontSize: '0.75rem',
                      boxShadow: 'var(--shadow-md)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      justifyContent: 'center'
                    }}>
                      📷
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    </label>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>{profile.name}</h2>
                        <p style={{ color: 'hsl(var(--primary))', fontWeight: '600', marginBottom: '0.5rem' }}>
                          {profile.role} • {profile.department} ({profile.workMode || 'Office'})
                        </p>
                      </div>
                      <button className="btn btn-secondary" onClick={handleEditToggle} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                        ✏️ Edit Workspace
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <div>📧 <strong>Email:</strong> {profile.email}</div>
                      <div>📞 <strong>Phone:</strong> {profile.phone || '+1 (555) 000-0000'}</div>
                      <div>📅 <strong>Birthdate:</strong> {profile.birthDate || '1990-01-01'}</div>
                      <div>📅 <strong>Joined:</strong> {profile.joinDate}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Edit Personal Workspace details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Display Name</label>
                      <input type="text" className="input-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Phone Number</label>
                      <input type="text" className="input-control" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Birth Date</label>
                      <input type="date" className="input-control" value={editForm.birthDate} onChange={e => setEditForm({ ...editForm, birthDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Work Mode</label>
                      <select className="input-control" value={editForm.workMode} onChange={e => setEditForm({ ...editForm, workMode: e.target.value })}>
                        <option value="Office">Office</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Skills (comma separated)</label>
                      <input type="text" className="input-control" placeholder="e.g. React, Node.js, CSS" value={editForm.skills} onChange={e => setEditForm({ ...editForm, skills: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Certifications (comma separated)</label>
                      <input type="text" className="input-control" placeholder="e.g. AWS Practitioner, CSM" value={editForm.certifications} onChange={e => setEditForm({ ...editForm, certifications: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Emergency Contact Name</label>
                      <input type="text" className="input-control" value={editForm.emergencyName} onChange={e => setEditForm({ ...editForm, emergencyName: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Emergency Contact Phone</label>
                      <input type="text" className="input-control" value={editForm.emergencyPhone} onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Reporting Manager</label>
                      <select className="input-control" value={editForm.reportingManagerId} onChange={e => setEditForm({ ...editForm, reportingManagerId: e.target.value })}>
                        <option value="">No Reporting Manager</option>
                        {employees.filter(emp => emp.id !== employeeId).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-actions" style={{ margin: 0 }}>
                    <button type="button" className="btn btn-secondary" onClick={handleEditToggle} disabled={isSaving}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Workspace Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Skills, Certifications, Managers & Emergency Contacts grids */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {/* Skills Card */}
              <div className="glass-card">
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Skills & Talents</h4>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {profile.skills ? (
                    profile.skills.split(',').map((skill) => (
                      <span key={skill} className="badge" style={{ background: 'hsla(var(--primary), 0.15)', color: 'hsl(var(--primary))', border: '1px solid hsla(var(--primary), 0.25)' }}>
                        {skill.trim()}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No skills documented yet.</span>
                  )}
                </div>
              </div>

              {/* Certifications Card */}
              <div className="glass-card">
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Certifications</h4>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {profile.certifications ? (
                    profile.certifications.split(',').map((cert) => (
                      <span key={cert} className="badge" style={{ background: 'hsla(var(--success), 0.15)', color: 'hsl(var(--success))', border: '1px solid hsla(var(--success), 0.25)' }}>
                        {cert.trim()}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No certifications registered yet.</span>
                  )}
                </div>
              </div>

              {/* Contacts Card */}
              <div className="glass-card">
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Emergency Contact</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  <div>🚨 <strong>Name:</strong> {profile.emergencyName || '--'}</div>
                  <div>📞 <strong>Phone:</strong> {profile.emergencyPhone || '--'}</div>
                </div>
              </div>

              {/* Reporting Manager Card */}
              <div className="glass-card">
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Reporting Manager</h4>
                {manager ? (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div 
                      className="avatar" 
                      style={{ 
                        backgroundColor: manager.profileColor, 
                        width: '32px', 
                        height: '32px', 
                        fontSize: '0.8rem',
                        backgroundImage: manager.photoUrl ? `url(${manager.photoUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        margin: 0
                      }}
                    >
                      {!manager.photoUrl && manager.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{manager.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{manager.role} • {manager.department}</div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>No manager assigned.</span>
                )}
              </div>
            </div>

            {/* Leave Balance status widgets */}
            <div className="leave-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
              <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid hsl(var(--primary))' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vacation Used</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 'bold', color: 'hsl(var(--primary))', margin: '0.2rem 0' }}>
                  {leaveStats.vacationApproved} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Limit: 15 days max</div>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid hsl(var(--success))' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sick Leave Used</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 'bold', color: 'hsl(var(--success))', margin: '0.2rem 0' }}>
                  {leaveStats.sickApproved} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Limit: 10 days max</div>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid hsl(var(--warning))' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Decision</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 'bold', color: 'hsl(var(--warning))', margin: '0.2rem 0' }}>
                  {leaveStats.pending} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Awaiting approval review</div>
              </div>
            </div>

          </div>

          {/* Right Side: Clock widget & Leave File Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Clock Widget */}
            <div className="glass-card clock-widget-container">
              <h3>Time Attendance</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Log your shift work hours</p>
              
              <div className="clock-timer">{elapsedTime}</div>
              
              {activeSession ? (
                <>
                  <div className="clock-subtext">
                    <span className="pulse-ring"></span>
                    Clocked-in since {activeSession.clockInTime} ({activeSession.workMode})
                  </div>
                  <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleClockOut}>
                    🔴 Clock Out
                  </button>
                </>
              ) : (
                <>
                  <div className="clock-subtext">You are currently clocked out</div>
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleClockIn('Office')}>
                      🏢 Office
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1, background: '#3b82f6' }} onClick={() => handleClockIn('WFH')}>
                      🏡 WFH
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Request Leave */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Request Time-off</h3>
              
              <form onSubmit={handleLeaveSubmit}>
                <div className="form-group">
                  <label>Leave Type</label>
                  <select 
                    className="input-control" 
                    value={leaveForm.type}
                    onChange={e => setLeaveForm({...leaveForm, type: e.target.value})}
                  >
                    <option value="Vacation">Vacation</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Personal Leave">Personal Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      className="input-control" 
                      value={leaveForm.startDate}
                      onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>End Date</label>
                    <input 
                      type="date" 
                      className="input-control" 
                      value={leaveForm.endDate}
                      onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason</label>
                  <textarea 
                    className="input-control" 
                    rows="3" 
                    placeholder="Provide reason for time off..."
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                    style={{ resize: 'none', fontFamily: 'inherit' }}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Submit Leave Request
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Attendance Calendar Grid */}
      {activeTab === 'calendar' && (
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Personal Attendance Calendar</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Verify clock-ins, late flags, and leaves recorded this month.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))}>
                ◀ Prev
              </button>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', minWidth: '120px', textAlign: 'center' }}>
                {monthNames[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}
              </span>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))}>
                Next ▶
              </button>
            </div>
          </div>

          {/* Calendar Grid Container */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ fontWeight: '600', padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{day}</div>
            ))}
            
            {calendarDays.map((d, index) => {
              if (!d) return <div key={`empty-${index}`} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }} />;
              
              const isToday = new Date().toISOString().split('T')[0] === d.dateStr;
              const hasClocks = d.clockings.length > 0;
              const hasLeave = !!d.leave;

              return (
                <div 
                  key={d.dateStr} 
                  style={{
                    minHeight: '85px',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    background: isToday ? 'hsla(var(--primary), 0.1)' : 'rgba(255,255,255,0.02)',
                    border: isToday ? '1px solid hsl(var(--primary))' : '1px solid var(--border-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'hsl(var(--primary))' : 'inherit', alignSelf: 'flex-start' }}>
                    {d.day}
                  </span>
                  
                  {/* Status displays inside calendar block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {hasClocks && d.clockings.map(clock => (
                      <div 
                        key={clock.id} 
                        style={{
                          fontSize: '0.65rem',
                          padding: '0.15rem 0.35rem',
                          borderRadius: '4px',
                          background: clock.workMode === 'WFH' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: clock.workMode === 'WFH' ? 'var(--info)' : 'var(--success)',
                          border: `1px solid ${clock.workMode === 'WFH' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{clock.totalHours}h</span>
                        {clock.lateStatus === 'Late' && (
                          <span title="Late Arrival" style={{ color: 'var(--warning)', fontWeight: 'bold' }}>⚠️ L</span>
                        )}
                      </div>
                    ))}
                    
                    {hasLeave && (
                      <div 
                        style={{
                          fontSize: '0.65rem',
                          padding: '0.15rem 0.35rem',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: 'var(--warning)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          textAlign: 'center'
                        }}
                        title={d.leave.reason}
                      >
                        🌴 {d.leave.type.substring(0, 7)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Documents management */}
      {activeTab === 'documents' && (
        <div className="glass-card animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Left: Documents list */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Documents Locker</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Review contracts, ID checks, and certificates uploaded to your portal.</p>

            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>No documents stored in your locker.</p>
            ) : (
              <div className="table-responsive">
                <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id}>
                        <td>
                          <strong>📄 {doc.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {doc.type.toUpperCase()}</div>
                        </td>
                        <td>{doc.uploadDate}</td>
                        <td>
                          <button className="btn btn-secondary" onClick={() => handleDownloadDoc(doc)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                            💾 Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Upload new document Form */}
          <div className="glass-card" style={{ background: 'rgba(0,0,0,0.15)', height: 'fit-content' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Add Document Attachment</h4>
            <form onSubmit={handleDocumentSubmit}>
              <div className="form-group">
                <label>Document Name</label>
                <input type="text" className="input-control" placeholder="e.g. Passport_Scan" value={docName} onChange={e => setDocName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Select File</label>
                <input type="file" className="input-control" onChange={e => setDocFile(e.target.files[0])} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={uploadingDoc}>
                {uploadingDoc ? 'Uploading...' : 'Upload Attachment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Performance Reviews */}
      {activeTab === 'reviews' && (
        <div className="glass-card animate-fade-in">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Performance Reviews</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Track review periods, feedback comments, and manager ratings.</p>

          {reviews.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>No performance reviews logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {reviews.map(rev => (
                <div key={rev.id} style={{ border: '1px solid var(--border-card)', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className="badge" style={{ background: 'hsla(var(--primary), 0.15)', color: 'hsl(var(--primary))', marginRight: '0.5rem' }}>{rev.period}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reviewed on {rev.reviewDate}</span>
                    </div>
                    <div>
                      <span style={{ color: '#fbbf24', fontSize: '1.1rem', marginRight: '3px' }}>★</span>
                      <strong style={{ fontSize: '1rem' }}>{rev.rating} / 5.0</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-main)', paddingLeft: '0.5rem', borderLeft: '3px solid hsl(var(--primary))' }}>
                    "{rev.comments}"
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Reviewer: <strong>{rev.reviewerName}</strong> (ID: {rev.reviewerId})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
