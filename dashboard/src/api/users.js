import { getDB, saveDB } from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const usersApi = {
  // Login / Profile Fetch
  getProfile: async (employeeId) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      
      if (error) {
        console.error('Supabase getProfile error:', error);
        throw new Error(error.message);
      }
      return data;
    }

    await delay();
    const db = getDB();
    const employee = db.employees.find(emp => emp.id === employeeId);
    if (!employee) throw new Error('Employee not found');
    return employee;
  },

  // Update profile details directly (handles skills, emergency contact, photo, etc.)
  updateProfileDetails: async (employeeId, updatedData) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('employees')
        .update(updatedData)
        .eq('id', employeeId)
        .select()
        .single();
      if (error) {
        console.error('Supabase updateProfileDetails error:', error);
        throw new Error(error.message);
      }
      await usersApi.addAuditLog(employeeId, 'Update Profile', 'Updated personal profile details');
      return data;
    }

    await delay();
    const db = getDB();
    const index = db.employees.findIndex(emp => emp.id === employeeId);
    if (index === -1) throw new Error('Employee not found');
    db.employees[index] = {
      ...db.employees[index],
      ...updatedData
    };
    saveDB(db);
    await usersApi.addAuditLog(employeeId, 'Update Profile', 'Updated personal profile details');
    return db.employees[index];
  },

  // Get active session (if clocked in but not clocked out today)
  getActiveSession: async (employeeId) => {
    await delay(100);
    const sessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
    return sessions[employeeId] || null;
  },

  // Clock In (keeps tracking active session locally)
  clockIn: async (employeeId, workMode = 'Office') => {
    await delay(100);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const sessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
    if (sessions[employeeId]) {
      throw new Error('Already clocked in');
    }
    
    // Calculate late arrival status (standard starts 09:00 AM, buffer until 09:05 AM)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const lateStatus = (hours > 9 || (hours === 9 && minutes > 5)) ? 'Late' : 'Ontime';
    
    sessions[employeeId] = {
      clockInTime: timeStr,
      date: dateStr,
      timestamp: now.getTime(),
      workMode,
      lateStatus
    };
    
    localStorage.setItem('active_sessions', JSON.stringify(sessions));
    await usersApi.addAuditLog(employeeId, 'Clock In', `Clocked in from ${workMode} (${lateStatus})`);
    return sessions[employeeId];
  },

  // Clock Out (inserts attendance log to Supabase/LocalStorage)
  clockOut: async (employeeId) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    
    const sessions = JSON.parse(localStorage.getItem('active_sessions') || '{}');
    const session = sessions[employeeId];
    if (!session) {
      throw new Error('Not clocked in');
    }
    
    const startMs = session.timestamp;
    const endMs = now.getTime();
    const hours = parseFloat(((endMs - startMs) / (1000 * 60 * 60)).toFixed(2));
    
    // Calculate overtime (hours > 8)
    const overtime = hours > 8 ? (hours - 8).toFixed(2) : '0.00';
    
    const newLog = {
      id: 'A' + Math.floor(Math.random() * 10000),
      employeeId,
      date: session.date,
      clockIn: session.clockInTime,
      clockOut: timeStr,
      totalHours: String(hours),
      workMode: session.workMode || 'Office',
      lateStatus: session.lateStatus || 'Ontime',
      overtimeHours: overtime
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('attendance')
        .insert([newLog])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase clockOut error:', error);
        throw new Error(error.message);
      }
      
      delete sessions[employeeId];
      localStorage.setItem('active_sessions', JSON.stringify(sessions));
      await usersApi.addAuditLog(employeeId, 'Clock Out', `Clocked out. Hours: ${hours}, Overtime: ${overtime}`);
      return data;
    }

    await delay();
    const db = getDB();
    db.attendance.unshift(newLog);
    saveDB(db);
    
    delete sessions[employeeId];
    localStorage.setItem('active_sessions', JSON.stringify(sessions));
    await usersApi.addAuditLog(employeeId, 'Clock Out', `Clocked out. Hours: ${hours}, Overtime: ${overtime}`);
    
    return newLog;
  },

  // Leave Requests for individual
  getLeaves: async (employeeId) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('employeeId', employeeId)
        .order('requestDate', { ascending: false });
      
      if (error) {
        console.error('Supabase getLeaves error:', error);
        throw new Error(error.message);
      }
      return data || [];
    }

    await delay();
    const db = getDB();
    return db.leaves.filter(l => l.employeeId === employeeId);
  },

  requestLeave: async (employeeId, { type, startDate, endDate, reason }) => {
    let employeeName = '';

    if (isSupabaseConfigured()) {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('name')
        .eq('id', employeeId)
        .single();
      
      if (empError) {
        console.error('Supabase fetch employee error during leave request:', empError);
        throw new Error(empError.message);
      }
      employeeName = employee.name;

      const newLeave = {
        id: 'L' + Math.floor(Math.random() * 10000),
        employeeId,
        employeeName,
        type,
        startDate,
        endDate,
        reason,
        status: 'Pending',
        requestDate: new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase
        .from('leaves')
        .insert([newLeave])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase requestLeave error:', error);
        throw new Error(error.message);
      }
      await usersApi.addAuditLog(employeeId, 'Request Leave', `Requested ${type} from ${startDate} to ${endDate}`);
      return data;
    }

    await delay();
    const db = getDB();
    const employee = db.employees.find(emp => emp.id === employeeId);
    if (!employee) throw new Error('Employee not found');
    employeeName = employee.name;

    const newLeave = {
      id: 'L' + Math.floor(Math.random() * 10000),
      employeeId,
      employeeName,
      type,
      startDate,
      endDate,
      reason,
      status: 'Pending',
      requestDate: new Date().toISOString().split('T')[0]
    };

    db.leaves.unshift(newLeave);
    saveDB(db);
    await usersApi.addAuditLog(employeeId, 'Request Leave', `Requested ${type} from ${startDate} to ${endDate}`);
    return newLeave;
  },

  // Attendance history for individual
  getAttendanceHistory: async (employeeId) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employeeId', employeeId)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Supabase getAttendanceHistory error:', error);
        throw new Error(error.message);
      }
      return data || [];
    }

    await delay();
    const db = getDB();
    return db.attendance.filter(log => log.employeeId === employeeId);
  },

  // Document Management
  getDocuments: async (employeeId) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('employeeId', employeeId)
        .order('uploadDate', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
    await delay();
    const db = getDB();
    return db.documents.filter(doc => doc.employeeId === employeeId);
  },

  uploadDocument: async (employeeId, { name, type, fileData }) => {
    const newDoc = {
      id: 'D' + Math.floor(Math.random() * 10000),
      employeeId,
      name,
      type,
      fileData,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('documents')
        .insert([newDoc])
        .select()
        .single();
      if (error) throw new Error(error.message);
      await usersApi.addAuditLog(employeeId, 'Upload Document', `Uploaded document ${name}`);
      return data;
    }
    await delay();
    const db = getDB();
    db.documents.unshift(newDoc);
    saveDB(db);
    await usersApi.addAuditLog(employeeId, 'Upload Document', `Uploaded document ${name}`);
    return newDoc;
  },

  // Performance Reviews
  getPerformanceReviews: async (employeeId) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('employeeId', employeeId)
        .order('reviewDate', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
    await delay();
    const db = getDB();
    return db.performance_reviews.filter(rev => rev.employeeId === employeeId);
  },

  // Helper to add audit logs
  addAuditLog: async (employeeId, action, details) => {
    let userName = 'System';
    try {
      const db = getDB();
      const profile = db.employees.find(emp => emp.id === employeeId);
      if (profile) userName = profile.name;
    } catch {}

    const newLog = {
      id: 'LOG' + Math.floor(Math.random() * 100000),
      userId: employeeId,
      userName,
      action,
      details,
      timestamp: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      await supabase.from('audit_logs').insert([newLog]);
      return;
    }
    const db = getDB();
    db.audit_logs.unshift(newLog);
    saveDB(db);
  }
};
