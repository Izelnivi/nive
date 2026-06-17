import { getDB, saveDB } from './db';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const SESSION_KEY = 'apex_portal_session';
const CREDENTIALS_KEY = 'local_credentials';

// Helper to manage local credentials for LocalStorage mode
const getLocalCredentials = () => {
  const data = localStorage.getItem(CREDENTIALS_KEY);
  if (!data) {
    const creds = {};
    const db = getDB();
    db.employees.forEach(emp => {
      creds[emp.email.toLowerCase()] = 'password123';
    });
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
    return creds;
  }
  return JSON.parse(data);
};

const saveLocalCredential = (email, password) => {
  const creds = getLocalCredentials();
  creds[email.toLowerCase()] = password;
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
};

export const authApi = {
  // Log in user
  login: async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (isSupabaseConfigured()) {
      // 1. Check credentials table
      const { data: cred, error: credError } = await supabase
        .from('credentials')
        .select('*')
        .eq('email', cleanEmail)
        .single();
      
      if (credError || !cred) {
        throw new Error('Invalid email or password');
      }
      
      if (cred.password !== password) {
        throw new Error('Invalid email or password');
      }

      // 2. Fetch employee profile
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', cleanEmail)
        .single();
      
      if (empError || !employee) {
        throw new Error('Employee profile not found');
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(employee));
      return employee;
    }

    // Fallback mode
    await new Promise(r => setTimeout(r, 300));
    
    // Check if default master admin bypass
    if (cleanEmail === 'admin@company.com' && password === 'admin') {
      const db = getDB();
      // Use Emily Watson (HR Director) as default admin
      const adminUser = db.employees.find(e => e.id === 'E004') || {
        id: 'E004',
        name: 'Emily Watson',
        role: 'HR Director',
        department: 'HR',
        email: 'emily.watson@company.com',
        profileColor: '#f59e0b',
        status: 'Active'
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
      return adminUser;
    }

    const localCreds = getLocalCredentials();
    const storedPassword = localCreds[cleanEmail];
    
    if (!storedPassword || storedPassword !== password) {
      throw new Error('Invalid email or password');
    }

    const db = getDB();
    const employee = db.employees.find(emp => emp.email.toLowerCase() === cleanEmail);
    if (!employee) {
      throw new Error('Employee profile not found');
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(employee));
    return employee;
  },

  // Sign up new user
  signup: async ({ name, email, password, role, department, phone }) => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (isSupabaseConfigured()) {
      // Check if credentials already exist
      const { data: existingCred } = await supabase
        .from('credentials')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();
      
      if (existingCred) {
        throw new Error('Email is already registered');
      }

      // Generate ID
      const { data: employees } = await supabase
        .from('employees')
        .select('id');
      const nextId = 'E' + String((employees || []).length + 1).padStart(3, '0');
      
      const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newEmployee = {
        id: nextId,
        name,
        role: role || 'Junior Developer',
        department: department || 'Engineering',
        email: cleanEmail,
        baseSalary: '$4,500/mo',
        phone: phone || '+1 (555) 000-0000',
        profileColor: randomColor,
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0],
        rating: '5.0'
      };

      // 1. Insert into employees
      const { error: empErr } = await supabase
        .from('employees')
        .insert([newEmployee]);
      
      if (empErr) throw new Error(empErr.message);

      // 2. Insert into credentials
      const { error: credErr } = await supabase
        .from('credentials')
        .insert([{ email: cleanEmail, password }]);
      
      if (credErr) {
        // Rollback employee insert if possible (delete since ID is known)
        await supabase.from('employees').delete().eq('id', nextId);
        throw new Error(credErr.message);
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(newEmployee));
      return newEmployee;
    }

    // Fallback mode
    await new Promise(r => setTimeout(r, 300));
    const db = getDB();
    
    if (db.employees.some(e => e.email.toLowerCase() === cleanEmail)) {
      throw new Error('Email is already registered');
    }

    const nextId = 'E' + String(db.employees.length + 1).padStart(3, '0');
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newEmployee = {
      id: nextId,
      name,
      role: role || 'Junior Developer',
      department: department || 'Engineering',
      email: cleanEmail,
      baseSalary: '$4,500/mo',
      phone: phone || '+1 (555) 000-0000',
      profileColor: randomColor,
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
      rating: '5.0'
    };

    db.employees.push(newEmployee);
    saveDB(db);

    saveLocalCredential(cleanEmail, password);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newEmployee));
    return newEmployee;
  },

  // Log out current user
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  // Get current logged-in user profile
  getCurrentUser: () => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }
};
