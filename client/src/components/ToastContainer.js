import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
  faCircleInfo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import './Toast.css';

const TOAST_CONFIG = {
  success: { icon: faCircleCheck,         title: 'Success',  color: '#22c55e' },
  error:   { icon: faCircleXmark,         title: 'Error',    color: '#ef4444' },
  warning: { icon: faTriangleExclamation, title: 'Warning',  color: '#f59e0b' },
  info:    { icon: faCircleInfo,          title: 'Info',     color: '#3b82f6' },
};

const ToastItem = ({ toast, onDismiss }) => {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;

  return (
    <div
      className={`toast-item${toast.removing ? ' toast-removing' : ''}`}
      style={{ '--toast-color': config.color, '--toast-duration': `${toast.duration}ms` }}
    >
      <div className="toast-icon">
        <FontAwesomeIcon icon={config.icon} />
      </div>
      <div className="toast-body">
        <p className="toast-title">{config.title}</p>
        <p className="toast-message">{toast.message}</p>
      </div>
      <button className="toast-close" onClick={() => onDismiss(toast.id)}>
        <FontAwesomeIcon icon={faXmark} />
      </button>
      <div className="toast-progress" />
    </div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastContainer;