import { getDB, saveDB } from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const adminApi = {
  // Employee Management
  getEmployees: async () => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) {
        console.error('Supabase getEmployees error:', error);
        throw new Error(error.message);
      }
      return data || [];
    }

    await delay();
    const db = getDB();
    return db.employees;
  },

  addEmployee: async (employeeData) => {
    if (isSupabaseConfigured()) {
      const { data: employees, error: countError } = await supabase
        .from('employees')
        .select('id');
      
      if (countError) {
        console.error('Supabase count employees error:', countError);
        throw new Error(countError.message);
      }
      
      // Generate ID like E011, E012
      const nextId = 'E' + String(employees.length + 1).padStart(3, '0');
      
      const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newEmployee = {
        id: nextId,
        name: employeeData.name,
        role: employeeData.role || 'Junior Developer',
        department: employeeData.department || 'Engineering',
        email: employeeData.email,
        baseSalary: employeeData.baseSalary || '$5,000/mo',
        profileColor: employeeData.profileColor || randomColor,
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0],
        rating: employeeData.rating || '5.0',
        skills: employeeData.skills || '',
        certifications: employeeData.certifications || '',
        emergencyName: employeeData.emergencyName || '',
        emergencyPhone: employeeData.emergencyPhone || '',
        reportingManagerId: employeeData.reportingManagerId || '',
        birthDate: employeeData.birthDate || '1990-01-01',
        workMode: employeeData.workMode || 'Office',
        roleLevel: employeeData.roleLevel || 'Employee'
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([newEmployee])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase addEmployee error:', error);
        throw new Error(error.message);
      }
      return data;
    }

    await delay();
    const db = getDB();
    
    // Generate simple sequential or random ID
    const nextId = 'E' + String(db.employees.length + 1).padStart(3, '0');
    
    // Pick a profile color if not specified
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newEmployee = {
      id: nextId,
      name: employeeData.name,
      role: employeeData.role || 'Junior Developer',
      department: employeeData.department || 'Engineering',
      email: employeeData.email,
      baseSalary: employeeData.baseSalary || '$5,000/mo',
      profileColor: employeeData.profileColor || randomColor,
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
      rating: employeeData.rating || '5.0',
      skills: employeeData.skills || '',
      certifications: employeeData.certifications || '',
      emergencyName: employeeData.emergencyName || '',
      emergencyPhone: employeeData.emergencyPhone || '',
      reportingManagerId: employeeData.reportingManagerId || '',
      birthDate: employeeData.birthDate || '1990-01-01',
      workMode: employeeData.workMode || 'Office',
      roleLevel: employeeData.roleLevel || 'Employee'
    };

    db.employees.push(newEmployee);
    saveDB(db);
    return newEmployee;
  },

  updateEmployee: async (employeeId, updatedData) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('employees')
        .update(updatedData)
        .eq('id', employeeId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase updateEmployee error:', error);
        throw new Error(error.message);
      }
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
    return db.employees[index];
  },

  deleteEmployee: async (employeeId) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);
      
      if (error) {
        console.error('Supabase deleteEmployee error:', error);
        throw new Error(error.message);
      }
      return { success: true };
    }

    await delay();
    const db = getDB();
    
    db.employees = db.employees.filter(emp => emp.id !== employeeId);
    // Also cleanup leave requests & attendance
    db.leaves = db.leaves.filter(leave => leave.employeeId !== employeeId);
    db.attendance = db.attendance.filter(log => log.employeeId !== employeeId);
    db.documents = (db.documents || []).filter(doc => doc.employeeId !== employeeId);
    db.performance_reviews = (db.performance_reviews || []).filter(rev => rev.employeeId !== employeeId);
    
    saveDB(db);
    return { success: true };
  },

  // Leave Requests Review
  getAllLeaves: async () => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .order('requestDate', { ascending: false });
      
      if (error) {
        console.error('Supabase getAllLeaves error:', error);
        throw new Error(error.message);
      }
      return data || [];
    }

    await delay();
    const db = getDB();
    return db.leaves;
  },

  updateLeaveStatus: async (leaveId, status) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('leaves')
        .update({ status })
        .eq('id', leaveId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase updateLeaveStatus error:', error);
        throw new Error(error.message);
      }
      return data;
    }

    await delay();
    const db = getDB();
    const index = db.leaves.findIndex(l => l.id === leaveId);
    if (index === -1) throw new Error('Leave request not found');

    db.leaves[index].status = status;
    saveDB(db);
    return db.leaves[index];
  },

  // System Attendance Logs
  getAllAttendance: async () => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Supabase getAllAttendance error:', error);
        throw new Error(error.message);
      }
      return data || [];
    }

    await delay();
    const db = getDB();
    return db.attendance;
  },

  // Get Audit Logs
  getAuditLogs: async () => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) {
        console.error('Supabase getAuditLogs error:', error);
        throw new Error(error.message);
      }
      return data || [];
    }
    await delay();
    const db = getDB();
    return db.audit_logs || [];
  },

  // Add Performance Review
  addPerformanceReview: async (employeeId, { reviewerId, reviewerName, period, rating, comments }) => {
    const newReview = {
      id: 'PR' + Math.floor(Math.random() * 10000),
      employeeId,
      reviewerId,
      reviewerName,
      period,
      rating,
      comments,
      reviewDate: new Date().toISOString().split('T')[0]
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('performance_reviews')
        .insert([newReview])
        .select()
        .single();
      if (error) {
        console.error('Supabase addPerformanceReview error:', error);
        throw new Error(error.message);
      }
      return data;
    }
    await delay();
    const db = getDB();
    if (!db.performance_reviews) db.performance_reviews = [];
    db.performance_reviews.unshift(newReview);
    saveDB(db);
    return newReview;
  }
};
