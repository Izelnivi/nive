import { useState } from 'react';
import { authApi } from '../api/auth';
import { isSupabaseConfigured } from '../api/supabaseClient';

export default function AuthPage({ onLoginSuccess }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup fields
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Junior Developer',
    department: 'Engineering',
    phone: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginEmail || !loginPassword) return setError('Please enter email and password.');
    setLoading(true);
    try {
      const user = await authApi.login(loginEmail, loginPassword);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!signupData.name || !signupData.email || !signupData.password) {
      return setError('Please fill in Name, Email, and Password.');
    }
    setLoading(true);
    try {
      const user = await authApi.signup(signupData);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCloud = isSupabaseConfigured();

  return (
    <div className="auth-container">
      <div className="auth-glass-box">
        {/* Brand Header */}
        <div className="auth-brand">
          <span className="auth-logo">💼</span>
          <h2>Apex Portal</h2>
          <p className="auth-subtitle">Enterprise Workspace Management</p>
        </div>

        {/* Tab Selectors */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab-btn ${isLoginTab ? 'active' : ''}`}
            onClick={() => { setIsLoginTab(true); setError(''); }}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`auth-tab-btn ${!isLoginTab ? 'active' : ''}`}
            onClick={() => { setIsLoginTab(false); setError(''); }}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {error && <div className="auth-error-alert">{error}</div>}

        {/* Auth Forms */}
        {isLoginTab ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="input-control" 
                placeholder="e.g. john.doe@company.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="input-control" 
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading ? <div className="spinner-small"></div> : 'Sign In'}
            </button>

            <div className="auth-demo-tip">
              <strong>💡 Demo Login:</strong><br />
              Standard: <code>john.doe@company.com</code> / <code>password123</code><br />
              HR Admin: <code>emily.watson@company.com</code> / <code>password123</code>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="e.g. Liam Anderson"
                value={signupData.name}
                onChange={e => setSignupData({ ...signupData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="input-control" 
                placeholder="e.g. liam.a@company.com"
                value={signupData.email}
                onChange={e => setSignupData({ ...signupData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="input-control" 
                placeholder="Minimum 6 characters"
                value={signupData.password}
                onChange={e => setSignupData({ ...signupData, password: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Department</label>
                <select 
                  className="input-control"
                  value={signupData.department}
                  onChange={e => setSignupData({ ...signupData, department: e.target.value })}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Product">Product</option>
                  <option value="HR">HR</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Job Role</label>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="e.g. Lead Designer"
                  value={signupData.role}
                  onChange={e => setSignupData({ ...signupData, role: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="e.g. +1 (555) 012-3456"
                value={signupData.phone}
                onChange={e => setSignupData({ ...signupData, phone: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
              {loading ? <div className="spinner-small"></div> : 'Create Account'}
            </button>
          </form>
        )}

        {/* Database Status badge footer */}
        <div className="auth-footer-status">
          <span className={`db-status-badge ${isCloud ? 'connected' : 'fallback'}`}>
            {isCloud ? '⚡ Supabase Cloud Connected' : '📁 Local Storage (Offline Mode)'}
          </span>
        </div>
      </div>
    </div>
  );
}
