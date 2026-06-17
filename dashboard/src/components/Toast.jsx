import { useState, useEffect } from 'react';

export const showToast = (message, type = 'success') => {
  window.dispatchEvent(
    new CustomEvent('show-toast', {
      detail: { id: Math.random().toString(36).substr(2, 9), message, type }
    })
  );
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const { id, message, type } = e.detail;
      const newToast = { id, message, type };
      
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('show-toast', handleToastEvent);
    return () => window.removeEventListener('show-toast', handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="toast-container" style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item ${toast.type}`}
          onClick={() => removeToast(toast.id)}
          style={{
            pointerEvents: 'auto',
            background: toast.type === 'success' 
              ? 'rgba(16, 185, 129, 0.95)' 
              : toast.type === 'error' 
              ? 'rgba(244, 63, 94, 0.95)' 
              : 'rgba(59, 130, 246, 0.95)',
            color: '#fff',
            padding: '0.85rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: '280px',
            animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <span className="toast-icon">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="toast-message" style={{ flex: 1 }}>{toast.message}</span>
          <span className="toast-close" style={{ opacity: 0.7, fontSize: '0.8rem' }}>×</span>
        </div>
      ))}
    </div>
  );
}
