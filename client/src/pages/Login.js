import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'otp' | 'reset'
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, forgotPassword, verifyOtp, resetPassword } = useContext(AuthContext);
  const navigate = useNavigate();

  const clearMessages = () => { setError(''); setSuccess(''); };

  // --- LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    const result = await login(loginData.email, loginData.password);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  // --- STEP 1: Send OTP ---
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    const result = await forgotPassword(resetEmail);
    setLoading(false);
    if (result.success) {
      setSuccess('OTP sent! Check your email.');
      setMode('otp');
    } else {
      setError(result.message);
    }
  };

  // --- STEP 2: Verify OTP ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    const result = await verifyOtp(resetEmail, otp);
    setLoading(false);
    if (result.success) {
      setResetToken(result.resetToken);
      setMode('reset');
    } else {
      setError(result.message);
    }
  };

  // --- STEP 3: Set New Password ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = await resetPassword(resetToken, newPassword);
    setLoading(false);
    if (result.success) {
      setSuccess('Password reset successfully! You can now sign in.');
      setMode('login');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
    } else {
      setError(result.message);
    }
  };

  const switchToLogin = () => {
    setMode('login');
    clearMessages();
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetEmail('');
  };

  return (
    <div className="login-page">

      {/* Left Branding Panel */}
      <div className="login-branding">
        <div className="login-branding-content">
          <img src="/images/arise-logo.png" alt="Arise Logo" className="login-logo" />
          <h1 className="login-org-name">ARISE</h1>
          <p className="login-tagline">Organization Management System</p>
          <div className="login-branding-divider"></div>
          <div className="login-branding-features">
            <div className="login-feature-item">
              <i className="fas fa-users"></i>
              <span>Member &amp; Officer Management</span>
            </div>
            <div className="login-feature-item">
              <i className="fas fa-coins"></i>
              <span>Financial &amp; Budget Tracking</span>
            </div>
            <div className="login-feature-item">
              <i className="fas fa-calendar-check"></i>
              <span>Event Coordination</span>
            </div>
            <div className="login-feature-item">
              <i className="fas fa-file-alt"></i>
              <span>Reports &amp; Documentation</span>
            </div>
          </div>
        </div>
        <div className="login-branding-circle login-branding-circle-1"></div>
        <div className="login-branding-circle login-branding-circle-2"></div>
        <div className="login-branding-circle login-branding-circle-3"></div>
      </div>

      {/* Right Form Panel */}
      <div className="login-form-panel">
        <div className="login-form-wrapper">

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <div className="login-form-header">
                <h2>Welcome Back</h2>
                <p>Sign in to access the management portal</p>
              </div>

              {error && <div className="alert alert-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
              {success && <div className="alert alert-success"><i className="fas fa-check-circle"></i> {success}</div>}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <FontAwesomeIcon icon={faEnvelope} />
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="input-with-icon input-with-toggle">
                    <FontAwesomeIcon icon={faLock} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                    <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Please wait...</> : 'Sign In'}
                </button>
              </form>

              <p className="login-switch">
                Forgot your password?{' '}
                <span onClick={() => { setMode('forgot'); clearMessages(); }}>Reset Password</span>
              </p>
            </>
          )}

          {/* ── STEP 1: EMAIL ── */}
          {mode === 'forgot' && (
            <>
              <div className="login-form-header">
                <h2>Reset Password</h2>
                <p>Enter your email and we'll send you a one-time code</p>
              </div>

              {error && <div className="alert alert-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}

              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <i className="fas fa-envelope"></i>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter your registered email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : 'Send OTP'}
                </button>
              </form>

              <p className="login-switch">
                <span onClick={switchToLogin}><i className="fas fa-arrow-left"></i> Back to Sign In</span>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {mode === 'otp' && (
            <>
              <div className="login-form-header">
                <h2>Enter OTP</h2>
                <p>A 6-digit code was sent to <strong>{resetEmail}</strong></p>
              </div>

              {error && <div className="alert alert-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
              {success && <div className="alert alert-success"><i className="fas fa-check-circle"></i> {success}</div>}

              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label>One-Time Password</label>
                  <div className="input-with-icon">
                    <i className="fas fa-key"></i>
                    <input
                      type="text"
                      className="form-control otp-input"
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Verifying...</> : 'Verify OTP'}
                </button>
              </form>

              <p className="login-switch">
                Didn't receive the code?{' '}
                <span onClick={() => { setMode('forgot'); clearMessages(); setOtp(''); }}>Resend</span>
                {' · '}
                <span onClick={switchToLogin}>Cancel</span>
              </p>
            </>
          )}

          {/* ── STEP 3: NEW PASSWORD ── */}
          {mode === 'reset' && (
            <>
              <div className="login-form-header">
                <h2>Set New Password</h2>
                <p>Create a strong password for your account</p>
              </div>

              {error && <div className="alert alert-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}

              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <i className="fas fa-lock"></i>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="input-with-icon">
                    <i className="fas fa-lock"></i>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Repeat your new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Reset Password'}
                </button>
              </form>

              <p className="login-switch">
                <span onClick={switchToLogin}><i className="fas fa-arrow-left"></i> Back to Sign In</span>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;