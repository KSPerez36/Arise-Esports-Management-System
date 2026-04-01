import { createContext, useContext, useState, useCallback, useRef } from 'react';
import ToastContainer from '../components/ToastContainer';

const ToastContext = createContext(null);

let nextId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  const showToast = useCallback((type, message, duration = 3500) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, type, message, duration, removing: false }]);
    timers.current[id] = setTimeout(() => {
      dismiss(id);
      delete timers.current[id];
    }, duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);